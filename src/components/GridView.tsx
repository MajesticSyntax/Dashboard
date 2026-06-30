import React, { useState, useEffect, memo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, MoreVertical, LayoutGrid, Pencil, Trash2, Info } from 'lucide-react';
import { getFavicon } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Website } from '../types';

interface WebsiteGridItemProps {
  website: Website;
  onVisit: (id: string, url: string) => void;
  onContextMenu: (e: React.MouseEvent, websiteId: string) => void;
  onEditTrigger: (e: React.MouseEvent, id: string) => void;
  onDeleteTrigger: (e: React.MouseEvent, id: string, name: string) => void;
}

const WebsiteGridItem = memo(({ website, onVisit, onContextMenu, onEditTrigger, onDeleteTrigger }: WebsiteGridItemProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.2 }}
    className="group relative h-32"
  >
    <div 
      onClick={() => onVisit(website.id, website.url)}
      onContextMenu={(e) => onContextMenu(e, website.id)}
      className="relative bg-white/[0.03] hover-shine backdrop-blur-md rounded-2xl p-4 h-full flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.05] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 shadow-xl cursor-pointer"
    >
      <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
        <button
          onClick={(e) => onEditTrigger(e, website.id)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white text-white/40 hover:text-black transition-all shadow-lg"
          title="Edit Website"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => onDeleteTrigger(e, website.id, website.name)}
          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-white/40 hover:text-white transition-all shadow-lg"
          title="Delete Website"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 shadow-inner mb-3 transition-transform group-hover:-translate-y-1"
        style={{ backgroundColor: `${website.color}20` }}
      >
        <img 
          src={getFavicon(website.url) || ''} 
          alt={website.name}
          className="w-5 h-5 rounded-md opacity-80 group-hover:opacity-100 transition-opacity"
        />
      </div>

      <div className="text-center w-full mt-auto">
        <h3 className="text-xs font-bold text-white/90 mb-0.5 group-hover:text-white transition-colors tracking-tight truncate w-full px-1">{website.name}</h3>
        <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.1em] truncate w-full px-1">
          {new URL(website.url).hostname}
        </p>
      </div>
    </div>
  </motion.div>
));
WebsiteGridItem.displayName = 'WebsiteGridItem';

export const GridView: React.FC = () => {
  const { searchQuery, selectedCategory, setEditingWebsiteId, selectedWebsiteId, setSelectedWebsiteId } = useStore();
  const queryClient = useQueryClient();
  const [gridColumns, setGridColumns] = useState(6);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    websiteId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    websiteId: null
  });

  const handleDeleteTrigger = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteTargetId(id);
    setDeleteTargetName(name);
  }, []);

  const handleEditTrigger = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEditingWebsiteId(id);
  }, [setEditingWebsiteId]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (e.button === 2) return;
      closeContextMenu();
    };
    window.addEventListener('click', handleDocumentClick);
    window.addEventListener('scroll', handleDocumentClick as any, true);
    return () => {
      window.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('scroll', handleDocumentClick as any, true);
    };
  }, [closeContextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent, websiteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      websiteId
    });
  }, []);

  const websites = useLiveQuery(() => db.websites.toArray()) || [];

  const handleVisit = useCallback(async (id: string, url: string) => {
    await db.incrementUsageCount(id);
    window.open(url, '_blank');
  }, []);

  const filteredWebsites = websites.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        w.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || w.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex justify-end items-center gap-3 border-b border-white/5 bg-black/20">
        <LayoutGrid className="w-4 h-4 text-white/40" />
        <input 
          type="range" 
          min="2" 
          max="12" 
          value={gridColumns}
          onChange={(e) => setGridColumns(Number(e.target.value))}
          className="w-32 accent-white/50 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer" 
        />
        <span className="text-xs font-mono text-white/40 w-4 text-right">{gridColumns}</span>
      </div>
      
      <div 
        className="grid gap-4 p-6 pb-20 overflow-y-auto flex-1 scroll-smooth"
        style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
      >
        <AnimatePresence mode="popLayout">
          {filteredWebsites.map((website) => (
            <WebsiteGridItem
              key={website.id}
              website={website as Website}
              onVisit={handleVisit}
              onContextMenu={handleContextMenu}
              onEditTrigger={handleEditTrigger}
              onDeleteTrigger={handleDeleteTrigger}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-[9999] min-w-[180px] glass-dark border border-white/10 rounded-2xl py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-black/95 flex flex-col overflow-hidden"
            style={{ 
              top: `${contextMenu.y}px`, 
              left: `${contextMenu.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contextMenu.websiteId) {
                  setSelectedWebsiteId(contextMenu.websiteId);
                }
                closeContextMenu();
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors text-left w-full"
            >
              <Info className="w-3.5 h-3.5 text-white/40" />
              View Details
            </button>
            <div className="h-px bg-white/5 mx-2 my-1" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contextMenu.websiteId) {
                  setEditingWebsiteId(contextMenu.websiteId);
                }
                closeContextMenu();
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors text-left w-full"
            >
              <Pencil className="w-3.5 h-3.5 text-white/40" />
              Edit
            </button>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contextMenu.websiteId) {
                  const node = await db.websites.get(contextMenu.websiteId);
                  if (node) {
                    setDeleteTargetId(node.id);
                    setDeleteTargetName(node.name);
                  }
                }
                closeContextMenu();
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors text-left w-full"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400/40" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Modal Confirmation for Deletion */}
      <AnimatePresence>
        {deleteTargetId && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm p-6 bg-[#0c0c0e]/95 border border-white/10 rounded-2xl shadow-2xl text-center backdrop-blur-xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">Delete Website Node?</h3>
              <p className="text-xs text-white/60 mt-2.5 leading-relaxed font-sans px-2">
                Are you sure you want to delete <span className="text-white font-bold">"{deleteTargetName}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => {
                    setDeleteTargetId(null);
                    setDeleteTargetName('');
                  }}
                  className="flex-1 py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (deleteTargetId) {
                      await db.websites.delete(deleteTargetId);
                      if (selectedWebsiteId === deleteTargetId) {
                        setSelectedWebsiteId(null);
                      }
                      queryClient.invalidateQueries({ queryKey: ['websites'] });
                      queryClient.invalidateQueries({ queryKey: ['websites-count'] });
                    }
                    setDeleteTargetId(null);
                    setDeleteTargetName('');
                  }}
                  className="flex-1 py-2 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-500/25"
                >
                  Delete Node
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
