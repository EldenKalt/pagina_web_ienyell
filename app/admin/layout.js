'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import AdminShell from '../../components/admin/AdminShell';

function AdminGuard({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/users/login');
      } else if (String(user.role || '').toUpperCase() !== 'ADMIN') {
        router.replace('/');
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="cms-loading-screen">
        <div className="blog-loading-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!user || String(user.role || '').toUpperCase() !== 'ADMIN') {
    return null;
  }

  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }) {
  return <AdminGuard>{children}</AdminGuard>;
}
