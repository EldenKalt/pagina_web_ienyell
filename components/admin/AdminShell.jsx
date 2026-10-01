'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';

const NAVIGATION = [
  { href: '/admin', label: 'Overview', hint: 'Studio pulse' },
  { href: '/admin/portfolio', label: 'Portfolio', hint: 'Published work' },
  { href: '/admin/blog', label: 'Journal', hint: 'Stories & notes' },
  { href: '/admin/services', label: 'Services', hint: 'Public paths' },
  { href: '/admin/links', label: 'Links', hint: 'Link-in-bio buttons' },
  { href: '/admin/calculators', label: 'Calculators', hint: 'Prices & availability' },
  { href: '/admin/flows', label: 'Flows', hint: 'Questions & routing' },
  { href: '/admin/faq', label: 'FAQs', hint: 'Service answers' },
  { href: '/admin/commissions', label: 'Requests', hint: 'New commissions' },
  { href: '/admin/waitlist', label: 'Waitlist', hint: 'Future clients' },
];

function isCurrentRoute(pathname, href) {
  return href === '/admin'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/users/login');
  }

  return (
    <div className="ienyell-admin-shell">
      <aside className="ienyell-admin-rail" aria-label="Admin navigation">
        <Link href="/admin" className="ienyell-admin-brand" aria-label="iEnyell admin home">
          <img
            src="/recursos/logotype_enyell.png"
            alt="iEnyell"
            className="ienyell-admin-brand-logo"
          />
          <span>
            <small>studio notes</small>
          </span>
        </Link>

        <nav className="ienyell-admin-nav">
          <span className="ienyell-admin-nav-label">Workspace</span>
          {NAVIGATION.map((item) => {
            const active = isCurrentRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ienyell-admin-nav-link ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </Link>
            );
          })}
        </nav>

        <div className="ienyell-admin-account">
          <span className="ienyell-admin-account-name">{user?.name || 'Studio admin'}</span>
          <span className="ienyell-admin-account-role">Administrator</span>
          <Link href="/" className="ienyell-admin-site-link">View site</Link>
          <button type="button" className="ienyell-admin-signout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="ienyell-admin-content">{children}</main>
    </div>
  );
}
