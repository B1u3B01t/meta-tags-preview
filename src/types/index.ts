export interface MetaTag {
  name: string;
  content: string;
  property?: string;
}

export interface PageMetaData {
  url: string;
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  ogSiteName: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterSite: string;
  favicon: string;
  allMetaTags: MetaTag[];
  status: 'success' | 'error';
  error?: string;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface ParseSitemapResponse {
  urls: SitemapUrl[];
  totalUrls: number;
  error?: string;
}

export interface FetchMetaRequest {
  urls: string[];
}

export interface FetchMetaResponse {
  results: PageMetaData[];
  processedCount: number;
  errorCount: number;
}
