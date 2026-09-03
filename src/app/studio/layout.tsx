import type {Metadata} from 'next';
import StudioNav from './studio-nav';

export const metadata: Metadata = {
  title: 'Asset Studio',
  robots: {index: false, follow: false},
};

export default function StudioLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <StudioNav />
      {children}
    </>
  );
}
