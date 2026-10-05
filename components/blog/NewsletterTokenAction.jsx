'use client';

import { useState } from 'react';
import Link from 'next/link';
import { newsletterTokenAction } from '../../lib/newsletter';

export default function NewsletterTokenAction({ action, token }) {
  const [status, setStatus] = useState('idle');
  const confirm = action === 'confirm';
  const title = confirm ? 'Confirm your subscription' : 'Unsubscribe from the newsletter';
  const invalid = typeof token !== 'string' || !token;
  const submit = async (event) => {
    event.preventDefault();
    if (status === 'busy' || invalid) return;
    setStatus('busy');
    const successful = await newsletterTokenAction(action, token);
    setStatus(successful ? 'success' : 'error');
    if (successful) window.history.replaceState({}, '', window.location.pathname);
  };

  return <main className="newsletter-action-page">
    <section className="newsletter-action-card" aria-labelledby="newsletter-action-title">
      <h1 id="newsletter-action-title">{title}</h1>
      {status === 'success' ? <p role="status">{confirm
        ? 'Your subscription is confirmed. You are on the list for article emails.'
        : 'You have unsubscribed. You will no longer receive newsletter emails.'}</p> :
        invalid ? <p role="alert">This link is incomplete. Please open the full link from your email.</p> : <>
          <p>{confirm ? 'Choose Confirm to receive new article emails from Enyell.' :
            'Choose Unsubscribe to stop new article emails from Enyell.'}</p>
          <form onSubmit={submit}>
            <button type="submit" className="newsletter-submit" disabled={status === 'busy'}>
              {status === 'busy' ? 'Working…' : confirm ? 'Confirm subscription' : 'Unsubscribe'}
            </button>
          </form>
          {status === 'error' && <p role="alert">This link could not be used. It may have expired or already been used.</p>}
        </>}
      <Link href="/blog">Back to articles</Link>
    </section>
  </main>;
}
