import { useCallback, useEffect, useRef, useState } from 'react';
import { AUDIO_PROCESSING, ERROR_MESSAGES } from '../constants';
import type { AudioProcessingOptions } from '../utils/audioProcessor';
import {
  createEffectChain,
  applyEffectOptions,
  applyEqGains,
  disconnectEffectChain,
  NEUTRAL_OPTIONS,
  type EffectChain,
} from '../utils/effectGraph';
import { EQ_FLAT_GAINS } from '../contexts/eqPresets';
import { getBufferLoudness, type LoudnessProfile } from '../utils/audioLoudness';

export interface PlaybackState {
  isPlaying: boolean;
  playbackTime: number;
  duration: number;
  volume: number;
  repeat: boolean;
  error: string | null;
}

interface UseAudioPlaybackParams {
  getAudioContext: () => AudioContext;
  getBufferDuration: (buffer: AudioBuffer | null) => number;
  getFallbackBuffer: () => AudioBuffer | null;
  onError?: (message: string | null) => void;
}

interface AttachOptions {
  resetPosition?: boolean;
}

/**
 * Manages playback through a live effect graph. Effects are applied in real time:
 * `setEffects` ramps the running graph (DAW-style), and any change is also picked up
 * the next time playback starts. Playback position is tracked in source-buffer time,
 * advancing at the current playback rate so the playhead stays accurate when the
 * speed changes mid-play.
 */
export function useAudioPlayback({
  getAudioContext,
  getBufferDuration,
  getFallbackBuffer,
  onError,
}: UseAudioPlaybackParams) {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    playbackTime: 0,
    duration: 0,
    volume: (() => {
      if (typeof localStorage === 'undefined') return AUDIO_PROCESSING.DEFAULT_VOLUME;
      const stored = localStorage.getItem(AUDIO_PROCESSING.VOLUME_STORAGE_KEY);
      const parsed = stored ? parseFloat(stored) : NaN;
      return Number.isFinite(parsed) ? parsed : AUDIO_PROCESSING.DEFAULT_VOLUME;
    })(),
    repeat: (() => {
      if (typeof localStorage === 'undefined') return false;
      return localStorage.getItem(AUDIO_PROCESSING.REPEAT_STORAGE_KEY) === 'true';
    })(),
    error: null,
  });

  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chainRef = useRef<EffectChain | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const startOffsetRef = useRef<number>(0);
  const playStartTimeRef = useRef<number>(0);
  const activeBufferRef = useRef<AudioBuffer | null>(null);
  const playbackSessionRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const optionsRef = useRef<AudioProcessingOptions>(NEUTRAL_OPTIONS);
  // Listening EQ gains (dB per band). A separate channel from the export options
  // above, so the EQ shapes playback only and never reaches the offline renderer.
  const eqGainsRef = useRef<number[]>(EQ_FLAT_GAINS);
  const rateRef = useRef<number>(1);
  const repeatRef = useRef<boolean>(
    typeof localStorage !== 'undefined' &&
      localStorage.getItem(AUDIO_PROCESSING.REPEAT_STORAGE_KEY) === 'true',
  );
  // Latest playAudio, captured for the onended loop restart without making the
  // callback depend on itself.
  const playAudioRef = useRef<((buffer?: AudioBuffer, startTime?: number) => void) | null>(null);

  const setError = useCallback((message: string | null) => {
    setState((prev) => ({ ...prev, error: message }));
    if (onError) {
      onError(message);
    }
  }, [onError]);

  const captureProgress = useCallback(() => {
    const audioContext = getAudioContext();
    if (!activeBufferRef.current) return startOffsetRef.current;
    const elapsed = Math.max(0, audioContext.currentTime - playStartTimeRef.current);
    const totalDuration = getBufferDuration(activeBufferRef.current);
    return Math.min(startOffsetRef.current + elapsed * rateRef.current, totalDuration);
  }, [getAudioContext, getBufferDuration]);

  const teardownGraph = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      try {
        sourceNodeRef.current.stop();
      } catch {
        // ignore stop errors
      }
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore disconnect errors
      }
      sourceNodeRef.current = null;
    }

    if (chainRef.current) {
      disconnectEffectChain(chainRef.current);
      chainRef.current = null;
    }

    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch {
        // ignore disconnect errors
      }
      gainNodeRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // ignore disconnect errors
      }
      analyserRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    playbackSessionRef.current += 1;
    const nextTime = captureProgress();

    teardownGraph();

    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }

    activeBufferRef.current = null;
    startOffsetRef.current = nextTime;
    isPlayingRef.current = false;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      playbackTime: nextTime,
    }));
  }, [captureProgress, teardownGraph]);

  const attachBuffer = useCallback((buffer: AudioBuffer | null, options: AttachOptions = {}) => {
    activeBufferRef.current = buffer;
    const duration = getBufferDuration(buffer);
    const resetPosition = options.resetPosition ?? false;
    const clampedStart = resetPosition ? 0 : Math.min(startOffsetRef.current, duration);
    startOffsetRef.current = clampedStart;
    setState((prev) => ({
      ...prev,
      duration,
      playbackTime: resetPosition ? 0 : Math.min(prev.playbackTime, duration),
    }));
  }, [getBufferDuration]);

  const playAudio = useCallback((buffer?: AudioBuffer, startTime?: number) => {
    const audioContext = getAudioContext();
    const bufferToPlay = buffer || activeBufferRef.current || getFallbackBuffer();

    if (!bufferToPlay) {
      setError(ERROR_MESSAGES.NO_AUDIO_TO_PLAY);
      return;
    }

    setError(null);

    // Browsers suspend the AudioContext until a user gesture; playback is one.
    if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
      audioContext.resume();
    }

    playbackSessionRef.current += 1;
    const sessionId = playbackSessionRef.current;

    teardownGraph();

    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }

    const totalDuration = getBufferDuration(bufferToPlay);
    // Use provided startTime or current offset (don't depend on state.playbackTime)
    const startAt = Math.max(0, Math.min(startTime ?? startOffsetRef.current, totalDuration));
    startOffsetRef.current = startAt;
    activeBufferRef.current = bufferToPlay;

    // Volume gain is created first so it stays the master/output node.
    const gainNode = audioContext.createGain();
    gainNode.gain.value = state.volume;
    gainNodeRef.current = gainNode;

    const chain = createEffectChain(audioContext);
    chainRef.current = chain;

    const source = audioContext.createBufferSource();
    source.buffer = bufferToPlay;
    source.loop = false;
    const rate = optionsRef.current.speedMultiplier || 1;
    rateRef.current = rate;
    source.playbackRate.value = rate;

    // The analyser tees off the effect chain *before* the volume gain so the live
    // spectrum (and the UI's "breathe with the music" reactivity) tracks the music
    // and its effects, never the user's listening volume. It sits on a parallel
    // branch and doesn't need to reach the destination - an AnalyserNode reads its
    // input whether or not it's connected onward. Optional: skipped when the context
    // can't create one (older engines, tests).
    const analyser =
      typeof audioContext.createAnalyser === 'function' ? audioContext.createAnalyser() : null;
    if (analyser) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
    }
    analyserRef.current = analyser;

    source.connect(chain.input);
    chain.output.connect(gainNode);
    gainNode.connect(audioContext.destination);
    if (analyser) {
      chain.output.connect(analyser);
    }
    applyEffectOptions(chain, optionsRef.current, audioContext, false);
    applyEqGains(chain, eqGainsRef.current, audioContext, false);

    const tick = () => {
      if (playbackSessionRef.current !== sessionId) return;
      if (!activeBufferRef.current || !sourceNodeRef.current) return;
      const elapsed = audioContext.currentTime - playStartTimeRef.current;
      const nextTime = Math.min(startOffsetRef.current + elapsed * rateRef.current, totalDuration);
      setState((prev) => ({ ...prev, playbackTime: nextTime }));
      if (nextTime < totalDuration) {
        playbackRafRef.current = requestAnimationFrame(tick);
      }
    };

    source.onended = () => {
      if (playbackSessionRef.current !== sessionId) return;
      // Repeat: when the track reaches its end, restart from the top with the same
      // buffer and live effects instead of stopping. Manual stops/seeks null this
      // handler before the source ends, so the loop only fires on a natural finish.
      if (repeatRef.current && activeBufferRef.current) {
        startOffsetRef.current = 0;
        playAudioRef.current?.(activeBufferRef.current, 0);
        return;
      }
      isPlayingRef.current = false;
      setState((prev) => ({ ...prev, isPlaying: false, playbackTime: totalDuration }));
      teardownGraph();
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
    };

    playStartTimeRef.current = audioContext.currentTime;
    isPlayingRef.current = true;
    setState((prev) => ({
      ...prev,
      isPlaying: true,
      playbackTime: startAt,
      duration: totalDuration,
    }));
    source.start(0, startAt);
    sourceNodeRef.current = source;
    playbackRafRef.current = requestAnimationFrame(tick);
  }, [getAudioContext, getBufferDuration, getFallbackBuffer, setError, state.volume, teardownGraph]);

  // Keep the ref pointing at the latest playAudio so onended can loop without the
  // callback referencing itself (and without an impossible self-dependency).
  useEffect(() => {
    playAudioRef.current = playAudio;
  }, [playAudio]);

  const stopAudio = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const next = !prev.repeat;
      repeatRef.current = next;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AUDIO_PROCESSING.REPEAT_STORAGE_KEY, next.toString());
      }
      return { ...prev, repeat: next };
    });
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    setState((prev) => ({ ...prev, volume: newVolume }));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUDIO_PROCESSING.VOLUME_STORAGE_KEY, newVolume.toString());
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
  }, []);

  const seekTo = useCallback((time: number, bufferOverride?: AudioBuffer | null) => {
    const buffer = bufferOverride || activeBufferRef.current || getFallbackBuffer();
    const totalDuration = getBufferDuration(buffer);
    if (!buffer || totalDuration <= 0) return;

    const clamped = Math.max(0, Math.min(time, totalDuration));
    activeBufferRef.current = buffer;
    startOffsetRef.current = clamped;
    setState((prev) => ({
      ...prev,
      playbackTime: clamped,
      duration: totalDuration,
    }));

    if (isPlayingRef.current) {
      playAudio(buffer, clamped);
    }
  }, [getBufferDuration, getFallbackBuffer, playAudio]);

  /**
   * Update effects in real time. While playing, parameters ramp on the live graph;
   * a speed change rebases the position clock so the playhead stays accurate. When
   * paused, the new settings simply apply the next time playback starts.
   */
  const setEffects = useCallback((options: AudioProcessingOptions) => {
    optionsRef.current = options;
    const chain = chainRef.current;
    if (!chain || !isPlayingRef.current) return;

    const audioContext = getAudioContext();
    applyEffectOptions(chain, options, audioContext, true);

    const nextRate = options.speedMultiplier || 1;
    if (nextRate !== rateRef.current && sourceNodeRef.current) {
      // Rebase the position clock before switching rate so elapsed time keeps mapping
      // correctly, then glide the source to the new rate.
      startOffsetRef.current = captureProgress();
      playStartTimeRef.current = audioContext.currentTime;
      rateRef.current = nextRate;
      const param = sourceNodeRef.current.playbackRate;
      if (typeof param.setTargetAtTime === 'function') {
        param.setTargetAtTime(nextRate, audioContext.currentTime, 0.04);
      } else {
        param.value = nextRate;
      }
    }
  }, [captureProgress, getAudioContext]);

  /**
   * Update the listening EQ in real time. While playing, every band ramps on the
   * live graph; otherwise the gains apply the next time playback starts. Export is
   * unaffected - the EQ lives entirely on the playback graph.
   */
  const setEq = useCallback((gains: number[]) => {
    eqGainsRef.current = gains;
    const chain = chainRef.current;
    if (!chain || !isPlayingRef.current) return;
    applyEqGains(chain, gains, getAudioContext(), true);
  }, [getAudioContext]);

  const resetPlayback = useCallback(() => {
    stopPlayback();
    startOffsetRef.current = 0;
    activeBufferRef.current = null;
    optionsRef.current = NEUTRAL_OPTIONS;
    rateRef.current = 1;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      playbackTime: 0,
      duration: 0,
      error: null,
    }));
  }, [stopPlayback]);

  // Cleanup on unmount - stop playback
  useEffect(() => {
    return () => {
      playbackSessionRef.current += 1;
      teardownGraph();
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      activeBufferRef.current = null;
      isPlayingRef.current = false;
    };
  }, [teardownGraph]);

  // Live analyser node for visualisations; null while stopped.
  const getAnalyser = useCallback(() => analyserRef.current, []);

  // The active track's loudness profile (peak + gated integrated RMS), or null when
  // nothing is attached. Lets reactive visuals calibrate their intensity to each
  // song's loudness and headroom instead of fixed constants. Measured once per
  // buffer and cached.
  const getLoudness = useCallback((): LoudnessProfile | null => {
    const buffer = activeBufferRef.current;
    return buffer ? getBufferLoudness(buffer) : null;
  }, []);

  return {
    state,
    playAudio,
    stopAudio,
    seekTo,
    updateVolume,
    toggleRepeat,
    setEffects,
    setEq,
    attachBuffer,
    resetPlayback,
    getAnalyser,
    getLoudness,
  };
}
