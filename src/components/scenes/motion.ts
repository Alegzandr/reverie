/**
 * Should the ambient backdrop animate? Desktop goes all out (live WebGL / canvas
 * scene); mobile and touch devices get a still frame to spare the battery, and
 * `prefers-reduced-motion` always wins. The same predicate gates the CSS scene
 * animations (see the matching media query in index.css), so JS and CSS stay in
 * sync about when a scene is alive.
 */
export function animatedBackdropAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;
  return !reduce && desktop;
}
