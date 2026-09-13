import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../db/db';
import { getSortedAscendingNodes, openNodeWebsite } from '../lib/searchUtils';
import { 
  Search, 
  Plus, 
  ArrowUpRight, 
  Download, 
  Settings as SettingsIcon,
  Bell,
  Grid,
  Network,
  List,
  Layout,
  CornerDownLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TopBarProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onAddClick, onSettingsClick }) => {
  const { searchQuery, setSearchQuery, viewMode, setViewMode, setSelectedWebsiteId } = useStore();
  const queryClient = useQueryClient();

  const { data: websites = [] } = useQuery({
    queryKey: ['websites'],
    queryFn: () => db.websites.toArray(),
  });

  const sortedNodes = useMemo(() => {
    return getSortedAscendingNodes(websites, searchQuery);
  }, [websites, searchQuery]);

  const firstAscendingNode = sortedNodes.length > 0 && searchQuery.trim() ? sortedNodes[0] : null;

  const handleOpenFirst = async () => {
    if (firstAscendingNode) {
      setSelectedWebsiteId(firstAscendingNode.id);
      await openNodeWebsite(firstAscendingNode, queryClient);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleOpenFirst();
    }
  };

  const viewModes = [
    { id: 'graph', icon: Network, label: 'Graph' },
    { id: 'grid', icon: Grid, label: 'Grid' },
    { id: 'list', icon: List, label: 'List' },
  ];

  return (
    <header className="h-20 flex items-center justify-center px-8 border-b border-white/5 z-20 bg-black/10 backdrop-blur-md">
      <div className="flex items-center gap-8">
        {/* Search Bar */}
        <div className="relative w-[480px] group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-500/50 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search nodes or type letter/word (↵ to open)..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-32 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-white/20 transition-all text-white"
          />

          {firstAscendingNode ? (
            <button
              onClick={handleOpenFirst}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold transition-all shadow-sm cursor-pointer group/btn"
              title="Press Enter to open first ascending match"
            >
              <CornerDownLeft className="w-3 h-3 text-blue-400 group-hover/btn:translate-x-0.5 transition-transform" />
              <span className="truncate max-w-[130px]">Open: {firstAscendingNode.name}</span>
            </button>
          ) : (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-white/30 font-mono pointer-events-none">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-bold">⌘K</kbd>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md p-1">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={cn(
                "px-4 py-1.5 rounded text-xs font-medium transition-all relative",
                viewMode === mode.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-2">
          <button 
            onClick={onAddClick}
            className="p-2.5 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white group relative"
          >
            <Plus className="w-4 h-4" />
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
              Add Website
            </span>
          </button>
          <button 
            onClick={onSettingsClick}
            className="p-2.5 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white group relative"
          >
            <SettingsIcon className="w-4 h-4" />
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
              Settings
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
