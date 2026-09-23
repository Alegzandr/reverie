import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListPlus, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collectDroppedAudio } from '../utils/fileCollect';

export type DropIntent = 'play' | 'queue';

interface FileDropOverlayProps {
  /** Accepted audio from the drop (folders expanded), and what the listener chose to do with it. */
  onFilesDrop: (files: File[], intent: DropIntent) => void;
  /** When true, drops are ignored (e.g. while exporting). */
  disabled?: boolean;
}

/**
 * Window-wide drop target over the workspace. Dragging files (or whole folders)
 * anywhere reveals two halves: drop on the left to play them now, on the right
 * to add them quietly to the playlist - the one choice that matters, made by
 * where you let go. It listens on `window` and only shows while files are
 * actually being dragged, so it never gets in the way of ordinary pointer use
 * (the playlist's own row drags carry no files and pass straight through).
 */
export const FileDropOverlay = memo(function FileDropOverlay({ onFilesDrop, disabled }: FileDropOverlayProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [intent, setIntent] = useState<DropIntent>('play');
  // dragenter/dragleave fire for every nested element the cursor crosses, so a
  // single boolean flickers. Counting enters minus leaves tracks the window as
  // one region and only drops to zero when the drag truly leaves the page.
  const dragDepth = useRef(0);

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

  const reset = useCallback(() => {
    dragDepth.current = 0;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (disabled) return;

    const sideOf = (e: DragEvent): DropIntent => (e.clientX < window.innerWidth / 2 ? 'play' : 'queue');

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
      setIntent(sideOf(e));
    };

    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      // Required for the drop event to fire at all.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const side = sideOf(e);
      setIntent((prev) => (prev === side ? prev : side));
    };

    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    };

    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      const chosen = sideOf(e);
      reset();
      void collectDroppedAudio(e.dataTransfer).then((files) => {
        if (files.length) onFilesDrop(files, chosen);
      });
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [disabled, onFilesDrop, reset]);

  if (!isDragging || disabled) return null;

  const zones: { id: DropIntent; icon: typeof Play; label: string }[] = [
    { id: 'play', icon: Play, label: t('upload.dropPlay') },
    { id: 'queue', icon: ListPlus, label: t('upload.dropQueue') },
  ];

  return (
    <div className="drop-overlay" role="presentation">
      {zones.map(({ id, icon: Icon, label }) => (
        <div key={id} className={cn('drop-zone', intent === id && 'is-target')}>
          <span className="drop-zone-icon">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="text-xl font-semibold text-[rgb(var(--color-text))]">{label}</p>
          <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-text-secondary))]">{t('upload.formats')}</p>
        </div>
      ))}
    </div>
  );
});
