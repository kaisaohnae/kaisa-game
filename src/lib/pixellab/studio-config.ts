export const STUDIO_URL =
  process.env.NEXT_PUBLIC_STUDIO_URL ?? 'http://127.0.0.1:8890';

export const STUDIO_SECRET =
  process.env.NEXT_PUBLIC_STUDIO_SECRET ?? 'change-me-local-dev';

export function studioHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Studio-Secret': STUDIO_SECRET,
    ...extra,
  };
}
