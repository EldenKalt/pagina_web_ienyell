import NewsletterTokenAction from '../../../components/blog/NewsletterTokenAction';

export const metadata = { title: 'Unsubscribe from newsletter' };

export default async function UnsubscribeNewsletterPage({ searchParams }) {
  const query = await searchParams;
  return <NewsletterTokenAction action="unsubscribe" token={typeof query.token === 'string' ? query.token : ''} />;
}
