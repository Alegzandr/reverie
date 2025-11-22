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
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <span className="text-sm font-medium text-gray-700">
            {message || 'Processing audio...'}
          </span>
          <span className="ml-auto text-sm font-bold text-purple-500">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
