'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createDefaultServiceCatalog } from '../data/serviceCatalog';
import { getApiBase } from '../lib/authHelper';

const ServiceCatalogContext = createContext({ catalog: createDefaultServiceCatalog(), isLoading: false, refresh: async () => {} });

function hasFamilies(value) {
  return value && typeof value === 'object' && Array.isArray(value.families);
}

export function ServiceCatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(() => createDefaultServiceCatalog());
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/service-catalog`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Service catalog could not be loaded.');
      const payload = await response.json();
      if (hasFamilies(payload?.catalog)) setCatalog(payload.catalog);
    } catch (_) {
      // The reviewed catalog stays available when the settings service is unavailable.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ catalog, isLoading, refresh }), [catalog, isLoading, refresh]);
  return <ServiceCatalogContext.Provider value={value}>{children}</ServiceCatalogContext.Provider>;
}

export function useServiceCatalog() {
  return useContext(ServiceCatalogContext);
}
