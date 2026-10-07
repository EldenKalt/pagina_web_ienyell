'use client';

import ProfileActivity from './ProfileActivity';
import usePagedProfile from '../../hooks/usePagedProfile';

export default function PublicReaderProfile({ profile }) {
  const handle = profile.handle;
  const base = `/api/reader-profiles/${encodeURIComponent(handle)}`;
  const notes = usePagedProfile(`${base}/notes`, 'notes', handle);
  const comments = usePagedProfile(`${base}/comments`, 'comments', handle);
  const socials = Array.isArray(profile.socialLinks) ? profile.socialLinks : [];
  return <main className="profile-page">
    <header className="profile-header"><div className="profile-identity">
      <span className="profile-avatar profile-avatar--fallback" aria-hidden="true">{(profile.name || '?').trim().charAt(0)}</span>
      <div><h1 className="profile-name">{profile.name || 'Reader'}</h1>
        {profile.pronouns && <p className="profile-pronouns">{profile.pronouns}</p>}
        <p>@{handle}</p>
        {socials.length > 0 && <ul className="profile-socials">{socials.map((social, index) => <li key={`${social.url}-${index}`}>
          <a href={social.url} rel="me noreferrer" target="_blank">{social.label}</a>
        </li>)}</ul>}
      </div>
    </div></header>
    <ProfileActivity notes={notes} comments={comments} publicView />
  </main>;
}
