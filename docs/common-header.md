# Kaisa header (kaisa-game)

Headers are no longer shared across the kaisa sites. The game header shows only the GAME menu; the logo and the menu item link to this site's home (/). No NEXT_PUBLIC_NAV_* variables are needed.

Header source: src/components/layout/header.tsx, kaisa-header.css and src/config/kaisa-navigation.ts.

The header uses the fo layout: 72px desktop height, 64px mobile height, 1100px inner width, 100x42 logo and 44x24 theme toggle. Works starts with a transparent header; scrolling more than 8px adds the same blurred background, border and shadow. Mobile navigation closes on outside click or Escape.

Theme uses kaisa-shared-theme on domain kaisa.co.kr for 30 days. Visible tabs check for changes every second and on focus.

Language also uses the shared domain cookie kaisa-shared-locale (30 days). It takes priority over legacy per-site session choices. First entry uses the browser language, with IP country as a fallback when the browser language is unsupported. Changes synchronize in visible tabs every second and on focus. Locale bootstrap and client detection use the same cookie; server and initial React rendering remain deterministic.

Shared page/footer dimensions are in src/components/layout/kaisa-layout.css, imported after other root styles. Inner width is 1100px, gutters clamp(24px, 5vw, 64px) with 24px on mobile, footer vertical padding 40px, footer columns gap 16px (20px stacked below 480px), and content bottom padding 64px.
