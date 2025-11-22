import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  isProcessing?: boolean;
  message?: string;
}

export function ProgressBar({ progress, isProcessing, message }: ProgressBarProps) {
  if (!isProcessing && progress === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="cassette-tape rounded-2xl p-6 border-2 border-white/30">
        <div className="flex items-center gap-4 mb-5">
          <Loader2 className="w-7 h-7 text-[#4de8ff] animate-spin drop-shadow-lg" />
          <span className="text-sm font-black text-white/90 uppercase tracking-wider drop-shadow">
            {message || 'Processing...'}
          </span>
          <span className="ml-auto text-lg font-black text-[#4de8ff] drop-shadow-lg">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden backdrop-blur border border-white/30">
          <div
            className="h-full bg-gradient-to-r from-[#ff6ec7] via-[#b06aff] to-[#4de8ff] transition-all duration-300 ease-out rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
