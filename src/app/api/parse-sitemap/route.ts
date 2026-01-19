import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { ParseSitemapResponse, SitemapUrl } from '@/types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

async function fetchSitemap(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MetaTagsUtility/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseSitemapXml(xml: string): SitemapUrl[] {
  const parsed = parser.parse(xml);
  const urls: SitemapUrl[] = [];

  // Handle standard sitemap
  if (parsed.urlset?.url) {
    const urlEntries = Array.isArray(parsed.urlset.url)
      ? parsed.urlset.url
      : [parsed.urlset.url];

    for (const entry of urlEntries) {
      urls.push({
        loc: entry.loc,
        lastmod: entry.lastmod,
        changefreq: entry.changefreq,
        priority: entry.priority?.toString(),
      });
    }
  }

  // Handle sitemap index (nested sitemaps)
  if (parsed.sitemapindex?.sitemap) {
    const sitemapEntries = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap];

    // Return sitemap URLs for further processing
    for (const entry of sitemapEntries) {
      urls.push({
        loc: entry.loc,
        lastmod: entry.lastmod,
      });
    }
  }

  return urls;
}

async function fetchNestedSitemaps(sitemapUrls: SitemapUrl[]): Promise<SitemapUrl[]> {
  const allUrls: SitemapUrl[] = [];

  // Fetch up to 10 nested sitemaps to avoid timeout
  const sitemapsToFetch = sitemapUrls.slice(0, 10);

  const results = await Promise.allSettled(
    sitemapsToFetch.map(async (sitemap) => {
      const xml = await fetchSitemap(sitemap.loc);
      return parseSitemapXml(xml);
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allUrls.push(...result.value);
    }
  }

  return allUrls;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Sitemap URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const xml = await fetchSitemap(url);
    let urls = parseSitemapXml(xml);

    // Check if this is a sitemap index
    if (urls.length > 0 && urls[0].loc.includes('sitemap')) {
      // This might be a sitemap index, try to fetch nested sitemaps
      const isSitemapIndex = urls.every(u =>
        u.loc.endsWith('.xml') || u.loc.includes('sitemap')
      );

      if (isSitemapIndex) {
        const nestedUrls = await fetchNestedSitemaps(urls);
        if (nestedUrls.length > 0) {
          urls = nestedUrls;
        }
      }
    }

    const response: ParseSitemapResponse = {
      urls,
      totalUrls: urls.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error parsing sitemap:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to parse sitemap',
        urls: [],
        totalUrls: 0,
      },
      { status: 500 }
    );
  }
}
