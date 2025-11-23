import { useState, useCallback, useRef } from 'react';
import { audioProcessor } from '../utils/audioProcessor';
import type { AudioProcessingOptions } from '../utils/audioProcessor';
import { audioBufferToMp3, downloadBlob } from '../utils/mp3Encoder';

export interface ProcessingState {
  isLoading: boolean;
  isProcessing: boolean;
  isExporting: boolean;
  isPlaying: boolean;
  progress: number;
  error: string | null;
}

export function useAudioProcessor() {
  const getBufferDuration = useCallback((buffer: AudioBuffer | null) => {
    if (!buffer) return 0;
    return buffer.duration || buffer.length / buffer.sampleRate;
  }, []);

  const [state, setState] = useState<ProcessingState>({
    isLoading: false,
    isProcessing: false,
    isExporting: false,
    isPlaying: false,
    progress: 0,
    error: null,
  });

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof localStorage === 'undefined') return 0.7;
    const stored = localStorage.getItem('pitchsongs:volume');
    const parsed = stored ? parseFloat(stored) : NaN;
    return Number.isFinite(parsed) ? parsed : 0.7;
  });
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const startOffsetRef = useRef<number>(0);
  const playStartTimeRef = useRef<number>(0);
  const activeBufferRef = useRef<AudioBuffer | null>(null);
  const playbackSessionRef = useRef<number>(0);

  const getAudioContext = useCallback(() => audioProcessor.getAudioContext(), []);

  const captureProgress = useCallback(() => {
    const audioContext = getAudioContext();
    if (!activeBufferRef.current) return playbackTime;
    const elapsed = Math.max(0, audioContext.currentTime - playStartTimeRef.current);
    const totalDuration = getBufferDuration(activeBufferRef.current);
    return Math.min(startOffsetRef.current + elapsed, totalDuration);
  }, [getAudioContext, getBufferDuration, playbackTime]);

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
    setPlaybackTime(nextTime);
    startOffsetRef.current = nextTime;
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [captureProgress]);

  const loadAudioFile = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, progress: 0 }));
    try {
      const buffer = await audioProcessor.loadAudioFile(file);
      setOriginalFile(file);
      setOriginalBuffer(buffer);
      setDuration(getBufferDuration(buffer));
      setPlaybackTime(0);
      setState((prev) => ({ ...prev, isLoading: false, progress: 100 }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load audio file',
      }));
    }
  }, [getBufferDuration]);

  const processAudio = useCallback(async (options: AudioProcessingOptions) => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null, progress: 0 }));
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 100);

      const buffer = await audioProcessor.processAudio(options);
      clearInterval(progressInterval);

      setProcessedBuffer(buffer);
      setDuration(getBufferDuration(buffer));
      setPlaybackTime(0);
      setState((prev) => ({ ...prev, isProcessing: false, progress: 100 }));

      return buffer;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to process audio',
      }));
      throw error;
    }
  }, [getBufferDuration]);

  const playAudio = useCallback(
    (buffer?: AudioBuffer, startTime = playbackTime) => {
      const audioContext = getAudioContext();
      const bufferToPlay = buffer || processedBuffer || audioProcessor.getAudioBuffer();

      if (!bufferToPlay) {
        setState((prev) => ({ ...prev, error: 'No audio to play' }));
        return;
      }

      // Invalidate older sessions to avoid duplicate onended/tick updates
      playbackSessionRef.current += 1;
      const sessionId = playbackSessionRef.current;

      // Stop any existing source without altering playhead (we'll set it below)
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

      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = volume;
      gainNodeRef.current = gainNode;

      const source = audioContext.createBufferSource();
      source.buffer = bufferToPlay;
      source.loop = false; // Never loop - stop at end
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const tick = () => {
        if (playbackSessionRef.current !== sessionId) return;
        if (!activeBufferRef.current || !sourceNodeRef.current) return;
        const elapsed = audioContext.currentTime - playStartTimeRef.current;
        const nextTime = Math.min(
          startOffsetRef.current + elapsed,
          totalDuration
        );
        setPlaybackTime(nextTime);
        if (nextTime < totalDuration) {
          playbackRafRef.current = requestAnimationFrame(tick);
        }
      };

      source.onended = () => {
        if (playbackSessionRef.current !== sessionId) return;
        setState((prev) => ({ ...prev, isPlaying: false }));
        sourceNodeRef.current = null;
        gainNodeRef.current = null;
        if (playbackRafRef.current) {
          cancelAnimationFrame(playbackRafRef.current);
          playbackRafRef.current = null;
        }
        setPlaybackTime(totalDuration);
      };

      playStartTimeRef.current = audioContext.currentTime;
      setPlaybackTime(startAt);
      source.start(0, startAt);
      sourceNodeRef.current = source;
      playbackRafRef.current = requestAnimationFrame(tick);
      setState((prev) => ({ ...prev, isPlaying: true }));
    },
    [processedBuffer, playbackTime, volume, getBufferDuration, getAudioContext]
  );

  const stopAudio = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const estimateBitrate = useCallback(
    (file: File | null, durationSeconds: number) => {
      if (!file || durationSeconds <= 0) return 192;
      const kbps = Math.round(((file.size * 8) / durationSeconds) / 1000);
      return Math.min(320, Math.max(96, kbps)); // keep within common MP3 bitrates
    },
    []
  );

  const exportProcessedAudio = useCallback(async (filename?: string) => {
    const buffer = processedBuffer || audioProcessor.getAudioBuffer();
    if (!buffer) {
      throw new Error('No audio to export');
    }

    setState((prev) => ({ ...prev, isExporting: true }));

    try {
      const durationSeconds = getBufferDuration(buffer);
      const extension = originalFile?.name.split('.').pop()?.toLowerCase() || '';
      const mime = (originalFile?.type || '').toLowerCase();
      const preferWav = mime.includes('wav') || extension === 'wav';

      let blob: Blob;
      let targetExtension: string;

      if (preferWav) {
        blob = await audioProcessor.audioBufferToWav(buffer);
        targetExtension = 'wav';
      } else {
        const bitRate = estimateBitrate(originalFile, durationSeconds);
        blob = await audioBufferToMp3(buffer, bitRate);
        targetExtension = 'mp3';
      }

      const baseName = filename
        ? filename.replace(/\.[^/.]+$/, '')
        : originalFile
          ? `${originalFile.name.replace(/\.[^/.]+$/, '')}_processed`
          : 'processed_audio';

      downloadBlob(blob, `${baseName}.${targetExtension}`);
      setState((prev) => ({ ...prev, isExporting: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isExporting: false,
        error: error instanceof Error ? error.message : 'Failed to export audio',
      }));
      throw error;
    }
  }, [processedBuffer, originalFile, getBufferDuration, estimateBitrate]);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pitchsongs:volume', newVolume.toString());
    }
    // Update volume in real-time if audio is playing
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
  }, []);

  const seekTo = useCallback(
    (time: number, bufferOverride?: AudioBuffer | null) => {
      const buffer = bufferOverride || processedBuffer || originalBuffer || audioProcessor.getAudioBuffer();
      const totalDuration = getBufferDuration(buffer);
      if (!buffer || totalDuration <= 0) return;
      const clamped = Math.max(0, Math.min(time, totalDuration));
      setPlaybackTime(clamped);
      startOffsetRef.current = clamped;
      activeBufferRef.current = buffer;
      if (state.isPlaying) {
        playAudio(buffer, clamped);
      }
    },
    [processedBuffer, originalBuffer, state.isPlaying, playAudio, getBufferDuration]
  );

  const reset = useCallback(() => {
    stopAudio();
    setOriginalFile(null);
    setOriginalBuffer(null);
    setProcessedBuffer(null);
    setDuration(0);
    setPlaybackTime(0);
    startOffsetRef.current = 0;
    setState({
      isLoading: false,
      isProcessing: false,
      isExporting: false,
      isPlaying: false,
      progress: 0,
      error: null,
    });
  }, [stopAudio]);

  return {
    state,
    originalFile,
    originalBuffer,
    processedBuffer,
    playbackTime,
    duration,
    volume,
    loadAudioFile,
    processAudio,
    playAudio,
    stopAudio,
    exportProcessedAudio,
    updateVolume,
    seekTo,
    reset,
  };
}
