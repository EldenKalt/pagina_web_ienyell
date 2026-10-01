'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useServiceCatalog } from '../../context/ServiceCatalogContext';
import { portfolioLinks } from '../../data/serviceCategories';
import ServiceOfferSelector from '../ServiceOfferSelector';

function Chevron() {
  return <span className="srv-card-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></span>;
}

function InlineIcon({ icon }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: icon }} />;
}

function ServiceCard({ family, onClick }) {
  return (
    <button type="button" className="srv-card" onClick={() => onClick(family.id)}>
      <span className="srv-card-icon" aria-hidden="true">✦</span>
      <span className="srv-card-text"><strong className="srv-card-name">{family.title}</strong><span className="srv-card-desc">{family.description}</span></span>
      <Chevron />
    </button>
  );
}

function PortfolioCard({ link }) {
  const content = (
    <>
      <span className="srv-card-icon" aria-hidden="true">{link.icon.startsWith('/') ? <img src={link.icon} alt="" width={24} height={24} /> : <InlineIcon icon={link.icon} />}</span>
      <span className="srv-card-text"><strong className="srv-card-name">{link.title}</strong><span className="srv-card-desc">{link.description}</span></span>
      <Chevron />
    </>
  );

  if (link.internal) return <Link href={link.url} className="srv-card" style={{ background: link.bg }}>{content}</Link>;
  return <a href={link.url} className="srv-card" style={{ background: link.bg }} target="_blank" rel="noopener noreferrer">{content}</a>;
}

export default function LinkServicesHub() {
  const router = useRouter();
  const { catalog } = useServiceCatalog();
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);
  const activeFamilies = (catalog?.families || []).filter((family) => family.isActive !== false);

  if (selectedFamilyId) {
    return (
      <main className="srv-page">
        <button type="button" className="srv-back" onClick={() => router.push('/links')}>‹ Return to start</button>
        <ServiceOfferSelector familyId={selectedFamilyId} variant="link" onBack={() => setSelectedFamilyId(null)} />
      </main>
    );
  }

  return (
    <main className="srv-page">
      <button type="button" className="srv-back" onClick={() => router.push('/links')}>‹ Return to start</button>

      <section className="srv-section" aria-labelledby="services-title">
        <h1 id="services-title" className="srv-section-title">Services</h1>
        <div className="srv-cards-list">{activeFamilies.map((family) => <ServiceCard key={family.id} family={family} onClick={setSelectedFamilyId} />)}</div>
        <p className="srv-note">*Apply restrictions.</p>
      </section>

      <section className="srv-section" aria-labelledby="portfolios-title">
        <h2 id="portfolios-title" className="srv-section-title">Portfolios</h2>
        <div className="srv-cards-list">{portfolioLinks.map((link) => <PortfolioCard key={link.id} link={link} />)}</div>
      </section>
    </main>
  );
}
