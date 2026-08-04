import { motion, AnimatePresence } from 'framer-motion';
import { Play, Settings, Save, RotateCcw, LogOut } from 'lucide-react';
import { QUALITY_LABELS_AR } from '@/lib/gameQuality';

export default function MoodGamePauseSheet({ open, qualityMode, onClose, onSetQuality, onSaveExit, onStartOver, onExit }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 bg-tamam-ink/80 z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-tamam-surface rounded-t-3xl p-4 pb-safe"
            dir="rtl"
          >
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full bg-tamam-outline/40" />
            </div>
            <h3 className="text-tamam-text font-bold text-base mb-3 text-center">إيقاف مؤقت</h3>

            <div className="space-y-2">
              <button onClick={onClose} className="w-full flex items-center gap-3 bg-tamam-green text-tamam-ink font-bold text-sm py-3 rounded-xl px-4">
                <Play size={18} fill="currentColor" /> متابعة اللعب
              </button>

              <div className="bg-tamam-surface-low rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Settings size={14} className="text-tamam-text-muted" />
                  <span className="text-tamam-text-muted text-[11px] font-semibold">جودة الرسم</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['auto', 'high', 'balanced', 'lite'].map((m) => (
                    <button
                      key={m}
                      onClick={() => onSetQuality(m)}
                      className={`py-2 rounded-lg text-[10px] font-bold ${qualityMode === m ? 'bg-tamam-green text-tamam-ink' : 'bg-tamam-surface-high text-tamam-text-muted'}`}
                    >
                      {QUALITY_LABELS_AR[m]}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={onStartOver} className="w-full flex items-center gap-3 bg-tamam-surface-high text-tamam-text font-bold text-sm py-3 rounded-xl px-4">
                <RotateCcw size={16} /> ابدأ من جديد
              </button>

              <button onClick={onSaveExit} className="w-full flex items-center gap-3 bg-tamam-surface-high text-tamam-text font-bold text-sm py-3 rounded-xl px-4">
                <Save size={16} /> حفظ والخروج
              </button>

              <button onClick={onExit} className="w-full flex items-center gap-3 text-tamam-text-muted text-sm py-2 px-4">
                <LogOut size={16} /> الخروج بدون حفظ
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}