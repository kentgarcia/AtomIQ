import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getTheme, setTheme as saveTheme } from '@/services/storage';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const savedTheme = await getTheme();
    setColorSchemeState(savedTheme);
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    await saveTheme(scheme);
  };

  const toggleTheme = async () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    await setColorScheme(newScheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        isDark: colorScheme === 'dark',
        toggleTheme,
        setColorScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Backward compatibility
export function useColorScheme(): ColorScheme {
  const { colorScheme } = useTheme();
  return colorScheme;
}
