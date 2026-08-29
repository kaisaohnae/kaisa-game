export const SITE_NAME = 'Kaisa';

export const SITE_DESCRIPTION = 'Games from Kaisa — play on phones and tablets.';

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:8689';
  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return `${base}/`;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized.endsWith('/') ? normalized : `${normalized}/`}`;
}
