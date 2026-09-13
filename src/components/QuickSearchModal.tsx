import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  ExternalLink, 
  CornerDownLeft, 
  Globe, 
  ArrowRight,
  BarChart2
} from 'lucide-react';
import { getFavicon } from '../lib/utils';
import { getSortedAscendingNodes, openNodeWebsite } from '../lib/searchUtils';
import { Website } from '../types';

export const QuickSearchModal: React.FC = () => {
  const { 
    isQuickSearchOpen, 
    setQuickSearchOpen, 
    searchQuery, 
    setSearchQuery,
    setSelectedWebsiteId 
  } = useStore();

  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch websites
  const { data: websites = [] } = useQuery({
    queryKey: ['websites'],
    queryFn: () => db.websites.toArray(),
  });

  // Calculate ascending matches
  const sortedNodes = useMemo(() => {
    return getSortedAscendingNodes(websites, searchQuery);
  }, [websites, searchQuery]);

  // The first ascending search node
  const firstAscendingNode = sortedNodes.length > 0 ? sortedNodes[0] : null;
  const activeNode = sortedNodes[selectedIndex] || firstAscendingNode;

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when modal opens and place cursor at end
  useEffect(() => {
    if (isQuickSearchOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 50);
    }
  }, [isQuickSearchOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (listContainerRef.current) {
      const activeEl = listContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleOpen = useCallback(async (nodeToOpen: Website | null) => {
    if (!nodeToOpen) {
      // Fallback: If no node matches but user typed something, search on web
      if (searchQuery.trim()) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery.trim())}`, '_blank');
        setQuickSearchOpen(false);
      }
      return;
    }

    setSelectedWebsiteId(nodeToOpen.id);
    setQuickSearchOpen(false);
    await openNodeWebsite(nodeToOpen, queryClient);
  }, [searchQuery, setSelectedWebsiteId, setQuickSearchOpen, queryClient]);

  // Handle keyboard events in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (sortedNodes.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % sortedNodes.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sortedNodes.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + sortedNodes.length) % sortedNodes.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleOpen(activeNode);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuickSearchOpen(false);
    }
  };

  if (!isQuickSearchOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="quick-search-overlay"
        className="fixed inset-0 z-[120] flex items-start justify-center pt-[10vh] px-4 select-none pointer-events-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setQuickSearchOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="relative w-full max-w-2xl bg-[#090d16]/95 border border-white/15 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(59,130,246,0.15)] overflow-hidden flex flex-col max-h-[78vh] z-10"
        >
          {/* Top Search Input Bar */}
          <div className="relative p-4 border-b border-white/10 flex items-center gap-3 bg-white/[0.02]">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 shrink-0">
              <Search className="w-5 h-5" />
            </div>

            <div className="flex-1 relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type any letter or word to open node..."
                className="w-full bg-transparent border-none text-white text-base font-medium placeholder:text-white/30 focus:outline-none focus:ring-0 pr-24"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all mr-1"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Open badge indicator for first ascending match */}
            {firstAscendingNode && (
              <button
                onClick={() => handleOpen(firstAscendingNode)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm group"
                title="Press Enter to open first ascending match"
              >
                <CornerDownLeft className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                <span className="truncate max-w-[130px]">Open: {firstAscendingNode.name}</span>
              </button>
            )}

            <button
              onClick={() => setQuickSearchOpen(false)}
              className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/60">Esc</kbd>
            </button>
          </div>

          {/* Results List */}
          <div 
            ref={listContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 max-h-[50vh]"
          >
            {sortedNodes.length > 0 ? (
              sortedNodes.map((node, index) => {
                const isSelected = index === selectedIndex;
                const isFirst = index === 0;

                return (
                  <div
                    key={node.id}
                    data-index={index}
                    onClick={() => handleOpen(node)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group relative p-3 rounded-xl flex items-center gap-3.5 transition-all duration-150 cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)] text-white'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-white/80'
                    }`}
                  >
                    {/* Ascending Rank Badge */}
                    <span 
                      className={`w-5 text-center text-xs font-mono font-bold shrink-0 ${
                        isFirst ? 'text-blue-400' : 'text-white/30'
                      }`}
                    >
                      #{index + 1}
                    </span>

                    {/* Logo / Favicon */}
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 shadow-inner shrink-0"
                      style={{ backgroundColor: `${node.color || '#3b82f6'}20` }}
                    >
                      <img
                        src={getFavicon(node.url) || ''}
                        alt={node.name}
                        className="w-4.5 h-4.5 rounded object-contain"
                        onError={(e) => {
                          // fallback if favicon fails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Node Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight truncate">
                          {node.name}
                        </h4>
                        {isFirst && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[9px] font-extrabold uppercase tracking-wider">
                            1st Match
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 font-normal truncate mt-0.5">
                        {node.url}
                      </p>
                    </div>

                    {/* Meta info: Category & Usage count */}
                    <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-white/60">
                        {node.category}
                      </span>
                      {node.usageCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-white/40 font-mono">
                          <BarChart2 className="w-3 h-3 text-emerald-400" />
                          {node.usageCount}
                        </span>
                      )}
                    </div>

                    {/* Action button / enter indicator */}
                    <div className="shrink-0 flex items-center pl-1">
                      {isSelected ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-bold shadow-md animate-pulse">
                          <span>Open</span>
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty state */
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/80">No nodes found matching &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-xs text-white/40 mt-1">Press Enter to search the web, or try typing a different letter or word.</p>
                </div>
                {searchQuery.trim() && (
                  <button
                    onClick={() => handleOpen(null)}
                    className="mt-2 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <span>Search Google for &ldquo;{searchQuery.trim()}&rdquo;</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
