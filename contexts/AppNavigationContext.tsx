import React, { createContext, useContext } from 'react';

export type AppNavigationContextValue = {
  setView: (view: string) => void;
};

export const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

export function useAppNavigation(): AppNavigationContextValue | null {
  return useContext(AppNavigationContext);
}
