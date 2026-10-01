'use client';

import Link from 'next/link';

import { useServiceCatalog } from '../context/ServiceCatalogContext';
import { getServiceFamily } from '../data/serviceCatalog';
import ServiceFaqs from './ServiceFaqs';
import ServiceOfferSelector from './ServiceOfferSelector';

export default function ServiceFamilyLanding({ familyId }) {
  const { catalog, isLoading } = useServiceCatalog();
  const family = getServiceFamily(catalog, familyId);

  if (!family && isLoading) return <main className="service-family-landing"><p>Loading services…</p></main>;
  if (!family || family.isActive === false) {
    return (
      <main className="service-family-landing service-family-landing--missing">
        <p className="service-family-landing__eyebrow">Services</p>
        <h1>This service is not available right now.</h1>
        <Link href="/services" className="service-family-landing__back">See all services</Link>
      </main>
    );
  }

  return (
    <main>
      <section className="service-family-landing">
        <div>
          <Link href="/services" className="service-family-landing__back">‹ All services</Link>
          <p className="service-family-landing__eyebrow">Service family</p>
          <h1>{family.title}</h1>
          {family.description ? <p>{family.description}</p> : null}
        </div>
        {family.image ? <img src={family.image} alt="" /> : <div className="service-family-landing__image-placeholder" aria-hidden="true" />}
      </section>
      <ServiceOfferSelector familyId={family.id} />
      <ServiceFaqs serviceId={family.id} fallbackItems={[]} />
    </main>
  );
}
