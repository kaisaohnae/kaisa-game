/** Hit / splash impact FX sprites under /common/fx */

export type HitFxKind = 'hit' | 'splash';

export type HitFxImages = Partial<Record<HitFxKind, HTMLImageElement>>;

const HIT_FX_URLS: Record<HitFxKind, string> = {
  hit: '/common/fx/hit.png',
  splash: '/common/fx/hit-splash.png',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`fail ${src}`));
    img.src = src;
  });
}

export async function loadHitFxImages(): Promise<HitFxImages> {
  const out: HitFxImages = {};
  await Promise.all(
    (Object.keys(HIT_FX_URLS) as HitFxKind[]).map((kind) =>
      loadImage(HIT_FX_URLS[kind])
        .then((img) => {
          out[kind] = img;
        })
        .catch(() => {
          /* optional until studio assets arrive */
        }),
    ),
  );
  return out;
}

export function pickHitFxImage(
  images: HitFxImages | null | undefined,
  kind: HitFxKind,
): HTMLImageElement | null {
  const img = images?.[kind];
  if (img?.complete && img.naturalWidth > 0) return img;
  return null;
}

export const hitFxPublicPaths = HIT_FX_URLS;
