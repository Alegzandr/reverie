import { memo, useCallback, useRef, useState } from 'react';
import { PlusIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import type { ChangeEvent, DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropReticle } from './DropReticle';
import { collectDroppedAudio, collectPickedAudio } from '../utils/fileCollect';
import { usePickerFullscreenRestore } from '../hooks/usePickerFullscreenRestore';

interface FileUploaderProps {
  /** Every accepted audio file picked or dropped (folders expanded, naturally sorted). */
  onFilesSelect: (files: File[]) => void;
  isLoading?: boolean;
  /** Compact chrome variant (the workspace's "Add music" button). */
  hasFile?: boolean;
}

// Memoised: its props are stable between interactions (App's callbacks are
// useCallback'd), so it only re-renders when they actually change.
export const FileUploader = memo(function FileUploader({ onFilesSelect, isLoading, hasFile }: FileUploaderProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  // The picker opens from a real button (focusable, Enter/Space for free); the
  // input itself stays out of the tab order and out of sight.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openPicker = useCallback(() => inputRef.current?.click(), []);
  const { onInputClick, restore } = usePickerFullscreenRestore();

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      // Collected before any await: DataTransfer items expire with the event.
      void collectDroppedAudio(e.dataTransfer).then((files) => {
        if (files.length) onFilesSelect(files);
      });
    },
    [onFilesSelect]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = collectPickedAudio(e.target.files);
      restore();
      if (files.length) onFilesSelect(files);
      e.target.value = '';
    },
    [onFilesSelect, restore]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="audio/*"
      multiple
      onClick={onInputClick}
      onChange={handleFileInput}
      className="hidden"
      id="file-input"
      tabIndex={-1}
      disabled={isLoading}
      aria-label={t('upload.browse')}
    />
  );

  // Compact variant - lives in the workspace chrome and adds to the playlist.
  // Drag-and-drop is window-wide (FileDropOverlay), so no local drop handlers.
  if (hasFile) {
    return (
      <div role="region" aria-label={t('upload.title')}>
        {input}
        <Button type="button" variant="glass" size="sm" className="h-10 px-4 disabled:opacity-60" onClick={openPicker} disabled={isLoading}>
          <PlusIcon className="h-4 w-4 text-[rgb(var(--color-accent-text))]" aria-hidden="true" />
          {t('playlist.add')}
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
      <button
        type="button"
        onClick={openPicker}
        disabled={isLoading}
        className={cn(
          'group pane relative flex w-full flex-col items-center justify-center px-8 py-12 text-center transition-colors duration-200 sm:py-14',
          isDragging && '[outline:2px_solid_rgba(var(--color-accent),0.75)] [outline-offset:-2px]',
          isLoading ? 'cursor-not-allowed opacity-50' : 'ios-button cursor-pointer'
        )}
      >
        {isDragging && (
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[rgba(var(--color-accent),0.08)]" aria-hidden="true" />
        )}
        <DropReticle
          active={isDragging}
          className="mb-5"
          icon={
            <UploadSimpleIcon className="h-7 w-7 transition-transform duration-300 group-hover:-translate-y-0.5" />
          }
        />
        <span className="block text-lg font-semibold text-[rgb(var(--color-text))] sm:text-xl">{t('upload.dragDrop')}</span>
        <span className="mt-2 block text-sm text-[rgb(var(--color-text-secondary))]">
          {t('upload.or')}{' '}
          <span className="font-medium text-[rgb(var(--color-accent-text))] underline-offset-4 group-hover:underline">
            {t('upload.browse')}
          </span>
        </span>
        <span className="mt-5 block text-xs uppercase tracking-wide text-[rgb(var(--color-text-secondary))]">{t('upload.formats')}</span>
      </button>
    </div>
  );
});
