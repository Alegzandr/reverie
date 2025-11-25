import { useEffect, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supportedLanguages, type SupportedLanguage } from '../i18n/config';

interface LanguageRouteProps {
  children: React.ReactNode;
}

function LanguageRoute({ children }: LanguageRouteProps) {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isChangingLanguage = useRef(false);

  useEffect(() => {
    // Validate and apply language from URL
    if (lang && supportedLanguages.includes(lang as SupportedLanguage)) {
      if (i18n.language !== lang && !isChangingLanguage.current) {
        isChangingLanguage.current = true;
        i18n.changeLanguage(lang).finally(() => {
          isChangingLanguage.current = false;
        });
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
  const isChangingLanguage = useRef(false);

  useEffect(() => {
    // Set language to English when on root
    if (i18n.language !== 'en' && !isChangingLanguage.current) {
      isChangingLanguage.current = true;
      i18n.changeLanguage('en').finally(() => {
        isChangingLanguage.current = false;
      });
    }
  }, [i18n]);

  return <>{children}</>;
}

/**
 * Router component that sets up language-based routes
 * English (default) is at root /, other languages at /:lang/
 *
 * This component ensures URL is the source of truth for language selection,
 * preventing state resets and allowing seamless language switching.
 */
export function LanguageRouter({ children }: LanguageRouteProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const previousLanguage = useRef(i18n.language);

  // Sync URL when i18n language changes programmatically
  useEffect(() => {
    const handleLanguageChange = (newLang: string) => {
      // Only update URL if language actually changed and it's not from URL navigation
      if (newLang !== previousLanguage.current) {
        previousLanguage.current = newLang;

        // Extract current path without language prefix
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const currentFirstSegment = pathSegments[0];
        const isLangInPath = supportedLanguages.includes(currentFirstSegment as SupportedLanguage);

        // Get path without language prefix
        const pathWithoutLang = isLangInPath
          ? `/${pathSegments.slice(1).join('/')}`
          : location.pathname;

        // Build new path with new language
        const newPath = newLang === 'en'
          ? pathWithoutLang || '/'
          : `/${newLang}${pathWithoutLang}`;

        // Only navigate if path actually needs to change
        if (newPath !== location.pathname) {
          navigate(newPath, { replace: true });
        }
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, navigate, location.pathname]);

  return (
    <Routes>
      {/* Non-English language routes */}
      <Route path="/:lang/*" element={<LanguageRoute>{children}</LanguageRoute>} />

      {/* Root path - English (default language, no prefix) */}
      <Route path="/*" element={<EnglishRoute>{children}</EnglishRoute>} />
    </Routes>
  );
}
