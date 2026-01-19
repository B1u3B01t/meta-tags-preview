'use client';

import { PageMetaData } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';

export type MetaTabType = 'basic' | 'og' | 'twitter' | 'preview';

interface MetaTagCardProps {
  data: PageMetaData;
  activeTab?: MetaTabType;
}

function MetaField({
  label,
  value,
  isUrl = false,
}: {
  label: string;
  value: string;
  isUrl?: boolean;
}) {
  const hasValue = value && value.trim() !== '';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {hasValue ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <X className="h-3 w-3 text-red-500" />
        )}
      </div>
      {hasValue ? (
        isUrl ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm break-all">{value}</p>
        )
      ) : (
        <p className="text-sm text-muted-foreground italic">Not set</p>
      )}
    </div>
  );
}

function PreviewCard({ data }: { data: PageMetaData }) {
  const title = data.ogTitle || data.title;
  const description = data.ogDescription || data.description;
  const image = data.ogImage;

  return (
    <div className="border rounded-lg overflow-hidden bg-white max-w-lg">
      {image && (
        <div className="relative h-48 bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="OG Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">
          {new URL(data.url).hostname}
        </p>
        <h3 className="font-semibold text-gray-900 line-clamp-2 mt-1">
          {title || 'No title'}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
          {description || 'No description'}
        </p>
      </div>
    </div>
  );
}

function BasicTab({ data }: { data: PageMetaData }) {
  return (
    <div className="space-y-4">
      <MetaField label="Title" value={data.title} />
      <Separator />
      <MetaField label="Description" value={data.description} />
      <Separator />
      <MetaField label="Canonical URL" value={data.canonical} isUrl />
    </div>
  );
}

function OgTab({ data }: { data: PageMetaData }) {
  return (
    <div className="space-y-4">
      <MetaField label="og:title" value={data.ogTitle} />
      <Separator />
      <MetaField label="og:description" value={data.ogDescription} />
      <Separator />
      <MetaField label="og:image" value={data.ogImage} isUrl />
      <Separator />
      <MetaField label="og:url" value={data.ogUrl} isUrl />
      <Separator />
      <MetaField label="og:type" value={data.ogType} />
      <Separator />
      <MetaField label="og:site_name" value={data.ogSiteName} />
    </div>
  );
}

function TwitterTab({ data }: { data: PageMetaData }) {
  return (
    <div className="space-y-4">
      <MetaField label="twitter:card" value={data.twitterCard} />
      <Separator />
      <MetaField label="twitter:title" value={data.twitterTitle} />
      <Separator />
      <MetaField label="twitter:description" value={data.twitterDescription} />
      <Separator />
      <MetaField label="twitter:image" value={data.twitterImage} isUrl />
      <Separator />
      <MetaField label="twitter:site" value={data.twitterSite} />
    </div>
  );
}

function PreviewTab({ data }: { data: PageMetaData }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Social Share Preview</h4>
        <PreviewCard data={data} />
      </div>
    </div>
  );
}

export function MetaTagCard({ data, activeTab = 'basic' }: MetaTagCardProps) {
  if (data.status === 'error') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-base truncate">{data.url}</CardTitle>
          </div>
          <CardDescription className="text-red-600">
            Error: {data.error || 'Failed to fetch meta tags'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const ogTagsCount = [
    data.ogTitle,
    data.ogDescription,
    data.ogImage,
    data.ogUrl,
    data.ogType,
  ].filter(Boolean).length;

  const twitterTagsCount = [
    data.twitterCard,
    data.twitterTitle,
    data.twitterDescription,
    data.twitterImage,
  ].filter(Boolean).length;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return <BasicTab data={data} />;
      case 'og':
        return <OgTab data={data} />;
      case 'twitter':
        return <TwitterTab data={data} />;
      case 'preview':
        return <PreviewTab data={data} />;
      default:
        return <BasicTab data={data} />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              {data.favicon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.favicon}
                  alt=""
                  className="w-4 h-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="truncate">{data.title || 'No title'}</span>
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate flex items-center gap-1"
              >
                {data.url}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            </CardDescription>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Badge variant={ogTagsCount >= 4 ? 'default' : 'secondary'}>
              OG: {ogTagsCount}/5
            </Badge>
            <Badge variant={twitterTagsCount >= 3 ? 'default' : 'secondary'}>
              Twitter: {twitterTagsCount}/4
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderTabContent()}
      </CardContent>
    </Card>
  );
}
