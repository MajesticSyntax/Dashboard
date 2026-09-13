import { Website } from '../types';
import { db } from '../db/db';
import { QueryClient } from '@tanstack/react-query';

/**
 * Filters and sorts websites in strict ascending order (A to Z) based on search query.
 * Ranking algorithm:
 * 1. Exact name match (case-insensitive)
 * 2. Prefix match on name (sorted ascending A-Z)
 * 3. Substring match on name (sorted ascending A-Z)
 * 4. Substring match on URL, tags, or category (sorted ascending A-Z)
 */
export function getSortedAscendingNodes(websites: Website[], query: string): Website[] {
  const q = (query || '').trim().toLowerCase();

  if (!q) {
    return [...websites].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
    );
  }

  const matching = websites.filter((w) => {
    const name = (w.name || '').toLowerCase();
    const url = (w.url || '').toLowerCase();
    const tags = (w.tags || []).map((t) => (t || '').toLowerCase());
    const category = (w.category || '').toLowerCase();

    return (
      name.includes(q) ||
      url.includes(q) ||
      tags.some((t) => t.includes(q)) ||
      category.includes(q)
    );
  });

  return matching.sort((a, b) => {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();

    // Exact match comes first
    if (aName === q && bName !== q) return -1;
    if (bName === q && aName !== q) return 1;

    // Prefix match on name comes next
    const aStarts = aName.startsWith(q);
    const bStarts = bName.startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // Substring match on name comes before url/tag only match
    const aNameInc = aName.includes(q);
    const bNameInc = bName.includes(q);
    if (aNameInc && !bNameInc) return -1;
    if (!aNameInc && bNameInc) return 1;

    // Strict alphabetical ascending order (A to Z)
    return (a.name || '').localeCompare(b.name || '', undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

/**
 * Unified node opener that increments visit count, invalidates cache, and opens in new tab.
 */
export async function openNodeWebsite(website: Website, queryClient?: QueryClient) {
  try {
    await db.incrementUsageCount(website.id);
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      queryClient.invalidateQueries({ queryKey: ['websites-count'] });
    }
  } catch (error) {
    console.error('Failed to increment usage count for node:', error);
  } finally {
    window.open(website.url, '_blank');
  }
}
