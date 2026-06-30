import React, { useState, useEffect, memo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Globe, Clock, BarChart2, Trash2, Pencil, Info } from 'lucide-react';
import { getFavicon } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Website } from '../types';

interface WebsiteListItemProps {
  website: Website;
  onVisit: (id: string, url: string) => void;
  onContextMenu: (e: React.MouseEvent, websiteId: string) => void;
  onDeleteTrigger: (e: React.MouseEvent, id: string, name: string) => void;
}

const WebsiteListItem = memo(({ website, onVisit, onContextMenu, onDeleteTrigger }: WebsiteListItemProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
    transition={{ duration: 0.2 }}
    className="group"
    onContextMenu={(e: React.MouseEvent) => onContextMenu(e, website.id)}
  >
    <div 
      onClick={() => onVisit(website.id, website.url)}
      className="bg-white/[0.02] hover:bg-white/[0.05] hover-shine border border-white/5 hover:border-white/10 rounded-xl py-2 px-3.5 flex items-center gap-4 transition-all duration-300 cursor-pointer"
    >
      <div className="flex-[2] flex items-center gap-3.5 min-w-0">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 shadow-inner shrink-0"
          style={{ backgroundColor: `${website.color}15` }}
        >
          <img 
            src={getFavicon(website.url) || ''} 
            alt={website.name}
            className="w-4 h-4 rounded opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-white tracking-tight leading-snug truncate">{website.name}</h3>
          <p className="text-[10px] text-white/40 font-medium truncate max-w-[180px] leading-tight mt-0.5">{website.url}</p>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <span className="inline-flex px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-white/70 uppercase tracking-wider border border-white/5">
          {website.category}
        </span>
      </div>

      <div className="flex-1 flex items-center gap-1.5 text-[10px] text-white/60 font-semibold min-w-0">
        <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="truncate">{new Date(website.lastOpened).toLocaleDateString()}</span>
      </div>

      <div className="flex-1 flex items-center gap-1.5 text-[10px] text-white/60 font-bold min-w-0">
        <BarChart2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="truncate">{website.usageCount}</span>
      </div>

      <div className="w-24 flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onVisit(website.id, website.url);
          }}
          className="p-1.5 rounded-lg hover:bg-blue-500/20 text-white/50 hover:text-white transition-all active:scale-90"
          title="Visit Website"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={(e) => onDeleteTrigger(e, website.id, website.name)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all active:scale-90"
          title="Delete Website"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </motion.div>
));
WebsiteListItem.displayName = 'WebsiteListItem';

export const ListView: React.FC = () => {
  const { searchQuery, selectedCategory, setEditingWebsiteId, selectedWebsiteId, setSelectedWebsiteId } = useStore();
  const queryClient = useQueryClient();
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

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

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
  }, []);

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

  const filteredWebsites = websites.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        w.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || w.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleVisit = useCallback(async (id: string, url: string) => {
    await db.incrementUsageCount(id);
    window.open(url, '_blank');
  }, []);

  const handleDeleteTrigger = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteTargetId(id);
    setDeleteTargetName(name);
  }, []);

  return (
    <div className="flex flex-col gap-1.5 p-4 pb-20 overflow-y-auto h-full scroll-smooth">
      <div className="flex items-center px-3.5 py-1.5 text-[9px] font-bold text-white/50 uppercase tracking-[0.2em] border-b border-white/5 mb-1.5">
        <div className="flex-[2]">Website</div>
        <div className="flex-1">Category</div>
        <div className="flex-1 text-left">Last Visited</div>
        <div className="flex-1 text-left">Usage</div>
        <div className="w-24 text-right pr-4">Actions</div>
      </div>
      
      <AnimatePresence mode="popLayout">
        {filteredWebsites.map((website) => (
          <WebsiteListItem
            key={website.id}
            website={website as Website}
            onVisit={handleVisit}
            onContextMenu={handleContextMenu}
            onDeleteTrigger={handleDeleteTrigger}
          />
        ))}
      </AnimatePresence>

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

      {/* Beautiful Native-Looking Modal Confirmation for Deletion */}
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
