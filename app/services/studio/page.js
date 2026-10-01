'use client';

import BentoZoomHero from '../../../components/BentoZoomHero';
import CircleTransition from '../../../components/CircleTransition';
import VerticalValueText from '../../../components/VerticalValueText';
import StackedCards from '../../../components/StackedCards';
import PortfolioGallery from '../../../components/PortfolioGallery';
import TestimonialsCarousel from '../../../components/TestimonialsCarousel';
import ServiceFaqs from '../../../components/ServiceFaqs';
import ServiceOfferSelector from '../../../components/ServiceOfferSelector';
import { studio as content } from '../../../data/serviceContent';

export default function StudioPage() {
  return (
    <>
      <BentoZoomHero
        title={content.heroTitle}
        subtitle={content.heroSubtitle}
        images={content.bentoImages}
        centerIndex={2}
        ctaHref="#service-offers"
      />

      <CircleTransition
        heading={content.circleHeading}
        body={content.circleBody}
        points={content.circlePoints}
      />

      <VerticalValueText lines={content.valueLines} />

      <StackedCards
        steps={content.processSteps}
        images={content.processImages}
      />

      <PortfolioGallery
        images={content.galleryImages}
        ctaHref="/work?category=studio"
      />

      <TestimonialsCarousel items={content.testimonials} />

      <ServiceOfferSelector familyId="studio" />

      <ServiceFaqs serviceId="studio" fallbackItems={content.faq} />
    </>
  );
}
