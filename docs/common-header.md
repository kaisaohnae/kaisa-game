# Common Kaisa header

All four projects use the same header component, stylesheet, theme cookie and navigation configuration.

Local URLs are configured in each project's .env.local:

- NEXT_PUBLIC_NAV_HOME_URL: http://localhost:5551/
- NEXT_PUBLIC_NAV_POSTS_URL: http://localhost:5551/
- NEXT_PUBLIC_NAV_BLOG_URL: http://localhost:5552/
- NEXT_PUBLIC_NAV_TOOL_URL: http://localhost:5553/image/compress/
- NEXT_PUBLIC_NAV_GAME_URL: http://localhost:5555/
- NEXT_PUBLIC_NAV_WORKS_URL: http://localhost:5551/works/

Restart development servers after changing environment variables. Public environment values are baked into Next.js builds. Production builds ignore localhost and 127.0.0.1 navigation values and use the public domains; other valid HTTP(S) values can override them.

Header source: src/components/layout/header.tsx, kaisa-header.css and src/config/kaisa-navigation.ts. Keep these files consistent across projects when changing the common header. Only the site identifier and the tool logo import differ.

The header uses the fo layout: 72px desktop height, 64px mobile height, 1100px inner width, 100x42 logo and 44x24 theme toggle. Works starts with a transparent header; scrolling more than 8px adds the same blurred background, border and shadow across all sites. Mobile navigation closes on outside click or Escape.

Tool navigation has three levels: common site header, category navigation, category-specific tool links. Photo opens the existing fullscreen editor and its own application menu.

Theme uses kaisa-shared-theme on domain kaisa.co.kr for 30 days. Visible tabs check for changes every second and on focus.

Language also uses the shared domain cookie kaisa-shared-locale (30 days). It takes priority over legacy per-site session choices. First entry uses the browser language, with IP country as a fallback when the browser language is unsupported. Changes synchronize in visible tabs every second and on focus. Locale bootstrap and client detection use the same cookie; server and initial React rendering remain deterministic.

Shared page/footer dimensions are in src/components/layout/kaisa-layout.css, imported after other root styles. Inner width is 1100px, gutters clamp(24px, 5vw, 64px) with 24px on mobile, footer vertical padding 40px, footer columns gap 16px (20px stacked below 480px), and content bottom padding 64px. Keep this stylesheet identical across the four projects.
