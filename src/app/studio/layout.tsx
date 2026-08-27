import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Asset Studio',
  robots: {index: false, follow: false},
};

export default function StudioLayout({children}: {children: React.ReactNode}) {
  return children;
}
