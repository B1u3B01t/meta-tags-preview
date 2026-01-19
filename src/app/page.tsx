'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MetaTagCard, MetaTabType } from '@/components/MetaTagCard';
import { PathTreeSidebar } from '@/components/PathTreeSidebar';
import { exportToJSON, exportToCSV } from '@/lib/export';
import { buildPathTree, getAllUrlsFromNode } from '@/lib/path-tree';
import { PageMetaData, SitemapUrl } from '@/types';
import {
  Search,
  Download,
  Loader2,
  FileJson,
  FileSpreadsheet,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Twitter,
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

export default function Home() {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [urls, setUrls] = useState<SitemapUrl[]>([]);
  const [metaResults, setMetaResults] = useState<PageMetaData[]>([]);
  const [isLoadingSitemap, setIsLoadingSitemap] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [masterTab, setMasterTab] = useState<MetaTabType>('basic');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [maxPathsPerParent, setMaxPathsPerParent] = useState(20);

  // Build tree from URLs (with limiting applied)
  // This rebuilds whenever urls or maxPathsPerParent changes, reprocessing all URLs
  const { tree, stats } = useMemo(() => {
    if (urls.length === 0) {
      return {
        tree: {
          name: 'root',
          fullPath: '',
          urls: [],
          isIncluded: true,
          totalUrlCount: 0,
          limitedUrlCount: 0,
          children: new Map(),
          isExpanded: true,
          isSelected: false,
        },
        stats: { totalOriginalUrls: 0, totalLimitedUrls: 0 },
      };
    }
    // Reprocess all URLs with the current maxPathsPerParent limit
    return buildPathTree(urls, maxPathsPerParent);
  }, [urls, maxPathsPerParent]);

  // Get all limited URLs from tree
  const limitedUrls = useMemo(() => getAllUrlsFromNode(tree), [tree]);
  
  // Create a stable key from limited URLs for dependency tracking
  const limitedUrlsKey = useMemo(
    () => limitedUrls.map((u) => u.loc).sort().join(','),
    [limitedUrls]
  );

  // Filter results by selected path
  const filteredResults = useMemo(() => {
    if (!selectedPath || metaResults.length === 0) return metaResults;

    return metaResults.filter((result) => {
      try {
        const parsed = new URL(result.url);
        const path = parsed.pathname;

        if (selectedPath === '/') {
          return path === '/' || path === '';
        }

        return path.startsWith(selectedPath);
      } catch {
        return false;
      }
    });
  }, [metaResults, selectedPath]);

  const handleParseSitemap = async () => {
    if (!sitemapUrl.trim()) return;

    setIsLoadingSitemap(true);
    setError(null);
    setUrls([]);
    setMetaResults([]);
    setSelectedUrls(new Set());
    setExpandedPaths(new Set());
    setSelectedPath(null);

    try {
      const response = await fetch('/api/parse-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sitemapUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse sitemap');
      }

      setUrls(data.urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse sitemap');
    } finally {
      setIsLoadingSitemap(false);
    }
  };

  // Auto-select limited URLs when tree changes
  // This updates selections when maxPathsPerParent changes to reflect the new limited set
  useEffect(() => {
    if (limitedUrls.length > 0) {
      setSelectedUrls(new Set(limitedUrls.map((u) => u.loc)));
    }
  }, [limitedUrlsKey]);

  const handleFetchMetaTags = async () => {
    if (selectedUrls.size === 0) return;

    setIsFetchingMeta(true);
    setError(null);
    setMetaResults([]);
    setProgress(0);

    const urlsToFetch = Array.from(selectedUrls);
    const batchSize = 10;
    const allResults: PageMetaData[] = [];

    try {
      for (let i = 0; i < urlsToFetch.length; i += batchSize) {
        const batch = urlsToFetch.slice(i, i + batchSize);

        const response = await fetch('/api/fetch-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch meta tags');
        }

        allResults.push(...data.results);
        setMetaResults([...allResults]);
        setProgress(Math.round((allResults.length / urlsToFetch.length) * 100));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meta tags');
    } finally {
      setIsFetchingMeta(false);
      setProgress(100);
    }
  };

  const handleToggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleToggleSelect = (urlsToToggle: SitemapUrl[]) => {
    const newSelected = new Set(selectedUrls);
    const locs = urlsToToggle.map((u) => u.loc);
    const allSelected = locs.every((loc) => newSelected.has(loc));

    if (allSelected) {
      locs.forEach((loc) => newSelected.delete(loc));
    } else {
      locs.forEach((loc) => newSelected.add(loc));
    }
    setSelectedUrls(newSelected);
  };

  const handleSelectPath = (path: string) => {
    setSelectedPath(path === selectedPath ? null : path);
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === limitedUrls.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(limitedUrls.map((u) => u.loc)));
    }
  };

  const successCount = metaResults.filter((r) => r.status === 'success').length;
  const errorCount = metaResults.filter((r) => r.status === 'error').length;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-950 px-4 py-3">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Meta Tags Utility</h1>
          </div>

          {/* Sitemap Input */}
          <div className="flex-1 max-w-2xl mx-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com/sitemap.xml"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParseSitemap()}
                disabled={isLoadingSitemap || isFetchingMeta}
                className="flex-1"
              />
              <Button
                onClick={handleParseSitemap}
                disabled={!sitemapUrl.trim() || isLoadingSitemap || isFetchingMeta}
              >
                {isLoadingSitemap ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {urls.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={isFetchingMeta}
                >
                  {selectedUrls.size === limitedUrls.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={handleFetchMetaTags}
                  disabled={selectedUrls.size === 0 || isFetchingMeta}
                >
                  {isFetchingMeta ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Fetch ({selectedUrls.size})
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mx-4 mt-4 max-w-none">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {urls.length > 0 && sidebarOpen && (
          <div className="w-72 flex-shrink-0">
            <PathTreeSidebar
              urls={urls}
              selectedUrls={selectedUrls}
              expandedPaths={expandedPaths}
              onToggleExpand={handleToggleExpand}
              onToggleSelect={handleToggleSelect}
              onSelectPath={handleSelectPath}
              selectedPath={selectedPath}
              maxPathsPerParent={maxPathsPerParent}
            />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toggle sidebar button */}
          {urls.length > 0 && (
            <div className="border-b bg-white dark:bg-gray-950 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeft className="h-4 w-4" />
                  )}
                </Button>

                {selectedPath && (
                  <span className="text-sm text-muted-foreground">
                    Viewing: <code className="font-mono">{selectedPath}</code>
                  </span>
                )}
              </div>

              {/* Master Tab Selector */}
              {metaResults.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">View all as:</span>
                  <Tabs
                    value={masterTab}
                    onValueChange={(v) => setMasterTab(v as MetaTabType)}
                  >
                    <TabsList>
                      <TabsTrigger value="basic" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Basic
                      </TabsTrigger>
                      <TabsTrigger value="og" className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Open Graph
                      </TabsTrigger>
                      <TabsTrigger value="twitter" className="flex items-center gap-1">
                        <Twitter className="h-3 w-3" />
                        Twitter
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Export dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => exportToJSON(metaResults)}>
                        <FileJson className="h-4 w-4 mr-2" />
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToCSV(metaResults)}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {isFetchingMeta && (
            <div className="px-4 py-2 border-b bg-white dark:bg-gray-950">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Fetching meta tags...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          <ScrollArea className="flex-1 h-full min-h-0">
            <div className="p-4 space-y-4">
              {/* Stats */}
              {metaResults.length > 0 && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm">
                          <strong>{successCount}</strong> successful
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm">
                          <strong>{errorCount}</strong> failed
                        </span>
                      </div>
                      {selectedPath && (
                        <div className="text-sm text-muted-foreground">
                          Showing {filteredResults.length} of {metaResults.length} results
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Meta Tag Cards */}
              {filteredResults.map((result, index) => (
                <MetaTagCard key={index} data={result} activeTab={masterTab} />
              ))}

              {/* Empty State */}
              {!isLoadingSitemap && urls.length === 0 && metaResults.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">No data yet</h3>
                    <p className="text-muted-foreground">
                      Enter a sitemap URL above to get started
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Waiting for fetch */}
              {urls.length > 0 && metaResults.length === 0 && !isFetchingMeta && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">
                      {selectedUrls.size} URLs selected
                    </h3>
                    <p className="text-muted-foreground mb-2 flex items-center justify-center gap-1 flex-wrap">
                      <span>{stats.totalOriginalUrls} total → {stats.totalLimitedUrls} (max</span>
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        value={maxPathsPerParent}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          if (!isNaN(value) && value > 0 && value <= 1000) {
                            setMaxPathsPerParent(value);
                          }
                        }}
                        className="w-16 h-7 text-center text-sm inline-block"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>per path)</span>
                    </p>
                    <p className="text-muted-foreground">
                      Click &quot;Fetch&quot; to analyze meta tags
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
