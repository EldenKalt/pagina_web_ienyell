'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getApiBase } from '../lib/authHelper';

const CalculatorSettingsContext = createContext({ settings: {}, priceOptions: [], flowSettings: {}, isLoading: false, refresh: async () => {} });

export function CalculatorSettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [priceOptions, setPriceOptions] = useState([]);
  const [flowSettings, setFlowSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) {
      setSettings({});
      setPriceOptions([]);
      setFlowSettings({});
      setIsLoading(false);
      return;
    }

    try {
      const [settingsResponse, optionsResponse, flowsResponse] = await Promise.all([
        fetch(`${apiBase}/api/calculator-configs`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/calculator-options`, { cache: 'no-store' }),
        fetch(`${apiBase}/api/wizard-flows`, { cache: 'no-store' }),
      ]);
      if (!settingsResponse.ok || !optionsResponse.ok || !flowsResponse.ok) throw new Error('Calculator settings failed to load.');
      const [settingsPayload, optionsPayload, flowsPayload] = await Promise.all([settingsResponse.json(), optionsResponse.json(), flowsResponse.json()]);
      setSettings(settingsPayload?.settings && typeof settingsPayload.settings === 'object' ? settingsPayload.settings : {});
      setPriceOptions(Array.isArray(optionsPayload?.options) ? optionsPayload.options : []);
      setFlowSettings(flowsPayload?.settings && typeof flowsPayload.settings === 'object' ? flowsPayload.settings : {});
    } catch (_) {
      // The public calculator keeps its reviewed defaults if the settings service is unavailable.
      setSettings({});
      setPriceOptions([]);
      setFlowSettings({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({ settings, priceOptions, flowSettings, isLoading, refresh }), [settings, priceOptions, flowSettings, isLoading, refresh]);
  return <CalculatorSettingsContext.Provider value={value}>{children}</CalculatorSettingsContext.Provider>;
}

export function useCalculatorSettings() {
  return useContext(CalculatorSettingsContext);
}
