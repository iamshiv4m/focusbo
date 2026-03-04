import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Target, Clock, Zap, ArrowRight, Check, Plus, X } from 'lucide-react';

const STEP_COUNT = 3;

const GOAL_SUGGESTIONS = [
  'Ship a side project',
  'Learn a new skill',
  'Read 12 books this year',
  'Exercise daily',
  'Complete my thesis',
  'Build a portfolio',
  'Learn a language',
  'Deep work 4h/day',
];

const FOCUS_PRESETS = [
  { label: '1 hour', minutes: 60, desc: 'Light — just getting started' },
  { label: '2 hours', minutes: 120, desc: 'Balanced — most popular' },
  { label: '4 hours', minutes: 240, desc: 'Serious — deep work mode' },
  { label: '6 hours', minutes: 360, desc: 'Intense — full focus days' },
];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { completeOnboarding, addGoal, setUserPrefs } = useStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [goals, setGoals] = useState<string[]>([]);

  const [selectedMinutes, setSelectedMinutes] = useState(120);
  const [userName, setUserName] = useState('');

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const addCustomGoal = useCallback(() => {
    if (!customGoal.trim()) return;
    setGoals((prev) => [...prev, customGoal.trim()]);
    setCustomGoal('');
  }, [customGoal]);

  const toggleSuggestion = useCallback((suggestion: string) => {
    setSelectedSuggestions((prev) =>
      prev.includes(suggestion)
        ? prev.filter((s) => s !== suggestion)
        : [...prev, suggestion],
    );
  }, []);

  const handleFinish = useCallback(async () => {
    const allGoalNames = [...selectedSuggestions, ...goals];
    for (const name of allGoalNames) {
      await addGoal({
        id: generateId(),
        name,
        createdAt: Date.now(),
      });
    }

    await setUserPrefs({
      dailyFocusGoalMinutes: selectedMinutes,
    });

    await completeOnboarding();
    onComplete();
  }, [
    selectedSuggestions,
    goals,
    selectedMinutes,
    addGoal,
    setUserPrefs,
    completeOnboarding,
    onComplete,
  ]);

  const variants = {
    enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50 overflow-hidden px-6">
      <div className="flex gap-2 mb-10">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === step ? 20 : 6,
              background:
                i <= step ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="h-1.5 rounded-full"
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="w-full max-w-sm flex flex-col"
        >
          {step === 0 && (
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.1,
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                }}
                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
              >
                <Zap className="w-8 h-8 text-primary" />
              </motion.div>
              <h1 className="text-2xl font-semibold text-foreground mb-3 tracking-tight">
                Welcome to Focusbo
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Your personal focus companion. Track deep work, build streaks,
                and make every session count.
              </p>
              <p className="text-xs text-muted-foreground/60 mb-8">
                Takes 30 seconds to set up. All data stays on your device.
              </p>

              <div className="w-full flex flex-col gap-2">
                {[
                  { icon: Target, text: 'Set goals that matter to you' },
                  { icon: Clock, text: 'Track focused time, not just hours' },
                  { icon: Zap, text: 'Build momentum with daily streaks' },
                ].map(({ icon: Icon, text }, i) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-3 text-left px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-foreground mb-1.5 tracking-tight">
                  What are you working towards?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick a few goals or add your own. You can always change these
                  later.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {GOAL_SUGGESTIONS.map((suggestion) => {
                  const selected = selectedSuggestions.includes(suggestion);
                  return (
                    <motion.button
                      key={suggestion}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => toggleSuggestion(suggestion)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border"
                      style={{
                        background: selected
                          ? 'rgba(10, 132, 255, 0.15)'
                          : 'rgba(255,255,255,0.04)',
                        borderColor: selected
                          ? 'rgba(10, 132, 255, 0.4)'
                          : 'rgba(255,255,255,0.08)',
                        color: selected ? '#0a84ff' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {selected && <Check className="w-3 h-3 inline mr-1" />}
                      {suggestion}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomGoal()}
                  placeholder="Add your own goal..."
                  className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
                />
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={addCustomGoal}
                  disabled={!customGoal.trim()}
                  className="w-9 h-9 rounded-xl bg-primary/80 hover:bg-primary disabled:opacity-30 flex items-center justify-center border-0 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4 text-white" />
                </motion.button>
              </div>

              {goals.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {goals.map((goal, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                    >
                      <Target className="w-3 h-3 text-primary/60 flex-shrink-0" />
                      <span className="text-sm flex-1 text-foreground/80">
                        {goal}
                      </span>
                      <button
                        onClick={() =>
                          setGoals((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-muted-foreground/40 hover:text-muted-foreground bg-transparent border-0 cursor-pointer p-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedSuggestions.length === 0 && goals.length === 0 && (
                <p className="text-xs text-muted-foreground/40 mt-1">
                  Skip this — you can add goals anytime from the Goals screen.
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-foreground mb-1.5 tracking-tight">
                  Set your daily focus target
                </h2>
                <p className="text-sm text-muted-foreground">
                  How many hours of deep work do you want to do each day?
                </p>
              </div>

              <div className="flex flex-col gap-2 mb-5">
                {FOCUS_PRESETS.map((preset) => {
                  const selected = selectedMinutes === preset.minutes;
                  return (
                    <motion.button
                      key={preset.minutes}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedMinutes(preset.minutes)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer border transition-all text-left"
                      style={{
                        background: selected
                          ? 'rgba(10, 132, 255, 0.1)'
                          : 'rgba(255,255,255,0.03)',
                        borderColor: selected
                          ? 'rgba(10, 132, 255, 0.35)'
                          : 'rgba(255,255,255,0.07)',
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {preset.label}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          {preset.desc}
                        </p>
                      </div>
                      <motion.div
                        animate={{
                          scale: selected ? 1 : 0.7,
                          opacity: selected ? 1 : 0,
                        }}
                        className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </motion.div>
                    </motion.button>
                  );
                })}
              </div>

              <div>
                <p className="text-xs text-muted-foreground/50 mb-2">
                  What should we call you? (optional)
                </p>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between w-full max-w-sm mt-10">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={step === 0 ? undefined : goBack}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-0 bg-transparent cursor-pointer ${
            step === 0
              ? 'opacity-0 pointer-events-none'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Back
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={step === STEP_COUNT - 1 ? handleFinish : goNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold border-0 cursor-pointer hover:bg-primary/90 transition-colors"
        >
          {step === STEP_COUNT - 1 ? (
            <>
              <Zap className="w-4 h-4" />
              Start focusing
            </>
          ) : (
            <>
              {step === 1 &&
              selectedSuggestions.length === 0 &&
              goals.length === 0
                ? 'Skip'
                : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
