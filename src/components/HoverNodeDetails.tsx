import React from 'react';
import { useStore } from '../store/useStore';
import { useQuery } from '@tanstack/react-query';
import { db } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Calendar, Globe, Activity } from 'lucide-react';
import { getFavicon } from '../lib/utils';
import { format } from 'date-fns';

export const HoverNodeDetails: React.FC = () => {
  const { hoveredWebsiteId, selectedWebsiteId, selectedWebsiteIds } = useStore();

  // Don't show hover details if a node is currently selected or batch selected
  const shouldShow = hoveredWebsiteId && !selectedWebsiteId && selectedWebsiteIds.length === 0;

  const { data: website } = useQuery({
    queryKey: ['website', hoveredWebsiteId],
    queryFn: () => hoveredWebsiteId ? db.websites.get(hoveredWebsiteId) : null,
    enabled: !!hoveredWebsiteId,
  });

  return (
    <AnimatePresence>
      {shouldShow && website && (
        <motion.aside
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-[12.5%] bottom-[12.5%] right-6 w-[360px] glass-dark border border-white/10 shadow-[10px_10px_40px_rgba(0,0,0,0.6)] z-[58] flex flex-col rounded-[24px] overflow-hidden pointer-events-none"
        >
          {/* Header */}
          <div className="p-8 flex items-start justify-between">
            <div className="flex items-center gap-4 text-left">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl relative overflow-hidden"
                style={{ backgroundColor: `${website.color}15` }}
              >
                <img src={getFavicon(website.url) || ''} className="w-8 h-8 relative z-10" alt="logo" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{website.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="w-3 h-3 text-white/30" />
                  <span className="text-xs font-medium text-white/40">{new URL(website.url).hostname}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Visits</span>
                    <Activity className="w-3 h-3 text-white/20" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-white">{website.usageCount}</span>
                  </div>
                </div>
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Category</span>
                    <Tag className="w-3 h-3 text-white/20" />
                  </div>
                  <span className="text-lg font-bold text-blue-400">{website.category}</span>
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] block">Classification</span>
                <div className="flex flex-wrap gap-2">
                  {website.tags.map((tag: string) => (
                    <span key={tag} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[11px] font-semibold text-white/50">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description Section */}
              <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                <div 
                  className="absolute -right-10 -top-10 w-40 h-40 blur-[80px] opacity-10 transition-opacity duration-700"
                  style={{ backgroundColor: website.color }}
                />
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] block mb-4">Neural Data</span>
                <p className="text-sm text-white/60 leading-relaxed font-medium">
                  {website.description || 'No additional metadata synchronized for this node.'}
                </p>
              </div>

              {/* Date Metadata */}
              <div className="flex items-center gap-3 px-2 text-white/20">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Indexed on {format(website.createdAt, 'MMMM dd, yyyy')}</span>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
