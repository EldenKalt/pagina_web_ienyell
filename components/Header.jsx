'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OffcanvasTrigger } from './Offcanvas';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    let ticking = false;
    let frameId;

    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 40);
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      frameId = window.requestAnimationFrame(updateScrollState);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className={`header-wrapper${isScrolled ? ' is-scrolled' : ''}`}>
      <div className="over-header">
        <span>Talk with me:</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
        <span>workwithenyell@gmail.com</span>
      </div>

      <header className="header">
        <Link href="/">
          <img src="/recursos/logotype_enyell.png" alt="enyell" className="header-logo" />
        </Link>
        <nav className="header-nav">
          <Link href="/">Home</Link>
          <Link href="/services">What I do</Link>
          <Link href="/about">Know me</Link>
          <Link href="/blog">Blog</Link>
          <Link href="#">Store</Link>
        </nav>
        <div className="header-actions">
          <Link className="header-commission-cta" href="/services">
            Request a Commission
          </Link>
          {/* An admin lands in the admin; everyone else lands on their profile.
              Readers used to be sent to '/' — the home page — because there was
              no profile to send them to, which made the button look broken:
              it is the only control in the header that appeared to do nothing. */}
          {isLoading ? (
            <span className="btn-login header-account-loading" aria-hidden="true" />
          ) : user ? (
            <Link
              className="btn-login"
              href={String(user.role || '').toUpperCase() === 'ADMIN' ? '/admin' : '/users/profile'}
            >
              {user.name || 'My account'}
            </Link>
          ) : (
            <Link className="btn-login" href="/users/login">
              Log in
            </Link>
          )}
          <OffcanvasTrigger />
        </div>
      </header>
    </div>
  );
}
