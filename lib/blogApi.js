/** Shared public blog API access for the server-rendered and client-rendered pages. */
export function getBlogApiBase() {
  return String(process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
}

export async function fetchBlogApi(path, options = {}) {
  const apiBase = getBlogApiBase();
  if (!apiBase) throw new Error('The blog service is not configured.');

  const response = await fetch(`${apiBase}${path}`, {
    cache: 'no-store',
    ...options,
    headers: { Accept: 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const error = new Error('The blog service could not complete the request.');
    error.status = response.status;
    throw error;
  }
  return response.json();
}
