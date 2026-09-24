import { useRef } from 'react';
import { LightningIcon, WavesIcon, HeadphonesIcon, SpeakerHifiIcon, ShieldCheckIcon, PlaylistIcon, PlayIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUploader } from './FileUploader';
import { ProgressBar } from './ProgressBar';
import { SettingsMenu } from './SettingsMenu';
import { OverlayScrollbar } from './OverlayScrollbar';
import { WorldSwitcher } from './WorldSwitcher';
import { Logo } from './Logo';
import { SHELL_CLASS } from './shell';

interface WelcomeScreenProps {
  onFilesSelect: (files: File[]) => void;
  isLoading: boolean;
  progress: number;
  /** Remount key for the uploader; bumped on reset to clear its internal state. */
  uploadRevision: number;
  /** Shared error banner node (also rendered by the workspace stage). */
  errorBanner: ReactNode;
  /** Tracks already waiting in the remembered playlist (0 = none). */
  playlistCount: number;
  /** The track the resume lands on (the last one playing, else the first). */
  resumeTitle: string | null;
  onResume: () => void;
}

/**
 * The welcome stage: the world behind, the brand, the drop zone (files or whole
 * folders), the four effects, the privacy promise - and, when a playlist is
 * already remembered on this device, a one-click way back into it.
 */
export function WelcomeScreen({
  onFilesSelect,
  isLoading,
  progress,
  uploadRevision,
  errorBanner,
  playlistCount,
  resumeTitle,
  onResume,
}: WelcomeScreenProps) {
  const { t } = useTranslation();
  const welcomeShellRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={welcomeShellRef} className={SHELL_CLASS}>
      <OverlayScrollbar target={welcomeShellRef} insetTop={24} insetBottom={24} />
      {/* Sticky so the settings entry point stays reachable while the landing
         scrolls; pointer-events gymnastics keep the full-width row from
         swallowing clicks on content sliding underneath it. */}
      <div className="sticky top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-6 py-4 pointer-events-none [&>*]:pointer-events-auto">
        <span />
        <WorldSwitcher />
        <div className="justify-self-end">
          <SettingsMenu />
        </div>
      </div>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="welcome-stage relative flex w-full max-w-2xl flex-col items-center text-center">
          <Logo className="mb-7 h-16 w-16 rounded-[18px] shadow-[0_18px_50px_-24px_rgba(var(--color-accent),0.7)]" />
          <h1 className="wordmark text-6xl sm:text-7xl">
            {t('app.title')}
          </h1>
          <p className="mt-5 max-w-lg text-base font-light text-balance text-[rgba(var(--color-text),0.9)] sm:text-lg">
            {t('app.subtitle')}
          </p>

          <div className="mt-10 w-full space-y-4">
            {errorBanner}
            {isLoading ? (
              <ProgressBar progress={progress} isProcessing={isLoading} message={t('upload.loading')} />
            ) : (
              <FileUploader key={uploadRevision} onFilesSelect={onFilesSelect} isLoading={isLoading} hasFile={false} />
            )}
            {playlistCount > 0 && !isLoading && (
              <button type="button" onClick={onResume} className="pane ios-button group flex w-full items-center gap-4 px-5 py-4 text-left">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[rgba(var(--color-accent),0.14)] text-[rgb(var(--color-accent-text))]">
                  <PlaylistIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[rgb(var(--color-text))]">{t('welcome.resume')}</span>
                  <span className="flex min-w-0 gap-2 text-xs tabular-nums text-[rgb(var(--color-text-secondary))]">
                    {resumeTitle && <span className="min-w-0 truncate text-[rgb(var(--color-text))]">{resumeTitle}</span>}
                    <span className="shrink-0">{t('welcome.resumeHint', { count: playlistCount })}</span>
                  </span>
                </span>
                <PlayIcon className="h-5 w-5 shrink-0 text-[rgb(var(--color-accent-text))] transition-transform group-hover:translate-x-0.5" weight="fill" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* What it does, as a plain line of type - not pills, which read as
              buttons and invited clicks that did nothing. */}
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[rgba(var(--color-text),0.88)]">
            {[
              { icon: WavesIcon, label: t('effects.slowReverb') },
              { icon: LightningIcon, label: t('effects.speedUp') },
              { icon: HeadphonesIcon, label: t('effects.8dAudio') },
              { icon: SpeakerHifiIcon, label: t('effects.bassBoost') },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 [text-shadow:0_1px_14px_rgba(var(--scene-veil),0.9)]">
                <Icon className="h-4 w-4 text-[rgb(var(--color-accent-text))]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          {/* The privacy promise is a design principle, not a footnote. */}
          <p className="mt-8 flex items-center gap-2 text-xs font-medium text-[rgba(var(--color-text),0.85)]">
            <ShieldCheckIcon className="h-4 w-4 text-[rgb(var(--color-accent-text))]" aria-hidden="true" />
            {t('features.private.desc')}
          </p>
        </div>
      </main>

      <footer className="pb-8 text-center">
        <p className="text-xs text-[rgba(var(--color-text),0.75)]">{t('footer.built')}</p>
      </footer>
    </div>
  );
}
