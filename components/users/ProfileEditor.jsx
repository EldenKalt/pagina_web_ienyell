'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { profileError, updateOwnProfile } from '../../lib/readerProfile';

export default function ProfileEditor({ profile, onSaved }) {
  const [handle, setHandle] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [links, setLinks] = useState([]);
  const [bio, setBio] = useState('');
  const [patreonUrl, setPatreonUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    setHandle(profile?.handle || ''); setPronouns(profile?.pronouns || '');
    setLinks(Array.isArray(profile?.socialLinks) ? profile.socialLinks : []);
    setBio(profile?.bio || ''); setPatreonUrl(profile?.patreonUrl || '');
    setError(''); setMessage('');
  }, [profile?.handle, profile?.pronouns, profile?.socialLinks, profile?.bio, profile?.patreonUrl]);
  const save = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await updateOwnProfile({ ...(handle ? { handle } : {}), pronouns, socialLinks: links,
        ...(profile.canEditAuthor ? { bio, patreonUrl } : {}) });
      onSaved(result.profile);
      setMessage('Public profile updated.');
    } catch (failure) { setError(profileError(failure)); }
    finally { setBusy(false); }
  };
  const changeLink = (index, key, value) => setLinks((current) => current.map((link, at) => at === index ? { ...link, [key]: value } : link));
  return <form className="profile-editor" onSubmit={save}>
    <label>Public alias
      <input value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())}
        minLength={3} maxLength={30} pattern="[a-z][a-z0-9_-]{2,29}" required={Boolean(profile?.handle)} placeholder="your-name" />
    </label>
    <p className="profile-editor-hint">This appears in your public URL. You can change it later; old links will redirect.</p>
    <label>Pronouns (optional)
      <input value={pronouns} onChange={(event) => setPronouns(event.target.value)} maxLength={60} />
    </label>
    {profile.canEditAuthor && <>
      <label>Author biography (shown below your articles)
        <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} maxLength={1500} />
      </label>
      <p className="profile-editor-hint">{bio.length} / 1,500 characters</p>
      <label>Patreon link (optional)
        <input type="url" value={patreonUrl} onChange={(event) => setPatreonUrl(event.target.value)} maxLength={500} placeholder="https://www.patreon.com/your-name" />
      </label>
    </>}
    <div className="profile-editor-links">
      <p>Your public links (optional)</p>
      {links.map((link, index) => <div key={index} className="profile-editor-link">
        <input aria-label={`Link ${index + 1} name`} value={link.label} maxLength={40} placeholder="Platform" required
          onChange={(event) => changeLink(index, 'label', event.target.value)} />
        <input aria-label={`Link ${index + 1} URL`} value={link.url} type="url" placeholder="https://…" required
          onChange={(event) => changeLink(index, 'url', event.target.value)} />
        <button type="button" onClick={() => setLinks((current) => current.filter((_, at) => at !== index))}>Remove</button>
      </div>)}
      {links.length < 8 && <button type="button" onClick={() => setLinks((current) => [...current, { label: '', url: '' }])}>Add a link</button>}
    </div>
    {error && <p className="blog-public-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <button type="submit" className="blog-comments-all" disabled={busy}>{busy ? 'Saving…' : 'Save public profile'}</button>
    {profile?.handle && <Link href={`/users/${profile.handle}`}>Open public profile</Link>}
  </form>;
}
