import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  progress: number;
  isProcessing?: boolean;
  message?: string;
}

export function ProgressBar({ progress, isProcessing, message }: ProgressBarProps) {
  if (!isProcessing && progress === 0) return null;

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="w-5 h-5 text-[rgb(var(--color-accent))] animate-spin flex-shrink-0" />
        <span className="text-sm font-medium text-[rgb(var(--color-text))]">
          {message || 'Processing...'}
        </span>
        <span className="ml-auto text-sm font-semibold text-[rgb(var(--color-accent))]">
          {Math.round(progress)}%
        </span>
      </div>
      <Progress value={progress} />
    </Card>
  );
}
