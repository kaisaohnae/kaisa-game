import {getToken} from '@/lib/auth-storage';

export async function apiPost<T = unknown>(
  apiUrl: string,
  apiData?: Record<string, unknown>,
  tokenKind?: 'member' | 'admin' | null,
  timeout = 20000
): Promise<{success: boolean; message: string; data: T}> {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
  const path = apiUrl.replace(/^\//, '');
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  const token = tokenKind ? getToken(tokenKind) : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(apiData ?? {}),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (!body?.success) {
      throw new Error(body?.message || 'Request failed.');
    }
    return body;
  } finally {
    window.clearTimeout(timer);
  }
}
