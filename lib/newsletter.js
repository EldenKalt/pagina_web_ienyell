/**
 * Newsletter subscription seam.
 *
 * UI phase: there is no subscriber backend yet. This module is the single place the
 * form talks to, so wiring the real endpoint later means flipping one flag — the
 * component never learns how the request is made.
 *
 * CONTRACT the backend must implement (POST /api/newsletter/subscribe):
 *   request   { email: string }
 *   201       { success: true }            subscribed
 *   409       { error: string }            already subscribed
 *   400       { error: string }            malformed email
 *   429       { error: string }            rate limited
 *
 * When building it, `backend/src/controllers/nsfwAccessController.js` is the pattern
 * to copy: email regex validation, a per-email cooldown, a signed token mailed as a
 * confirmation link, and a neutral response that does not leak whether an address is
 * already on the list. `backend/src/utils/emailHelper.js` already provides the
 * branded HTML shell and the nodemailer transport. Note it has no unsubscribe link —
 * that needs adding for a newsletter.
 */

import { getApiBase } from './authHelper';

/** UI-phase flag. Set to false once POST /api/newsletter/subscribe exists. */
export const NEWSLETTER_USE_PLACEHOLDER = true;

/** Result codes the form renders a state for. */
export const SUBSCRIBE_RESULT = {
  SUCCESS: 'success',
  DUPLICATE: 'duplicate',
  INVALID: 'invalid',
  ERROR: 'error',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Addresses that force a given outcome while the placeholder flag is on, so every
 * state of the form can actually be reviewed. Without these, the error paths are
 * unreachable and effectively untested.
 */
const PLACEHOLDER_CASES = {
  'duplicate@example.com': SUBSCRIBE_RESULT.DUPLICATE,
  'error@example.com': SUBSCRIBE_RESULT.ERROR,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email || '').trim());
}

/**
 * @param {string} email
 * @returns {Promise<{result: string, message?: string}>}
 */
export async function subscribeToNewsletter(email) {
  const normalized = String(email || '').trim().toLowerCase();

  if (!isValidEmail(normalized)) {
    return { result: SUBSCRIBE_RESULT.INVALID };
  }

  if (NEWSLETTER_USE_PLACEHOLDER) {
    await delay(700);
    return { result: PLACEHOLDER_CASES[normalized] || SUBSCRIBE_RESULT.SUCCESS };
  }

  try {
    const apiBase = getApiBase();
    if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

    const response = await fetch(`${apiBase}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: normalized }),
    });

    if (response.status === 409) return { result: SUBSCRIBE_RESULT.DUPLICATE };
    if (response.status === 400) return { result: SUBSCRIBE_RESULT.INVALID };
    if (!response.ok) return { result: SUBSCRIBE_RESULT.ERROR };

    return { result: SUBSCRIBE_RESULT.SUCCESS };
  } catch {
    return { result: SUBSCRIBE_RESULT.ERROR };
  }
}
