'use client';

import { useEffect, useMemo, useState } from 'react';

import { createDefaultLinkButtonSettings, intentionButtons } from '../../../data/linkInBioConfig';
import { authFetch } from '../../../lib/authHelper';

function Switch({ checked, onChange, label }) {
  return (
    <label className="ienyell-calculator-switch">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export default function LinkButtonsAdminPage() {
  const [settings, setSettings] = useState(() => createDefaultLinkButtonSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const payload = await authFetch('/api/link-buttons/admin');
        if (!cancelled && payload?.settings?.buttons) setSettings(payload.settings);
      } catch (requestError) {
        if (!cancelled) setError(requestError?.data?.error || 'Link-in-Bio settings could not be loaded. Reviewed defaults are shown below.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visibleCount = useMemo(
    () => intentionButtons.filter((button) => settings.buttons?.[button.id] !== false).length,
    [settings],
  );

  function changeVisibility(id, visible) {
    setMessage('');
    setSettings((current) => ({
      ...current,
      buttons: { ...current.buttons, [id]: visible },
    }));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = await authFetch('/api/link-buttons', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      setSettings(payload.settings);
      setMessage('Link-in-Bio visibility saved. The public /links page now uses this selection.');
    } catch (requestError) {
      setError(requestError?.data?.error || 'Link-in-Bio settings could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ienyell-admin-page ienyell-link-buttons-page">
      <header className="ienyell-admin-page-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Link-in-Bio visibility</p>
          <h1>Choose what appears on /links.</h1>
          <p>Activate or hide the main buttons without changing their destination, content or internal service flow.</p>
        </div>
        <button type="button" className="ienyell-admin-refresh" disabled={loading || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
      </header>

      {error ? <p className="ienyell-admin-notice is-error" role="alert">{error}</p> : null}
      {message ? <p className="ienyell-admin-notice" role="status">{message}</p> : null}

      <div className="ienyell-link-buttons-summary">
        <span>{visibleCount} of {intentionButtons.length} buttons visible</span>
        <a href="/links" target="_blank" rel="noreferrer">Preview /links</a>
      </div>

      <div className="ienyell-link-buttons-list">
        {intentionButtons.map((button) => {
          const visible = settings.buttons?.[button.id] !== false;
          return (
            <article className={`ienyell-link-button-card${visible ? '' : ' is-hidden'}`} key={button.id}>
              <div>
                <p className="ienyell-admin-eyebrow">{button.href}</p>
                <h2>{button.title}</h2>
                <p>{button.subtitle}</p>
              </div>
              <Switch
                checked={visible}
                label={visible ? 'Visible' : 'Hidden'}
                onChange={(value) => changeVisibility(button.id, value)}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
