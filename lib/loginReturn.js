export function loginDestination(candidate, role) {
  const fallback = role === 'ADMIN' || role === 'COLABORADOR' ? '/admin' : '/users/profile';
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//') || /[\\\u0000-\u001f]/.test(candidate)) return fallback;
  try {
    const url = new URL(candidate, 'https://local.invalid');
    // Return requests from the reader flow are limited to reader pages.
    if (url.origin !== 'https://local.invalid' || !(url.pathname === '/blog' || url.pathname.startsWith('/blog/') || url.pathname === '/users/profile')) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
