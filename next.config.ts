import type {NextConfig} from 'next';

/**
 * Static export for GitHub Pages.
 * Asset Studio (`src/app/studio`) is local-only: `npm run build` excludes it via
 * `scripts/build-next.mjs`. Use `npm run build:with-studio` / INCLUDE_STUDIO=true
 * only for local inspection — never enable on deploy.
 */
const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
