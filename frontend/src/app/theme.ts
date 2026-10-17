import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'andon-theme';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Armazenamento indisponível: segue a preferência do sistema.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// O index.html aplica o tema antes do primeiro paint; aqui ele só é mantido e alternado.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Preferência só não persiste.
    }
  }, [theme]);

  return { theme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
