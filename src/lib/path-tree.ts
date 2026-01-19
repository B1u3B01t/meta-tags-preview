import { SitemapUrl } from '@/types';

export interface PathTreeNode {
  name: string;
  fullPath: string;
  urls: SitemapUrl[]; // URLs that end at this node
  isIncluded: boolean; // Whether this node's URLs are included in the limited set
  totalUrlCount: number; // Total URLs in this branch (original)
  limitedUrlCount: number; // Limited URLs in this branch
  children: Map<string, PathTreeNode>;
  isExpanded: boolean;
  isSelected: boolean;
}

export interface FlatTreeNode {
  id: string;
  name: string;
  fullPath: string;
  depth: number;
  urls: SitemapUrl[];
  urlCount: number;
  limitedUrlCount: number; // Limited URLs in this branch
  totalUrlCount: number; // Total URLs in this branch
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isPartiallySelected: boolean;
  isLimited: boolean;
  isIncluded: boolean;
}

export interface TreeStats {
  totalOriginalUrls: number;
  totalLimitedUrls: number;
}

/**
 * Build a tree structure from URLs based on path segments
 * Limits: each parent can have at most maxChildrenPerParent children with URLs
 */
export function buildPathTree(
  urls: SitemapUrl[],
  maxChildrenPerParent: number = 20
): { tree: PathTreeNode; stats: TreeStats } {
  const root: PathTreeNode = {
    name: 'root',
    fullPath: '',
    urls: [],
    isIncluded: true,
    totalUrlCount: 0,
    limitedUrlCount: 0,
    children: new Map(),
    isExpanded: true,
    isSelected: false,
  };

  // First pass: build the tree with all URLs
  for (const url of urls) {
    try {
      const parsed = new URL(url.loc);
      const pathParts = parsed.pathname.split('/').filter(Boolean);

      let currentNode = root;

      // Handle root URLs (no path)
      if (pathParts.length === 0) {
        root.urls.push(url);
        continue;
      }

      // Traverse/create path segments
      for (let i = 0; i < pathParts.length; i++) {
        const segment = pathParts[i];
        const fullPath = '/' + pathParts.slice(0, i + 1).join('/');

        if (!currentNode.children.has(segment)) {
          currentNode.children.set(segment, {
            name: segment,
            fullPath,
            urls: [],
            isIncluded: true, // Will be updated in second pass
            totalUrlCount: 0,
            limitedUrlCount: 0,
            children: new Map(),
            isExpanded: false,
            isSelected: false,
          });
        }

        currentNode = currentNode.children.get(segment)!;

        // Add URL to the leaf node (last segment)
        if (i === pathParts.length - 1) {
          currentNode.urls.push(url);
        }
      }
    } catch {
      // Skip invalid URLs
    }
  }

  // Second pass: mark included children and calculate counts
  const stats = { totalOriginalUrls: 0, totalLimitedUrls: 0 };
  markIncludedChildren(root, stats, true, maxChildrenPerParent);

  return { tree: root, stats };
}

/**
 * Mark which children are included (first maxChildrenPerParent with URLs)
 * and calculate total/limited URL counts
 * Note: Root node's direct children are always included (no limiting applied)
 */
function markIncludedChildren(
  node: PathTreeNode,
  stats: TreeStats,
  parentIncluded: boolean,
  maxChildrenPerParent: number
): void {
  // Count children that have URLs (directly or in descendants)
  const childrenWithUrls: string[] = [];

  for (const [key, child] of node.children.entries()) {
    const hasUrls = hasAnyUrls(child);
    if (hasUrls) {
      childrenWithUrls.push(key);
    }
  }

  // Root node's direct children are always included (no limiting)
  // For all other nodes, apply the maxChildrenPerParent limit
  const isRootNode = node.fullPath === '';
  const includedChildren = isRootNode
    ? new Set(childrenWithUrls) // Include all root children
    : new Set(childrenWithUrls.slice(0, maxChildrenPerParent)); // Apply limit for other nodes

  // Process all children
  for (const [key, child] of node.children.entries()) {
    const childIncluded = parentIncluded && includedChildren.has(key);
    child.isIncluded = childIncluded;
    markIncludedChildren(child, stats, childIncluded, maxChildrenPerParent);
  }

  // Calculate counts for this node
  node.totalUrlCount = countAllUrls(node);
  node.limitedUrlCount = countLimitedUrls(node);

  // Add to stats (only count leaf URLs, not intermediate nodes)
  stats.totalOriginalUrls += node.urls.length;
  if (node.isIncluded) {
    stats.totalLimitedUrls += node.urls.length;
  }
}

/**
 * Check if a node or any of its descendants has URLs
 */
function hasAnyUrls(node: PathTreeNode): boolean {
  if (node.urls.length > 0) return true;
  for (const child of node.children.values()) {
    if (hasAnyUrls(child)) return true;
  }
  return false;
}

/**
 * Count all URLs in this branch (original, no limiting)
 */
function countAllUrls(node: PathTreeNode): number {
  let count = node.urls.length;
  for (const child of node.children.values()) {
    count += child.totalUrlCount;
  }
  return count;
}

/**
 * Count limited URLs in this branch (respecting isIncluded)
 */
function countLimitedUrls(node: PathTreeNode): number {
  if (!node.isIncluded) return 0;
  let count = node.urls.length;
  for (const child of node.children.values()) {
    count += child.limitedUrlCount;
  }
  return count;
}

/**
 * Get all LIMITED URLs from a node and its descendants (respecting isIncluded)
 */
export function getAllUrlsFromNode(node: PathTreeNode): SitemapUrl[] {
  if (!node.isIncluded) return [];

  const urls: SitemapUrl[] = [...node.urls];
  for (const child of node.children.values()) {
    urls.push(...getAllUrlsFromNode(child));
  }
  return urls;
}

/**
 * Get all ORIGINAL URLs from a node and its descendants (ignoring limits)
 */
export function getAllOriginalUrlsFromNode(node: PathTreeNode): SitemapUrl[] {
  const urls: SitemapUrl[] = [...node.urls];
  for (const child of node.children.values()) {
    urls.push(...getAllOriginalUrlsFromNode(child));
  }
  return urls;
}

/**
 * Flatten tree for rendering, respecting expanded state
 */
export function flattenTree(
  node: PathTreeNode,
  expandedPaths: Set<string>,
  selectedUrls: Set<string>,
  depth: number = 0,
  parentPath: string = ''
): FlatTreeNode[] {
  const result: FlatTreeNode[] = [];

  // Sort children alphabetically
  const sortedChildren = Array.from(node.children.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [, child] of sortedChildren) {
    const allUrls = getAllOriginalUrlsFromNode(child);
    const selectedCount = allUrls.filter((u) => selectedUrls.has(u.loc)).length;
    const isExpanded = expandedPaths.has(child.fullPath);
    const isLimited = child.totalUrlCount > child.limitedUrlCount;

    result.push({
      id: child.fullPath,
      name: child.name,
      fullPath: child.fullPath,
      depth,
      urls: child.urls,
      urlCount: child.urls.length,
      limitedUrlCount: child.limitedUrlCount,
      totalUrlCount: child.totalUrlCount,
      hasChildren: child.children.size > 0,
      isExpanded,
      isSelected: selectedCount === allUrls.length && allUrls.length > 0,
      isPartiallySelected: selectedCount > 0 && selectedCount < allUrls.length,
      isLimited,
      isIncluded: child.isIncluded,
    });

    // Add children if expanded
    if (isExpanded && child.children.size > 0) {
      result.push(
        ...flattenTree(child, expandedPaths, selectedUrls, depth + 1, child.fullPath)
      );
    }
  }

  return result;
}

/**
 * Get all paths that should be expanded to show a specific path
 */
export function getPathsToExpand(fullPath: string): string[] {
  const parts = fullPath.split('/').filter(Boolean);
  const paths: string[] = [];

  for (let i = 1; i <= parts.length; i++) {
    paths.push('/' + parts.slice(0, i).join('/'));
  }

  return paths;
}
