'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` delayed by `delay` ms, so fast-changing input (typing) settles
 * before it drives expensive work.
 *
 * SSR-safe in the same way hooks/usePretextLayout.js is: the first render returns
 * the incoming value unchanged, and the timer only ever runs in an effect.
 */
export default function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value === debounced) return undefined;

    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, debounced]);

  return debounced;
}
