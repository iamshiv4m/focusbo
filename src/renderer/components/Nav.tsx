import { NavLink } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Focus', end: true },
  { to: '/goals', label: 'Goals' },
  { to: '/todos', label: 'Todos' },
  { to: '/progress', label: 'Progress' },
];

export default function Nav() {
  return (
    <nav className="flex items-center gap-0.5 pb-2.5 overflow-x-auto">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'px-3 py-1.5 rounded-lg font-medium text-[13px] transition-all duration-200 no-underline whitespace-nowrap',
              isActive
                ? 'text-foreground bg-black/[0.06] dark:bg-white/[0.08]'
                : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
            )
          }
          end={item.end}
        >
          {item.label}
        </NavLink>
      ))}
      <div className="flex-1" />
      <div className="w-px h-4 bg-black/[0.06] dark:bg-white/[0.06] mx-1" />
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            'px-2.5 py-1.5 rounded-lg transition-all duration-200 no-underline',
            isActive
              ? 'text-foreground bg-black/[0.06] dark:bg-white/[0.08]'
              : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
          )
        }
        aria-label="Settings"
      >
        <Settings className="h-[15px] w-[15px]" />
      </NavLink>
    </nav>
  );
}
