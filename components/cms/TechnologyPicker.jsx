'use client';

import { useState } from 'react';
import {
  PORTFOLIO_TECHNOLOGY_OPTIONS,
  normalizePortfolioTechnologyEntry,
} from '../../data/portfolioSoftwareCatalog';

export default function TechnologyPicker({ value = [], onChange }) {
  const [selected, setSelected] = useState('');
  const usedIds = new Set(value.map((item) => item.id));
  const available = PORTFOLIO_TECHNOLOGY_OPTIONS.filter(
    (option) => !usedIds.has(option.id),
  );

  const add = () => {
    if (!selected) return;
    const entry = normalizePortfolioTechnologyEntry(selected);
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
          <option value="">Select technique/medium…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.kind})
            </option>
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
            <span className="cms-picker-kind">{item.kind}</span>
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
