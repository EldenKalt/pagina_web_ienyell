'use client';

import { useEffect, useMemo, useState } from 'react';

import { getApiBase } from '../lib/authHelper';
import FAQAccordion from './FAQAccordion';

const GLOBAL_CATEGORIES = new Set(['all-services', 'services', 'general']);

function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase();
}

export default function ServiceFaqs({ serviceId, fallbackItems = [] }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const apiBase = getApiBase();
    if (!apiBase) {
      setItems([]);
      return undefined;
    }

    fetch(`${apiBase}/api/faq`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((payload) => {
        if (!cancelled) setItems(Array.isArray(payload?.items) ? payload.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => { cancelled = true; };
  }, []);

  const serviceItems = useMemo(() => (items ?? [])
    .filter((item) => {
      const category = normalizeCategory(item.category);
      return category === serviceId || GLOBAL_CATEGORIES.has(category);
    })
    .map((item) => ({ q: item.question, a: item.answer })), [items, serviceId]);

  const visibleItems = serviceItems.length ? serviceItems : fallbackItems;
  return visibleItems.length ? <FAQAccordion items={visibleItems} /> : null;
}
