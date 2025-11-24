import { useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, type SupportedLanguage } from '../i18n/config';

interface LanguageRouteProps {
  children: React.ReactNode;
}

/**
 * Component that handles language detection from URL and updates i18n
 * For non-English languages with :lang parameter
 */
function LanguageRoute({ children }: LanguageRouteProps) {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Listen for language changes and update URL accordingly
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (!supportedLanguages.includes(lng as SupportedLanguage)) return;

      // If changing to English, go to root
      if (lng === 'en') {
        if (location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      }
      // If currently on a language route and changing to another non-English language
      else if (lang && lang !== lng) {
        navigate(`/${lng}/`, { replace: true });
      }
      // If on root (English) and changing to non-English
      else if (!lang && lng !== 'en') {
        navigate(`/${lng}/`, { replace: true });
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, lang, navigate, location.pathname]);

  return <>{children}</>;
}

/**
 * Component for root path (English - default language)
 */
function EnglishRoute({ children }: LanguageRouteProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Set language to English when on root
    if (i18n.language !== 'en') {
      i18n.changeLanguage('en');
    }
  }, [i18n]);

  // Listen for language changes and update URL accordingly
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (lng !== 'en' && supportedLanguages.includes(lng as SupportedLanguage)) {
        // Navigate to the new language route
        navigate(`/${lng}/`, { replace: true });
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, navigate]);

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
