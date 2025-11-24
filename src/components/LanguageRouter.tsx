import { useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, type SupportedLanguage } from '../i18n/config';

interface LanguageRouteProps {
  children: React.ReactNode;
}

function LanguageRoute({ children }: LanguageRouteProps) {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Validate and apply language from URL
    if (lang && supportedLanguages.includes(lang as SupportedLanguage)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    } else if (lang) {
      // Invalid language in URL, redirect to English (default)
      navigate('/', { replace: true });
    }
  }, [lang, i18n, navigate]);

  return <>{children}</>;
}

/**
 * Component for root path (English - default language)
 */
function EnglishRoute({ children }: LanguageRouteProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set language to English when on root
    if (i18n.language !== 'en') {
      i18n.changeLanguage('en');
    }
  }, [i18n]);

  return <>{children}</>;
}

/**
 * Router component that sets up language-based routes
 * English (default) is at root /, other languages at /:lang/
 */
export function LanguageRouter({ children }: LanguageRouteProps) {
  return (
    <Routes>
      {/* Non-English language routes */}
      <Route path="/:lang/*" element={<LanguageRoute>{children}</LanguageRoute>} />

      {/* Root path - English (default language, no prefix) */}
      <Route path="/*" element={<EnglishRoute>{children}</EnglishRoute>} />
    </Routes>
  );
}
