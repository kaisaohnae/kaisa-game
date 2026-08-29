import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';

export default function SiteLayout({children}: {children: React.ReactNode}) {
  return (
    <div className="site-layout">
      <Header />
      <div id="content" className="site-layout__body">
        {children}
      </div>
      <Footer />
    </div>
  );
}
