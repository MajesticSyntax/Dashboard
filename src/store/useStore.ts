import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings, ViewMode, Website, UserProfile, CategoryItem } from '../types';
import { db } from '../db/db';

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
  categories: CategoryItem[];
  graphFilterCategory: string | null;
  graphFilterTag: string | null;
  
  setViewMode: (mode: ViewMode) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedWebsiteId: (id: string | null) => void;
  setEditingWebsiteId: (id: string | null) => void;
  setGraphFilterCategory: (category: string | null) => void;
  setGraphFilterTag: (tag: string | null) => void;
  toggleSidebar: () => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setIsUnlocked: (isUnlocked: boolean) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  triggerReset: () => void;
  triggerFitToView: () => void;
  addCategory: (category: CategoryItem) => void;
  deleteCategory: (name: string) => Promise<void>;
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
      categories: [
        { name: 'AI', color: '#94a3b8' },
        { name: 'Development', color: '#94a3b8' },
        { name: 'Design', color: '#94a3b8' },
        { name: 'Search', color: '#94a3b8' },
        { name: 'Education', color: '#94a3b8' },
        { name: 'Productivity', color: '#94a3b8' },
        { name: 'Finance', color: '#94a3b8' },
        { name: 'Social', color: '#94a3b8' },
        { name: 'Entertainment', color: '#94a3b8' },
        { name: 'News', color: '#94a3b8' },
        { name: 'Shopping', color: '#94a3b8' },
        { name: 'Personal', color: '#94a3b8' },
      ],
      graphFilterCategory: null,
      graphFilterTag: null,
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
        backgroundImage: '',
        backgroundImageOpacity: 0.4,
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
      setGraphFilterCategory: (graphFilterCategory) => set({ graphFilterCategory }),
      setGraphFilterTag: (graphFilterTag) => set({ graphFilterTag }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setIsUnlocked: (isUnlocked) => set({ isUnlocked }),
      setUserProfile: (profile) => set((state) => ({ 
        userProfile: { ...state.userProfile, ...profile } 
      })),
      triggerReset: () => set({ lastReset: Date.now() }),
      triggerFitToView: () => set({ fitToViewTrigger: Date.now() }),
      addCategory: (category) => set((state) => {
        // Prevent duplicate categories
        if (state.categories.some(c => c.name.toLowerCase() === category.name.toLowerCase())) {
          return {};
        }
        return {
          categories: [...state.categories, category]
        };
      }),
      deleteCategory: async (name) => {
        try {
          const websites = await db.websites.where('category').equals(name).toArray();
          for (const w of websites) {
            await db.websites.update(w.id, { category: 'Personal' });
          }
        } catch (e) {
          console.error('Failed to update websites on category deletion', e);
        }
        set((state) => {
          const filtered = state.categories.filter((c) => c.name !== name);
          const nextSelected = state.selectedCategory === name ? null : state.selectedCategory;
          return {
            categories: filtered,
            selectedCategory: nextSelected
          };
        });
      },
    }),
    {
      name: 'nexus-storage',
      partialize: (state) => ({ 
        settings: state.settings, 
        viewMode: state.viewMode,
        userProfile: state.userProfile,
        categories: state.categories
      }),
    }
  )
);
