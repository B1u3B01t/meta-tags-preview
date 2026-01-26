import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Meta Tags Utility - Check How Your Pages Appear When Shared",
    template: "%s | Meta Tags Utility",
  },
  description: "Check how your website pages appear when shared on social media. Analyze meta tags from your sitemap, preview Open Graph and Twitter Card tags, and export results to Excel or JSON.",
  keywords: [
    "meta tags",
    "Open Graph",
    "Twitter Cards",
    "social media preview",
    "SEO",
    "sitemap analyzer",
    "meta tag checker",
    "social sharing preview",
    "og tags",
    "meta tags analyzer",
  ],
  authors: [{ name: "Meta Tags Utility" }],
  creator: "Meta Tags Utility",
  publisher: "Meta Tags Utility",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://metamochi.vercel.app")
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Meta Tags Utility - Check How Your Pages Appear When Shared",
    description: "Check how your website pages appear when shared on social media. Analyze meta tags from your sitemap, preview Open Graph and Twitter Card tags, and export results to Excel or JSON.",
    siteName: "Meta Tags Utility",
    images: [
      {
        url: "https://aiverse-next.b-cdn.net/meta-mochi/meta-mochi-meta-card.png",
        width: 1200,
        height: 630,
        alt: "Meta Tags Utility - Check how your pages appear when shared",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meta Tags Utility - Check How Your Pages Appear When Shared",
    description: "Check how your website pages appear when shared on social media. Analyze meta tags from your sitemap, preview Open Graph and Twitter Card tags, and export results to Excel or JSON.",
    images: ["https://aiverse-next.b-cdn.net/meta-mochi/meta-mochi-meta-card.png"],
    creator: "@metatagsutility",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://metamochi.vercel.app');

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Meta Tags Utility',
    description: 'Check how your website pages appear when shared on social media. Analyze meta tags from your sitemap, preview Open Graph and Twitter Card tags, and export results to Excel or JSON.',
    url: baseUrl,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
    featureList: [
      'Sitemap parsing and analysis',
      'Meta tag extraction',
      'Open Graph preview',
      'Twitter Card preview',
      'Social media preview',
      'Export to JSON and Excel',
    ],
    screenshot: "https://aiverse-next.b-cdn.net/meta-mochi/meta-mochi-meta-card.png",
    image: "https://aiverse-next.b-cdn.net/meta-mochi/meta-mochi-meta-card.png",
    author: {
      '@type': 'Organization',
      name: 'Meta Tags Utility',
    },
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
