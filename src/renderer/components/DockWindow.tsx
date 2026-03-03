import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Play, Target, ListTodo, BarChart3, ChevronLeft } from 'lucide-react';

const OPTIONS = [
  { route: '/', label: 'Focus', icon: Play },
  { route: '/goals', label: 'Goals', icon: Target },
  { route: '/todos', label: 'Todos', icon: ListTodo },
  { route: '/progress', label: 'Progress', icon: BarChart3 },
] as const;

const containerVariants = {
  collapsed: { width: 58 },
  options: { width: 140 },
};

const optionVariants = {
  hidden: { opacity: 0, x: 4 },
  visible: { opacity: 1, x: 0 },
};

export default function DockWindow() {
  const { state, setWindowState, openSecondary } = useStore();
  const windowState = state?.windowState ?? 'collapsed';

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('dock-window', 'dark');
    html.classList.remove('theme-light');
    return () => html.classList.remove('dock-window');
  }, []);

  const baseTheme = 'min-h-screen dark' as const;

  return (
    <div
      className={`${baseTheme} w-full h-full flex justify-end overflow-hidden`}
    >
      <motion.div
        layout
        initial={false}
        animate={windowState === 'options' ? 'options' : 'collapsed'}
        variants={containerVariants}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="dock-strip h-full flex flex-col overflow-hidden rounded-l-2xl flex-shrink-0"
      >
        <AnimatePresence mode="wait">
          {windowState === 'collapsed' ? (
            <motion.button
              key="collapsed"
              type="button"
              onClick={() => setWindowState('options')}
              className="w-full h-full min-h-[56px] flex items-center justify-center cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.01] transition-colors rounded-l-2xl"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-label="Expand options"
            >
              <Play className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.div
              key="options"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.03,
                    delayChildren: 0.06,
                  },
                },
              }}
              className="flex-1 flex flex-col pt-1.5 pb-3 px-2 min-w-0"
            >
              {OPTIONS.map(({ route, label, icon: Icon }, i) => (
                <motion.button
                  key={route}
                  variants={optionVariants}
                  type="button"
                  onClick={() => openSecondary(route)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left font-medium text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] active:scale-[0.98] transition-all cursor-pointer"
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="truncate">{label}</span>
                </motion.button>
              ))}
              <motion.button
                variants={optionVariants}
                type="button"
                onClick={() => setWindowState('collapsed')}
                className="mt-auto mb-0.5 h-7 w-8 self-center rounded-full border border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-200 cursor-pointer flex items-center justify-center"
                aria-label="Collapse"
                whileHover={{ y: -1, scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
