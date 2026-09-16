import type {NextConfig} from 'next';

/**
 * Static export for GitHub Pages.
 * Asset Studio (`src/app/studio`) is local-only in deploy artifacts:
 * `npm run build` strips `out/studio` via `scripts/build-next.mjs`.
 * Use `npm run build:with-studio` / INCLUDE_STUDIO=true only locally.
 */
const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
