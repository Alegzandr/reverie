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
          w-full h-72 px-8 py-12
          cassette-tape rounded-3xl
          cursor-pointer transition-all duration-500
          ${
            hasFile
              ? 'border-4 border-[#4de8ff] shadow-[0_0_40px_rgba(77,232,255,0.5)]'
              : 'border-4 border-white/30 hover:border-white/50 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-6">
          {hasFile ? (
            <div className="relative">
              <div className="absolute inset-0 bg-[#4de8ff] blur-2xl opacity-50 rounded-full"></div>
              <div className="relative p-6 bg-gradient-to-br from-[#4de8ff] to-[#00d4ff] rounded-full shadow-2xl">
                <Music className="w-16 h-16 text-white drop-shadow-lg" />
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-white blur-2xl opacity-30 rounded-full"></div>
              <div className="relative p-6 bg-white/20 rounded-full backdrop-blur-sm border-2 border-white/40">
                <Upload className="w-16 h-16 text-white drop-shadow-lg" />
              </div>
            </div>
          )}
          <div className="text-center">
            <p className="text-2xl font-black text-white drop-shadow-2xl mb-2 uppercase tracking-wide">
              {hasFile ? 'Tape Loaded!' : 'Drop Your MP3'}
            </p>
            <p className="text-sm text-white/80 font-bold uppercase tracking-wider">
              {hasFile ? 'Drop another to replace' : 'or click to browse'}
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}
