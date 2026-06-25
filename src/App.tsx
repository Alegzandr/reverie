import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Waves, Radio, Volume2, ShieldCheck } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { EffectControls } from './components/EffectControls';
import type { EffectSettings } from './components/EffectControls';
import { PlaybackControls } from './components/PlaybackControls';
import { ProgressBar } from './components/ProgressBar';
import { SettingsMenu } from './components/SettingsMenu';
import { WaveformTimeline } from './components/WaveformTimeline';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from './components/ui/tooltip';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { EFFECT_EXPORT_LABELS } from './constants';
import type { AudioProcessingOptions } from './utils/audioProcessor';

const toOptions = (s: EffectSettings): AudioProcessingOptions => ({
  speedMultiplier: s.speedMultiplier,
  reverbAmount: s.reverbAmount,
  preservePitch: false,
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
  } = useAudioProcessor();

  // Update document meta tags when language changes
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

  const [effectSettings, setEffectSettings] = useState<EffectSettings>({
    mode: 'speed-up',
    speedMultiplier: 1.2,
    reverbAmount: 0,
  });
  // Drives both the live graph and the waveform's effect preview.
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
    if (originalBuffer) playAudio(originalBuffer, playbackTime);
    else if (processedBuffer) playAudio(processedBuffer, playbackTime);
  }, [playAudio, originalBuffer, processedBuffer, playbackTime]);

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
      const baseName = originalFile ? originalFile.name.replace(/\.[^/.]+$/, '') : 'track';
      // Use English-only labels for filenames (not translated)
      const fxLabel = EFFECT_EXPORT_LABELS[effectSettings.mode];
      await exportProcessedAudio({ filename: baseName, effectLabel: fxLabel });
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [exportProcessedAudio, originalFile, effectSettings.mode]);

  const hasSession = !!(originalFile || originalBuffer || processedBuffer);
  const stageBuffer = originalBuffer || processedBuffer;

  const errorBanner = state.error ? (
    <div role="alert" className="rounded-2xl px-4 py-3 border border-[rgba(var(--color-accent),0.4)] bg-[rgba(var(--color-accent),0.1)]">
      <p className="text-sm font-medium text-[rgb(var(--color-text))]">{state.error}</p>
    </div>
  ) : null;

  // ---------------------------------------------------------------- Welcome
  if (!hasSession) {
    return (
      <div className="min-h-screen flex flex-col">
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
                    <Icon className="w-4 h-4 text-[rgb(var(--color-accent))]" aria-hidden="true" />
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
      {/* Header / toolbar */}
      <header className="sticky top-0 z-40 bg-[rgba(var(--color-surface),0.78)] backdrop-blur-xl border-b border-[rgba(var(--color-border),0.5)]">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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
      </header>

      {/* Working area */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {errorBanner}

        {originalFile && (
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-normal text-[rgb(var(--color-text))] truncate">
              {originalFile.name}
            </h2>
            {metaItems.length > 0 && (
              <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
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

        <div className="grid gap-6 items-start lg:grid-cols-[minmax(320px,360px)_1fr]">
          {/* Control panel — the machinery, grouped on one glass surface */}
          {originalFile && (
            <Card asChild className="p-5 sm:p-6">
              <aside className="flex flex-col gap-6">
                {/* Effects are live: moving a control reshapes the sound as it plays. */}
                <EffectControls onChange={handleEffectChange} disabled={state.isExporting} />
              </aside>
            </Card>
          )}

          {/* Stage — the waveform centerpiece */}
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
        </div>
      </main>

      {/* Transport bar */}
      {(processedBuffer || originalFile) && (
        <div className="sticky bottom-0 z-30 bg-[rgba(var(--color-surface),0.85)] backdrop-blur-xl border-t border-[rgba(var(--color-border),0.5)] shadow-[0_-14px_40px_-28px_rgba(var(--color-accent),0.5)]">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-3">
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
              hasAudio={!!(processedBuffer || originalBuffer)}
              canExport={!!(originalBuffer || processedBuffer)}
              isExporting={state.isExporting}
              disabled={state.isExporting}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
