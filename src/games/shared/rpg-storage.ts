/** 간단 RPG 세이브 (localStorage) */
export function loadRpg<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return {...fallback, ...JSON.parse(raw)} as T;
  } catch {
    return fallback;
  }
}

export function saveRpg<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}
