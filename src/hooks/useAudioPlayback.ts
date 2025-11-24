import { useCallback, useEffect, useRef, useState } from 'react';
import { AUDIO_PROCESSING, ERROR_MESSAGES } from '../constants';

export interface PlaybackState {
  isPlaying: boolean;
  playbackTime: number;
  duration: number;
  volume: number;
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
 * Hook for managing audio playback, seeking, and volume control
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
    error: null,
  });

  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const startOffsetRef = useRef<number>(0);
  const playStartTimeRef = useRef<number>(0);
  const activeBufferRef = useRef<AudioBuffer | null>(null);
  const playbackSessionRef = useRef<number>(0);

  const setError = useCallback((message: string | null) => {
    setState((prev) => ({ ...prev, error: message }));
    if (onError) {
      onError(message);
    }
  }, [onError]);

  const captureProgress = useCallback(() => {
    const audioContext = getAudioContext();
    if (!activeBufferRef.current) return state.playbackTime;
    const elapsed = Math.max(0, audioContext.currentTime - playStartTimeRef.current);
    const totalDuration = getBufferDuration(activeBufferRef.current);
    return Math.min(startOffsetRef.current + elapsed, totalDuration);
  }, [getAudioContext, getBufferDuration, state.playbackTime]);

  const stopPlayback = useCallback(() => {
    playbackSessionRef.current += 1;
    const nextTime = captureProgress();

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

    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch {
        // ignore disconnect errors
      }
      gainNodeRef.current = null;
    }

    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }

    activeBufferRef.current = null;
    startOffsetRef.current = nextTime;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      playbackTime: nextTime,
    }));
  }, [captureProgress]);

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

  const playAudio = useCallback((buffer?: AudioBuffer, startTime = state.playbackTime) => {
    const audioContext = getAudioContext();
    const bufferToPlay = buffer || activeBufferRef.current || getFallbackBuffer();

    if (!bufferToPlay) {
      setError(ERROR_MESSAGES.NO_AUDIO_TO_PLAY);
      return;
    }

    setError(null);

    playbackSessionRef.current += 1;
    const sessionId = playbackSessionRef.current;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      try {
        sourceNodeRef.current.stop();
      } catch {
        // ignore
      }
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
    }

    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch {
        // ignore
      }
    }

    if (playbackRafRef.current) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }

    const totalDuration = getBufferDuration(bufferToPlay);
    const startAt = Math.max(0, Math.min(startTime, totalDuration));
    startOffsetRef.current = startAt;
    activeBufferRef.current = bufferToPlay;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = state.volume;
    gainNodeRef.current = gainNode;

    const source = audioContext.createBufferSource();
    source.buffer = bufferToPlay;
    source.loop = false;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const tick = () => {
      if (playbackSessionRef.current !== sessionId) return;
      if (!activeBufferRef.current || !sourceNodeRef.current) return;
      const elapsed = audioContext.currentTime - playStartTimeRef.current;
      const nextTime = Math.min(startOffsetRef.current + elapsed, totalDuration);
      setState((prev) => ({ ...prev, playbackTime: nextTime }));
      if (nextTime < totalDuration) {
        playbackRafRef.current = requestAnimationFrame(tick);
      }
    };

    source.onended = () => {
      if (playbackSessionRef.current !== sessionId) return;
      setState((prev) => ({ ...prev, isPlaying: false, playbackTime: totalDuration }));
      sourceNodeRef.current = null;
      gainNodeRef.current = null;
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
    };

    playStartTimeRef.current = audioContext.currentTime;
    setState((prev) => ({
      ...prev,
      isPlaying: true,
      playbackTime: startAt,
      duration: totalDuration,
    }));
    source.start(0, startAt);
    sourceNodeRef.current = source;
    playbackRafRef.current = requestAnimationFrame(tick);
  }, [getAudioContext, getBufferDuration, getFallbackBuffer, setError, state.volume, state.playbackTime]);

  const stopAudio = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

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

    if (state.isPlaying) {
      playAudio(buffer, clamped);
    }
  }, [getBufferDuration, getFallbackBuffer, playAudio, state.isPlaying]);

  const resetPlayback = useCallback(() => {
    stopPlayback();
    startOffsetRef.current = 0;
    activeBufferRef.current = null;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      playbackTime: 0,
      duration: 0,
      error: null,
    }));
  }, [stopPlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  return {
    state,
    playAudio,
    stopAudio,
    seekTo,
    updateVolume,
    attachBuffer,
    resetPlayback,
  };
}
