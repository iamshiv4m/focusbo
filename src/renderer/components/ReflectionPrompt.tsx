import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';

export type Mood = 'great' | 'okay' | 'rough';

interface ReflectionPromptProps {
  sessionDuration: number;
  taskName?: string;
  onSave: (mood: Mood, note: string) => void;
  onSkip: () => void;
}

const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '😊', label: 'Great', color: '#30d158' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: '#ff9f0a' },
  { value: 'rough', emoji: '😔', label: 'Rough', color: '#ff453a' },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function ReflectionPrompt({
  sessionDuration,
  taskName,
  onSave,
  onSkip,
}: ReflectionPromptProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  const handleSave = useCallback(() => {
    if (!selectedMood) return;
    onSave(selectedMood, note.trim());
  }, [selectedMood, note, onSave]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="fixed inset-0 flex items-center justify-center z-50 px-5"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-5 relative"
        style={{
          background: 'rgba(18, 18, 24, 0.96)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all bg-transparent border-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Session complete
          </span>
        </div>
        <p className="text-base font-semibold text-foreground mb-0.5">
          {formatDuration(sessionDuration)} of focus
        </p>
        {taskName && (
          <p className="text-xs text-muted-foreground/60 mb-4 truncate">
            {taskName}
          </p>
        )}
        {!taskName && <div className="mb-4" />}

        <p className="text-xs text-muted-foreground mb-3">
          How was that session?
        </p>
        <div className="flex gap-2 mb-4">
          {MOODS.map((mood) => (
            <motion.button
              key={mood.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setSelectedMood(mood.value);
                setShowNote(true);
              }}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl cursor-pointer border transition-all"
              style={{
                background:
                  selectedMood === mood.value
                    ? `${mood.color}15`
                    : 'rgba(255,255,255,0.03)',
                borderColor:
                  selectedMood === mood.value
                    ? `${mood.color}50`
                    : 'rgba(255,255,255,0.07)',
              }}
            >
              <span className="text-xl">{mood.emoji}</span>
              <span
                className="text-[10px] font-medium"
                style={{
                  color:
                    selectedMood === mood.value
                      ? mood.color
                      : 'rgba(255,255,255,0.4)',
                }}
              >
                {mood.label}
              </span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {showNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4"
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any notes? (optional)"
                rows={2}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/30 transition-colors resize-none"
                style={{ fontFamily: 'inherit' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!selectedMood}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          style={{
            background: selectedMood
              ? (MOODS.find((m) => m.value === selectedMood)?.color ??
                'var(--primary)')
              : 'rgba(255,255,255,0.08)',
            color: 'white',
          }}
        >
          Save reflection
        </motion.button>
      </div>
    </motion.div>
  );
}
