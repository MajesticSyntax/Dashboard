import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useQuery } from '@tanstack/react-query';
import { db } from '../db/db';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Tag, Folder, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export const GraphFilters: React.FC = () => {
  const {
    graphFilterCategory,
    graphFilterTag,
    setGraphFilterCategory,
    setGraphFilterTag,
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);

  // Fetch real websites from query cache / DB
  const { data: websites = [] } = useQuery({
    queryKey: ['websites'],
    queryFn: () => db.websites.toArray(),
  });

  // Get active unique categories
  const categoriesList = useMemo(() => {
    const cats = websites.map(w => w.category).filter(Boolean);
    return Array.from(new Set(cats));
  }, [websites]);

  // Get active unique tags (limit to top 15 tags to keep UI pristine)
  const tagsList = useMemo(() => {
    const tagCounts: { [key: string]: number } = {};
    websites.forEach(w => {
      w.tags?.forEach(tag => {
        if (!tag) return;
        const cleanTag = tag.trim();
        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 15);
  }, [websites]);

  const hasActiveFilter = !!graphFilterCategory || !!graphFilterTag;

  const handleClearAll = () => {
    setGraphFilterCategory(null);
    setGraphFilterTag(null);
  };

  const handleCategoryClick = (cat: string) => {
    if (graphFilterCategory === cat) {
      setGraphFilterCategory(null); // toggle off
    } else {
      setGraphFilterCategory(cat);
    }
  };

  const handleTagClick = (tag: string) => {
    if (graphFilterTag === tag) {
      setGraphFilterTag(null); // toggle off
    } else {
      setGraphFilterTag(tag);
    }
  };

  // Label to display current filter status on the trigger button
  const getFilterStatusLabel = () => {
    if (graphFilterCategory && graphFilterTag) {
      return `${graphFilterCategory} + #${graphFilterTag}`;
    }
    if (graphFilterCategory) {
      return graphFilterCategory;
    }
    if (graphFilterTag) {
      return `#${graphFilterTag}`;
    }
    return 'Filter Nodes';
  };

  return (
    <div className="relative pointer-events-auto select-none">
      {/* Filter Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-11 px-4 rounded-xl flex items-center gap-2.5 transition-all duration-300 border cursor-pointer font-medium text-xs font-sans tracking-wide",
            hasActiveFilter
              ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
              : "bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.07] hover:text-white"
          )}
        >
          <Filter className={cn("w-3.5 h-3.5", hasActiveFilter && "animate-pulse")} />
          <span>{getFilterStatusLabel()}</span>
          <ChevronDown className={cn("w-3 h-3 text-white/40 transition-transform duration-300", isOpen && "rotate-180")} />
        </button>

        {/* Quick Clear Button */}
        {hasActiveFilter && (
          <button
            onClick={handleClearAll}
            className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-white/50 cursor-pointer transition-all flex items-center justify-center"
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Floating Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click shield to close */}
            <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 mt-3 w-80 z-50 rounded-2xl border border-white/10 bg-[#090d14]/90 backdrop-blur-3xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] p-5 overflow-hidden"
            >
              {/* Decorative accent spotlight */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col gap-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-bold">Focus Filters</span>
                  {hasActiveFilter && (
                    <button
                      onClick={handleClearAll}
                      className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-medium cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Categories Section */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-white/50">
                    <Folder className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-semibold tracking-wide font-sans text-white/70">Categories</span>
                  </div>
                  {categoriesList.length === 0 ? (
                    <span className="text-[11px] text-white/30 italic">No categories yet</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {categoriesList.map(cat => {
                        const isSelected = graphFilterCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={cn(
                              "text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-1",
                              isSelected
                                ? "bg-blue-500/20 text-white border-blue-500/40 shadow-[0_2px_8px_rgba(59,130,246,0.1)]"
                                : "bg-white/[0.02] text-white/60 border-white/5 hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-blue-400" />}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tags Section */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-white/50">
                    <Tag className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs font-semibold tracking-wide font-sans text-white/70">Tags</span>
                  </div>
                  {tagsList.length === 0 ? (
                    <span className="text-[11px] text-white/30 italic">No tags found</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {tagsList.map(tag => {
                        const isSelected = graphFilterTag === tag;
                        return (
                          <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            className={cn(
                              "text-[11px] px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-1",
                              isSelected
                                ? "bg-pink-500/20 text-white border-pink-500/40 shadow-[0_2px_8px_rgba(236,72,153,0.1)]"
                                : "bg-white/[0.02] text-white/60 border-white/5 hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-pink-400" />}
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom hint */}
                <div className="text-[10px] text-white/30 border-t border-white/5 pt-2.5 font-medium leading-relaxed">
                  💡 Clicking a category or tag blurs out unrelated nodes, allowing you to isolate and study connection clusters instantly.
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
