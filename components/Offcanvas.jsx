'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOffcanvas } from './OffcanvasContext';
import { useAuth } from '../context/AuthContext';

export default function Offcanvas() {
  const { open, close } = useOffcanvas();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  // Readers used to be sent to '/' here too, for the same reason the header did:
  // there was no profile to send them to.
  const accountHref =
    String(user?.role || '').toUpperCase() === 'ADMIN' ? '/admin' : '/users/profile';

  const isActive = (href) => (
    href === '/' ? pathname === '/' : pathname.startsWith(href)
  );

  return (
    <div className={`offcanvas${open ? ' open' : ''}`}>
      <button className="offcanvas-close" aria-label="Close menu" onClick={close}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <nav className="offcanvas-nav">
        <Link href="/" className={isActive('/') ? 'is-active' : undefined} onClick={close}>Home</Link>
        <Link href="/services" className={isActive('/services') ? 'is-active' : undefined} onClick={close}>What I do</Link>
        <Link href="/about" className={isActive('/about') ? 'is-active' : undefined} onClick={close}>Know me</Link>
        <Link href="/blog" className={isActive('/blog') ? 'is-active' : undefined} onClick={close}>Blog</Link>
        <Link href="#" className={isActive('#') ? 'is-active' : undefined} onClick={close}>Store</Link>
        <Link href="#" className={isActive('#') ? 'is-active' : undefined} onClick={close}>Learn</Link>
      </nav>
      {isLoading ? (
        <span className="btn-login-mobile header-account-loading" aria-hidden="true" />
      ) : user ? (
        <Link href={accountHref} className="btn-login-mobile" onClick={close}>
          {user.name || 'My account'}
        </Link>
      ) : (
        <Link href="/users/login" className="btn-login-mobile" onClick={close}>Log in</Link>
      )}
      <p className="offcanvas-contact">workwithenyell@gmail.com</p>
      <div className="offcanvas-socials">
        <a href="#" aria-label="Instagram" onClick={close}><img src="/recursos/icon_social/_Instagram.svg" alt="" /></a>
        <a href="#" aria-label="Twitter" onClick={close}><img src="/recursos/icon_social/_Twitter.svg" alt="" /></a>
        <a href="#" aria-label="LinkedIn" onClick={close}><img src="/recursos/icon_social/_Linkedin.svg" alt="" /></a>
      </div>
    </div>
  );
}

export function OffcanvasTrigger() {
  const { toggle } = useOffcanvas();

  return (
    <button className="hamburger" aria-label="Menu" onClick={toggle}>
      <span /><span /><span />
    </button>
  );
}
