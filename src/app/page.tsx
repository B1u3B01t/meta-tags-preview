'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [masterTab, setMasterTab] = useState<MetaTabType>('preview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [maxPathsPerParent, setMaxPathsPerParent] = useState(3);
  const [hasSearched, setHasSearched] = useState(false);

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

    // Trigger the animation
    setHasSearched(true);
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

  // Animation variants
  const containerVariants = {
    centered: {
      transition: { staggerChildren: 0.1 }
    },
    header: {
      transition: { staggerChildren: 0.05 }
    }
  };

  const titleVariants = {
    centered: {
      scale: 1.5,
      opacity: 1,
    },
    header: {
      scale: 1,
      opacity: 1,
    }
  };

  const searchBarVariants = {
    centered: {
      width: '100%',
      opacity: 1,
    },
    header: {
      width: '100%',
      opacity: 1,
    }
  };

  // Centered initial state - before search
  if (!hasSearched) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            className="flex flex-col items-center gap-8 px-4 w-full max-w-2xl"
            initial="centered"
            animate="centered"
            variants={containerVariants}
          >
            {/* Centered Title */}
            <motion.h1
              layoutId="title-text"
              className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              variants={titleVariants}
            >
              Meta Tags Utility
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-muted-foreground text-center text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Check how your pages appear when shared. Paste your sitemap URL below.
            </motion.p>

            {/* Centered Search Bar */}
            <motion.div
              layoutId="search-container"
              className="w-full"
              variants={searchBarVariants}
            >
              <div className="flex gap-3">
                <Input
                  type="url"
                  placeholder="https://example.com/sitemap.xml"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleParseSitemap()}
                  disabled={isLoadingSitemap}
                  className="flex-1 h-12 text-lg px-4"
                />
                <Button
                  onClick={handleParseSitemap}
                  disabled={!sitemapUrl.trim() || isLoadingSitemap}
                  className="h-12 px-6"
                  size="lg"
                >
                  {isLoadingSitemap ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Hint text */}
            <motion.p
              className="text-sm text-muted-foreground/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Works with any sitemap URL
            </motion.p>
          </motion.div>
        </div>

        {/* Error Alert - show on centered view too */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Header state - after search
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <motion.header
        className="border-b bg-white dark:bg-gray-950 px-4 py-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between max-w-full">
          <motion.h1
            layoutId="title-text"
            className="text-xl font-bold"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            Meta Tags Utility
          </motion.h1>

          {/* Sitemap Input */}
          <motion.div
            layoutId="search-container"
            className="flex-1 max-w-2xl mx-4"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
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
          </motion.div>

          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
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
                {(isFetchingMeta || metaResults.length > 0) && (
                  <motion.div
                    layoutId="fetch-button"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <Button
                      onClick={handleFetchMetaTags}
                      disabled={selectedUrls.size === 0 || isFetchingMeta}
                    >
                      {isFetchingMeta ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Analyze {selectedUrls.size} pages
                    </Button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant="destructive" className="mx-4 mt-4 max-w-none">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {urls.length > 0 && sidebarOpen && (
            <motion.div
              className="w-72 flex-shrink-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toggle sidebar button */}
          {urls.length > 0 && (
            <motion.div
              className="border-b bg-white dark:bg-gray-950 px-4 py-2 flex items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
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
                    Showing pages in: <code className="font-mono">{selectedPath}</code>
                  </span>
                )}
              </div>

              {/* Master Tab Selector */}
              {metaResults.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Display:</span>
                  <Tabs
                    value={masterTab}
                    onValueChange={(v) => setMasterTab(v as MetaTabType)}
                  >
                    <TabsList>
                      <TabsTrigger value="basic" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Details
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
                        Download as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToCSV(metaResults)}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Download as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </motion.div>
          )}

          {/* Progress */}
          <AnimatePresence>
            {isFetchingMeta && (
              <motion.div
                className="px-4 py-2 border-b bg-white dark:bg-gray-950"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Checking pages...</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <ScrollArea className="flex-1 h-full min-h-0">
            <div className="p-4 space-y-4">
              {/* Stats */}
              <AnimatePresence>
                {metaResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="text-sm">
                              <strong>{successCount}</strong> pages found
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-500" />
                            <span className="text-sm">
                              <strong>{errorCount}</strong> couldn't load
                            </span>
                          </div>
                          {selectedPath && (
                            <div className="text-sm text-muted-foreground">
                              {filteredResults.length} of {metaResults.length} pages shown
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Meta Tag Cards */}
              {filteredResults.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <MetaTagCard data={result} activeTab={masterTab} />
                </motion.div>
              ))}

              {/* Loading State */}
              {isLoadingSitemap && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                      <h3 className="text-lg font-medium mb-2">Loading your sitemap...</h3>
                      <p className="text-muted-foreground">
                        Please wait while we find all your pages
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Waiting for fetch */}
              {urls.length > 0 && metaResults.length === 0 && !isFetchingMeta && !isLoadingSitemap && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium mb-2">
                        Ready to check {selectedUrls.size} pages
                      </h3>
                      <p className="text-muted-foreground mb-2 flex items-center justify-center gap-1 flex-wrap">
                        <span>Found {stats.totalOriginalUrls} pages total. Showing {stats.totalLimitedUrls} (limit:</span>
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
                        <span>per section)</span>
                      </p>
                      <motion.div
                        layoutId="fetch-button"
                        className="flex justify-center mt-6"
                      >
                        <Button
                          onClick={handleFetchMetaTags}
                          disabled={selectedUrls.size === 0 || isFetchingMeta}
                          size="lg"
                          className="px-8"
                        >
                          <Search className="h-5 w-5 mr-2" />
                          Analyze {selectedUrls.size} pages
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Empty state after error */}
              {!isLoadingSitemap && urls.length === 0 && error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive/50" />
                      <h3 className="text-lg font-medium mb-2">Couldn't load your sitemap</h3>
                      <p className="text-muted-foreground">
                        Make sure the URL is correct and try again
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
