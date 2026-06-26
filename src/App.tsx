import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Waves, Radio, Volume2, ShieldCheck } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { EffectControls } from './components/EffectControls';
import type { EffectSettings } from './components/EffectControls';
import { PlaybackControls } from './components/PlaybackControls';
import { ProgressBar } from './components/ProgressBar';
import { SettingsMenu } from './components/SettingsMenu';
import { AmbientScene } from './components/AmbientScene';
import { DesktopOnlyGate } from './components/DesktopOnlyGate';
import { useIsViewportTooNarrow } from './hooks/useViewportGate';
import { WaveformTimeline } from './components/WaveformTimeline';
import { ThemeRail } from './components/ThemeRail';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from './components/ui/tooltip';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { useAudioReactivity } from './hooks/useAudioReactivity';
import { EFFECT_EXPORT_LABELS, EFFECT_DEFAULTS } from './constants';
import type { AudioProcessingOptions } from './utils/audioProcessor';

const toOptions = (s: EffectSettings): AudioProcessingOptions => ({
  speedMultiplier: s.speedMultiplier,
  reverbAmount: s.reverbAmount,
  audio8D: s.mode === '8d-audio',
  rotationSpeed: s.rotationSpeed,
  bassBoost: s.mode === 'bass-boost',
  bassBoostIntensity: s.bassBoostIntensity,
});

function App() {
  const { t, i18n } = useTranslation();
  const {
    state,
    originalFile,
    originalBuffer,
    processedBuffer,
    playbackTime,
    duration,
    volume,
    metadata,
    loadAudioFile,
    setEffects,
    playAudio,
    stopAudio,
    exportProcessedAudio,
    updateVolume,
    seekTo,
    reset,
    getAnalyser,
  } = useAudioProcessor();

  // Desktop-only: Reverie's cockpit needs a wide canvas, so narrow viewports are
  // gated (no bypass) and pushed to a bigger screen. Width-based, live on resize.
  const viewportTooNarrow = useIsViewportTooNarrow();

  // The signature: the whole interface breathes with the music. Publishes live
  // audio-energy CSS vars that the scene and panels consume.
  useAudioReactivity({ getAnalyser, isPlaying: state.isPlaying });

  useEffect(() => {
    document.title = t('meta.title');
    document.documentElement.lang = i18n.language;

    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaTag('description', t('meta.description'));
    updateMetaTag('keywords', t('meta.keywords'));
    updateMetaTag('og:title', t('meta.title'), true);
    updateMetaTag('og:description', t('meta.description'), true);
    updateMetaTag('twitter:title', t('meta.title'));
    updateMetaTag('twitter:description', t('meta.description'));
  }, [i18n.language, t]);

  // Seed matches EffectControls' initial mode; replaced by its first onChange on mount.
  const [effectSettings, setEffectSettings] = useState<EffectSettings>({
    mode: 'slow-reverb',
    speedMultiplier: EFFECT_DEFAULTS.SLOW_REVERB.SPEED_DEFAULT,
    reverbAmount: EFFECT_DEFAULTS.SLOW_REVERB.REVERB_DEFAULT,
  });
  const effectOptions = useMemo(() => toOptions(effectSettings), [effectSettings]);

  const [uploadRevision, setUploadRevision] = useState(0);

  const handleFileSelect = useCallback(
    async (file: File) => {
      await loadAudioFile(file);
    },
    [loadAudioFile]
  );

  const handleReset = useCallback(() => {
    reset();
    setUploadRevision((n) => n + 1);
  }, [reset]);

  const handleEffectChange = useCallback(
    (settings: EffectSettings) => {
      setEffectSettings(settings);
      // Apply live: ramps the playing graph, and is remembered for the next play.
      setEffects(toOptions(settings));
    },
    [setEffects]
  );

  const handlePlay = useCallback(() => {
    // When the track has reached the end, pressing play replays from the start.
    const startAt = duration > 0 && playbackTime >= duration ? 0 : playbackTime;
    if (originalBuffer) playAudio(originalBuffer, startAt);
    else if (processedBuffer) playAudio(processedBuffer, startAt);
  }, [playAudio, originalBuffer, processedBuffer, playbackTime, duration]);

  const hasPlayableAudio = !!(originalBuffer || processedBuffer);

  const handleTogglePlay = useCallback(() => {
    if (state.isPlaying) stopAudio();
    else handlePlay();
  }, [state.isPlaying, stopAudio, handlePlay]);

  // Spacebar toggles play/pause, like a classic media player. Ignored while the
  // user is typing in a field or focused on a control space would already act on,
  // so we don't hijack the key or fire the transport twice.
  useEffect(() => {
    if (!hasPlayableAudio || state.isExporting) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'BUTTON' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      e.preventDefault();
      handleTogglePlay();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasPlayableAudio, state.isExporting, handleTogglePlay]);

  // Speed changes the listening length: a 3:00 clip at 0.5x lasts 6:00. We track time
  // internally in source-buffer time, but the transport speaks in effective (output)
  // time so the duration and clock stretch/compress with the rate, like a real player.
  const playbackRate = effectSettings.speedMultiplier || 1;
  const effectiveDuration = playbackRate > 0 ? duration / playbackRate : duration;
  const effectiveTime = playbackRate > 0 ? playbackTime / playbackRate : playbackTime;

  const handleSeek = useCallback(
    (time: number) => {
      // The UI seeks in effective time; convert back to source time for the engine.
      seekTo(time * playbackRate);
    },
    [seekTo, playbackRate]
  );

  const handleExport = useCallback(async () => {
    try {
      // Pause playback before exporting so the offline render isn't fighting the
      // live graph and the user isn't left hearing audio during the export.
      if (state.isPlaying) stopAudio();
      const baseName = originalFile ? originalFile.name.replace(/\.[^/.]+$/, '') : 'track';
      // Use English-only labels for filenames (not translated)
      const fxLabel = EFFECT_EXPORT_LABELS[effectSettings.mode];
      await exportProcessedAudio({ filename: baseName, effectLabel: fxLabel });
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [exportProcessedAudio, originalFile, effectSettings.mode, state.isPlaying, stopAudio]);

  const hasSession = !!(originalFile || originalBuffer || processedBuffer);
  const stageBuffer = originalBuffer || processedBuffer;

  const errorBanner = state.error ? (
    <div role="alert" className="rounded-2xl px-4 py-3 border border-[rgba(var(--color-accent),0.4)] bg-[rgba(var(--color-accent),0.1)]">
      <p className="text-sm font-medium text-[rgb(var(--color-text))]">{state.error}</p>
    </div>
  ) : null;

  // ------------------------------------------------------------ Desktop gate
  if (viewportTooNarrow) {
    return <DesktopOnlyGate />;
  }

  // ---------------------------------------------------------------- Welcome
  if (!hasSession) {
    return (
      <div className="min-h-screen flex flex-col">
        <AmbientScene />
        <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-4">
          <SettingsMenu />
        </div>

        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-16">
          <div className="aurora-stage relative w-full max-w-2xl flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-[18px] bg-[url('/favicon.svg')] bg-center bg-cover shadow-[0_18px_50px_-24px_rgba(var(--aurora-pink),0.7)] mb-7"
              aria-hidden="true"
            />
            <h1 className="font-display lowercase text-5xl sm:text-6xl font-light tracking-[0.04em] text-[rgb(var(--color-text))]">
              {t('app.title')}
            </h1>
            <p className="font-display mt-4 text-lg sm:text-xl font-light text-balance text-[rgb(var(--color-text-secondary))] max-w-md">
              {t('app.subtitle')}
            </p>

            <div className="w-full mt-10 space-y-4">
              {errorBanner}
              {state.isLoading ? (
                <ProgressBar
                  progress={state.progress}
                  isProcessing={state.isLoading}
                  message={t('upload.loading')}
                />
              ) : (
                <FileUploader
                  key={uploadRevision}
                  onFileSelect={handleFileSelect}
                  isLoading={state.isLoading}
                  hasFile={false}
                />
              )}
            </div>

            <ul className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: Zap, label: t('effects.speedUp') },
                { icon: Waves, label: t('effects.slowReverb') },
                { icon: Radio, label: t('effects.8dAudio') },
                { icon: Volume2, label: t('effects.bassBoost') },
              ].map(({ icon: Icon, label }) => (
                <li key={label}>
                  <Badge variant="ghost" className="gap-2">
                    <Icon className="w-4 h-4 text-[rgb(var(--color-accent-text))]" aria-hidden="true" />
                    {label}
                  </Badge>
                </li>
              ))}
            </ul>

            <p className="mt-8 flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              {t('features.private.desc')}
            </p>
          </div>
        </main>

        <footer className="pb-8 text-center">
          <p className="text-xs text-[rgb(var(--color-text-secondary))]">{t('footer.built')}</p>
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------- Workspace
  const metaItems = originalFile
    ? [
        { label: t('track.size'), value: `${(originalFile.size / 1024 / 1024).toFixed(1)} MB` },
        metadata?.bitrate ? { label: t('track.bitrate'), value: `${metadata.bitrate} kbps` } : null,
        metadata?.sampleRate ? { label: t('track.sampleRate'), value: `${(metadata.sampleRate / 1000).toFixed(1)} kHz` } : null,
        metadata?.channels
          ? {
              label: t('track.channels'),
              value: metadata.channels === 1 ? t('track.mono') : metadata.channels === 2 ? t('track.stereo') : `${metadata.channels}ch`,
            }
          : null,
        metadata?.bitDepth ? { label: t('track.bitDepth'), value: `${metadata.bitDepth}-bit` } : null,
      ].filter((item): item is { label: string; value: string } => item !== null)
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <AmbientScene />
      <header className="hud-rail hud-rail-top sticky top-0 z-40 bg-[rgba(var(--color-surface),0.78)] backdrop-blur-xl border-b border-[rgba(var(--color-border),0.5)]">
        <div className="hud-bow">
        <div className="hud-bow-inner mx-auto w-full max-w-[1700px] px-6 sm:px-10 h-16 flex items-center justify-between gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleReset}
                aria-label={t('accessibility.resetApp')}
                className="flex items-center gap-3 min-w-0 ios-button cursor-pointer rounded-full pr-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--color-background))] outline-none"
              >
                <div className="w-9 h-9 rounded-[10px] bg-[url('/favicon.svg')] bg-center bg-cover shrink-0" aria-hidden="true" />
                <span className="font-display lowercase text-xl font-light tracking-[0.04em] text-[rgb(var(--color-text))] hidden sm:inline">
                  {t('app.title')}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('accessibility.resetApp')}</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2">
            <FileUploader
              key={uploadRevision}
              onFileSelect={handleFileSelect}
              isLoading={state.isLoading}
              hasFile
            />
            <SettingsMenu />
          </div>
        </div>
        </div>
      </header>

      {/* Biased upward (bottom padding > top) so content sits in the upper-middle. */}
      <main className="flex-1 mx-auto w-full max-w-[1700px] px-6 sm:px-10 pt-6 sm:pt-8 pb-32 sm:pb-40 flex flex-col gap-8 sm:gap-10 lg:justify-center">
        {errorBanner}

        {originalFile && (
          <div className="space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-normal text-[rgb(var(--color-text))] truncate">
              {originalFile.name}
            </h2>
            {metaItems.length > 0 && (
              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                {metaItems.map((item) => (
                  <div key={item.label}>
                    <dt className="text-[11px] uppercase tracking-wide text-[rgb(var(--color-text-secondary))]">
                      {item.label}
                    </dt>
                    <dd className="text-sm font-medium tabular-nums text-[rgb(var(--color-text))]">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        {/* Cockpit: effects rail | waveform centrepiece | mood rail. */}
        <div className="grid gap-6 lg:gap-12 xl:gap-16 items-start lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)_minmax(280px,340px)]">
          {originalFile && (
            <Card asChild className="hud-frame p-4 sm:p-5 audio-drift-a">
              <aside>
                <EffectControls onChange={handleEffectChange} disabled={state.isExporting} />
              </aside>
            </Card>
          )}

          <section className="min-w-0">
            {stageBuffer && (
              <WaveformTimeline
                buffer={stageBuffer}
                duration={effectiveDuration}
                currentTime={effectiveTime}
                isPlaying={state.isPlaying}
                onSeek={handleSeek}
                options={effectOptions}
              />
            )}
          </section>

          <ThemeRail />
        </div>
      </main>

      {(processedBuffer || originalFile) && (
        <div className="hud-rail hud-rail-bottom sticky bottom-0 z-30 bg-[rgba(var(--color-surface),0.85)] backdrop-blur-xl border-t border-[rgba(var(--color-border),0.5)] shadow-[0_-14px_40px_-28px_rgba(var(--color-accent),0.5)]">
          <div className="hud-bow">
          <div className="hud-bow-inner mx-auto w-full max-w-[1700px] px-6 sm:px-10 py-3">
            <PlaybackControls
              isPlaying={state.isPlaying}
              onPlay={handlePlay}
              onStop={stopAudio}
              onExport={handleExport}
              volume={volume}
              onVolumeChange={updateVolume}
              currentTime={effectiveTime}
              duration={effectiveDuration}
              onSeek={handleSeek}
              hasAudio={hasPlayableAudio}
              canExport={hasPlayableAudio}
              isExporting={state.isExporting}
              disabled={state.isExporting}
              getAnalyser={getAnalyser}
            />
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
