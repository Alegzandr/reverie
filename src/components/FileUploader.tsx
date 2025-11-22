import { useCallback } from 'react';
import { Upload, Music } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  hasFile?: boolean;
}

export function FileUploader({ onFileSelect, isLoading, hasFile }: FileUploaderProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'audio/mpeg') {
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
    >
      <input
        type="file"
        accept="audio/mpeg"
        onChange={handleFileInput}
        className="hidden"
        id="file-input"
        disabled={isLoading}
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
          `}>
            {hasFile ? (
              <Music className="w-10 h-10 text-white" />
            ) : (
              <Upload className="w-10 h-10 text-gray-600 dark:text-gray-300" />
            )}
          </div>
          <div className="text-center">
            <p className="text-[17px] font-semibold text-[rgb(var(--color-text))] mb-2">
              {hasFile ? 'File Loaded' : 'Drop MP3 File'}
            </p>
            <p className="text-[13px] text-[rgb(var(--color-text-secondary))]">
              {hasFile ? 'Drop another to replace' : 'or click to browse'}
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}
