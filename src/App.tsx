import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUploader } from './components/FileUploader';
import { FileDropOverlay, type DropIntent } from './components/FileDropOverlay';
import { EffectControls } from './components/EffectControls';
import type { EffectSettings } from './components/EffectControls';
import { PlaybackControls } from './components/PlaybackControls';
import { SettingsMenu } from './components/SettingsMenu';
import { FullscreenButton } from './components/FullscreenButton';
import { AmbientScene } from './components/AmbientScene';
import { DesktopOnlyGate } from './components/DesktopOnlyGate';
import { useIsViewportTooNarrow } from './hooks/useViewportGate';
import { WaveformTimeline } from './components/WaveformTimeline';
import { ScrollFade } from './components/ScrollFade';
import { Logo } from './components/Logo';
import { WelcomeScreen } from './components/WelcomeScreen';
import { WorldSwitcher } from './components/WorldSwitcher';
import { NowPlaying } from './components/NowPlaying';
import { PlaylistPanel } from './components/playlist/PlaylistPanel';
import { Tooltip, TooltipTrigger, TooltipContent } from './components/ui/tooltip';
import { provideWorldAnalyser } from './components/scenes/world/analyserSource';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import type { AudioMetadata } from './hooks/useAudioFile';
import { useAudioReactivity } from './hooks/useAudioReactivity';
import { usePlaylist } from './hooks/usePlaylist';
import { usePlaylistPlayer } from './hooks/usePlaylistPlayer';
import { useMediaSession } from './hooks/useMediaSession';
import { useUiRest } from './hooks/useUiRest';
import { useFullscreenAutoHide } from './hooks/useFullscreenAutoHide';
import { useEq } from './contexts/EqContext';
import { EFFECT_EXPORT_LABELS, EFFECT_DEFAULTS, AUDIO_PROCESSING } from './constants';
import type { AudioProcessingOptions } from './utils/audioProcessor';
import { stripExtension } from './utils/playlistModel';
import { prefersReducedMotion } from './components/scenes/motion';

/** Length of the session power-on choreography (keep in step with `.cockpit-boot`). */
const SESSION_BOOT_MS = 1500;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

const toOptions = (s: EffectSettings): AudioProcessingOptions => ({
  speedMultiplier: s.speedMultiplier,
  reverbAmount: s.reverbAmount,
  audio8D: s.mode === '8d-audio',
  rotationSpeed: s.rotationSpeed,
  bassBoost: s.mode === 'bass-boost',
  bassBoostIntensity: s.bassBoostIntensity,
  bassUnderwater: s.bassUnderwater,
  // Nightcore beat bed is a Speed Up sub-option; the detected tempo is folded in
  // downstream (useAudioProcessor.setEffects), so it isn't carried here.
  enableBeats: s.mode === 'speed-up' && !!s.enableBeats,
  beatsVolume: s.beatsVolume,
});

/**
 * Format telemetry for the now-playing card (FLAC · 44.1 kHz · 24-bit ...).
 * Memoised so the strings aren't rebuilt on every render.
 */
function useTrackDetails(originalFile: File | null, metadata: AudioMetadata | null) {
  const { t } = useTranslation();
  return useMemo(() => {
    if (!originalFile) return [];
    const ext = originalFile.name.match(/\.([^/.]+)$/)?.[1];
    const channels = metadata?.channels
      ? metadata.channels === 1
        ? t('track.mono')
        : metadata.channels === 2
          ? t('track.stereo')
          : `${metadata.channels}ch`
      : null;
    return [
      ext ? ext.toUpperCase() : null,
      metadata?.sampleRate ? `${(metadata.sampleRate / 1000).toFixed(1)} kHz` : null,
      metadata?.bitDepth ? `${metadata.bitDepth}-bit` : null,
      metadata?.bitrate ? `${metadata.bitrate} kbps` : null,
      channels,
      `${(originalFile.size / 1024 / 1024).toFixed(1)} MB`,
    ].filter((d): d is string => d !== null);
  }, [originalFile, metadata, t]);
}

/** Keys the global handlers must leave alone: typing, and controls that own their keys. */
function yieldsKeys(target: HTMLElement | null): boolean {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function App() {
  const { t, i18n } = useTranslation();

  // The playlist advances when a song ends on its own. The engine needs that
  // callback before the player (which needs the engine) exists, so it goes
  // through a stable trampoline set once the player is up.
  const trackEndRef = useRef<() => void>(() => {});
  const onTrackEnd = useCallback(() => trackEndRef.current(), []);

  const {
    state,
    originalFile,
    originalBuffer,
    processedBuffer,
    playbackClock,
    duration,
    volume,
    repeat,
    detectedBpm,
    detectedMeter,
    metadata,
    loadAudioFile,
    setEffects,
    setEq,
    playAudio,
    stopAudio,
    exportProcessedAudio,
    updateVolume,
    seekTo,
    toggleRepeat,
    reset,
    getAnalyser,
    getLoudness,
  } = useAudioProcessor({ onTrackEnd });

  const hasSession = !!(originalFile || originalBuffer || processedBuffer);
  const playlist = usePlaylist();
  const player = usePlaylistPlayer(playlist, {
    isPlaying: state.isPlaying,
    repeat,
    hasSession,
    playbackClock,
    duration,
    loadAudioFile,
    playAudio,
    seekTo,
  });
  useEffect(() => {
    trackEndRef.current = player.handleTrackEnd;
  }, [player.handleTrackEnd]);

  // The living world, mounted at the root, hears the music through this.
  useEffect(() => {
    provideWorldAnalyser(getAnalyser);
    return () => provideWorldAnalyser(null);
  }, [getAnalyser]);

  // Listening EQ: a comfort setting kept in its own context (and localStorage).
  // Pushed to the playback graph whenever it changes - never touches the export.
  const { gains: eqGains } = useEq();
  useEffect(() => {
    setEq(eqGains);
  }, [eqGains, setEq]);

  // Desktop-only: narrow viewports are gated (no bypass). Live on resize.
  const viewportTooNarrow = useIsViewportTooNarrow();

  // The interface breathes with the music: live audio-energy CSS vars.
  useAudioReactivity({ getAnalyser, getLoudness, isPlaying: state.isPlaying });

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

  // Source of truth for the live effect settings, passed back as
  // `initialSettings` so a remount restores them instead of the defaults.
  const [effectSettings, setEffectSettings] = useState<EffectSettings>({
    mode: 'slow-reverb',
    speedMultiplier: EFFECT_DEFAULTS.SLOW_REVERB.SPEED_DEFAULT,
    reverbAmount: EFFECT_DEFAULTS.SLOW_REVERB.REVERB_DEFAULT,
  });
  const effectOptions = useMemo(() => toOptions(effectSettings), [effectSettings]);

  const [uploadRevision, setUploadRevision] = useState(0);

  const { addFiles } = player;
  const handleFilesSelect = useCallback((files: File[]) => addFiles(files, 'append'), [addFiles]);
  const handleFilesDrop = useCallback(
    (files: File[], intent: DropIntent) => addFiles(files, intent === 'play' ? 'play' : 'append'),
    [addFiles],
  );

  const { setActive } = playlist;
  const handleReset = useCallback(() => {
    reset();
    setActive(null);
    setUploadRevision((n) => n + 1);
  }, [reset, setActive]);

  const handleEffectChange = useCallback(
    (settings: EffectSettings) => {
      setEffectSettings(settings);
      // Apply live: ramps the playing graph, and is remembered for the next play.
      setEffects(toOptions(settings));
    },
    [setEffects]
  );

  const handlePlay = useCallback(() => {
    // At the end of the track, play starts over. The position lives in the
    // playback clock (an external store), so reading it here costs nothing.
    const time = playbackClock.get();
    const startAt = duration > 0 && time >= duration ? 0 : time;
    if (originalBuffer) playAudio(originalBuffer, startAt);
    else if (processedBuffer) playAudio(processedBuffer, startAt);
  }, [playAudio, playbackClock, originalBuffer, processedBuffer, duration]);

  const hasPlayableAudio = !!(originalBuffer || processedBuffer);

  const handleTogglePlay = useCallback(() => {
    if (state.isPlaying) stopAudio();
    else handlePlay();
  }, [state.isPlaying, stopAudio, handlePlay]);

  const { next, previous, playTrack } = player;
  const handlePlayTrack = useCallback((id: string) => void playTrack(id, { autoplay: true }), [playTrack]);

  // Spacebar toggles play/pause, like a classic media player. Ignored while
  // typing or on a keyboard-focused control space already acts on. Buttons only
  // keep space when focused by keyboard (:focus-visible): a mouse click leaves
  // residual focus on the last button pressed, and letting it swallow space made
  // the key re-trigger that button instead of the transport.
  useEffect(() => {
    if (!hasPlayableAudio || state.isExporting) return;

    const isKeyboardFocused = (el: HTMLElement) => {
      try {
        return el.matches(':focus-visible');
      } catch {
        // Selector unsupported (older jsdom): let the focused control handle it.
        return true;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const target = e.target as HTMLElement | null;
      if (yieldsKeys(target)) return;
      if (
        target &&
        (target.tagName === 'BUTTON' || target.closest('button, [role="button"]')) &&
        isKeyboardFocused(target)
      ) {
        return;
      }
      e.preventDefault();
      handleTogglePlay();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasPlayableAudio, state.isExporting, handleTogglePlay]);

  // Speed changes the listening length (3:00 at 0.5x lasts 6:00): the transport
  // speaks in effective time, while the engine tracks source-buffer time. The
  // position flows through a derived clock, so the 60fps tick never re-renders App.
  const playbackRate = effectSettings.speedMultiplier || 1;
  const effectiveDuration = playbackRate > 0 ? duration / playbackRate : duration;
  const effectiveClock = useMemo(
    () => ({
      get: () => (playbackRate > 0 ? playbackClock.get() / playbackRate : playbackClock.get()),
      subscribe: playbackClock.subscribe,
    }),
    [playbackClock, playbackRate]
  );

  const handleSeek = useCallback(
    (time: number) => {
      // The UI seeks in effective time; convert back to source time for the engine.
      seekTo(time * playbackRate);
    },
    [seekTo, playbackRate]
  );

  // Arrow-key transport: left/right nudge the playhead, up/down the volume, and
  // Shift+left/right step through the playlist; media keys do what they say.
  // Yields to fields, native sliders, menus, and lists that walk with arrows
  // themselves (the playlist marks itself data-own-arrows).
  useEffect(() => {
    if (!hasPlayableAudio || state.isExporting) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === 'MediaTrackNext') {
        next();
        return;
      }
      if (key === 'MediaTrackPrevious') {
        previous();
        return;
      }
      if (key === 'MediaPlayPause') {
        handleTogglePlay();
        return;
      }
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') return;
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.closest('input, textarea, select, [role="slider"], [role="listbox"], [role="menu"], [role="combobox"], [data-own-arrows]')
      ) {
        return;
      }

      e.preventDefault();
      if (e.shiftKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
        if (key === 'ArrowRight') next();
        else previous();
      } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const step = key === 'ArrowRight' ? AUDIO_PROCESSING.SEEK_STEP_SECONDS : -AUDIO_PROCESSING.SEEK_STEP_SECONDS;
        handleSeek(Math.max(0, Math.min(effectiveDuration, effectiveClock.get() + step)));
      } else {
        const step = key === 'ArrowUp' ? AUDIO_PROCESSING.VOLUME_STEP : -AUDIO_PROCESSING.VOLUME_STEP;
        updateVolume(round2(clamp01(volume + step)));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasPlayableAudio, state.isExporting, effectiveClock, effectiveDuration, handleSeek, volume, updateVolume, next, previous, handleTogglePlay]);

  // What's playing, as the playlist knows it (tags, artwork) - falling back to
  // the loaded file for a track that was removed from the list mid-listen.
  const activeTrack = playlist.activeIndex >= 0 ? playlist.tracks[playlist.activeIndex] : null;
  const title = activeTrack?.title ?? (originalFile ? stripExtension(originalFile.name) : '');
  const artist = activeTrack?.artist ?? null;
  const cover = activeTrack?.cover ?? null;
  const details = useTrackDetails(originalFile, metadata);
  const upNext = useMemo(() => {
    if (repeat === 'one') return null;
    const id = playlist.upcomingId ?? (repeat === 'all' && !playlist.shuffle ? playlist.tracks[0]?.id : null);
    return playlist.tracks.find((tr) => tr.id === id && tr.id !== playlist.activeId) ?? null;
  }, [repeat, playlist.upcomingId, playlist.shuffle, playlist.tracks, playlist.activeId]);
  const hasNext = playlist.upcomingId !== null || (repeat !== 'off' && playlist.tracks.length > 0);

  useMediaSession({
    title: hasSession ? title : null,
    artist,
    cover,
    isPlaying: state.isPlaying,
    onPlay: handlePlay,
    onPause: stopAudio,
    onNext: next,
    onPrevious: previous,
  });

  const handleExport = useCallback(async () => {
    try {
      // Pause first so the offline render isn't fighting the live graph.
      if (state.isPlaying) stopAudio();
      const baseName = originalFile ? originalFile.name.replace(/\.[^/.]+$/, '') : 'track';
      // English-only labels for filenames (not translated)
      const fxLabel = EFFECT_EXPORT_LABELS[effectSettings.mode];
      await exportProcessedAudio({ filename: baseName, effectLabel: fxLabel });
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [exportProcessedAudio, originalFile, effectSettings.mode, state.isPlaying, stopAudio]);

  const resting = useUiRest(state.isPlaying && hasSession);

  // Session power-on: entering a session brings the interface in once (see
  // `.cockpit-boot` in index.css). Toggled straight on the shell element - no
  // state, no re-render - never under reduced motion, removed once it's done.
  const shellRef = useRef<HTMLDivElement | null>(null);
  const hadSessionRef = useRef(false);
  useEffect(() => {
    const had = hadSessionRef.current;
    hadSessionRef.current = hasSession;
    if (had || !hasSession || prefersReducedMotion()) return;
    const shell = shellRef.current;
    if (!shell) return;
    shell.classList.add('cockpit-boot');
    const off = window.setTimeout(() => shell.classList.remove('cockpit-boot'), SESSION_BOOT_MS);
    return () => {
      window.clearTimeout(off);
      shell.classList.remove('cockpit-boot');
    };
  }, [hasSession]);

  // Fullscreen is for listening: idle panels fade away and leave the scene alone.
  // Gated on the workspace actually being mounted (the shell ref must be live).
  useFullscreenAutoHide(shellRef, hasSession && !viewportTooNarrow && !player.booting);

  const errorBanner = state.error ? (
    <div role="alert" className="rounded-2xl border border-[rgba(var(--color-accent),0.4)] bg-[rgba(var(--color-accent),0.12)] px-4 py-3 backdrop-blur-md">
      <p className="text-sm font-medium text-[rgb(var(--color-text))]">{state.error}</p>
    </div>
  ) : null;

  const resumeId = playlist.resumeSession?.activeId ?? playlist.tracks[0]?.id ?? null;
  const handleResume = useCallback(() => {
    if (resumeId) void playTrack(resumeId, { autoplay: false });
  }, [playTrack, resumeId]);

  let stage;
  if (viewportTooNarrow) {
    stage = <DesktopOnlyGate />;
  } else if (player.booting) {
    // Reading the stored playlist / decoding the last track: the world alone,
    // for the half-second it takes - never a flash of the welcome stage.
    stage = <div className="boot-veil" aria-busy="true" />;
  } else if (!hasSession) {
    stage = (
      <WelcomeScreen
        onFilesSelect={handleFilesSelect}
        isLoading={state.isLoading}
        progress={state.progress}
        uploadRevision={uploadRevision}
        errorBanner={errorBanner}
        playlistCount={playlist.tracks.length}
        onResume={handleResume}
      />
    );
  } else {
    stage = (
      <div ref={shellRef} className={`app-shell${resting ? ' is-resting' : ''}`}>
        <FileDropOverlay onFilesDrop={handleFilesDrop} disabled={state.isExporting} />

        <header className="top-bar">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleReset}
                aria-label={t('accessibility.resetApp')}
                className="ios-button flex min-w-0 items-center gap-3 rounded-full pr-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Logo className="h-9 w-9 shrink-0 rounded-[10px]" />
                <span className="wordmark hidden text-lg sm:inline">
                  {t('app.title')}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('accessibility.resetApp')}</TooltipContent>
          </Tooltip>

          <WorldSwitcher className="justify-self-center" />

          <div className="flex items-center justify-end gap-2">
            <FileUploader key={uploadRevision} onFilesSelect={handleFilesSelect} isLoading={state.isLoading} hasFile />
            <FullscreenButton />
            <SettingsMenu />
          </div>
        </header>

        <main className="stage-grid">
          <div className="console console-left">
            <aside className="pane recede flex min-h-0 flex-col" aria-label={t('studio.effects')}>
              <ScrollFade className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                <EffectControls onChange={handleEffectChange} disabled={state.isExporting} initialSettings={effectSettings} />
              </ScrollFade>
            </aside>
          </div>

          <section className="stage-center" aria-label={t('track.title')}>
            {errorBanner}
            <NowPlaying
              title={title}
              artist={artist}
              cover={cover}
              details={details}
              position={playlist.activeIndex >= 0 ? playlist.activeIndex + 1 : null}
              total={playlist.tracks.length}
              upNext={upNext}
              clock={effectiveClock}
              duration={effectiveDuration}
            />
            {(originalBuffer || processedBuffer) && (
              <div className="stage-wave">
                <WaveformTimeline
                  buffer={originalBuffer || processedBuffer}
                  duration={effectiveDuration}
                  clock={effectiveClock}
                  isPlaying={state.isPlaying}
                  onSeek={handleSeek}
                  options={effectOptions}
                  getAnalyser={getAnalyser}
                  detectedBpm={detectedBpm}
                  detectedMeter={detectedMeter}
                />
              </div>
            )}
          </section>

          <div className="console console-right">
            <aside className="pane recede flex min-h-0 flex-col" aria-label={t('playlist.title')}>
              <PlaylistPanel
                tracks={playlist.tracks}
                activeId={playlist.activeId}
                isPlaying={state.isPlaying}
                clock={effectiveClock}
                duration={effectiveDuration}
                storageError={playlist.storageError}
                onPlay={handlePlayTrack}
                onRemove={playlist.removeTrack}
                onMove={playlist.moveTrack}
                onClear={playlist.clear}
                onAddFiles={handleFilesSelect}
              />
            </aside>
          </div>
        </main>

        <footer className="dock-wrap">
          <div className="dock">
            <PlaybackControls
              isPlaying={state.isPlaying}
              onPlay={handlePlay}
              onStop={stopAudio}
              onExport={handleExport}
              repeat={repeat}
              onToggleRepeat={toggleRepeat}
              shuffle={playlist.shuffle}
              onToggleShuffle={playlist.toggleShuffle}
              onPrevious={previous}
              onNext={next}
              hasPrevious={hasPlayableAudio}
              hasNext={hasNext}
              volume={volume}
              onVolumeChange={updateVolume}
              clock={effectiveClock}
              duration={effectiveDuration}
              onSeek={handleSeek}
              hasAudio={hasPlayableAudio}
              canExport={hasPlayableAudio}
              isExporting={state.isExporting}
              disabled={state.isExporting}
              getAnalyser={getAnalyser}
            />
          </div>
        </footer>
      </div>
    );
  }

  return (
    <>
      <AmbientScene />
      {stage}
    </>
  );
}

export default App;
