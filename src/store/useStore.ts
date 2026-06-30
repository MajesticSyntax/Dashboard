import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, ViewMode, Website, UserProfile } from '../types';

interface NexusState {
  viewMode: ViewMode;
  settings: AppSettings;
  searchQuery: string;
  selectedCategory: string | null;
  selectedWebsiteId: string | null;
  editingWebsiteId: string | null;
  isSidebarOpen: boolean;
  isUnlocked: boolean;
  userProfile: UserProfile;
  lastReset: number;
  fitToViewTrigger: number;
  
  setViewMode: (mode: ViewMode) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedWebsiteId: (id: string | null) => void;
  setEditingWebsiteId: (id: string | null) => void;
  toggleSidebar: () => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setIsUnlocked: (isUnlocked: boolean) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  triggerReset: () => void;
  triggerFitToView: () => void;
}

export const useStore = create<NexusState>()(
  persist(
    (set) => ({
      viewMode: 'graph',
      searchQuery: '',
      selectedCategory: null,
      selectedWebsiteId: null,
      editingWebsiteId: null,
      isSidebarOpen: false,
      isUnlocked: true,
      userProfile: {
        name: 'Alex Rivera',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        role: 'Pro Member'
      },
      lastReset: 0,
      fitToViewTrigger: 0,
      settings: {
        accentColor: '#3b82f6',
        backgroundColor: '#050505',
        nodeColor: '#3b82f6',
        nodeSize: 4,
        connectionThickness: 1,
        glowStrength: 10,
        font: 'Inter',
        glassEffect: true,
        transparency: 0.1,
        grid: false,
        backgroundGradient: 'radial-gradient(circle at center, #0a0a0a 0%, #000000 100%)',
        particleDensity: 20,
        graphLayout: 'force',
        sidebarWidth: 260,
        searchPosition: 'center',
        cornerRadius: 12,
        blurAmount: 10,
        animationSpeed: 1,
        theme: 'nebula',
        glowingNodes: true,
        mouseHoverEffect: false,
        pinEnabled: false,
        pinCode: '',
      },

      setViewMode: (viewMode) => set({ viewMode }),
      setSettings: (newSettings) => set((state) => ({ 
        settings: { ...state.settings, ...newSettings } 
      })),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      setSelectedWebsiteId: (selectedWebsiteId) => set({ selectedWebsiteId }),
      setEditingWebsiteId: (editingWebsiteId) => set({ editingWebsiteId }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setIsUnlocked: (isUnlocked) => set({ isUnlocked }),
      setUserProfile: (profile) => set((state) => ({ 
        userProfile: { ...state.userProfile, ...profile } 
      })),
      triggerReset: () => set({ lastReset: Date.now() }),
      triggerFitToView: () => set({ fitToViewTrigger: Date.now() }),
    }),
    {
      name: 'nexus-storage',
      partialize: (state) => ({ 
        settings: state.settings, 
        viewMode: state.viewMode,
        userProfile: state.userProfile 
      }),
    }
  )
);
