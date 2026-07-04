import { createContext, useContext, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
type ThemeState = { theme: Theme; toggle: () => void };

const Ctx = createContext<ThemeState | null>(null);

function readTheme(): Theme {
  try {
    return (localStorage.getItem('ph-theme') as Theme) || 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // O atributo data-theme já foi aplicado pelo script inline do index.html
  // antes do paint — aqui só mantemos o estado React em sincronia.
  const [theme, setTheme] = useState<Theme>(readTheme);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('ph-theme', next);
    } catch {
      // storage indisponível — o tema vale só para a sessão
    }
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  };

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be inside <ThemeProvider>');
  return c;
}
