import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { GraphView } from './components/GraphView';
import { GridView } from './components/GridView';
import { ListView } from './components/ListView';
import { NodeDetails } from './components/NodeDetails';
import { AddWebsiteModal } from './components/AddWebsiteModal';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { LockScreen } from './components/LockScreen';
import { useStore } from './store/useStore';
import { seedInitialData, db } from './db/db';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, RotateCcw, LayoutGrid, Plus, MoreVertical, Focus } from 'lucide-react';
import { cn } from './lib/utils';

const queryClient = new QueryClient();

const getGlowColor = (bgColor: string, theme: string, alpha: number) => {
  if (theme === 'minimal') {
    return `rgba(82, 44, 93, ${alpha})`;
  }
  if (bgColor.startsWith('#')) {
    let hex = bgColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const isGrayscale = (maxVal - minVal) < 15;
      
      if (maxVal < 10 || isGrayscale) {
        return `rgba(255, 255, 255, ${alpha})`;
      }
      
      const scale = 255 / (maxVal || 1);
      const br = Math.min(255, Math.round(r * Math.max(1, scale * 0.4)));
      const bg = Math.min(255, Math.round(g * Math.max(1, scale * 0.4)));
      const bb = Math.min(255, Math.round(b * Math.max(1, scale * 0.4)));
      
      return `rgba(${br}, ${bg}, ${bb}, ${alpha})`;
    }
  }
  return bgColor;
};

function NexusApp() {
  const { viewMode, settings, setSearchQuery, triggerReset, triggerFitToView, isSidebarOpen, toggleSidebar, setIsSidebarOpen, userProfile, editingWebsiteId, selectedWebsiteId, isUnlocked, setIsUnlocked } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only lock on mount if PIN is enabled
    if (settings.pinEnabled && settings.pinCode) {
      setIsUnlocked(false);
    }
  }, []); // Run only once on mount

  useEffect(() => {
    if (editingWebsiteId) {
      setIsAddModalOpen(true);
    }
  }, [editingWebsiteId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const { data: websitesCount = 0 } = useQuery({
    queryKey: ['websites-count'],
    queryFn: () => db.websites.count(),
  });

  useEffect(() => {
    const init = async () => {
      await seedInitialData();
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    };
    init();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queryClient]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="flex h-screen w-screen overflow-hidden select-none transition-colors duration-700 relative"
      style={{ 
        backgroundColor: settings.backgroundColor,
        '--glass-blur': settings.glassEffect ? '40px' : '0px',
        '--glass-opacity': settings.glassEffect ? '0.3' : '0.05'
      } as React.CSSProperties}
    >
      {/* Interactive Global Hover Shine Spotlight (Foreground Overlay) */}
      <div 
        className={`fixed inset-0 pointer-events-none z-[9999] mix-blend-screen transition-opacity duration-300 ${settings.mouseHoverEffect ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `radial-gradient(220px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${getGlowColor(settings.backgroundColor, settings.theme, 0.2)} 0%, ${getGlowColor(settings.backgroundColor, settings.theme, 0.06)} 50%, transparent 100%)`
        }}
      />

      {/* Interactive Global Hover Back-glow (Background Spotlight) */}
      <div 
        className={`fixed inset-0 pointer-events-none z-[0] transition-opacity duration-500 ${settings.mouseHoverEffect ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `radial-gradient(440px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${getGlowColor(settings.backgroundColor, settings.theme, 0.12)} 0%, transparent 100%)`
        }}
      />

      {/* Ambient background particles/glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
        {settings.grid && (
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1.2px, transparent 1px)', backgroundSize: '32px 32px' }} />
        )}
      </div>

      <Sidebar onProfileClick={() => setIsProfileOpen(true)} />

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 z-50"
          />
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Left edge hover area to open sidebar */}
        {!isSidebarOpen && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-8 z-[55] cursor-pointer" 
            onMouseEnter={() => setIsSidebarOpen(true)}
          />
        )}

        <AnimatePresence>
          {viewMode !== 'graph' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="z-50"
            >
              <TopBar onAddClick={() => setIsAddModalOpen(true)} onSettingsClick={() => setIsSettingsOpen(true)} />
            </motion.div>
          )}
        </AnimatePresence>
        
          <div className="flex-1 relative px-8 pb-8 overflow-hidden">
            <AnimatePresence mode="wait">
              {viewMode === 'graph' ? (
                <motion.div
                  key="graph"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full"
                >
                  <GraphView />
                </motion.div>
              ) : viewMode === 'list' ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full"
                >
                  <ListView />
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full"
                >
                  <GridView />
                </motion.div>
              )}
            </AnimatePresence>

            {viewMode === 'graph' && <NodeDetails />}

            {/* Active Nodes - Top Right - Only in Graph View */}
            {viewMode === 'graph' && (
              <div className="absolute top-8 right-8 flex items-center gap-6 pointer-events-none z-40">
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">Active Nodes</span>
                  <span className="text-2xl font-medium tracking-tight text-white">{websitesCount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            <AnimatePresence>
              {viewMode === 'graph' && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0, top: '48px' }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none"
                >
                  <h1 className="text-4xl font-bold tracking-tight text-white/90 drop-shadow-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome, {userProfile.name.split(' ')[0]}</h1>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Controls */}
            {viewMode === 'graph' && (
              <motion.div 
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-12 right-12 flex flex-col gap-3 z-40"
              >
                <div className="glass-dark border border-white/5 rounded-[20px] overflow-hidden flex flex-col items-center p-1.5 shadow-2xl backdrop-blur-3xl bg-white/[0.02]">
                  {[
                    { icon: Plus, label: 'Add Website', onClick: () => setIsAddModalOpen(true), delay: 0 },
                    { icon: Focus, label: 'Fit to View', onClick: () => triggerFitToView(), delay: 0.1 },
                    { icon: Maximize2, label: 'Fullscreen', onClick: toggleFullscreen, delay: 0.2 },
                    { icon: RotateCcw, label: 'Reset Visits', onClick: async () => {
                      if (confirm('Are you sure you want to reset all visit counts to 0?')) {
                        try {
                          await db.websites.toCollection().modify({ usageCount: 0 });
                          
                          // Manually update react-query cache for instant UI feedback
                          queryClient.setQueryData(['websites'], (old: any) => {
                            if (!old) return [];
                            return old.map((site: any) => ({ ...site, usageCount: 0 }));
                          });
                          
                          if (selectedWebsiteId) {
                            queryClient.setQueryData(['website', selectedWebsiteId], (old: any) => {
                              if (!old) return null;
                              return { ...old, usageCount: 0 };
                            });
                          }
                          
                          // Force invalidation to ensure sync
                          await queryClient.invalidateQueries({ queryKey: ['websites'] });
                          await queryClient.invalidateQueries({ queryKey: ['websites-count'] });
                          if (selectedWebsiteId) {
                            await queryClient.invalidateQueries({ queryKey: ['website', selectedWebsiteId] });
                          }
                        } catch (error) {
                          console.error('Failed to reset visits:', error);
                        }
                      }
                    }, delay: 0.3 },
                    { icon: LayoutGrid, label: 'Settings', onClick: () => setIsSettingsOpen(true), delay: 0.4 }
                  ].map((btn, idx, arr) => (
                    <motion.button
                      key={btn.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + btn.delay, duration: 0.4 }}
                      onClick={btn.onClick}
                      className={cn(
                        "p-2.5 hover:bg-white/5 transition-all group relative",
                        idx === 4 ? "text-[#7c7c7c]" : idx === 1 ? "text-[#968b8b]" : "text-[#f6eded]",
                        idx !== arr.length - 1 && "border-b border-white/[0.03]"
                      )}
                    >
                      <btn.icon className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        btn.label === 'Fullscreen' ? 'group-hover:scale-110' :
                        btn.label === 'Fit to View' ? 'group-hover:scale-110' : 'group-hover:scale-110'
                      )} />
                      <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-xl border border-white/5 text-[9px] font-bold text-white/40 uppercase tracking-[0.15em] opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap translate-x-2 group-hover:translate-x-0 font-sans">
                        {btn.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
        </div>
      </main>

      <AddWebsiteModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      <AnimatePresence>
        {!isUnlocked && settings.pinEnabled && settings.pinCode && (
          <LockScreen 
            correctPin={settings.pinCode} 
            onUnlock={() => setIsUnlocked(true)} 
            onReset={async () => {
              await db.websites.clear();
              localStorage.clear();
              window.location.reload();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NexusApp />
    </QueryClientProvider>
  );
}


