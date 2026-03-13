import React, { createContext, useContext, useEffect } from 'react';

/** Thème fixe : uniquement mode clair. Plus de bascule dark/light. */
type Theme = 'light';

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.setAttribute('data-theme', 'light');
    // Nettoyer l’ancienne préférence stockée
    try {
      window.localStorage.removeItem('ecosystia-theme');
    } catch {
      /* ignore */
    }
  }, []);

  const value: ThemeContextValue = { theme: 'light' };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
