import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
}

const lightColors: ThemeColors = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#6366f1',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  shadow: 'rgba(0,0,0,0.1)',
};

const darkColors: ThemeColors = {
  primary: '#60a5fa',
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',
  info: '#818cf8',
  surface: '#1f2937',
  surfaceAlt: '#111827',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  border: '#374151',
  shadow: 'rgba(0,0,0,0.3)',
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });

  const colors = theme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.style.backgroundColor = colors.surface;
    document.body.style.color = colors.text;
  }, [theme, colors]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
