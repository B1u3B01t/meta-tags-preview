'use client';

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  buildPathTree,
  flattenTree,
  getAllUrlsFromNode,
  getAllOriginalUrlsFromNode,
  PathTreeNode,
  FlatTreeNode,
  TreeStats,
} from '@/lib/path-tree';
import { SitemapUrl } from '@/types';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PathTreeSidebarProps {
  urls: SitemapUrl[];
  selectedUrls: Set<string>;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onToggleSelect: (urls: SitemapUrl[]) => void;
  onSelectPath: (path: string) => void;
  selectedPath: string | null;
  maxPathsPerParent: number;
}

export function PathTreeSidebar({
  urls,
  selectedUrls,
  expandedPaths,
  onToggleExpand,
  onToggleSelect,
  onSelectPath,
  selectedPath,
  maxPathsPerParent,
}: PathTreeSidebarProps) {
  const { tree, stats } = useMemo(
    () => buildPathTree(urls, maxPathsPerParent),
    [urls, maxPathsPerParent]
  );

  const flatNodes = useMemo(
    () => flattenTree(tree, expandedPaths, selectedUrls),
    [tree, expandedPaths, selectedUrls]
  );

  // Get node for selection operations
  const getNodeByPath = (root: PathTreeNode, path: string): PathTreeNode | null => {
    const parts = path.split('/').filter(Boolean);
    let current = root;

    for (const part of parts) {
      const child = current.children.get(part);
      if (!child) return null;
      current = child;
    }

    return current;
  };

  const handleCheckboxClick = (node: FlatTreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const treeNode = getNodeByPath(tree, node.fullPath);
    if (treeNode) {
      onToggleSelect(getAllOriginalUrlsFromNode(treeNode));
    }
  };

  const handleRowClick = (node: FlatTreeNode) => {
    if (node.hasChildren) {
      onToggleExpand(node.fullPath);
    }
    onSelectPath(node.fullPath);
  };

  // Handle root URLs
  const rootUrls = tree.urls;
  const rootSelectedCount = rootUrls.filter((u) => selectedUrls.has(u.loc)).length;
  const rootIsSelected = rootSelectedCount === rootUrls.length && rootUrls.length > 0;
  const rootIsPartial = rootSelectedCount > 0 && rootSelectedCount < rootUrls.length;

  return (
    <div className="h-full flex flex-col border-r bg-gray-50/50 dark:bg-gray-900/50">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Path Navigator</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {stats.totalOriginalUrls} URLs → {stats.totalLimitedUrls} (max {maxPathsPerParent}/path)
        </p>
        <p className="text-xs text-muted-foreground">
          {selectedUrls.size} selected
        </p>
      </div>

      <ScrollArea className="flex-1 h-full min-h-0">
        <div className="p-2">
          {/* Root URLs (if any) */}
          {rootUrls.length > 0 && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm',
                selectedPath === '/'
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              onClick={() => onSelectPath('/')}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(rootUrls);
                }}
                className="p-0.5"
              >
                {rootIsSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : rootIsPartial ? (
                  <MinusSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <FileText className="h-4 w-4 text-muted-foreground ml-1" />
              <span className="flex-1 truncate">/</span>
              {tree.isLimited && (
                <Badge variant="outline" className="text-xs h-5 text-orange-600">
                  {rootUrls.length}/{tree.totalUrlCount}
                </Badge>
              )}
              {!tree.isLimited && (
                <Badge variant="secondary" className="text-xs h-5">
                  {rootUrls.length}
                </Badge>
              )}
            </div>
          )}

          {/* Tree nodes */}
          {flatNodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm',
                selectedPath === node.fullPath
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
              onClick={() => handleRowClick(node)}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => handleCheckboxClick(node, e)}
                className="p-0.5"
              >
                {node.isSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : node.isPartiallySelected ? (
                  <MinusSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Expand/Collapse or spacer */}
              {node.hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(node.fullPath);
                  }}
                  className="p-0.5"
                >
                  {node.isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <span className="w-5" />
              )}

              {/* Icon */}
              {node.hasChildren ? (
                node.isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-500" />
                )
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}

              {/* Name */}
              <span className="flex-1 truncate" title={node.fullPath}>
                {node.name}
              </span>

              {/* URL count badges - show limited/total for the entire branch */}
              {!node.isIncluded ? (
                <Badge variant="outline" className="text-xs h-5 text-gray-400 border-gray-300">
                  excluded
                </Badge>
              ) : node.isLimited ? (
                <Badge variant="outline" className="text-xs h-5 text-orange-600 border-orange-300">
                  {node.limitedUrlCount}/{node.totalUrlCount}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs h-5">
                  {node.limitedUrlCount}
                </Badge>
              )}
            </div>
          ))}

          {flatNodes.length === 0 && rootUrls.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No URLs to display
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick actions */}
      <div className="p-2 border-t space-y-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            // Select all URLs from the tree
            const allUrls = getAllOriginalUrlsFromNode(tree);
            // Add all URLs that aren't already selected
            const urlsToAdd = allUrls.filter((u) => !selectedUrls.has(u.loc));
            if (urlsToAdd.length > 0) {
              onToggleSelect(urlsToAdd);
            }
          }}
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            // Deselect all URLs from the tree
            const allUrls = getAllOriginalUrlsFromNode(tree);
            // Remove all URLs that are currently selected
            const urlsToRemove = allUrls.filter((u) => selectedUrls.has(u.loc));
            if (urlsToRemove.length > 0) {
              onToggleSelect(urlsToRemove);
            }
          }}
        >
          Deselect All
        </Button>
      </div>
    </div>
  );
}
