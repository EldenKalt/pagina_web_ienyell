'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { socialCategories } from '../../../data/socialLinks';

function SocialCard({ link }) {
  const content = (
    <>
      <span className="soc-card-icon"><img src={link.icon} alt="" width={24} height={24} /></span>
      <span className="soc-card-text">
        <strong className="soc-card-name">{link.name}</strong>
        <span className="soc-card-desc">{link.description}</span>
      </span>
      <span className="soc-card-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></span>
    </>
  );

  if (link.internal) {
    return <Link href={link.url} className="soc-card" style={{ background: link.bg }}>{content}</Link>;
  }
  return <a href={link.url} className="soc-card" style={{ background: link.bg }} target="_blank" rel="noopener noreferrer">{content}</a>;
}

export default function SocialLinksPage() {
  const router = useRouter();

  return (
    <main className="soc-page">
      <button type="button" className="soc-back" onClick={() => router.back()}>‹ Return to start</button>
      {socialCategories.map((category) => (
        <section className="soc-category" key={category.id}>
          <h2 className="soc-category-title">{category.title}</h2>
          <div className="soc-links-list">
            {category.links.map((link) => <SocialCard key={link.id} link={link} />)}
          </div>
        </section>
      ))}
    </main>
  );
}
