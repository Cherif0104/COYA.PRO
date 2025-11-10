
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { Language, Translation } from '../types';
import { translations } from '../constants/localization';

interface LocalizationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof Translation) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Détecter la langue du navigateur ou charger depuis localStorage
  const getInitialLanguage = (): Language => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('app_language');
      if (savedLang === 'FR' || savedLang === 'EN') {
        return savedLang as Language;
      }
      // Détecter la langue du navigateur
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('fr')) {
        return Language.FR;
      }
    }
    return Language.EN;
  };

  const [language, setLanguage] = useState<Language>(getInitialLanguage());

  // Sauvegarder la langue dans localStorage quand elle change
  const handleSetLanguage = useCallback((newLang: Language) => {
    setLanguage(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', newLang);
    }
  }, []);

  const t = useCallback((key: keyof Translation): string => {
    return translations[language][key] || translations[Language.EN][key] || String(key);
  }, [language]);

  return (
    <LocalizationContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
