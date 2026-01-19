import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { PageMetaData, MetaTag, FetchMetaResponse } from '@/types';

async function fetchPageContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MetaTagsUtility/1.0; +https://metatags.io)',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractMetaTags(html: string, url: string): PageMetaData {
  const $ = cheerio.load(html);
  const allMetaTags: MetaTag[] = [];

  // Extract all meta tags
  $('meta').each((_, element) => {
    const $el = $(element);
    const name = $el.attr('name') || $el.attr('property') || $el.attr('http-equiv');
    const content = $el.attr('content') || '';

    if (name && content) {
      allMetaTags.push({
        name,
        content,
        property: $el.attr('property'),
      });
    }
  });

  // Helper function to get meta content
  const getMeta = (selectors: string[]): string => {
    for (const selector of selectors) {
      const content = $(selector).attr('content');
      if (content) return content;
    }
    return '';
  };

  // Extract favicon
  let favicon = '';
  const faviconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
  ];

  for (const selector of faviconSelectors) {
    const href = $(selector).attr('href');
    if (href) {
      favicon = href.startsWith('http') ? href : new URL(href, url).href;
      break;
    }
  }

  // If no favicon found, try default /favicon.ico
  if (!favicon) {
    try {
      favicon = new URL('/favicon.ico', url).href;
    } catch {
      favicon = '';
    }
  }

  return {
    url,
    title: $('title').first().text() || '',
    description: getMeta([
      'meta[name="description"]',
      'meta[property="og:description"]',
    ]),
    canonical:
      $('link[rel="canonical"]').attr('href') || url,
    ogTitle: getMeta(['meta[property="og:title"]']),
    ogDescription: getMeta(['meta[property="og:description"]']),
    ogImage: getMeta(['meta[property="og:image"]']),
    ogUrl: getMeta(['meta[property="og:url"]']),
    ogType: getMeta(['meta[property="og:type"]']),
    ogSiteName: getMeta(['meta[property="og:site_name"]']),
    twitterCard: getMeta(['meta[name="twitter:card"]']),
    twitterTitle: getMeta(['meta[name="twitter:title"]']),
    twitterDescription: getMeta(['meta[name="twitter:description"]']),
    twitterImage: getMeta(['meta[name="twitter:image"]']),
    twitterSite: getMeta(['meta[name="twitter:site"]']),
    favicon,
    allMetaTags,
    status: 'success',
  };
}

async function processUrl(url: string): Promise<PageMetaData> {
  try {
    const html = await fetchPageContent(url);
    return extractMetaTags(html, url);
  } catch (error) {
    return {
      url,
      title: '',
      description: '',
      canonical: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      ogUrl: '',
      ogType: '',
      ogSiteName: '',
      twitterCard: '',
      twitterTitle: '',
      twitterDescription: '',
      twitterImage: '',
      twitterSite: '',
      favicon: '',
      allMetaTags: [],
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'URLs array is required' },
        { status: 400 }
      );
    }

    // Limit to 50 URLs per request to avoid timeout
    const urlsToProcess = urls.slice(0, 50);

    // Process URLs in parallel with concurrency limit
    const batchSize = 5;
    const results: PageMetaData[] = [];

    for (let i = 0; i < urlsToProcess.length; i += batchSize) {
      const batch = urlsToProcess.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processUrl));
      results.push(...batchResults);
    }

    const response: FetchMetaResponse = {
      results,
      processedCount: results.length,
      errorCount: results.filter((r) => r.status === 'error').length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching meta tags:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch meta tags',
        results: [],
        processedCount: 0,
        errorCount: 0,
      },
      { status: 500 }
    );
  }
}
