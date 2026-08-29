import {buildPageMetadata} from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Login',
  description: 'Sign in to Kaisa.',
  path: '/login/',
});

export default function LoginLayout({children}: {children: React.ReactNode}) {
  return children;
}
