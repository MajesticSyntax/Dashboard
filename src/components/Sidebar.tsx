import React, { useState } from 'react';
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
  Folder,
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
    setViewMode,
    categories,
    addCategory,
    deleteCategory
  } = useStore();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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

  const displayCategories = [
    { name: 'All' },
    ...categories
  ];

  const navigation = [
    { name: 'Network View', icon: Network, id: 'graph' },
    { name: 'Dashboard', icon: LayoutGrid, id: 'grid' },
    { name: 'List View', icon: List, id: 'list' },
  ];

  const handleAddCategorySubmit = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    
    addCategory({
      name: trimmed,
      color: '#94a3b8'
    });
    
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

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
            <div className="flex items-center justify-between px-3 mb-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white font-bold font-sans">Categories</p>
              <button 
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="p-1 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                title="Add Category"
              >
                <Plus className={cn("w-3.5 h-3.5 transition-transform duration-300", isAddingCategory && "rotate-45")} />
              </button>
            </div>
          )}

          {isAddingCategory && isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 mb-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-2.5 mx-2"
            >
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-2.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500/40 text-white font-medium"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategorySubmit();
                  }
                }}
              />
              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-white/60 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCategorySubmit}
                  className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-[10px] font-bold text-white transition-colors cursor-pointer shadow-md"
                >
                  Create
                </button>
              </div>
            </motion.div>
          )}

          <div className="space-y-0.5">
            {displayCategories.map((cat) => (
              <div
                key={cat.name}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-[11px] transition-colors group/cat rounded-lg hover:bg-white/[0.02] relative",
                  selectedCategory === cat.name || (cat.name === 'All' && !selectedCategory)
                    ? "text-white font-semibold"
                    : "text-white/60 hover:text-white"
                )}
              >
                <button
                  onClick={() => setSelectedCategory(cat.name === 'All' ? null : cat.name)}
                  className="flex-1 flex items-center gap-2.5 text-left py-0.5 cursor-pointer"
                >
                  <Folder className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-colors",
                    selectedCategory === cat.name || (cat.name === 'All' && !selectedCategory)
                      ? "text-blue-400"
                      : "text-white/40 group-hover/cat:text-white/80"
                  )} />
                  {isSidebarOpen && <span className="font-medium truncate max-w-[120px]">{cat.name}</span>}
                </button>
                
                {isSidebarOpen && (
                  <div className="flex items-center gap-1.5 h-5">
                    <span className="text-[9px] text-white/30 font-bold group-hover/cat:opacity-0 transition-all">
                      {cat.name === 'All' ? websitesCount : (categoryCounts[cat.name] || 0)}
                    </span>
                    
                    {cat.name !== 'All' && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete the category "${cat.name}"? Websites in this category will be moved to "Personal".`)) {
                            await deleteCategory(cat.name);
                          }
                        }}
                        className="p-0.5 rounded opacity-0 group-hover/cat:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all cursor-pointer absolute right-3"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
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
