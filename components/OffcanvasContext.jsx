'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export const OffcanvasContext = createContext(null);

export function OffcanvasProvider({ children }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((previousOpen) => {
      document.body.style.overflow = previousOpen ? '' : 'hidden';
      return !previousOpen;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = '';
  }, []);

  useEffect(() => () => {
    document.body.style.overflow = '';
  }, []);

  return (
    <OffcanvasContext.Provider value={{ open, toggle, close }}>
      {children}
    </OffcanvasContext.Provider>
  );
}

export function useOffcanvas() {
  const context = useContext(OffcanvasContext);
  if (!context) throw new Error('useOffcanvas must be used within an OffcanvasProvider');
  return context;
}
