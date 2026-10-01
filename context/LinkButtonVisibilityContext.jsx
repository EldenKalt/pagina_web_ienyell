'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createDefaultLinkButtonSettings } from '../data/linkInBioConfig';
import { getApiBase } from '../lib/authHelper';

const LinkButtonVisibilityContext = createContext({
  settings: createDefaultLinkButtonSettings(),
  isLoading: false,
  refresh: async () => {},
});

function hasButtons(value) {
  return value && typeof value === 'object' && value.buttons && typeof value.buttons === 'object' && !Array.isArray(value.buttons);
}

export function LinkButtonVisibilityProvider({ children }) {
  const [settings, setSettings] = useState(() => createDefaultLinkButtonSettings());
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/link-buttons`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Link buttons could not be loaded.');
      const payload = await response.json();
      if (hasButtons(payload?.settings)) setSettings(payload.settings);
    } catch (_) {
      // Reviewed defaults remain visible if the settings service is unavailable.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ settings, isLoading, refresh }), [settings, isLoading, refresh]);
  return <LinkButtonVisibilityContext.Provider value={value}>{children}</LinkButtonVisibilityContext.Provider>;
}

export function useLinkButtonVisibility() {
  return useContext(LinkButtonVisibilityContext);
}
