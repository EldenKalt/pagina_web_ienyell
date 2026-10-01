'use client';

import { useState } from 'react';

export default function CmsSidebarSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="cms-sidebar-section">
      <button
        type="button"
        className="cms-sidebar-section-toggle"
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span>
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms ease',
          }}
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? <div className="cms-sidebar-section-body">{children}</div> : null}
    </section>
  );
}
