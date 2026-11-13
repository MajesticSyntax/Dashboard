import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { useStore } from '../store/useStore';
import { Website, GraphNode, GraphLink } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Trash2, Sliders, Play, Pause, RotateCcw, SkipForward, Activity, Plus as PlusIcon, Check, Sparkles, Info, ExternalLink, ZoomIn, ZoomOut, Minus, Focus } from 'lucide-react';
import { forceX, forceY, forceCollide, forceManyBody } from 'd3-force';
import { getCleanHostname, getRootDomain } from '../lib/utils';

export const getNodeRadius = (
  node: any,
  theme: string = 'nebula',
  nodeSizeSetting: number = 4,
  isFocused: boolean = false
): number => {
  const scaleMultiplier = Math.max(0.4, (nodeSizeSetting || 4) / 4);
  const isObsidian = theme === 'obsidian' || theme === 'dark';
  const val = Number.isFinite(node?.val) ? node.val : 4;

  // Base visual radius in canvas coordinate pixels
  const baseSize = (isObsidian ? Math.max(3.5, val * 0.75) : Math.max(4, val)) * scaleMultiplier;
  const radius = (isFocused ? baseSize * 1.5 : baseSize) * 0.8;
  return Math.max(3, radius);
};

export const getNodeCollisionRadius = (
  node: any,
  theme: string = 'nebula',
  nodeSizeSetting: number = 4,
  nodeSpacing: number = 35
): number => {
  const visualRadius = getNodeRadius(node, theme, nodeSizeSetting, false);
  // Collision radius guarantees a hard non-overlap buffer around every node
  // with ample clearance for glows, text labels, and spacing
  const spacing = Math.max(16, nodeSpacing || 35);
  const dynamicPadding = Math.max(spacing, visualRadius * 0.45 + 16);
  return visualRadius + dynamicPadding;
};

const imgCache = new Map<string, HTMLImageElement>();

const hexToAlpha = (hex: string, alpha: string) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  if (hex.length === 4) {
    const r = hex[1], g = hex[2], b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (hex.length === 7) return hex + alpha;
  return hex;
};

export const GraphView: React.FC = () => {
  const { 
    searchQuery, 
    selectedCategory, 
    settings, 
    selectedWebsiteId, 
    setSelectedWebsiteId, 
    setHoveredWebsiteId, 
    lastReset, 
    fitToViewTrigger, 
    zoomInTrigger, 
    zoomOutTrigger, 
    triggerFitToView,
    triggerZoomIn,
    triggerZoomOut,
    setEditingWebsiteId, 
    graphFilterCategory, 
    graphFilterTag, 
    selectedWebsiteIds, 
    toggleWebsiteSelection, 
    clearWebsiteSelection 
  } = useStore();
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);
  const clickedNodeIdRef = useRef<string | null>(null);
  const zoomDisplayRef = useRef<HTMLButtonElement>(null);
  const zoomPercentRef = useRef<number>(100);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    websiteId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    websiteId: null
  });

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Color routing rule interface
  interface ColorRule {
    id: string;
    query: string;
    color: string;
    active: boolean;
  }

  // Custom force variables & sliders
  const [repulsion, setRepulsion] = useState(-250);
  const [gravity, setGravity] = useState(0.08);
  const [linkDist, setLinkDist] = useState(80);
  const [linkForceStrength, setLinkForceStrength] = useState(0.5);

  // Timelapse variables
  const [isTimelapseActive, setIsTimelapseActive] = useState(false);
  const [timelapseStep, setTimelapseStep] = useState(1);
  const [timelapseSpeed, setTimelapseSpeed] = useState(600);
  const [isPlaying, setIsPlaying] = useState(false);

  // Custom Color rules / Node Grouping
  const [colorRules, setColorRules] = useState<ColorRule[]>([
    { id: '1', query: 'tag:ai', color: '#10A37F', active: true },
    { id: '2', query: 'tag:code', color: '#8b5cf6', active: true },
    { id: '3', query: 'category:Design', color: '#ec4899', active: true },
    { id: '4', query: 'domain:google.com', color: '#4285F4', active: true }
  ]);
  const [newRuleQuery, setNewRuleQuery] = useState('');
  const [newRuleColor, setNewRuleColor] = useState('#3b82f6');

  // Control panel active tab and open/close state
  const [activeTab, setActiveTab] = useState('Forces');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Custom Color Router helper
  const getCustomColor = useCallback((w: Website) => {
    if (settings.theme === 'obsidian' || settings.theme === 'dark') {
      return '#dcdcdc';
    }
    if (w.isCustomColor) {
      return w.color;
    }
    for (const rule of colorRules) {
      if (!rule.active) continue;
      
      const q = rule.query.toLowerCase().trim();
      if (q.startsWith('tag:')) {
        const tag = q.replace('tag:', '').replace('#', '').trim();
        if (w.tags?.some(t => t.toLowerCase() === tag)) {
          return rule.color;
        }
      } else if (q.startsWith('category:')) {
        const cat = q.replace('category:', '').trim();
        if (w.category?.toLowerCase() === cat) {
          return rule.color;
        }
      } else if (q.startsWith('domain:')) {
        const domain = q.replace('domain:', '').trim();
        if (w.url?.toLowerCase().includes(domain)) {
          return rule.color;
        }
      } else {
        // General text search matching tag, category, name, or domain
        if (
          w.tags?.some(t => t.toLowerCase() === q || t.toLowerCase() === q.replace('#', '')) ||
          w.category?.toLowerCase() === q ||
          w.name.toLowerCase().includes(q) ||
          w.url.toLowerCase().includes(q)
        ) {
          return rule.color;
        }
      }
    }
    return w.color || settings.nodeColor;
  }, [colorRules, settings.nodeColor, settings.theme]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        lastClickCoords.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove, { capture: true, passive: true });
    window.addEventListener('contextmenu', handleGlobalMouseMove, { capture: true, passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove as any, { capture: true });
      window.removeEventListener('contextmenu', handleGlobalMouseMove as any, { capture: true });
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Don't close context menu if it's a right click
      if (e.button === 2) return;
      closeContextMenu();
    };
    window.addEventListener('click', handleDocumentClick);
    window.addEventListener('scroll', handleDocumentClick as any, true);
    return () => {
      window.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('scroll', handleDocumentClick as any, true);
    };
  }, []);


  // Pre-load images helper
  const getImg = (src: string) => {
    if (!src) return null;
    if (imgCache.has(src)) return imgCache.get(src);
    
    const img = new Image();
    img.src = src;
    img.onload = () => {};
    imgCache.set(src, img);
    return img;
  };

  const { data: websites = [] } = useQuery({
    queryKey: ['websites'],
    queryFn: () => db.websites.toArray(),
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const filteredWebsites = useMemo(() => {
    return websites.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          w.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          w.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || w.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [websites, searchQuery, selectedCategory]);

  const sortedWebsites = useMemo(() => {
    return [...filteredWebsites].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [filteredWebsites]);

  const timelapseWebsites = useMemo(() => {
    if (!isTimelapseActive) return filteredWebsites;
    if (sortedWebsites.length === 0) return [];
    return sortedWebsites.slice(0, Math.max(1, Math.min(timelapseStep, sortedWebsites.length)));
  }, [isTimelapseActive, sortedWebsites, timelapseStep, filteredWebsites]);

  const graphData = useMemo(() => {
    const activeWebsites = isTimelapseActive ? timelapseWebsites : filteredWebsites;
    const nodes: any[] = activeWebsites.map(w => ({
      id: w.id,
      name: w.name,
      url: w.url,
      category: w.category,
      tags: w.tags || [],
      color: getCustomColor(w),
      usageCount: w.usageCount || 0,
      val: Math.max(3.5, Math.sqrt(w.usageCount || 0) * 1.5 + 3.5), // Beautiful square root scaling for visiting time count
      logo: w.logo
    }));

    const links: any[] = [];
    const categories = Array.from(new Set(activeWebsites.map(w => w.category)));

    // 1. Group by Root Domain and Subdomains (Hierarchical Connection)
    const rootDomainMap = new Map<string, any[]>();
    nodes.forEach(node => {
      if (!node.isSun && node.url) {
        const cleanHost = getCleanHostname(node.url);
        const rootDomain = getRootDomain(cleanHost);
        node.cleanHost = cleanHost;
        node.rootDomain = rootDomain;
        if (rootDomain) {
          if (!rootDomainMap.has(rootDomain)) rootDomainMap.set(rootDomain, []);
          rootDomainMap.get(rootDomain)?.push(node);
        }
      }
    });

    const mainNodes: string[] = [];

    rootDomainMap.forEach((domainNodes, rootDomain) => {
      if (domainNodes.length === 0) return;

      // Sort order:
      // 1. Exact apex/root domain match (e.g. google.com vs mail.google.com)
      // 2. Fewest subdomain levels (e.g. app.domain.com vs dev.app.domain.com)
      // 3. Shortest URL
      domainNodes.sort((a, b) => {
        const aIsExact = a.cleanHost === rootDomain ? 1 : 0;
        const bIsExact = b.cleanHost === rootDomain ? 1 : 0;
        if (aIsExact !== bIsExact) return bIsExact - aIsExact;

        const aParts = (a.cleanHost || '').split('.').length;
        const bParts = (b.cleanHost || '').split('.').length;
        if (aParts !== bParts) return aParts - bParts;

        return (a.url?.length || 0) - (b.url?.length || 0);
      });

      const mainNode = domainNodes[0];
      mainNodes.push(mainNode.id);

      if (domainNodes.length > 1) {
        mainNode.isMainDomain = true;
        mainNode.subdomainCount = domainNodes.length - 1;

        // Distinctly scale up main domain hub node as in user's reference diagram
        mainNode.val = Math.max(8, (mainNode.val || 5) * 1.45 + Math.min(8, (domainNodes.length - 1) * 2));

        for (let i = 1; i < domainNodes.length; i++) {
          const subNode = domainNodes[i];
          subNode.isSubdomain = true;
          subNode.parentMainDomainId = mainNode.id;
          subNode.parentDomainName = mainNode.name;

          // Connect subdomains using the main domain's color theme as shown in the reference image
          subNode.color = mainNode.color;
          subNode.val = Math.max(3.2, Math.sqrt(subNode.usageCount || 0) * 1.1 + 3.2);

          // Direct physical link from Main Domain -> Subdomain
          links.push({ 
            source: mainNode.id, 
            target: subNode.id,
            isDomainLink: true,
            isSubdomainLink: true,
            color: mainNode.color
          });
        }
      }
    });

    nodes.forEach(node => {
      const neighbors = links.filter(l => l.source === node.id || l.target === node.id);
      if (neighbors.length > 0) {
        node.val = (node.val || 4) * (1 + Math.min(neighbors.length * 0.04, 0.4));
      }
      // Keep node.val balanced so nodes never grow unboundedly large
      node.val = Math.min(36, node.val || 4);
      
      // Precompute RGB colors for fast glow rendering
      let r = 255, g = 255, b = 255;
      if (node.color && node.color.startsWith('#')) {
        let hex = node.color.replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length >= 6) {
          r = parseInt(hex.substring(0,2), 16) || 255;
          g = parseInt(hex.substring(2,4), 16) || 255;
          b = parseInt(hex.substring(4,6), 16) || 255;
        }
      }
      node.r = r;
      node.g = g;
      node.b = b;
    });

    return { nodes, links, categories };
  }, [filteredWebsites, timelapseWebsites, isTimelapseActive, getCustomColor]);

  useEffect(() => {
    if (fgRef.current && lastReset > 0) {
      // 1. Clear fixed positions if nodes were dragged
      graphData.nodes.forEach((node: any) => {
        if (!node.isSun) {
          node.fx = undefined;
          node.fy = undefined;
        } else {
          node.fx = 0;
          node.fy = 0;
        }
      });

      // 2. Reheat simulation
      if (typeof (fgRef.current as any).d3ReheatSimulation === 'function') {
        (fgRef.current as any).d3ReheatSimulation();
      }
      
      // 3. Zoom and center
      if (typeof (fgRef.current as any).zoomToFit === 'function') {
        (fgRef.current as any).zoomToFit(1100, 150);
      }
    }
  }, [lastReset, graphData]);

  // Smooth fit to view
  useEffect(() => {
    if (fgRef.current && fitToViewTrigger > 0) {
      if (typeof (fgRef.current as any).zoomToFit === 'function') {
        (fgRef.current as any).zoomToFit(1100, 150);
      }
    }
  }, [fitToViewTrigger]);

  // Smooth Zoom In animation trigger
  useEffect(() => {
    if (fgRef.current && zoomInTrigger > 0) {
      const fg = fgRef.current as any;
      const cur = fg.zoom();
      if (typeof cur === 'number' && !isNaN(cur)) {
        fg.zoom(Math.min(14, cur * 1.35), 450);
      }
    }
  }, [zoomInTrigger]);

  // Smooth Zoom Out animation trigger
  useEffect(() => {
    if (fgRef.current && zoomOutTrigger > 0) {
      const fg = fgRef.current as any;
      const cur = fg.zoom();
      if (typeof cur === 'number' && !isNaN(cur)) {
        fg.zoom(Math.max(0.06, cur / 1.35), 450);
      }
    }
  }, [zoomOutTrigger]);

  // Smooth Momentum Wheel Zoom & Pan Animation Loop
  const zoomAnimRef = useRef<{
    rafId: number | null;
    targetK: number | null;
    currentK: number | null;
    targetCx: number | null;
    targetCy: number | null;
    currentCx: number | null;
    currentCy: number | null;
  }>({
    rafId: null,
    targetK: null,
    currentK: null,
    targetCx: null,
    targetCy: null,
    currentCx: null,
    currentCy: null,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Don't intercept if scrolling inside an overlay element (context menu, details drawer, modal)
      const target = e.target as HTMLElement;
      if (target && target.closest('.glass-dark, button, input, select, textarea, [role="dialog"], .custom-scrollbar')) {
        return;
      }

      // Intercept raw d3-zoom stepped zoom
      e.preventDefault();
      e.stopPropagation();

      if (!fgRef.current) return;
      const fg = fgRef.current as any;

      const curK = fg.zoom();
      const curCenter = fg.centerAt();
      if (typeof curK !== 'number' || isNaN(curK) || !curCenter || typeof curCenter.x !== 'number') return;

      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      const anim = zoomAnimRef.current;

      // Initialize animation state if starting from rest
      if (anim.targetK === null || anim.targetCx === null || anim.targetCy === null) {
        anim.targetK = curK;
        anim.currentK = curK;
        anim.targetCx = curCenter.x;
        anim.targetCy = curCenter.y;
        anim.currentCx = curCenter.x;
        anim.currentCy = curCenter.y;
      }

      // Normalize delta across input devices (mouse wheel, trackpad, line vs pixel mode)
      let delta = -e.deltaY;
      if (e.deltaMode === 1) delta *= 20; // lines mode
      else if (e.deltaMode === 2) delta *= 300; // pages mode

      // Cap delta per event to prevent sudden jumps on fast spins
      delta = Math.max(-200, Math.min(200, delta));

      // Calculate exponential zoom factor
      const zoomSensitivity = 0.0018;
      const factor = Math.exp(delta * zoomSensitivity);
      const MIN_ZOOM = 0.06;
      const MAX_ZOOM = 14.0;
      const nextTargetK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, anim.targetK * factor));

      // Focal point zoom: keep world coordinates at cursor invariant
      const deltaX = mx - width / 2;
      const deltaY = my - height / 2;

      anim.targetCx = anim.targetCx + deltaX * (1 / anim.targetK - 1 / nextTargetK);
      anim.targetCy = anim.targetCy + deltaY * (1 / anim.targetK - 1 / nextTargetK);
      anim.targetK = nextTargetK;

      if (!anim.rafId) {
        const step = () => {
          if (!fgRef.current || anim.targetK === null || anim.currentK === null || anim.targetCx === null || anim.targetCy === null) {
            anim.rafId = null;
            return;
          }

          const kDiff = anim.targetK - anim.currentK;
          const cxDiff = anim.targetCx - anim.currentCx;
          const cyDiff = anim.targetCy - anim.currentCy;

          // Convergence check: snap and finish animation
          if (Math.abs(kDiff) < 0.0006 && Math.abs(cxDiff) < 0.06 && Math.abs(cyDiff) < 0.06) {
            (fgRef.current as any).zoom(anim.targetK);
            (fgRef.current as any).centerAt(anim.targetCx, anim.targetCy);
            anim.targetK = null;
            anim.currentK = null;
            anim.targetCx = null;
            anim.targetCy = null;
            anim.currentCx = null;
            anim.currentCy = null;
            anim.rafId = null;
            return;
          }

          // Buttery smooth inertia lerp factor: 0.16 (60-120fps fluid deceleration)
          const lerpRate = 0.16;
          anim.currentK += kDiff * lerpRate;
          anim.currentCx += cxDiff * lerpRate;
          anim.currentCy += cyDiff * lerpRate;

          (fgRef.current as any).zoom(anim.currentK);
          (fgRef.current as any).centerAt(anim.currentCx, anim.currentCy);

          anim.rafId = requestAnimationFrame(step);
        };
        anim.rafId = requestAnimationFrame(step);
      }
    };

    container.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    // Cancel smooth zoom animation if user clicks or starts dragging to avoid fighting user interaction
    const handlePointerDown = () => {
      if (zoomAnimRef.current.rafId) {
        cancelAnimationFrame(zoomAnimRef.current.rafId);
        zoomAnimRef.current.rafId = null;
        zoomAnimRef.current.targetK = null;
        zoomAnimRef.current.currentK = null;
        zoomAnimRef.current.targetCx = null;
        zoomAnimRef.current.targetCy = null;
        zoomAnimRef.current.currentCx = null;
        zoomAnimRef.current.currentCy = null;
      }
    };
    container.addEventListener('pointerdown', handlePointerDown, { capture: true });

    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true } as any);
      container.removeEventListener('pointerdown', handlePointerDown, { capture: true } as any);
      if (zoomAnimRef.current.rafId) {
        cancelAnimationFrame(zoomAnimRef.current.rafId);
      }
    };
  }, []);

  // Center camera on externally selected node (e.g. from quick open or search)
  useEffect(() => {
    if (selectedWebsiteId && fgRef.current) {
      const target = graphData.nodes.find((n: any) => n.id === selectedWebsiteId);
      if (target && typeof target.x === 'number' && typeof target.y === 'number') {
        if (typeof (fgRef.current as any).centerAt === 'function') {
          (fgRef.current as any).centerAt(target.x, target.y, 750);
        }
        setClickedNodeId(selectedWebsiteId);
        clickedNodeIdRef.current = selectedWebsiteId;
      }
    }
  }, [selectedWebsiteId, graphData]);

  // Force graph refresh when data or visual settings change
  useEffect(() => {
    if (fgRef.current) {
      const fg = fgRef.current as any;
      if (typeof fg.refresh === 'function') {
        fg.refresh();
      } else if (typeof fg.d3ReheatSimulation === 'function') {
        fg.d3ReheatSimulation();
      }
    }
  }, [graphData, settings, colorRules, clickedNodeId, graphFilterCategory, graphFilterTag]);

  // Keep slider bounds safe when collection size changes
  useEffect(() => {
    if (isTimelapseActive) {
      setTimelapseStep(prev => {
        if (prev > sortedWebsites.length) {
          return Math.max(1, sortedWebsites.length);
        }
        return prev;
      });
    }
  }, [sortedWebsites.length, isTimelapseActive]);

  // Handle Play/Pause timer for Timelapse
  useEffect(() => {
    let intervalId: any = null;
    if (isTimelapseActive && isPlaying) {
      intervalId = setInterval(() => {
        setTimelapseStep(prev => {
          if (prev >= sortedWebsites.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, timelapseSpeed);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimelapseActive, isPlaying, timelapseSpeed, sortedWebsites.length]);

  // Live update d3-force simulation when variables, graph data, or spacing settings change
  useEffect(() => {
    if (fgRef.current && typeof (fgRef.current as any).d3Force === 'function') {
      const fg = fgRef.current as any;
      const currentSpacing = settings.nodeSpacing ?? 35;
      const currentNodeSize = settings.nodeSize ?? 4;
      const currentTheme = settings.theme;

      // Fast node lookup for links
      const nodeMap = new Map<string, any>();
      graphData.nodes.forEach((n: any) => nodeMap.set(n.id, n));

      // 1. Repulsive Charge Force (Many-Body)
      // Nodes repel each other. Larger nodes push away proportionally more to guarantee open space.
      fg.d3Force(
        'charge',
        forceManyBody()
          .strength((node: any) => {
            const r = getNodeRadius(node, currentTheme, currentNodeSize, false);
            const spacingFactor = currentSpacing / 35;
            return -Math.max(280, (200 + r * 20) * spacingFactor);
          })
          .distanceMax(2200)
          .distanceMin(15)
      );

      // 2. Rigid Non-Penetration Collision Force
      // Hard circle boundary collision completely eliminates overlap between nodes
      fg.d3Force(
        'collide',
        forceCollide((node: any) => {
          return getNodeCollisionRadius(node, currentTheme, currentNodeSize, currentSpacing);
        })
          .strength(1.0)
          .iterations(6)
      );

      // 3. Dynamic Link Spring Force
      // Holds subdomains in a clean orbit around their parent with plenty of space
      fg.d3Force(
        'link',
        fg.d3Force('link')
          ?.distance((link: any) => {
            const sourceNode = typeof link.source === 'object' ? link.source : nodeMap.get(link.source);
            const targetNode = typeof link.target === 'object' ? link.target : nodeMap.get(link.target);

            const r1 = sourceNode ? getNodeRadius(sourceNode, currentTheme, currentNodeSize, false) : 10;
            const r2 = targetNode ? getNodeRadius(targetNode, currentTheme, currentNodeSize, false) : 10;
            const subCount = sourceNode?.subdomainCount || targetNode?.subdomainCount || 1;

            if (link.isSubdomainLink || link.isDomainLink) {
              const minCircumferenceNeeded = subCount * (r2 * 2 + currentSpacing);
              const minRadiusFromCircumference = minCircumferenceNeeded / (2 * Math.PI);
              const orbitDist = Math.max(60, minRadiusFromCircumference, currentSpacing * 1.8);
              return r1 + r2 + orbitDist;
            }

            return Math.max(r1 + r2 + currentSpacing * 1.5, linkDist);
          })
          ?.strength((link: any) => {
            if (link.isSubdomainLink || link.isDomainLink) {
              return 0.35;
            }
            return Math.min(linkForceStrength, 0.4);
          })
      );

      // 4. Centering Forces (gentle positioning without pulling nodes into a dense clump)
      fg.d3Force('x', forceX(0).strength(0.025));
      fg.d3Force('y', forceY(0).strength(0.025));
      fg.d3Force('center')?.strength(0.015);

      if (typeof fg.d3ReheatSimulation === 'function') {
        fg.d3ReheatSimulation();
      }
    }
  }, [
    graphData, 
    settings.nodeSpacing, 
    settings.nodeSize, 
    settings.theme, 
    repulsion, 
    gravity, 
    linkDist, 
    linkForceStrength, 
    dimensions.width, 
    dimensions.height
  ]);

  const handleNodeDrag = useCallback((node: any) => {
    node.fx = node.x;
    node.fy = node.y;
    if (fgRef.current && typeof (fgRef.current as any).d3ReheatSimulation === 'function') {
      (fgRef.current as any).d3ReheatSimulation();
    }
  }, []);

  const handleNodeDragEnd = useCallback((node: any) => {
    if (!node.isSun) {
      node.fx = undefined;
      node.fy = undefined;
      if (fgRef.current && typeof (fgRef.current as any).d3ReheatSimulation === 'function') {
        (fgRef.current as any).d3ReheatSimulation();
      }
    }
  }, []);

  const handleNodeClick = useCallback(async (node: any, event: any) => {
    if (event && (event.button === 2 || event.ctrlKey)) {
      return;
    }
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }

    if (node.isSun) return;

    if (event && (event.shiftKey || event.metaKey)) {
      toggleWebsiteSelection(node.id);
      return;
    }
    
    if (fgRef.current && (!event || (!event.shiftKey && !event.metaKey))) {
      // Center camera on clicked node with smooth glide
      if (typeof (fgRef.current as any).centerAt === 'function' && typeof node.x === 'number' && typeof node.y === 'number') {
        (fgRef.current as any).centerAt(node.x, node.y, 750);
      }
    }
    

    if (clickedNodeIdRef.current === node.id) {
      await db.incrementUsageCount(node.id);
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      window.open(node.url, '_blank');
      clickedNodeIdRef.current = null;
      setClickedNodeId(null);
      setSelectedWebsiteId(null);
      clearWebsiteSelection();
    } else {
      clickedNodeIdRef.current = node.id;
      setClickedNodeId(node.id);
      setSelectedWebsiteId(node.id);
      clearWebsiteSelection();
    }
    closeContextMenu();
  }, [queryClient, setSelectedWebsiteId, toggleWebsiteSelection, clearWebsiteSelection]);

  const handleNodeRightClick = useCallback((node: any, event: any) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    
    if (node.isSun) return;

    clickedNodeIdRef.current = node.id;
    setClickedNodeId(node.id);
    setSelectedWebsiteId(node.id);

    // Calculate screen coordinate relative to containerRef
    let x = lastClickCoords.current.x;
    let y = lastClickCoords.current.y;

    // Keep menu position inside bounds
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuWidth = 180;
      const menuHeight = 240;
      if (x + menuWidth > rect.width) {
        x = rect.width - menuWidth - 10;
      }
      if (y + menuHeight > rect.height) {
        y = rect.height - menuHeight - 10;
      }
      x = Math.max(10, x);
      y = Math.max(10, y);
    }

    setContextMenu({
      visible: true,
      x: x,
      y: y,
      websiteId: node.id
    });
  }, [setSelectedWebsiteId]);

  const handleBackgroundClick = useCallback((event?: any) => {
    if (event && (event.button === 2 || event.ctrlKey)) {
      return;
    }
    clickedNodeIdRef.current = null;
    setClickedNodeId(null);
    setSelectedWebsiteId(null);
    clearWebsiteSelection();
    closeContextMenu();
  }, [setSelectedWebsiteId, clearWebsiteSelection]);

  const handleUpdateNodeColor = useCallback(async (websiteId: string, color: string, reset: boolean = false) => {
    if (reset) {
      await db.websites.update(websiteId, {
        color: '#3b82f6',
        isCustomColor: false
      });
    } else {
      await db.websites.update(websiteId, {
        color: color,
        isCustomColor: true
      });
    }
    queryClient.invalidateQueries({ queryKey: ['websites'] });
  }, [queryClient]);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredNodeRef = useRef<any>(null);

  const handleNodeHover = useCallback((node: any) => {
    hoveredNodeRef.current = node;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (node && !node.isSun) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredWebsiteId(node.id);
      }, 300); // 300ms delay to prevent flickering
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredWebsiteId(null);
      }, 0);
    }
  }, [setHoveredWebsiteId]);

  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const size = getNodeRadius(node, settings.theme, settings.nodeSize, false);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
    ctx.fill();
  }, [settings.theme, settings.nodeSize]);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    
    let isBlurred = false;
    let isFocused = false;
    
    const hasCategoryFilter = !!graphFilterCategory;
    const hasTagFilter = !!graphFilterTag;
    const hasAnyFilter = hasCategoryFilter || hasTagFilter;

    let matchesFilter = true;
    if (hasCategoryFilter && node.category !== graphFilterCategory) {
      matchesFilter = false;
    }
    if (hasTagFilter && (!node.tags || !node.tags.some((t: string) => t.toLowerCase() === graphFilterTag?.toLowerCase()))) {
      matchesFilter = false;
    }

    if (hasAnyFilter) {
      if (node.isSun) {
        isBlurred = true;
      } else if (!matchesFilter) {
        isBlurred = true;
      } else {
        isFocused = true;
      }
    }

    if (selectedWebsiteIds && selectedWebsiteIds.length > 0) {
      if (node.isSun) {
        isBlurred = true;
        isFocused = false;
      } else {
        if (selectedWebsiteIds.includes(node.id)) {
          isFocused = true;
          isBlurred = false;
        } else {
          isBlurred = true;
          isFocused = false;
        }
      }
    } else if (clickedNodeId) {
       if (node.isSun) {
          isBlurred = true;
          isFocused = false;
       } else {
           const clickedNode = graphData.nodes.find((n: any) => n.id === clickedNodeId);
           const isSelf = node.id === clickedNodeId;
           const isParent = clickedNode && node.id === clickedNode.parentMainDomainId;
           const isChild = clickedNode && node.parentMainDomainId === clickedNode.id;
           const isSibling = clickedNode && node.parentMainDomainId && clickedNode.parentMainDomainId && node.parentMainDomainId === clickedNode.parentMainDomainId;
           const isSameRootDomain = clickedNode && node.rootDomain && clickedNode.rootDomain && node.rootDomain === clickedNode.rootDomain;

           if (isSelf || isParent || isChild || isSibling || isSameRootDomain) {
               isFocused = true;
               isBlurred = false;
           } else {
               isBlurred = true;
               isFocused = false;
           }
       }
    }

    const isObsidian = settings.theme === 'obsidian' || settings.theme === 'dark';

    ctx.save();
    if (isBlurred) {
      ctx.globalAlpha = 0.12; // Beautifully dimmed out
    } else {
      ctx.globalAlpha = 1.0;
    }

    const size = getNodeRadius(node, settings.theme, settings.nodeSize, isFocused);

    if (isObsidian) {
      const nodeDotColor = isFocused ? '#ffffff' : (node.color || '#dcdcdc');
      // Subtle Obsidian soft halo glow
      const haloRadius = size * 1.9;
      const gradient = ctx.createRadialGradient(node.x, node.y, size * 0.2, node.x, node.y, haloRadius);
      gradient.addColorStop(0, isFocused ? 'rgba(255, 255, 255, 0.45)' : 'rgba(220, 225, 235, 0.22)');
      gradient.addColorStop(0.5, isFocused ? 'rgba(255, 255, 255, 0.12)' : 'rgba(200, 210, 225, 0.06)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Clean crisp circular node dot
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = nodeDotColor;
      ctx.fill();

      // Selected ring
      if (selectedWebsiteIds && selectedWebsiteIds.includes(node.id)) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.8 / globalScale;
        ctx.stroke();
      }
    } else if (settings.glowingNodes && settings.glowStrength > 0) {
      ctx.save();
      
      const usageCount = node.usageCount || 0;
      const usageFactor = Math.min(usageCount, 100) / 100;
      const glowMultiplier = 1.5 + (usageFactor * 4);
      const glowRadius = size * glowMultiplier;
      const baseAlpha = isFocused ? 0.4 : 0.25;
      const dynamicAlpha = Math.min(0.8, baseAlpha + (usageFactor * 0.5)); 
      
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
      const { r, g, b } = node;
      
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${dynamicAlpha})`);
      gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${dynamicAlpha * 0.4})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.shadowBlur = settings.glowStrength * (3 / globalScale) * (1 + usageFactor * 2);
      ctx.shadowColor = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color;
      ctx.fill();
    }
    
    if (!isObsidian) {
      // Highlight selected or main domain nodes
      if (selectedWebsiteIds && selectedWebsiteIds.includes(node.id)) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3 / globalScale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4 / globalScale, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
      } else if (node.isMainDomain && node.subdomainCount) {
        // Subtle orbit halo around main domain hub
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4 / globalScale, 0, 2 * Math.PI, false);
        ctx.strokeStyle = hexToAlpha(node.color, '50');
        ctx.lineWidth = 1.2 / globalScale;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
      }
    }
    
    if (globalScale > 0.75 && node.name) {
      const label = node.name;
      const fontSize = 10 / globalScale;
      ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = isObsidian
        ? (isFocused ? 'rgba(255, 255, 255, 1)' : 'rgba(220, 225, 235, 0.85)')
        : (isFocused ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.8)');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, node.x, node.y + size + 7 / globalScale);
    }
    ctx.restore();
  }, [clickedNodeId, selectedWebsiteIds, graphData.nodes, settings.glowingNodes, settings.glowStrength, settings.theme, settings.nodeSize, graphFilterCategory, graphFilterTag]);

  return (
    <div 
      ref={containerRef}
      onPointerDown={(e) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          lastClickCoords.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
        }
      }}
      className="w-full h-full relative overflow-hidden bg-white/[0.01] backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel={(node: any) => {
            if (node.isMainDomain && node.subdomainCount) {
              return `<div style="padding:6px 10px;font-family:system-ui,sans-serif;background:rgba(10,10,15,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.6);">
                <div style="font-weight:700;font-size:13px;color:#fff;">${node.name}</div>
                <div style="font-size:11px;color:${node.color || '#60a5fa'};font-weight:600;margin-top:2px;">Main Domain • ${node.subdomainCount} ${node.subdomainCount === 1 ? 'subdomain' : 'subdomains'} connected</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;">${node.url}</div>
              </div>`;
            }
            if (node.isSubdomain) {
              return `<div style="padding:6px 10px;font-family:system-ui,sans-serif;background:rgba(10,10,15,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.6);">
                <div style="font-weight:700;font-size:13px;color:#fff;">${node.name}</div>
                <div style="font-size:11px;color:${node.color || '#93c5fd'};font-weight:500;margin-top:2px;">Subdomain of ${node.parentDomainName || 'Main Domain'}</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;">${node.url}</div>
              </div>`;
            }
            return `<div style="padding:6px 10px;font-family:system-ui,sans-serif;background:rgba(10,10,15,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.6);">
              <div style="font-weight:700;font-size:13px;color:#fff;">${node.name}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;">${node.url}</div>
            </div>`;
          }}
          nodeColor={(node: any) => node.color}
          nodeRelSize={settings.nodeSize}
          d3VelocityDecay={0.2}
          d3AlphaDecay={0.012}
          cooldownTime={15000}
          linkCurvature={0}
        linkColor={(link: any) => {
          if (link.isParentLink) return 'transparent';
          if (link.isOrbitLink) return 'transparent';
          
          const hasCategoryFilter = !!graphFilterCategory;
          const hasTagFilter = !!graphFilterTag;
          const hasAnyFilter = hasCategoryFilter || hasTagFilter;
          
          if (hasAnyFilter) {
            const sourceCategory = link.source.category || (typeof link.source === 'object' ? link.source.category : '');
            const targetCategory = link.target.category || (typeof link.target === 'object' ? link.target.category : '');
            const sourceTags = link.source.tags || (typeof link.source === 'object' ? link.source.tags : []) || [];
            const targetTags = link.target.tags || (typeof link.target === 'object' ? link.target.tags : []) || [];
            
            const sourceMatches = (!graphFilterCategory || sourceCategory === graphFilterCategory) &&
                                  (!graphFilterTag || sourceTags.some((t: string) => t.toLowerCase() === graphFilterTag.toLowerCase()));
            const targetMatches = (!graphFilterCategory || targetCategory === graphFilterCategory) &&
                                  (!graphFilterTag || targetTags.some((t: string) => t.toLowerCase() === graphFilterTag.toLowerCase()));
            
            if (!sourceMatches || !targetMatches) {
              return 'transparent';
            }
          }

          if (clickedNodeId) {
            const isConnectedToClicked = link.source.id === clickedNodeId || link.target.id === clickedNodeId || 
                                         link.source === clickedNodeId || link.target === clickedNodeId;
            return isConnectedToClicked ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.03)';
          }
          if (link.isSubdomainLink || link.isDomainLink) {
            return 'rgba(255, 255, 255, 0.2)';
          }
          return 'rgba(255, 255, 255, 0.12)';
        }}
        linkWidth={(link: any) => {
          if (link.isParentLink) return 0;
          if (link.isOrbitLink) return 0;
          if (clickedNodeId) {
            const isConnected = link.source.id === clickedNodeId || link.target.id === clickedNodeId || 
                                link.source === clickedNodeId || link.target === clickedNodeId;
            return isConnected ? 1.4 : 0.8;
          }
          return 0.9;
        }}
        backgroundColor="transparent"
        onNodeClick={handleNodeClick}
        onNodeRightClick={(node: any, event: any) => {
          if (event && event.preventDefault) event.preventDefault();
          if (event && event.stopPropagation) event.stopPropagation();
          if (containerRef.current && event && event.clientX !== undefined) {
            const rect = containerRef.current.getBoundingClientRect();
            lastClickCoords.current = {
              x: event.clientX - rect.left,
              y: event.clientY - rect.top
            };
          }
          handleNodeRightClick(node, event);
        }}
        onBackgroundClick={handleBackgroundClick}
        onBackgroundRightClick={(event: MouseEvent) => {
          event.preventDefault();
        }}
        onNodeHover={handleNodeHover}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onZoom={(transform: any) => {
          if (transform && typeof transform.k === 'number') {
            const pct = Math.round(transform.k * 100);
            zoomPercentRef.current = pct;
            if (zoomDisplayRef.current) {
              zoomDisplayRef.current.textContent = `${pct}%`;
            }
          }
        }}
        cooldownTicks={150}
        onEngineStop={() => {
          if (fgRef.current && lastReset === 0) {
            if (typeof (fgRef.current as any).zoomToFit === 'function') {
              (fgRef.current as any).zoomToFit(1100, 150);
            }
          }
        }}
        nodePointerAreaPaint={nodePointerAreaPaint}
        nodeCanvasObject={nodeCanvasObject}
      />
      )}
      
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[9999] min-w-[180px] glass-dark border border-white/10 rounded-2xl py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl bg-black/95 flex flex-col overflow-hidden"
            style={{ 
              top: `${contextMenu.y}px`, 
              left: `${contextMenu.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contextMenu.websiteId) {
                  const node = await db.websites.get(contextMenu.websiteId);
                  if (node) {
                    await db.incrementUsageCount(node.id);
                    queryClient.invalidateQueries({ queryKey: ['websites'] });
                    window.open(node.url, '_blank');
                  }
                }
                closeContextMenu();
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors text-left w-full"
            >
              <ExternalLink className="w-3.5 h-3.5 text-white/40" />
              Visit Website
            </button>
            <div className="h-px bg-white/5 mx-2 my-1" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contextMenu.websiteId) {
                  setSelectedWebsiteId(contextMenu.websiteId);
                }
                closeContextMenu();
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors text-left w-full"
            >
              <Info className="w-3.5 h-3.5 text-white/40" />
              View Details
            </button>
            <div className="h-px bg-white/5 mx-2 my-1" />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contextMenu.websiteId) {
                  setEditingWebsiteId(contextMenu.websiteId);
                }
                closeContextMenu();
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors text-left w-full"
            >
              <Pencil className="w-3.5 h-3.5 text-white/40" />
              Edit
            </button>
            <div className="h-px bg-white/5 mx-2 my-1" />
            <div className="px-4 py-2 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.05em]">Node Color</span>
              <div className="flex flex-wrap gap-1.5 items-center">
                {['#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#10b981', '#f59e0b', '#f97316'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (contextMenu.websiteId) {
                        await handleUpdateNodeColor(contextMenu.websiteId, c);
                      }
                    }}
                    className="w-4 h-4 rounded-full border border-white/10 hover:scale-125 transition-transform cursor-pointer relative shrink-0"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                {/* Custom color picker */}
                <label className="w-4 h-4 rounded-full border border-white/10 hover:scale-125 transition-transform cursor-pointer flex items-center justify-center bg-white/5 hover:bg-white/10 overflow-hidden relative shrink-0" title="Custom color">
                  <input
                    type="color"
                    onChange={async (e) => {
                      if (contextMenu.websiteId) {
                        await handleUpdateNodeColor(contextMenu.websiteId, e.target.value);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500" />
                </label>
              </div>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (contextMenu.websiteId) {
                    await handleUpdateNodeColor(contextMenu.websiteId, '', true);
                  }
                  closeContextMenu();
                }}
                className="text-[10px] text-left text-white/50 hover:text-white mt-1 underline decoration-dotted underline-offset-2 transition-colors w-max"
              >
                Reset to Default/Rules
              </button>
            </div>
            <div className="h-px bg-white/5 mx-2 my-1" />
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contextMenu.websiteId) {
                  const node = await db.websites.get(contextMenu.websiteId);
                  if (node) {
                    setDeleteTargetId(node.id);
                    setDeleteTargetName(node.name);
                  }
                }
                closeContextMenu();
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors text-left w-full"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400/40" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Modal Confirmation for Deletion */}
      <AnimatePresence>
        {deleteTargetId && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm p-6 bg-[#0c0c0e]/95 border border-white/10 rounded-2xl shadow-2xl text-center backdrop-blur-xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider">Delete Website Node?</h3>
              <p className="text-xs text-white/60 mt-2.5 leading-relaxed font-sans px-2">
                Are you sure you want to delete <span className="text-white font-bold">"{deleteTargetName}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => {
                    setDeleteTargetId(null);
                    setDeleteTargetName('');
                  }}
                  className="flex-1 py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (deleteTargetId) {
                      try {
                        await db.websites.delete(deleteTargetId);
                        
                        // Instant cache update for the websites query
                        queryClient.setQueryData(['websites'], (old: any) => {
                          if (!old) return [];
                          return old.filter((site: any) => site.id !== deleteTargetId);
                        });
                        
                        setSelectedWebsiteId(null);
                        setClickedNodeId(null);
                        clickedNodeIdRef.current = null;
                        
                        await queryClient.invalidateQueries({ queryKey: ['websites'] });
                        await queryClient.invalidateQueries({ queryKey: ['websites-count'] });
                      } catch (error) {
                        console.error('Failed to delete node:', error);
                      }
                    }
                    setDeleteTargetId(null);
                    setDeleteTargetName('');
                  }}
                  className="flex-1 py-2 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-500/25"
                >
                  Delete Node
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Smooth Zoom HUD Controls */}
      <div 
        id="graph-zoom-hud"
        className="absolute bottom-6 right-6 z-30 flex items-center gap-1 p-1 rounded-full bg-[#080c14]/85 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] select-none"
      >
        <button
          onClick={() => triggerZoomOut()}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Zoom Out (-)"
          aria-label="Zoom Out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          ref={zoomDisplayRef}
          onClick={() => triggerFitToView()}
          className="px-2 py-0.5 text-[11px] font-mono font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer tracking-tight"
          title="Reset Zoom / Fit to View (0)"
          aria-label="Reset Zoom"
        >
          100%
        </button>
        <button
          onClick={() => triggerZoomIn()}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Zoom In (+)"
          aria-label="Zoom In"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />
        <button
          onClick={() => triggerFitToView()}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          title="Fit to Screen"
          aria-label="Fit to Screen"
        >
          <Focus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
