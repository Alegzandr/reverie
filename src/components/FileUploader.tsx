import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Music } from 'lucide-react';
import { FILE_FORMATS } from '../constants';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  hasFile?: boolean;
}

export function FileUploader({ onFileSelect, isLoading, hasFile }: FileUploaderProps) {
  const { t } = useTranslation();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      const mime = file?.type as typeof FILE_FORMATS.ACCEPTED_MIME_TYPES[number];
      if (file && FILE_FORMATS.ACCEPTED_MIME_TYPES.includes(mime)) {
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
        e.target.value = '';
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
        accept="audio/*"
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
          bg-gradient-to-br from-[rgba(var(--color-ambient),0.05)] to-[rgba(var(--color-accent),0.08)]
          cursor-pointer transition-all duration-200
          ${hasFile ? 'border-2 border-[rgb(var(--color-accent))]/30' : 'border-2 border-transparent hover:border-[rgb(var(--color-border))]'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'ios-button'}
        `}
      >
        <div className="flex flex-col items-center gap-6">
          <div className={`
            w-20 h-20 rounded-[20px] flex items-center justify-center
            ${hasFile
              ? 'bg-[linear-gradient(135deg,rgba(var(--color-accent),0.95),rgba(var(--color-ambient),0.9))]'
              : 'bg-[rgba(var(--color-border),0.4)] dark:bg-gray-700'}
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
