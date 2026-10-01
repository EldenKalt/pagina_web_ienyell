'use client';

import { usePathname } from 'next/navigation';

import Header from './Header';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';
import Offcanvas from './Offcanvas';

export default function SiteChrome({ children }) {
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith('/admin');

  if (isAdminArea) return children;

  return (
    <>
      <Header />
      {children}
      <Footer />
      <ScrollToTop />
      <Offcanvas />
    </>
  );
}
