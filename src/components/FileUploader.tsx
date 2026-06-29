import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FILE_FORMATS } from '../constants';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  hasFile?: boolean;
}

export function FileUploader({ onFileSelect, isLoading, hasFile }: FileUploaderProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
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
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const input = (
    <input
      type="file"
      accept="audio/*"
      onChange={handleFileInput}
      className="hidden"
      id="file-input"
      disabled={isLoading}
      aria-label={t('upload.browse')}
    />
  );

  // Compact variant - lives in the workspace chrome to swap the current track.
  // Drag-and-drop is handled window-wide by FileDropOverlay, so this is just the
  // browse button (no local drop handlers, which would double-fire onFileSelect).
  if (hasFile) {
    return (
      <div role="region" aria-label={t('upload.title')}>
        {input}
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn(isLoading && 'pointer-events-none opacity-50')}
        >
          <label htmlFor="file-input" className="cursor-pointer">
            <RefreshCw className="w-4 h-4 text-[rgb(var(--color-text-secondary))]" aria-hidden="true" />
            <span className="hidden sm:inline">{t('upload.browse')}</span>
          </label>
        </Button>
      </div>
    );
  }

  // Hero variant - the welcome stage's primary affordance.
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="relative w-full"
      role="region"
      aria-label={t('upload.title')}
    >
      {input}
      <label
        htmlFor="file-input"
        className={`
          group flex flex-col items-center justify-center text-center
          rounded-[28px] px-8 py-14 sm:py-16
          border-2 border-dashed transition-colors duration-200
          bg-[radial-gradient(120%_120%_at_50%_0%,rgba(var(--color-surface),0.7),rgba(var(--color-surface),0.35))]
          ${isDragging
            ? 'border-[rgb(var(--color-accent))] bg-[rgba(var(--color-accent),0.06)]'
            : 'border-[rgba(var(--color-border),0.8)] hover:border-[rgba(var(--color-accent),0.5)]'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'ios-button cursor-pointer'}
        `}
      >
        <div className="relative mb-6 grid place-items-center" aria-hidden="true">
          {/* Reverberation echoes - the brand's reverb motif (the mark's echo
              arcs, the play orb's pulse), breathing softly behind the well. */}
          <span className="upload-echo absolute h-[4.75rem] w-[4.75rem] rounded-full border border-[rgba(var(--aurora-violet),0.4)]" />
          <span
            className="upload-echo absolute h-[6.25rem] w-[6.25rem] rounded-full border border-[rgba(var(--aurora-pink),0.3)]"
            style={{ animationDelay: '1.6s' }}
          />
          {/* Aurora as a stroke around a dark glass well, not a solid fill: it
              reads as the brand without competing with the play orb, and steps
              away from the gradient-square upload cliché. */}
          <span
            className={cn(
              'relative h-16 w-16 rounded-full p-[2px] transition-transform duration-300 group-hover:scale-105',
              'bg-[linear-gradient(135deg,rgb(var(--aurora-violet)),rgb(var(--aurora-pink))_55%,rgb(var(--aurora-cyan)))]',
              isDragging
                ? 'scale-105 shadow-[0_0_0_4px_rgba(var(--aurora-pink),0.18),0_22px_50px_-20px_rgba(var(--aurora-pink),0.9)]'
                : 'shadow-[0_18px_44px_-22px_rgba(var(--aurora-pink),0.75)]'
            )}
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-[rgb(var(--color-surface))]">
              <Upload className="h-6 w-6 text-[rgb(var(--aurora-violet))] transition-transform duration-300 group-hover:-translate-y-0.5" />
            </span>
          </span>
        </div>
        <p className="text-lg sm:text-xl font-semibold text-[rgb(var(--color-text))]">
          {t('upload.dragDrop')}
        </p>
        <p className="mt-2 text-sm text-[rgb(var(--color-text-secondary))]">
          {t('upload.or')}{' '}
          <span className="font-medium text-[rgb(var(--color-accent-text))] underline-offset-4 group-hover:underline">
            {t('upload.browse')}
          </span>
        </p>
        <p className="mt-5 text-xs uppercase tracking-wide text-[rgb(var(--color-text-secondary))]">
          {t('upload.formats')}
        </p>
      </label>
    </div>
  );
}
