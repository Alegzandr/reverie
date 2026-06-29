import { useTranslation } from 'react-i18next';
import { MonitorSmartphone } from 'lucide-react';
import { AmbientScene } from './AmbientScene';

/**
 * Reverie is a wide cockpit - the effects rail, the holographic waveform and the
 * mood rail only line up on a real desktop canvas. Rather than ship a cramped
 * phone layout, narrow viewports get this branded "come back on a bigger screen"
 * stage. Deliberately no bypass: the experience is always the intended one.
 */
export function DesktopOnlyGate() {
  const { t } = useTranslation();

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden flex flex-col">
      <AmbientScene />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="aurora-stage relative w-full max-w-md flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-[18px] bg-[url('/favicon.svg')] bg-center bg-cover shadow-[0_18px_50px_-24px_rgba(var(--aurora-pink),0.7)] mb-8"
            aria-hidden="true"
          />

          <div className="relative mb-7 grid place-items-center" aria-hidden="true">
            <span className="upload-echo absolute h-[4.75rem] w-[4.75rem] rounded-full border border-[rgba(var(--aurora-violet),0.4)]" />
            <span
              className="upload-echo absolute h-[6.25rem] w-[6.25rem] rounded-full border border-[rgba(var(--aurora-pink),0.3)]"
              style={{ animationDelay: '1.6s' }}
            />
            <span className="relative h-16 w-16 rounded-full p-[2px] bg-[linear-gradient(135deg,rgb(var(--aurora-violet)),rgb(var(--aurora-pink))_55%,rgb(var(--aurora-cyan)))] shadow-[0_18px_44px_-22px_rgba(var(--aurora-pink),0.75)]">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[rgb(var(--color-surface))]">
                <MonitorSmartphone className="h-6 w-6 text-[rgb(var(--aurora-violet))]" />
              </span>
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-light tracking-[0.02em] text-balance text-[rgb(var(--color-text))]">
            {t('gate.title')}
          </h1>
          <p className="font-display mt-4 text-base sm:text-lg font-light text-balance text-[rgb(var(--color-text-secondary))]">
            {t('gate.description')}
          </p>

          <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[rgb(var(--color-accent-text))]">
            {t('gate.hint')}
          </p>
        </div>
      </main>
    </div>
  );
}
