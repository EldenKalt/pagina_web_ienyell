'use client';

import { use } from 'react';

import ServiceFamilyLanding from '../../../components/ServiceFamilyLanding';

export default function ServiceFamilyPage({ params }) {
  const { familyId } = use(params);
  return <ServiceFamilyLanding familyId={familyId} />;
}
