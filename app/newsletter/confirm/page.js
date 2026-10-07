import NewsletterTokenAction from '../../../components/blog/NewsletterTokenAction';

export const metadata = { title: 'Confirm newsletter subscription' };

export default async function ConfirmNewsletterPage({ searchParams }) {
  const query = await searchParams;
  return <NewsletterTokenAction action="confirm" token={typeof query.token === 'string' ? query.token : ''} />;
}
