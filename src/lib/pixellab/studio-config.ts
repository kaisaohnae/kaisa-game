export const STUDIO_URL =
  process.env.NEXT_PUBLIC_STUDIO_URL ?? 'http://127.0.0.1:8890';

export const STUDIO_SECRET =
  process.env.NEXT_PUBLIC_STUDIO_SECRET ?? 'dev-secret';

export function isLocalStudioUrl(url = STUDIO_URL): boolean {
  try {
    const u = new URL(url);
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
}

export function studioHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Studio-Secret': STUDIO_SECRET,
    ...extra,
  };
}
