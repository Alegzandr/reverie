import { useCallback, useState } from 'react';
import { getExportStrategy, estimateBitrate } from '../utils/exportStrategies';
import { downloadBlob } from '../utils/download';
import { ERROR_MESSAGES } from '../constants';
import type { AudioMetadata } from './useAudioFile';

export interface ExportState {
  isExporting: boolean;
  error: string | null;
}

interface UseAudioExportParams {
  getBuffer: () => AudioBuffer | null;
  originalFile: File | null;
  metadata: AudioMetadata | null;
  getBufferDuration: (buffer: AudioBuffer | null) => number;
  effectLabel?: string;
  onError?: (message: string | null) => void;
}

const stripReverieSuffix = (name: string) =>
  name.replace(/\s*(ver\.)?\s*by\s+Reverie$/i, '').trim();

const buildReverieName = (base: string, effectLabel?: string) => {
  const cleaned = stripReverieSuffix(base);
  const label = effectLabel?.trim();
  const labelPart = label ? ` ${label}` : '';
  return `${cleaned}${labelPart} ver. by Reverie`.trim().replace(/\s+/g, ' ');
};

type ExportArg = string | { filename?: string; effectLabel?: string };

/**
 * Hook that handles exporting audio buffers using strategy pattern
 */
export function useAudioExport({
  getBuffer,
  originalFile,
  metadata,
  getBufferDuration,
  effectLabel,
  onError,
}: UseAudioExportParams) {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    error: null,
  });

  const setError = useCallback((message: string | null) => {
    setState((prev) => ({ ...prev, error: message }));
    if (onError) {
      onError(message);
    }
  }, [onError]);

  const exportProcessedAudio = useCallback(async (arg?: ExportArg) => {
    setError(null);
    const filename = typeof arg === 'string' ? arg : arg?.filename;
    const explicitEffectLabel = typeof arg === 'object' ? arg?.effectLabel : undefined;
    const label = explicitEffectLabel ?? effectLabel;
    const buffer = getBuffer();
    if (!buffer) {
      const message = ERROR_MESSAGES.NO_AUDIO_TO_EXPORT;
      setError(message);
      throw new Error(message);
    }

    setState((prev) => ({ ...prev, isExporting: true, error: null }));

    try {
      const durationSeconds = getBufferDuration(buffer);
      const extension = metadata?.originalFormat || originalFile?.name.split('.').pop()?.toLowerCase() || '';
      const strategy = getExportStrategy(extension);
      const estimatedBitrate = estimateBitrate(originalFile, durationSeconds);

      const { blob, extension: targetExtension } = await strategy.export({
        buffer,
        originalFile,
        estimatedBitrate,
      });

      const baseName = filename
        ? filename.replace(/\.[^/.]+$/, '')
        : originalFile
          ? `${originalFile.name.replace(/\.[^/.]+$/, '')}_processed`
          : 'processed_audio';

      const finalName = buildReverieName(baseName, label);
      downloadBlob(blob, `${finalName}.${targetExtension}`);
      setState((prev) => ({ ...prev, isExporting: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.EXPORT_FAILED;
      setState((prev) => ({ ...prev, isExporting: false, error: message }));
      if (onError) {
        onError(message);
      }
      throw error instanceof Error ? error : new Error(message);
    }
  }, [effectLabel, getBuffer, getBufferDuration, metadata, onError, originalFile, setError]);

  const resetExport = useCallback(() => {
    setState({ isExporting: false, error: null });
  }, []);

  return {
    state,
    exportProcessedAudio,
    resetExport,
  };
}
