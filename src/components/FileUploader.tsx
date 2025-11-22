import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Music } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  hasFile?: boolean;
}

const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
];

export function FileUploader({ onFileSelect, isLoading, hasFile }: FileUploaderProps) {
  const { t } = useTranslation();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && ACCEPTED_AUDIO_TYPES.includes(file.type)) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="relative"
      role="region"
      aria-label={t('upload.title')}
    >
      <input
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/m4a"
        onChange={handleFileInput}
        className="hidden"
        id="file-input"
        disabled={isLoading}
        aria-label={t('upload.browse')}
      />
      <label
        htmlFor="file-input"
        className={`
          flex flex-col items-center justify-center
          glass rounded-3xl p-12 min-h-[280px]
          cursor-pointer transition-all duration-200
          ${hasFile ? 'border-2 border-[rgb(var(--color-accent))]/30' : 'border-2 border-transparent hover:border-[rgb(var(--color-border))]'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'ios-button'}
        `}
      >
        <div className="flex flex-col items-center gap-6">
          <div className={`
            w-20 h-20 rounded-[20px] flex items-center justify-center
            ${hasFile ? 'bg-[rgb(var(--color-accent))]' : 'bg-gray-200 dark:bg-gray-700'}
            transition-colors duration-200
          `} aria-hidden="true">
            {hasFile ? (
              <Music className="w-10 h-10 text-white" />
            ) : (
              <Upload className="w-10 h-10 text-gray-600 dark:text-gray-300" />
            )}
          </div>
          <div className="text-center">
            <p className="text-[17px] font-semibold text-[rgb(var(--color-text))] mb-2">
              {t('upload.dragDrop')}
            </p>
            <p className="text-[13px] text-[rgb(var(--color-text-secondary))] mb-1">
              {t('upload.or')}
            </p>
            <p className="text-[13px] font-medium text-[rgb(var(--color-accent))]">
              {t('upload.browse')}
            </p>
            <p className="text-[11px] text-[rgb(var(--color-text-secondary))] mt-3">
              {t('upload.formats')}
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}
