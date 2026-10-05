import { notFound, permanentRedirect } from 'next/navigation';
import PublicReaderProfile from '../../../components/users/PublicReaderProfile';
import { fetchBlogApi } from '../../../lib/blogApi';

async function readProfile(handle) {
  try { return await fetchBlogApi(`/api/reader-profiles/${encodeURIComponent(handle)}`); }
  catch (error) { if (error.status === 404 || error.status === 401) return null; throw error; }
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const result = await readProfile(handle);
  if (!result) return { title: 'Reader not found' };
  return { title: `${result.profile.name} — Reader profile`, robots: { index: true, follow: true } };
}

export default async function ReaderProfilePage({ params }) {
  const { handle } = await params;
  const result = await readProfile(handle);
  if (!result) notFound();
  if (result.redirectTo) permanentRedirect(`/users/${result.redirectTo}`);
  return <PublicReaderProfile profile={result.profile} />;
}
