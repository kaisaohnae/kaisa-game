/** Titles like `남자: …` / `여자: …` are hihi-only PixelLab characters. */

export function isHihiOnlyCharacterTitle(title?: string | null): boolean {
  const t = (title || '').trim();
  return t.startsWith('남자:') || t.startsWith('여자:');
}

export function hihiGenderFromTitle(title?: string | null): 'M' | 'F' | null {
  const t = (title || '').trim();
  if (t.startsWith('남자:')) return 'M';
  if (t.startsWith('여자:')) return 'F';
  return null;
}

export type HihiSpriteDir =
  | 'south'
  | 'south-east'
  | 'east'
  | 'north-east'
  | 'north'
  | 'north-west'
  | 'west'
  | 'south-west';

export type HihiCatalogCharacter = {
  name: string;
  title: string;
  remoteId?: string;
  /** @deprecated prefer actions.idle */
  frames?: string[];
  groupId?: string;
  stateName?: string;
  gender?: 'M' | 'F' | null;
  enabled?: boolean;
  actions?: {
    idle?: string[];
    walk?: string[];
  };
  sources?: {
    idle?: string;
    walk?: string;
  };
  previewFrame?: string;
};

export type HihiCharactersCatalog = {
  version: 1;
  characters: HihiCatalogCharacter[];
};

export const HIHI_CHARACTERS_CATALOG_URL = '/hihi/characters.catalog.json';

export function emptyHihiCharactersCatalog(): HihiCharactersCatalog {
  return {version: 1, characters: []};
}

export function hihiCharacterFrameUrl(
  name: string,
  action: 'idle' | 'walk',
  frame: string
): string {
  return `/hihi/characters/${encodeURIComponent(name)}/${action}/${frame}.png`;
}

export function hihiCharacterPreviewUrl(c: HihiCatalogCharacter): string {
  const frame = c.previewFrame || c.actions?.idle?.[0] || c.frames?.[0] || 'south';
  if (c.actions?.idle?.length) {
    return hihiCharacterFrameUrl(c.name, 'idle', frame);
  }
  // legacy: still pointing at pixellab-characters folder
  return `/pixellab-characters/${encodeURIComponent(c.name)}/${frame}.png`;
}

export async function fetchHihiCharactersCatalog(): Promise<HihiCharactersCatalog> {
  try {
    const res = await fetch(`${HIHI_CHARACTERS_CATALOG_URL}?t=${Date.now()}`, {cache: 'no-store'});
    if (!res.ok) return emptyHihiCharactersCatalog();
    const data = await res.json();
    const list = Array.isArray(data.characters) ? data.characters : [];
    return {
      version: 1,
      characters: list.map((c: Partial<HihiCatalogCharacter>) => {
        const title = String(c.title ?? '');
        const idle = Array.isArray(c.actions?.idle) ? c.actions!.idle!.map(String) : undefined;
        const walk = Array.isArray(c.actions?.walk) ? c.actions!.walk!.map(String) : undefined;
        return {
          name: String(c.name ?? ''),
          title,
          remoteId: c.remoteId ? String(c.remoteId) : undefined,
          frames: Array.isArray(c.frames) ? c.frames.map(String) : idle,
          groupId: c.groupId ? String(c.groupId) : undefined,
          stateName: c.stateName ? String(c.stateName) : undefined,
          gender: c.gender === 'M' || c.gender === 'F' ? c.gender : hihiGenderFromTitle(title),
          enabled: c.enabled !== false,
          actions: idle || walk ? {idle, walk} : undefined,
          sources: c.sources
            ? {
                idle: c.sources.idle ? String(c.sources.idle) : undefined,
                walk: c.sources.walk ? String(c.sources.walk) : undefined,
              }
            : undefined,
          previewFrame: c.previewFrame ? String(c.previewFrame) : idle?.[0] || 'south',
        };
      }),
    };
  } catch {
    return emptyHihiCharactersCatalog();
  }
}

const DIR_FALLBACKS: Record<string, string[]> = {
  south: ['south', 'south-east', 'south-west'],
  'south-east': ['south-east', 'south', 'east'],
  east: ['east', 'south-east', 'north-east'],
  'north-east': ['north-east', 'north', 'east'],
  north: ['north', 'north-east', 'north-west'],
  'north-west': ['north-west', 'north', 'west'],
  west: ['west', 'north-west', 'south-west'],
  'south-west': ['south-west', 'south', 'west'],
};

/** Map move vector → PixelLab 8-dir name */
export function hihiFacingFromMove(dx: number, dy: number): HihiSpriteDir {
  if (!dx && !dy) return 'south';
  const tau = Math.PI * 2;
  let a = Math.atan2(dy, dx);
  if (a < 0) a += tau;
  const sector = Math.floor((a + Math.PI / 8) / (Math.PI / 4)) % 8;
  const map: HihiSpriteDir[] = [
    'east',
    'south-east',
    'south',
    'south-west',
    'west',
    'north-west',
    'north',
    'north-east',
  ];
  return map[sector]!;
}

export type HihiAvatarPack = {
  name: string;
  idle: Partial<Record<string, HTMLImageElement>>;
  walk: Partial<Record<string, HTMLImageElement>>;
};

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadHihiAvatarPack(c: HihiCatalogCharacter): Promise<HihiAvatarPack> {
  const idleFrames = c.actions?.idle?.length ? c.actions.idle : c.frames?.length ? c.frames : ['south'];
  const walkFrames = c.actions?.walk?.length ? c.actions.walk : idleFrames;
  const idle: Partial<Record<string, HTMLImageElement>> = {};
  const walk: Partial<Record<string, HTMLImageElement>> = {};

  await Promise.all([
    ...idleFrames.map(async frame => {
      const img = await loadImg(hihiCharacterFrameUrl(c.name, 'idle', frame));
      if (img) idle[frame] = img;
    }),
    ...walkFrames.map(async frame => {
      const img = await loadImg(hihiCharacterFrameUrl(c.name, 'walk', frame));
      if (img) walk[frame] = img;
    }),
  ]);

  // Legacy fallback: single south from pixellab folder
  if (!Object.keys(idle).length) {
    const legacy = await loadImg(`/pixellab-characters/${encodeURIComponent(c.name)}/south.png`);
    if (legacy) idle.south = legacy;
  }

  return {name: c.name, idle, walk};
}

export function pickHihiSprite(
  pack: HihiAvatarPack | null | undefined,
  action: 'idle' | 'walk',
  facing: string
): HTMLImageElement | null {
  if (!pack) return null;
  const set = action === 'walk' ? pack.walk : pack.idle;
  const alt = action === 'walk' ? pack.idle : pack.walk;
  const order = DIR_FALLBACKS[facing] || [facing, 'south'];
  for (const d of order) {
    const img = set[d];
    if (img && img.complete && img.naturalWidth > 0) return img;
  }
  for (const d of order) {
    const img = alt[d];
    if (img && img.complete && img.naturalWidth > 0) return img;
  }
  const any = Object.values(set)[0] || Object.values(alt)[0];
  return any && any.complete && any.naturalWidth > 0 ? any : null;
}

/** Horizontal strip sheet frame count (Todie-compatible). */
export function hihiSheetFrameCount(img: HTMLImageElement): number {
  const h = img.naturalHeight;
  const w = img.naturalWidth;
  if (h <= 0 || w <= h) return 1;
  return Math.max(1, Math.round(w / h));
}
