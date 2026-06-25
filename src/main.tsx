import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n/config'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageRouter } from './components/LanguageRouter'
import { ErrorBoundary } from './components/ErrorBoundary'

// Use base path for GitHub Pages in production
const basename = import.meta.env.PROD ? '/reverie' : '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <ThemeProvider>
          <LanguageRouter>
            <App />
          </LanguageRouter>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
