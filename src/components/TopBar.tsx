import React from 'react';
import { useStore } from '../store/useStore';
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
  Layout
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TopBarProps {
  onAddClick: () => void;
  onSettingsClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onAddClick, onSettingsClick }) => {
  const { searchQuery, setSearchQuery, viewMode, setViewMode } = useStore();

  const viewModes = [
    { id: 'graph', icon: Network, label: 'Graph' },
    { id: 'grid', icon: Grid, label: 'Grid' },
    { id: 'list', icon: List, label: 'List' },
  ];

  return (
    <header className="h-20 flex items-center justify-center px-8 border-b border-white/5 z-20 bg-black/10 backdrop-blur-md">
      <div className="flex items-center gap-8">
        {/* Search Bar */}
        <div className="relative w-[450px] group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-500/50 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your digital universe..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 px-11 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-white/20 transition-all text-white"
          />
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
