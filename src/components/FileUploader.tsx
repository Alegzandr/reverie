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
      className="relative w-full max-w-2xl mx-auto"
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
          w-full h-64 px-6 py-12
          border-2 border-dashed rounded-2xl
          cursor-pointer transition-all duration-300
          ${
            hasFile
              ? 'border-purple-500 bg-purple-500/5'
              : 'border-gray-300 hover:border-purple-400 bg-gray-50/50 hover:bg-purple-50/50'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-4">
          {hasFile ? (
            <div className="p-4 bg-purple-500 rounded-full">
              <Music className="w-12 h-12 text-white" />
            </div>
          ) : (
            <div className="p-4 bg-gray-200 rounded-full group-hover:bg-purple-100 transition-colors">
              <Upload className="w-12 h-12 text-gray-600 group-hover:text-purple-600 transition-colors" />
            </div>
          )}
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900 mb-2">
              {hasFile ? 'File loaded!' : 'Drop your MP3 file here'}
            </p>
            <p className="text-sm text-gray-500">
              {hasFile ? 'Drop another file to replace' : 'or click to browse'}
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}
