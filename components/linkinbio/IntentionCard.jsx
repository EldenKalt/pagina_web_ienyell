'use client';

import Link from 'next/link';
import { INTENTION_ICONS } from '../../data/linkInBioConfig';

export default function IntentionCard({ iconKey, title, subtitle, href, color = 'slate', wizardId, onClick }) {
  const icon = INTENTION_ICONS[iconKey];
  const className = `lib-intention-card lib-ic-${color}`;

  const content = (
    <>
      <span className="lib-intention-icon">
        {icon && (
          <svg viewBox={icon.viewBox} width="20" height="20" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.paths }} />
        )}
      </span>
      <div className="lib-intention-text">
        <strong className="lib-intention-title">{title}</strong>
        <span className="lib-intention-subtitle">{subtitle}</span>
      </div>
      <span className="lib-intention-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </span>
    </>
  );

  if (wizardId && onClick) {
    return <button type="button" className={className} onClick={onClick}>{content}</button>;
  }

  return (
    <Link href={href} className={className}>{content}</Link>
  );
}
