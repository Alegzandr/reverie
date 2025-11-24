import { useState, useCallback, useRef } from 'react';
import { audioProcessor } from '../utils/audioProcessor';
import type { AudioProcessingOptions } from '../utils/audioProcessor';
import { audioBufferToMp3, downloadBlob } from '../utils/mp3Encoder';
import { audioBufferToAiff } from '../utils/aiffEncoder';
import { encodeWithMediaRecorder, getMimeTypeForFormat } from '../utils/mediaRecorderEncoder';
import { extractAudioMetadata } from '../utils/audioMetadataExtractor';

export interface ProcessingState {
  isLoading: boolean;
  isProcessing: boolean;
  isExporting: boolean;
  isPlaying: boolean;
  progress: number;
  error: string | null;
}

export interface AudioMetadata {
  sampleRate: number;
  channels: number;
  bitrate: number | null;
  bitDepth: number | null; // Bit depth (e.g., 16, 24) for lossless formats
  originalFormat: string; // File extension (e.g., 'mp3', 'wav', 'flac')
  originalMimeType: string; // MIME type (e.g., 'audio/mpeg', 'audio/wav')
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
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
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

  const estimateBitDepth = useCallback((format: string, fileSize: number, duration: number, channels: number, sampleRate: number): number | null => {
    // Only lossless formats have meaningful bit depth
    const losslessFormats = ['wav', 'wave', 'aiff', 'aif', 'aifc', 'flac'];
    if (!losslessFormats.includes(format) || duration <= 0) {
      return null;
    }

    // For WAV/AIFF: Calculate from file size
    // File size (bytes) = sample rate × channels × bit depth / 8 × duration + headers
    // Approximate header size: 44-100 bytes for WAV, ~54 bytes for AIFF
    const headerSize = format.includes('aif') ? 54 : 44;
    const dataSize = fileSize - headerSize;
    const bytesPerSample = dataSize / (sampleRate * channels * duration);
    const estimatedBitDepth = Math.round(bytesPerSample * 8);

    // Common bit depths: 8, 16, 24, 32
    // Round to nearest common bit depth
    if (estimatedBitDepth <= 12) return 8;
    if (estimatedBitDepth <= 20) return 16;
    if (estimatedBitDepth <= 28) return 24;
    return 32;
  }, []);

  const loadAudioFile = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, progress: 0 }));
    try {
      // Extract metadata from file headers BEFORE decoding (preserves original sample rate)
      const rawMetadata = await extractAudioMetadata(file);

      // Decode audio with Web Audio API (may resample)
      const buffer = await audioProcessor.loadAudioFile(file);
      const bufferDuration = getBufferDuration(buffer);

      // Extract original format information
      const originalFormat = file.name.split('.').pop()?.toLowerCase() || '';
      const originalMimeType = file.type || '';

      // Use raw metadata if available, otherwise fall back to decoded buffer
      const sampleRate = rawMetadata.sampleRate || buffer.sampleRate;
      const channels = rawMetadata.channels || buffer.numberOfChannels;
      const bitDepth = rawMetadata.bitDepth || estimateBitDepth(originalFormat, file.size, bufferDuration, channels, sampleRate);

      // Estimate bitrate from file size and duration (in kbps)
      const bitrate = bufferDuration > 0
        ? Math.round((file.size * 8) / bufferDuration / 1000)
        : null;

      setOriginalFile(file);
      setOriginalBuffer(buffer);
      setDuration(bufferDuration);
      setMetadata({ sampleRate, channels, bitrate, bitDepth, originalFormat, originalMimeType });
      setPlaybackTime(0);
      setState((prev) => ({ ...prev, isLoading: false, progress: 100 }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load audio file',
      }));
    }
  }, [getBufferDuration, estimateBitDepth]);

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
      const extension = metadata?.originalFormat || originalFile?.name.split('.').pop()?.toLowerCase() || '';

      // Determine export format based on original format
      let blob: Blob;
      let targetExtension: string;

      // Format-specific export logic with intelligent fallbacks
      switch (extension) {
        // WAV - already supported
        case 'wav':
        case 'wave':
          blob = await audioProcessor.audioBufferToWav(buffer);
          targetExtension = 'wav';
          break;

        // MP3 - already supported
        case 'mp3':
          const mp3BitRate = estimateBitrate(originalFile, durationSeconds);
          blob = await audioBufferToMp3(buffer, mp3BitRate);
          targetExtension = 'mp3';
          break;

        // AIFF - manual implementation
        case 'aiff':
        case 'aif':
        case 'aifc':
          blob = await audioBufferToAiff(buffer);
          targetExtension = 'aiff';
          break;

        // FLAC - export as WAV (both lossless, preserves quality)
        case 'flac':
          blob = await audioProcessor.audioBufferToWav(buffer);
          targetExtension = 'wav'; // Note: exported as WAV to preserve lossless quality
          break;

        // WebM - try MediaRecorder, fallback to MP3
        case 'webm': {
          const webmMime = getMimeTypeForFormat('webm');
          if (webmMime) {
            try {
              const bitRate = estimateBitrate(originalFile, durationSeconds) * 1000; // Convert to bps
              blob = await encodeWithMediaRecorder(buffer, {
                mimeType: webmMime,
                audioBitsPerSecond: bitRate,
              });
              targetExtension = 'webm';
            } catch (err) {
              console.warn('MediaRecorder failed for WebM, falling back to MP3:', err);
              const fallbackBitRate = estimateBitrate(originalFile, durationSeconds);
              blob = await audioBufferToMp3(buffer, fallbackBitRate);
              targetExtension = 'mp3';
            }
          } else {
            // Browser doesn't support WebM, fallback to MP3
            const fallbackBitRate = estimateBitrate(originalFile, durationSeconds);
            blob = await audioBufferToMp3(buffer, fallbackBitRate);
            targetExtension = 'mp3';
          }
          break;
        }

        // OGG/Opus - try MediaRecorder, fallback to MP3
        case 'ogg':
        case 'opus':
        case 'oga': {
          const oggMime = getMimeTypeForFormat('ogg');
          if (oggMime) {
            try {
              const bitRate = estimateBitrate(originalFile, durationSeconds) * 1000; // Convert to bps
              blob = await encodeWithMediaRecorder(buffer, {
                mimeType: oggMime,
                audioBitsPerSecond: bitRate,
              });
              targetExtension = extension;
            } catch (err) {
              console.warn('MediaRecorder failed for OGG, falling back to MP3:', err);
              const fallbackBitRate = estimateBitrate(originalFile, durationSeconds);
              blob = await audioBufferToMp3(buffer, fallbackBitRate);
              targetExtension = 'mp3';
            }
          } else {
            // Browser doesn't support OGG, fallback to MP3
            const fallbackBitRate = estimateBitrate(originalFile, durationSeconds);
            blob = await audioBufferToMp3(buffer, fallbackBitRate);
            targetExtension = 'mp3';
          }
          break;
        }

        // AAC/M4A - try MediaRecorder, fallback to MP3
        case 'm4a':
        case 'aac':
        case 'mp4': {
          const m4aMime = getMimeTypeForFormat('m4a');
          if (m4aMime) {
            try {
              const bitRate = estimateBitrate(originalFile, durationSeconds) * 1000; // Convert to bps
              blob = await encodeWithMediaRecorder(buffer, {
                mimeType: m4aMime,
                audioBitsPerSecond: bitRate,
              });
              targetExtension = extension === 'mp4' ? 'mp4' : 'm4a';
            } catch (err) {
              console.warn('MediaRecorder failed for M4A/AAC, falling back to MP3:', err);
              const fallbackBitRate = estimateBitrate(originalFile, durationSeconds);
              blob = await audioBufferToMp3(buffer, fallbackBitRate);
              targetExtension = 'mp3';
            }
          } else {
            // Browser doesn't support M4A/AAC, fallback to MP3
            const fallbackBitRate = estimateBitrate(originalFile, durationSeconds);
            blob = await audioBufferToMp3(buffer, fallbackBitRate);
            targetExtension = 'mp3';
          }
          break;
        }

        // Unknown format - export as MP3 (most compatible)
        default: {
          const defaultBitRate = estimateBitrate(originalFile, durationSeconds);
          blob = await audioBufferToMp3(buffer, defaultBitRate);
          targetExtension = 'mp3';
        }
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
  }, [processedBuffer, originalFile, metadata, getBufferDuration, estimateBitrate]);

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
    setMetadata(null);
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
    metadata,
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
