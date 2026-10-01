'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { authFetch, getApiBase } from '../lib/authHelper';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const data = await authFetch('/api/auth/check');
        if (!cancelled) setUser(data.user || data);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Login failed');
    }

    await response.json();
    const userData = await authFetch('/api/auth/me');
    setUser(userData.user || userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout request failures and clear the local session regardless.
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await authFetch('/api/auth/me');
    setUser(data.user || data);
    return data.user || data;
  }, []);

  const value = {
    user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
