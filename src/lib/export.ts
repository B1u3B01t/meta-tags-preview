import { PageMetaData } from '@/types';

export function exportToJSON(data: PageMetaData[]): void {
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  downloadBlob(blob, 'meta-tags-export.json');
}

export function exportToCSV(data: PageMetaData[]): void {
  const headers = [
    'URL',
    'Title',
    'Description',
    'Canonical',
    'OG Title',
    'OG Description',
    'OG Image',
    'OG URL',
    'OG Type',
    'OG Site Name',
    'Twitter Card',
    'Twitter Title',
    'Twitter Description',
    'Twitter Image',
    'Twitter Site',
    'Status',
    'Error',
  ];

  const rows = data.map((item) => [
    item.url,
    item.title,
    item.description,
    item.canonical,
    item.ogTitle,
    item.ogDescription,
    item.ogImage,
    item.ogUrl,
    item.ogType,
    item.ogSiteName,
    item.twitterCard,
    item.twitterTitle,
    item.twitterDescription,
    item.twitterImage,
    item.twitterSite,
    item.status,
    item.error || '',
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'meta-tags-export.csv');
}

function escapeCSV(value: string): string {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value);
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
