import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Palette, X, Layers } from 'lucide-react';

export const BatchActionsPanel: React.FC = () => {
  const { selectedWebsiteIds, clearWebsiteSelection } = useStore();
  const queryClient = useQueryClient();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const colors = [
    '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
    '#14b8a6', '#6366f1', '#f43f5e', '#84cc16'
  ];

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    await Promise.all(selectedWebsiteIds.map(id => db.websites.delete(id)));
    queryClient.invalidateQueries({ queryKey: ['websites'] });
    clearWebsiteSelection();
    setIsConfirmingDelete(false);
  };

  const handleUpdateColor = async (color: string) => {
    await Promise.all(selectedWebsiteIds.map(id => 
      db.websites.update(id, { color, isCustomColor: true })
    ));
    queryClient.invalidateQueries({ queryKey: ['websites'] });
    setShowColorPicker(false);
  };

  if (selectedWebsiteIds.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-6 z-[60] shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
            {selectedWebsiteIds.length}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Nodes Selected</span>
            <span className="text-xs text-white/50">Batch operations</span>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all flex items-center gap-2"
            >
              <Palette className="w-4 h-4" />
              Color
            </button>
            
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-4 rounded-2xl bg-[#151515] border border-white/10 shadow-2xl flex flex-wrap gap-2 w-[180px] z-[65]"
                >
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => handleUpdateColor(c)}
                      className="w-8 h-8 rounded-full border border-white/10 hover:scale-125 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleDelete}
            onMouseLeave={() => setIsConfirmingDelete(false)}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 text-sm ${isConfirmingDelete ? 'bg-red-500 text-white' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'}`}
          >
            <Trash2 className="w-4 h-4" />
            {isConfirmingDelete ? 'Confirm' : 'Delete'}
          </button>
        </div>

        <button
          onClick={() => {
            clearWebsiteSelection();
            setShowColorPicker(false);
          }}
          className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors ml-2"
        >
          <X className="w-5 h-5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
