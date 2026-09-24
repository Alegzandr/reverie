import { useTranslation } from 'react-i18next';

/**
 * Reverie is a wide cockpit - the effects rail, the holographic waveform and the
 * mood rail only line up on a real desktop canvas. Rather than ship a cramped
 * phone layout, narrow viewports get this branded "come back on a bigger screen"
 * stage. Deliberately no bypass: the experience is always the intended one.
 * One mark only: a second icon under the logo read as clutter on a phone.
 */
export function DesktopOnlyGate() {
  const { t } = useTranslation();

  return (
    <div className="desktop-gate h-[100dvh] overflow-y-auto overflow-x-hidden flex flex-col">
      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="aurora-stage relative w-full max-w-sm flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-[18px] bg-[url('/favicon.svg')] bg-center bg-cover shadow-[0_18px_50px_-24px_rgba(var(--aurora-pink),0.7)] mb-10"
            aria-hidden="true"
          />

          <h1 className="font-display text-[1.75rem] leading-tight sm:text-4xl font-light tracking-[0.01em] text-balance text-[rgb(var(--color-text))]">
            {t('gate.title')}
          </h1>
          <p className="font-display mt-5 text-[0.9375rem] leading-relaxed sm:text-lg font-light text-balance text-[rgb(var(--color-text-secondary))]">
            {t('gate.description')}
          </p>

          <p className="mt-10 text-xs uppercase tracking-[0.18em] text-[rgb(var(--color-accent-text))]">
            {t('gate.hint')}
          </p>
        </div>
      </main>
    </div>
  );
}
