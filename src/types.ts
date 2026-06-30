export type Category = 
  | 'AI' 
  | 'Development' 
  | 'Design' 
  | 'Education' 
  | 'Productivity' 
  | 'Finance' 
  | 'Social' 
  | 'Entertainment' 
  | 'News' 
  | 'Shopping' 
  | 'Personal' 
  | string;

export interface Website {
  id: string;
  name: string;
  url: string;
  logo?: string;
  category: Category;
  color: string;
  favorite: boolean;
  usageCount: number;
  pinned: boolean;
  tags: string[];
  description: string;
  lastOpened: number;
  createdAt: number;
}

export type ViewMode = 'graph' | 'grid' | 'list' | 'compact' | 'kanban' | 'timeline' | 'browser';

export interface AppSettings {
  accentColor: string;
  backgroundColor: string;
  nodeColor: string;
  nodeSize: number;
  connectionThickness: number;
  glowStrength: number;
  font: string;
  glassEffect: boolean;
  transparency: number;
  grid: boolean;
  backgroundGradient: string;
  particleDensity: number;
  graphLayout: 'force' | 'radial' | 'grid';
  sidebarWidth: number;
  searchPosition: 'center' | 'left';
  cornerRadius: number;
  blurAmount: number;
  animationSpeed: number;
  theme: 'dark' | 'light' | 'minimal' | 'glass' | 'nebula';
  glowingNodes: boolean;
  mouseHoverEffect: boolean;
  pinEnabled?: boolean;
  pinCode?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  url: string;
  category: string;
  color: string;
  val: number;
  logo?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface UserProfile {
  name: string;
  avatar: string;
  role: string;
}
