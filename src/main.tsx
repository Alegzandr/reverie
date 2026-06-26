import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Reverie's two faces, both self-hosted (no third-party request):
//  - Fraunces (soft cut): the oneiric display serif for the wordmark + headings.
//  - Hanken Grotesk: the warm humanist sans that carries the whole UI/body.
// Variable fonts, Latin subset only (~62KB + ~35KB), loaded on demand via
// unicode-range, so non-Latin locales fetch nothing and fall back per-glyph.
import '@fontsource-variable/fraunces/soft.css'
import '@fontsource-variable/hanken-grotesk/index.css'
import './index.css'
import './i18n/config'
import App from './App.tsx'
import { MoodProvider } from './contexts/MoodContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TooltipProvider } from './components/ui/tooltip'
import { PerformanceHint } from './components/PerformanceHint'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MoodProvider>
        <TooltipProvider delayDuration={300}>
          <App />
          {/* Fixed-position overlay: self-gates to software rendering, so it sits
              outside App's branch logic and shows on both welcome and workspace. */}
          <PerformanceHint />
        </TooltipProvider>
      </MoodProvider>
    </ErrorBoundary>
  </StrictMode>,
)
