import { ReactNode, useEffect } from 'react';
import { useStore } from '../store/useStore';
import Nav from './Nav';
import { X } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { state, closeSecondary } = useStore();
  const theme = state?.theme ?? 'dark';

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('theme-light');
    } else {
      html.classList.remove('dark');
      html.classList.add('theme-light');
    }
  }, [theme]);

  const baseTheme =
    `h-screen theme-${theme} ${theme === 'dark' ? 'dark' : ''}` as const;

  return (
    <div className={`${baseTheme} h-screen flex flex-col overflow-hidden`}>
      {/* Unified header + nav */}
      <div
        className="flex flex-col px-5 pt-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-[22px] h-[22px] rounded-[7px] bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-white leading-none">
                F
              </span>
            </div>
            <span className="text-[13px] font-semibold tracking-[-0.02em] text-foreground/80">
              Focusbo
            </span>
          </div>
          <button
            onClick={() => closeSecondary()}
            className="group flex items-center justify-center w-6 h-6 rounded-full bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-colors cursor-pointer border-0 p-0"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            aria-label="Close window"
          >
            <X className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          </button>
        </div>
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Nav />
        </div>
      </div>
      <main className="hide-scrollbar flex-1 min-w-0 overflow-y-auto px-5 py-4">
        <div className="max-w-full mx-auto w-full pb-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
