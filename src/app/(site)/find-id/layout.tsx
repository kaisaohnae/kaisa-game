import {buildPageMetadata} from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Find ID',
  description: 'Recover your Kaisa account email.',
  path: '/find-id/',
});

export default function FindIdLayout({children}: {children: React.ReactNode}) {
  return children;
}
