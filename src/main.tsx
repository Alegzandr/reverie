import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n/config'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageRouter } from './components/LanguageRouter'

// Use base path for GitHub Pages in production
const basename = import.meta.env.PROD ? '/pitch-songs' : '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        <LanguageRouter>
          <App />
        </LanguageRouter>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
