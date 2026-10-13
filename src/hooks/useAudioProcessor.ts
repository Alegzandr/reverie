import { useCallback, useMemo, useRef, useState } from 'react';
import { audioProcessor } from '../utils/audioProcessor';
import type { AudioProcessingOptions } from '../utils/audioProcessor';
import { NEUTRAL_OPTIONS, isNeutralOptions } from '../utils/effectGraph';
import { ERROR_MESSAGES } from '../constants';
import { detectTempo, type TempoEstimate } from '../utils/tempo';
import { loadBeatSamples } from '../utils/beatSamples';
import { useAudioFile } from './useAudioFile';
import { useAudioPlayback } from './useAudioPlayback';
import { useAudioExport } from './useAudioExport';
import { peekBeatGrid } from '../utils/beatGridStore';

export interface ProcessingState {
  isLoading: boolean;
  isProcessing: boolean;
  isExporting: boolean;
  isPlaying: boolean;
  progress: number;
  error: string | null;
}

/**
 * Orchestrates audio file management, real-time playback, and export.
 *
 * Effects are applied live: `setEffects` ramps the playing graph and is remembered
 * for the next play and for export. Export renders the current settings offline on
 * demand, so there is no separate "apply/bake" step in the UI.
 */
interface UseAudioProcessorOptions {
  /** A track played out to its natural end (repeat-one aside) - the playlist advances on it. */
  onTrackEnd?: () => void;
}

export function useAudioProcessor({ onTrackEnd }: UseAudioProcessorOptions = {}) {
  const [error, setError] = useState<string | null>(null);
  // Mirrors useAudioFile's own guard: a superseded load must not attach its buffer.
  const loadSeqRef = useRef(0);
  const optionsRef = useRef<AudioProcessingOptions>(NEUTRAL_OPTIONS);
  const renderedRef = useRef<AudioBuffer | null>(null);
  // The track the UI has committed (what's shown, played and named). Export renders
  // this explicitly instead of the processor's latest decode, which can briefly
  // belong to a track still loading.
  const committedSourceRef = useRef<AudioBuffer | null>(null);
  // One export at a time: a second click while the render runs joins the first.
  const exportInFlightRef = useRef<Promise<string> | null>(null);
  // Covers the offline render, which runs before useAudioExport flags isExporting,
  // so the export button is disabled from the very first click.
  const [isRendering, setIsRendering] = useState(false);
  // Detected tempo for the Nightcore beat grid. There is no BPM in the source files,
  // so it's measured once per track on load (see detectTempo) and injected into every
  // effect update, so both live playback and the export share one grid. Kept in a ref
  // for the synchronous injection below and mirrored to state for the UI readout.
  const tempoRef = useRef<TempoEstimate | null>(null);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [detectedMeter, setDetectedMeter] = useState<TempoEstimate['beatsPerBar'] | null>(null);

  const {
    state: fileState,
    originalFile,
    originalBuffer,
    processedBuffer,
    metadata,
    loadAudioFile: loadFile,
    processAudio: processFile,
    reset: resetFile,
    getBufferDuration,
  } = useAudioFile();

  const getPlaybackBuffer = useCallback(
    () => processedBuffer || originalBuffer || audioProcessor.getAudioBuffer(),
    [processedBuffer, originalBuffer],
  );

  // Stable accessor: a fresh inline arrow here would change identity every render,
  // which cascades through useAudioPlayback's memoised callbacks (captureProgress →
  // setEffects) into App's handleEffectChange. EffectControls lists that onChange in
  // a useEffect dependency array, so an unstable identity re-runs the effect every
  // render - an infinite re-render loop in the editor (only visible once a dialog
  // injects a synchronous setState into the storm: "Maximum update depth exceeded").
  const getAudioContext = useCallback(() => audioProcessor.getAudioContext(), []);

  const {
    state: playbackState,
    playbackClock,
    playAudio,
    stopAudio,
    seekTo,
    updateVolume,
    toggleRepeat,
    setEffects: setPlaybackEffects,
    setEq,
    attachBuffer,
    resetPlayback,
    getAnalyser,
    getLoudness,
    getBeatGrid,
  } = useAudioPlayback({
    getAudioContext,
    getBufferDuration,
    getFallbackBuffer: getPlaybackBuffer,
    onError: setError,
    onTrackEnd,
  });

  // Stable per processed buffer: an inline arrow would re-create runExport, and
  // with it exportProcessedAudio and App's handleExport, on every render.
  const getExportBuffer = useCallback(
    () => renderedRef.current ?? processedBuffer,
    [processedBuffer],
  );

  const {
    state: exportState,
    exportProcessedAudio: runExport,
    resetExport,
  } = useAudioExport({
    getBuffer: getExportBuffer,
    originalFile,
    metadata,
    getBufferDuration,
    sourceDurationSeconds: originalBuffer ? getBufferDuration(originalBuffer) : undefined,
    onError: setError,
  });

  const combinedError = useMemo(
    () => error ?? fileState.error ?? playbackState.error ?? exportState.error ?? null,
    [error, fileState.error, playbackState.error, exportState.error],
  );

  const loadAudioFile = useCallback(async (file: File) => {
    const seq = ++loadSeqRef.current;
    setError(null);
    stopAudio();
    renderedRef.current = null;
    const buffer = await loadFile(file);
    if (seq !== loadSeqRef.current) return undefined;
    // A failed load keeps the previous track committed (useAudioFile keeps its
    // file and metadata too), so export stays consistent with what's shown.
    if (buffer) committedSourceRef.current = buffer;
    const nextBuffer = buffer || audioProcessor.getAudioBuffer();
    attachBuffer(nextBuffer, { resetPosition: true });
    // Warm the Nightcore sample cache now (fire-and-forget) so enabling the beats - or
    // pressing play with them already on - never races a cold fetch/decode and drops
    // the first hits. The cache is app-wide, so this runs once; a failure is the
    // scheduler's silent-bed concern, not this load's.
    void loadBeatSamples(audioProcessor.getAudioContext()).catch(() => {});
    // Start the worlds' beat analysis now (in a worker) so the grid is ready by the first beats.
    if (nextBuffer) peekBeatGrid(nextBuffer);
    // Measure the track's tempo once so the Nightcore grid has a BPM to lock to.
    // Cheap (a few ms) and cached per buffer; failure just leaves the fallback tempo.
    if (nextBuffer) {
      try {
        const tempo = detectTempo(nextBuffer);
        tempoRef.current = tempo;
        setDetectedBpm(Math.round(tempo.bpm));
        setDetectedMeter(tempo.beatsPerBar);
      } catch {
        tempoRef.current = null;
        setDetectedBpm(null);
        setDetectedMeter(null);
      }
    } else {
      tempoRef.current = null;
      setDetectedBpm(null);
      setDetectedMeter(null);
    }
    return buffer;
  }, [attachBuffer, loadFile, stopAudio]);

  // Apply effects in real time and remember them for the next play and for export.
  // The per-track tempo is folded in here (not in the UI) so EffectControls stays
  // tempo-agnostic and both the live graph and the offline export see one grid.
  const setEffects = useCallback((options: AudioProcessingOptions) => {
    const withTempo: AudioProcessingOptions = tempoRef.current
      ? {
          ...options,
          bpm: tempoRef.current.bpm,
          beatOffsetSec: tempoRef.current.beatOffsetSec,
          beatsPerBar: tempoRef.current.beatsPerBar,
        }
      : options;
    optionsRef.current = withTempo;
    renderedRef.current = null; // settings changed; any cached render is stale
    setPlaybackEffects(withTempo);
  }, [setPlaybackEffects]);

  // Kept for the offline pipeline/tests; the UI no longer bakes a processed track.
  const processAudio = useCallback(async (options: AudioProcessingOptions) => {
    setError(null);
    stopAudio();
    const buffer = await processFile(options);
    attachBuffer(buffer, { resetPosition: true });
    return buffer;
  }, [attachBuffer, processFile, stopAudio]);

  // Render the current effect settings offline, then export the result.
  const exportProcessedAudio = useCallback((arg?: string | { filename?: string; effectLabel?: string }) => {
    if (exportInFlightRef.current) return exportInFlightRef.current;

    const run = async (): Promise<string> => {
      const source = committedSourceRef.current;
      if (source) {
        const options = optionsRef.current;
        try {
          renderedRef.current = await audioProcessor.processAudio(options, source);
        } catch (renderError) {
          // Shipping the dry source is only honest when no effect was asked for;
          // otherwise the listener would get a file that silently lacks them.
          if (!isNeutralOptions(options)) {
            setError(ERROR_MESSAGES.PROCESS_FAILED);
            throw renderError instanceof Error ? renderError : new Error(ERROR_MESSAGES.PROCESS_FAILED);
          }
          renderedRef.current = source;
        }
      }
      // Free the full rendered buffer (can be tens of MB) once the encode settles;
      // `return await` keeps it captured for the whole encode, the next export
      // re-renders anyway. The error still propagates after the finally.
      try {
        return await runExport(arg);
      } finally {
        renderedRef.current = null;
      }
    };

    setIsRendering(true);
    const pending = run().finally(() => {
      exportInFlightRef.current = null;
      setIsRendering(false);
    });
    exportInFlightRef.current = pending;
    return pending;
  }, [runExport]);

  const reset = useCallback(() => {
    // Invalidate in-flight loads at every layer, or a decode landing after the
    // reset would re-attach a track to the session the listener just closed.
    loadSeqRef.current++;
    audioProcessor.clear();
    committedSourceRef.current = null;
    stopAudio();
    resetFile();
    resetPlayback();
    resetExport();
    optionsRef.current = NEUTRAL_OPTIONS;
    renderedRef.current = null;
    tempoRef.current = null;
    setDetectedBpm(null);
    setDetectedMeter(null);
    setError(null);
  }, [resetExport, resetFile, resetPlayback, stopAudio]);

  return {
    state: {
      isLoading: fileState.isLoading,
      isProcessing: fileState.isProcessing,
      isExporting: exportState.isExporting || isRendering,
      isPlaying: playbackState.isPlaying,
      progress: fileState.progress,
      error: combinedError,
    } as ProcessingState,
    originalFile,
    originalBuffer,
    processedBuffer,
    // Playhead position store - read/subscribe without per-frame re-renders.
    playbackClock,
    duration: playbackState.duration,
    volume: playbackState.volume,
    repeat: playbackState.repeat,
    /** Auto-detected tempo (rounded BPM) of the loaded track, or null. */
    detectedBpm,
    /** Auto-detected meter (3 or 4 beats per bar) of the loaded track, or null. */
    detectedMeter,
    metadata,
    loadAudioFile,
    processAudio,
    setEffects,
    // Listening EQ - playback-only, never baked into exports, so it bypasses the
    // optionsRef/render-cache plumbing that setEffects needs.
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
    getBeatGrid,
  };
}
