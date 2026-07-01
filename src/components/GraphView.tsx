import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { useStore } from '../store/useStore';
import { Website, GraphNode, GraphLink } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Trash2, Sliders, Play, Pause, RotateCcw, SkipForward, Activity, Plus as PlusIcon, Check, Sparkles, Info, ExternalLink } from 'lucide-react';
import { forceX, forceY, forceCollide } from 'd3-force';

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

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
};

export const GraphView: React.FC = () => {
  const { searchQuery, selectedCategory, settings, setSelectedWebsiteId, setHoveredWebsiteId, lastReset, fitToViewTrigger, setEditingWebsiteId, graphFilterCategory, graphFilterTag, selectedWebsiteIds, toggleWebsiteSelection, clearWebsiteSelection } = useStore();
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);
  const clickedNodeIdRef = useRef<string | null>(null);
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
  }, [colorRules, settings.nodeColor]);

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

    // 1. Group by Domain
    const domainMap = new Map<string, any[]>();
    nodes.forEach(node => {
      if (!node.isSun && node.url) {
        const domain = getDomain(node.url);
        if (domain) {
          if (!domainMap.has(domain)) domainMap.set(domain, []);
          domainMap.get(domain)?.push(node);
        }
      }
    });

    const mainNodes: string[] = [];

    domainMap.forEach((domainNodes) => {
      domainNodes.sort((a, b) => (a.url?.length || 0) - (b.url?.length || 0));
      
      const mainNode = domainNodes[0];
      mainNodes.push(mainNode.id);
      
      for (let i = 1; i < domainNodes.length; i++) {
        const subNode = domainNodes[i];
        subNode.color = hexToAlpha(mainNode.color, '60');
        subNode.isSubNode = true;
        subNode.val = Math.max(3, Math.sqrt(subNode.usageCount || 0) * 1.2 + 3);

        links.push({ 
          source: mainNode.id, 
          target: subNode.id,
          isDomainLink: true 
        });
      }
    });

    if (mainNodes.length > 1) {
      for (let i = 0; i < mainNodes.length; i++) {
        for (let j = i + 1; j < mainNodes.length; j++) {
          links.push({ 
            source: mainNodes[i], 
            target: mainNodes[j], 
            isParentLink: true,
            distance: linkDist * 2
          });
        }
      }
    }

    nodes.forEach(node => {
      const neighbors = links.filter(l => l.source === node.id || l.target === node.id);
      if (neighbors.length > 0) {
        node.val = (node.val || 4) * (1 + (neighbors.length * 0.05));
      }
      
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
  }, [filteredWebsites, timelapseWebsites, isTimelapseActive, getCustomColor, linkDist]);

  useEffect(() => {
    if (fgRef.current && lastReset > 0) {
      // 1. Clear fixed positions if nodes were dragged
      const currentNodes = fgRef.current.graphData().nodes;
      currentNodes.forEach((node: any) => {
        if (!node.isSun) {
          node.fx = undefined;
          node.fy = undefined;
        } else {
          node.fx = 0;
          node.fy = 0;
        }
      });

      // 2. Reheat simulation
      fgRef.current.d3ReheatSimulation();
      
      // 3. Zoom and center
      fgRef.current.zoomToFit(800, 150);
    }
  }, [lastReset]);

  useEffect(() => {
    if (fgRef.current && fitToViewTrigger > 0) {
      fgRef.current.zoomToFit(800, 150);
    }
  }, [fitToViewTrigger]);

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

  // Live update d3-force simulation when variables are adjusted
  useEffect(() => {
    if (fgRef.current) {
      // 1. Every single node acts like a negatively charged particle. They all push away from each other.
      fgRef.current.d3Force('charge')?.strength(repulsion); 
      
      // 2. Links act like virtual rubber bands or springs.
      fgRef.current.d3Force('link')
        ?.distance((link: any) => {
          if (link.isParentLink) return linkDist * 1.5;
          const isChildConnection = link.isCategoryChildLink;
          return isChildConnection ? Math.round(linkDist * 0.4) : linkDist;
        })
        ?.strength((link: any) => {
          if (link.isParentLink) return 0.15; // Rubbery interconnected main nodes
          
          const isChildConnection = link.isDomainLink || link.isCategoryChildLink;
          if (isChildConnection) {
            // Rigid connection for subnodes
            return 2.0;
          }
          
          return linkForceStrength;
        });

      // 3. Invisible gravitational pull toward the exact coordinates (0,0) of the screen.
      fgRef.current.d3Force('x', forceX(0).strength(gravity));
      fgRef.current.d3Force('y', forceY(0).strength(gravity));
      
      // Standard center force
      fgRef.current.d3Force('center')?.strength(gravity);

      // Prevent nodes from overlapping for smoother, more stable layout
      fgRef.current.d3Force('collide', forceCollide((node: any) => {
        const size = (node.val || 4) * 1.5;
        return node.isSun ? size + 15 : size + 5;
      }).iterations(2));

      fgRef.current.d3ReheatSimulation();
    }
  }, [repulsion, gravity, linkDist, linkForceStrength]);

  const handleNodeDrag = useCallback((node: any) => {
    node.fx = node.x;
    node.fy = node.y;
    if (fgRef.current) {
      fgRef.current.d3ReheatSimulation();
    }
  }, []);

  const handleNodeDragEnd = useCallback((node: any) => {
    if (!node.isSun) {
      node.fx = undefined;
      node.fy = undefined;
      if (fgRef.current) {
        fgRef.current.d3ReheatSimulation();
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
      // Center camera on clicked node
      fgRef.current.centerAt(node.x, node.y, 400);
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
      setHoveredWebsiteId(null);
    }
  }, [setHoveredWebsiteId]);

  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const size = (node.val || 4) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

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
           const clickedDomain = getDomain(graphData.nodes.find((n: any) => n.id === clickedNodeId)?.url || '');
           const nodeDomain = getDomain(node.url || '');
           if (node.id === clickedNodeId || (clickedDomain && nodeDomain === clickedDomain && nodeDomain !== '')) {
               isFocused = true;
               isBlurred = false;
           } else {
               isBlurred = true;
               isFocused = false;
           }
       }
    }

    ctx.save();
    if (isBlurred) {
      ctx.globalAlpha = 0.12; // Beautifully dimmed out
    } else {
      ctx.globalAlpha = 1.0;
    }

    const baseSize = node.val || 4;
    const size = (isFocused ? baseSize * 1.8 : baseSize) * 0.8;

    if (settings.glowingNodes && settings.glowStrength > 0) {
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
    
    // Highlight selected nodes
    if (selectedWebsiteIds && selectedWebsiteIds.includes(node.id)) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3 / globalScale;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 4 / globalScale, 0, 2 * Math.PI, false);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }
    
    if (globalScale > 1.5 && node.name) {
      const label = node.name;
      const fontSize = 9 / globalScale;
      ctx.font = `500 ${fontSize}px Inter`;
      ctx.fillStyle = isFocused ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, node.x, node.y + size + 8 / globalScale);
    }
    ctx.restore();
  }, [clickedNodeId, selectedWebsiteIds, graphData.nodes, settings.glowingNodes, settings.glowStrength, graphFilterCategory, graphFilterTag]);

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
          nodeLabel="name"
          nodeColor={(node: any) => node.color}
          nodeRelSize={settings.nodeSize}
          d3VelocityDecay={0.15}
          d3AlphaDecay={0.01}
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

          if (link.isDomainLink) {
             const isConnectedToClicked = clickedNodeId && (link.source.id === clickedNodeId || link.target.id === clickedNodeId || link.source === clickedNodeId || link.target === clickedNodeId);
             if (clickedNodeId && !isConnectedToClicked) return 'transparent'; // Hide other domain links when focused
             return 'rgba(255, 255, 255, 0.4)';
          }
          
          if (clickedNodeId) {
            const isConnectedToClicked = link.source.id === clickedNodeId || link.target.id === clickedNodeId || link.source === clickedNodeId || link.target === clickedNodeId;
            return isConnectedToClicked ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
          }
          
          if (link.isCategoryChildLink) return 'rgba(255, 255, 255, 0.08)';
          
          return 'rgba(255, 255, 255, 0.05)';
        }}
        linkWidth={(link: any) => {
          if (link.isParentLink) return 0;
          if (link.isOrbitLink) return 0;
          if (link.isDomainLink) return 2;
          if (link.isCategoryChildLink) return 1.5;
          return 1;
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
        cooldownTicks={150}
        onEngineStop={() => {
          if (fgRef.current && lastReset === 0) {
            fgRef.current.zoomToFit(800, 150);
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
    </div>
  );
};
