import { getApiBase } from './authHelper';

export const NEWSLETTER_USE_PLACEHOLDER = false;

export const SUBSCRIBE_RESULT = {
  SUCCESS: 'success',
  INVALID: 'invalid',
  RATE_LIMITED: 'rate-limited',
  ERROR: 'error',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  const value = String(email || '').trim();
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

function apiUrl(path) {
  const base = getApiBase();
  if (!base) throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  return `${base}${path}`;
}

export async function subscribeToNewsletter(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!isValidEmail(normalized)) return { result: SUBSCRIBE_RESULT.INVALID };
  try {
    const response = await fetch(apiUrl('/api/newsletter/subscribe'), {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: normalized }),
    });
    if (response.status === 400) return { result: SUBSCRIBE_RESULT.INVALID };
    if (response.status === 429) return { result: SUBSCRIBE_RESULT.RATE_LIMITED };
    if (!response.ok) return { result: SUBSCRIBE_RESULT.ERROR };
    return { result: SUBSCRIBE_RESULT.SUCCESS };
  } catch { return { result: SUBSCRIBE_RESULT.ERROR }; }
}

export async function newsletterTokenAction(action, token) {
  if (!['confirm', 'unsubscribe'].includes(action) || !token) return false;
  try {
    const response = await fetch(apiUrl(`/api/newsletter/${action}`), {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token }),
    });
    return response.ok;
  } catch { return false; }
}
