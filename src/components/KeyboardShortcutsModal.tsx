import React from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { X, Command, Keyboard } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const { isKeyboardShortcutsOpen, setKeyboardShortcutsOpen } = useStore();

  const shortcuts = [
    {
      category: 'Global',
      items: [
        { keys: ['⌘', 'K'], label: 'Global Search (Mac)' },
        { keys: ['Ctrl', 'K'], label: 'Global Search (Windows)' },
        { keys: ['Esc'], label: 'Close Modals / Deselect' },
      ],
    },
    {
      category: 'Graph View',
      items: [
        { keys: ['Right Click'], label: 'Node Context Menu' },
        { keys: ['Ctrl', 'Click'], label: 'Node Context Menu (Alternative)' },
        { keys: ['Shift', 'Click'], label: 'Multi-select Nodes' },
        { keys: ['⌘', 'Click'], label: 'Multi-select Nodes (Mac)' },
        { keys: ['Scroll'], label: 'Zoom In / Out' },
        { keys: ['Drag'], label: 'Pan Canvas' },
      ],
    }
  ];

  if (!isKeyboardShortcutsOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center z-[110] p-6 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setKeyboardShortcutsOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg glass-dark rounded-[24px] border border-white/10 shadow-2xl relative overflow-hidden pointer-events-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/20">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Keyboard Shortcuts</h2>
                <p className="text-xs text-white/50 font-medium mt-0.5">Navigate and control with precision</p>
              </div>
            </div>
            <button
              onClick={() => setKeyboardShortcutsOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-black/20">
            {shortcuts.map((group, i) => (
              <div key={i} className="space-y-4">
                <h3 className="text-[10px] font-extrabold text-blue-400/80 uppercase tracking-[0.2em]">{group.category}</h3>
                <div className="space-y-2">
                  {group.items.map((shortcut, j) => (
                    <div key={j} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                      <span className="text-sm font-medium text-white/80">{shortcut.label}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {shortcut.keys.map((key, k) => (
                          <React.Fragment key={k}>
                            <kbd className="px-2 py-1.5 min-w-[32px] text-center rounded-lg bg-white/10 border-b-2 border-white/20 text-xs font-mono font-bold text-white shadow-sm">
                              {key}
                            </kbd>
                            {k < shortcut.keys.length - 1 && (
                              <span className="text-white/30 text-xs font-bold">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
