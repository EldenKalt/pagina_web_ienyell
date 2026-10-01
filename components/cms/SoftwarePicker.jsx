'use client';

import { useState } from 'react';
import {
  PORTFOLIO_SOFTWARE_OPTIONS,
  normalizePortfolioSoftwareEntry,
} from '../../data/portfolioSoftwareCatalog';

export default function SoftwarePicker({ value = [], onChange }) {
  const [selected, setSelected] = useState('');
  const usedIds = new Set(value.map((item) => item.id));
  const available = PORTFOLIO_SOFTWARE_OPTIONS.filter(
    (option) => !usedIds.has(option.id),
  );

  const add = () => {
    if (!selected) return;
    const entry = normalizePortfolioSoftwareEntry(selected);
    if (entry) {
      onChange([...value, entry]);
      setSelected('');
    }
  };

  const remove = (id) => onChange(value.filter((item) => item.id !== id));

  return (
    <div className="cms-picker">
      <div className="cms-picker-add">
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="cms-input"
        >
          <option value="">Select software…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
        <button
          type="button"
          className="cms-btn-add"
          onClick={add}
          disabled={!selected}
        >
          Add
        </button>
      </div>
      <div className="cms-picker-list">
        {value.map((item) => (
          <div key={item.id} className="cms-picker-item">
            <span className="cms-picker-abbr">{item.abbr}</span>
            <span>{item.name}</span>
            <button
              type="button"
              className="cms-pair-remove"
              onClick={() => remove(item.id)}
              aria-label={`Remove ${item.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
