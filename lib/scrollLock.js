'use client';

// Reference-counted body scroll lock.
//
// The project already locks body scroll in two places — components/OffcanvasContext.jsx
// and context/WizardContext.jsx — and neither knows about the other: one restores
// `overflow` to '' and the other to 'auto', so whichever closes last wins and can
// unlock the page underneath something still open.
//
// Overlays that use this module cannot do that to each other: the body only
// unlocks when the last of them releases, and the original inline value is
// restored rather than guessed.
//
// The two existing implementations are deliberately left alone — they are site
// chrome and migrating them is a change across every page, not part of this work.
// They can still clobber a lock taken here, which in practice needs the nav menu
// and a panel open at once; worth doing properly if that ever becomes reachable.

let locks = 0;
let previousOverflow = null;

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;

  if (locks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  locks += 1;
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;

  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    document.body.style.overflow = previousOverflow ?? '';
    previousOverflow = null;
  }
}
