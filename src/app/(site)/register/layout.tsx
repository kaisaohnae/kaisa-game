import {buildPageMetadata} from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Register',
  description: 'Create a Kaisa member account.',
  path: '/register/',
});

export default function RegisterLayout({children}: {children: React.ReactNode}) {
  return children;
}
