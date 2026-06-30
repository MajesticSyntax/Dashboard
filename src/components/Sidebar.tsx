import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useStore } from '../store/useStore';
import { ViewMode } from '../types';
import { 
  LayoutGrid, 
  Network, 
  List, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  History, 
  Trash2,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Maximize2,
  Download,
  Upload,
  Cloud,
  Moon,
  Sun,
  Bell,
  User,
  PanelLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SidebarProps {
  onProfileClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onProfileClick }) => {
  const { 
    isSidebarOpen, 
    toggleSidebar, 
    selectedCategory, 
    setSelectedCategory, 
    settings, 
    userProfile,
    viewMode,
    setViewMode
  } = useStore();

  const websites = useLiveQuery(() => db.websites.toArray());

  const categoryCounts = React.useMemo(() => {
    if (!websites) return {};
    const counts: Record<string, number> = {};
    websites.forEach(w => {
      counts[w.category] = (counts[w.category] || 0) + 1;
    });
    return counts;
  }, [websites]);

  const websitesCount = websites?.length || 0;

  const categories = [
    { name: 'All', icon: Cloud, color: 'bg-white/40' },
    { name: 'AI', icon: Cloud, color: 'bg-emerald-400' },
    { name: 'Development', icon: LayoutGrid, color: 'bg-blue-400' },
    { name: 'Design', icon: LayoutGrid, color: 'bg-orange-400' },
    { name: 'Education', icon: LayoutGrid, color: 'bg-yellow-400' },
    { name: 'Productivity', icon: LayoutGrid, color: 'bg-purple-400' },
    { name: 'Finance', icon: LayoutGrid, color: 'bg-emerald-600' },
    { name: 'Social', icon: LayoutGrid, color: 'bg-pink-400' },
    { name: 'Entertainment', icon: LayoutGrid, color: 'bg-red-400' },
  ];

  const navigation = [
    { name: 'Network View', icon: Network, id: 'graph' },
    { name: 'Dashboard', icon: LayoutGrid, id: 'grid' },
    { name: 'List View', icon: List, id: 'list' },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ 
        x: isSidebarOpen ? 0 : -settings.sidebarWidth,
      }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-y-0 left-0 bg-transparent backdrop-blur-[40px] border-r border-white/10 flex flex-col z-[60] shadow-[20px_0_50px_rgba(0,0,0,0.3)]"
      style={{ width: settings.sidebarWidth }}
    >
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        {isSidebarOpen && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg font-bold tracking-tight text-white/90"
          >
            NEXUS
          </motion.span>
        )}
      </div>

       {/* Navigation */}
      <div className="flex-1 px-3 space-y-6 overflow-y-auto overflow-x-hidden pt-2">
        <div>
          {isSidebarOpen && (
            <p className="text-[9px] uppercase tracking-[0.25em] text-white px-3 mb-3 font-bold">Menu</p>
          )}
          <div className="space-y-0.5">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => setViewMode(item.id as ViewMode)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-300",
                  viewMode === item.id ? "bg-white/5 text-white shadow-sm" : "text-white/30 hover:bg-white/5 hover:text-white"
                )}
              >
                 <span className={cn(
                   "w-1 h-1 rounded-full transition-all",
                   viewMode === item.id ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" : "bg-white/10"
                 )} />
                 {isSidebarOpen && <span>{item.name}</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          {isSidebarOpen && (
            <p className="text-[10px] uppercase tracking-[0.25em] text-white px-3 mb-3 font-bold font-sans">Categories</p>
          )}
          <div className="space-y-0.5">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name === 'All' ? null : cat.name)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-[11px] transition-colors cursor-pointer group rounded-lg hover:bg-white/[0.02]",
                  selectedCategory === cat.name || (cat.name === 'All' && !selectedCategory)
                    ? "text-white"
                    : "text-white/30 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", cat.color)} />
                  {isSidebarOpen && <span className="font-medium">{cat.name}</span>}
                </div>
                {isSidebarOpen && (
                  <span className="text-[9px] text-white/20 font-bold group-hover:text-white/40 transition-colors">
                    {cat.name === 'All' ? websitesCount : (categoryCounts[cat.name] || 0)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-t border-white/5">
        <div 
          onClick={onProfileClick}
          className="bg-white/5 backdrop-blur-xl p-3 rounded-2xl flex items-center gap-3 group cursor-pointer hover:bg-white/10 transition-all border border-white/10"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/50 to-purple-500/50 flex items-center justify-center border border-white/10 overflow-hidden shadow-lg">
             <img src={userProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
          </div>
          {isSidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white/80 truncate">{userProfile.name}</p>
              <p className="text-[10px] text-white/30 font-bold tracking-tight uppercase truncate">{userProfile.role}</p>
            </div>
          )}
          {isSidebarOpen && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
        </div>
      </div>
    </motion.aside>
  );
};
