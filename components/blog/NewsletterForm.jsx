'use client';

import { useId, useState } from 'react';
import { subscribeToNewsletter, SUBSCRIBE_RESULT } from '../../lib/newsletter';

/**
 * Newsletter signup. Owns presentation and state only — it calls
 * lib/newsletter.subscribeToNewsletter and never knows the transport, so connecting
 * the real endpoint is a change in that module alone.
 *
 * `variant="band"` sits on the dark band; `variant="inline"` sits under an article.
 */
export default function NewsletterForm({ variant = 'inline', buttonLabel = 'Subscribe' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const inputId = useId();
  const messageId = `${inputId}-message`;

  const isSubmitting = status === 'submitting';
  const isInvalid = status === SUBSCRIBE_RESULT.INVALID;

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setStatus('submitting');
    const { result } = await subscribeToNewsletter(email);
    setStatus(result);
    if (result === SUBSCRIBE_RESULT.SUCCESS) setEmail('');
  }

  if (status === SUBSCRIBE_RESULT.SUCCESS) {
    return (
      <div className={`newsletter newsletter--${variant}`}>
        <p className="newsletter-success" role="status">
          You&rsquo;re on the list. Check your inbox to confirm your subscription.
        </p>
      </div>
    );
  }

  return (
    <div className={`newsletter newsletter--${variant}`}>
      <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
        <label className="sr-only" htmlFor={inputId}>
          Email address
        </label>

        <input
          id={inputId}
          className="newsletter-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email address"
          value={email}
          /* readOnly rather than disabled: a disabled input is blurred by the
             browser, so the user would lose their place mid-submit. */
          readOnly={isSubmitting}
          aria-busy={isSubmitting || undefined}
          aria-invalid={isInvalid || undefined}
          aria-describedby={status !== 'idle' && status !== 'submitting' ? messageId : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
        />

        <button type="submit" className="newsletter-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : buttonLabel}
          {!isSubmitting ? (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>
      </form>

      {isInvalid ? (
        <p className="newsletter-message is-invalid" id={messageId}>
          Please enter a valid email address.
        </p>
      ) : null}

      {status === SUBSCRIBE_RESULT.DUPLICATE ? (
        <p className="newsletter-message is-duplicate" id={messageId} role="status">
          This address is already subscribed.
        </p>
      ) : null}

      {status === SUBSCRIBE_RESULT.ERROR ? (
        <p className="newsletter-message is-error" id={messageId} role="alert">
          Something went wrong. Please try again.
        </p>
      ) : null}

      <p className="newsletter-consent">
        You&rsquo;ll get an email when a new article goes live. Unsubscribe anytime.
      </p>
    </div>
  );
}
