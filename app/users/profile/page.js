'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import ProfileSection from '../../../components/users/ProfileSection';
import ProfileActivity from '../../../components/users/ProfileActivity';
import ProfileEditor from '../../../components/users/ProfileEditor';
import ProfileWishlistManager from '../../../components/users/ProfileWishlistManager';
import BlogPostGrid from '../../../components/blog/BlogPostGrid';
import usePagedProfile from '../../../hooks/usePagedProfile';
import { getOwnProfile, profileError } from '../../../lib/readerProfile';
import { fetchSavedPosts, savedError } from '../../../lib/savedBlog';

export default function UserProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const readerRef = useRef(user?.id);
  readerRef.current = user?.id;
  const [asPublic, setAsPublic] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState('');
  const [profileRevision, setProfileRevision] = useState(0);
  const [wishlistRevision, setWishlistRevision] = useState(0);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedOwner, setSavedOwner] = useState(null);
  const [savedPage, setSavedPage] = useState(0);
  const [savedPages, setSavedPages] = useState(0);
  const [savedTotal, setSavedTotal] = useState(0);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedListError, setSavedListError] = useState('');
  const [savedRevision, setSavedRevision] = useState(0);

  const identity = user?.id || null;
  const notes = usePagedProfile(identity ? asPublic ? '/api/reader-profiles/_self/notes' : '/api/users/me/notes' : null, 'notes', identity);
  const comments = usePagedProfile(identity ? asPublic ? '/api/reader-profiles/_self/comments' : '/api/users/me/comments' : null, 'comments', identity);
  const highlights = usePagedProfile(identity ? '/api/users/me/annotations' : null, 'highlights', identity);
  const wishlist = usePagedProfile(identity ? '/api/users/me/wishlist' : null, 'items', identity, wishlistRevision);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/users/login');
  }, [isLoading, user, router]);
  useEffect(() => {
    setProfile(null); setProfileErrorMessage('');
    if (!identity) return undefined;
    const controller = new AbortController();
    getOwnProfile(controller.signal).then((result) => { if (!controller.signal.aborted) setProfile(result.profile); })
      .catch((error) => { if (!controller.signal.aborted) setProfileErrorMessage(profileError(error)); });
    return () => controller.abort();
  }, [identity, profileRevision]);
  useEffect(() => {
    setSavedPosts([]); setSavedOwner(null); setSavedPage(0); setSavedPages(0); setSavedTotal(0); setSavedListError('');
    if (!identity) return undefined;
    const controller = new AbortController();
    setSavedLoading(true);
    fetchSavedPosts(1, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setSavedPosts(result.posts); setSavedOwner(identity); setSavedPage(result.page);
        setSavedPages(result.totalPages); setSavedTotal(result.total);
      }
    }).catch((error) => { if (!controller.signal.aborted) setSavedListError(savedError(error)); })
      .finally(() => { if (!controller.signal.aborted) setSavedLoading(false); });
    return () => controller.abort();
  }, [identity, savedRevision]);
  const loadMoreSaved = async () => {
    if (savedLoading || savedOwner !== identity || savedPage >= savedPages) return;
    const userId = identity;
    setSavedLoading(true); setSavedListError('');
    try {
      const result = await fetchSavedPosts(savedPage + 1);
      if (readerRef.current === userId) {
        setSavedPosts((current) => [...current, ...result.posts]);
        setSavedPage(result.page); setSavedPages(result.totalPages); setSavedTotal(result.total);
      }
    } catch (error) { if (readerRef.current === userId) setSavedListError(savedError(error)); }
    finally { setSavedLoading(false); }
  };

  if (isLoading) return <main className="profile-page"><div className="blog-loading" role="status">Loading your profile…</div></main>;
  if (!user) return <main className="profile-page"><p className="profile-empty">Sign in to see your profile.</p></main>;

  const currentProfile = profile?.id === identity ? profile : null;
  const currentSavedPosts = savedOwner === identity ? savedPosts : [];
  const socials = Array.isArray(currentProfile?.socialLinks) ? currentProfile.socialLinks : [];
  return <main className="profile-page">
    <header className="profile-header">
      <div className="profile-identity">
        <span className="profile-avatar profile-avatar--fallback" aria-hidden="true">{(currentProfile?.name || user.name || '?').trim().charAt(0)}</span>
        <div>
          <h1 className="profile-name">{currentProfile?.name || user.name || 'Reader'}</h1>
          {currentProfile?.pronouns && <p className="profile-pronouns">{currentProfile.pronouns}</p>}
          {currentProfile?.handle && <p>@{currentProfile.handle}</p>}
          {socials.length > 0 && <ul className="profile-socials">{socials.map((social, index) => <li key={`${social.url}-${index}`}>
            <a href={social.url} rel="me noreferrer" target="_blank">{social.label}</a>
          </li>)}</ul>}
        </div>
      </div>
    </header>

    <div className="profile-viewswitch" role="group" aria-label="How to view this profile">
      <button type="button" className={`profile-viewbtn${asPublic ? '' : ' is-active'}`} onClick={() => setAsPublic(false)} aria-pressed={!asPublic}>Your view</button>
      <button type="button" className={`profile-viewbtn${asPublic ? ' is-active' : ''}`} onClick={() => setAsPublic(true)} aria-pressed={asPublic}>What others see</button>
    </div>
    {asPublic && <p className="profile-public-banner" role="status">This preview shows your public notes, comments and links. Your highlights, reading list, wishlist and account details stay private.</p>}

    <ProfileActivity notes={notes} comments={comments} highlights={highlights} publicView={asPublic} />

    {!asPublic && <>
      <ProfileSection id="profile-saved" title="Read later"
        count={savedOwner !== identity || savedLoading && savedPage === 0 || savedListError ? undefined : savedTotal}
        countLabel={savedTotal === 1 ? 'post' : 'posts'} description="What you kept with the bookmark." empty="Nothing saved yet.">
        {savedListError && <div role="alert" className="blog-public-error"><p>{savedListError}</p>
          <button type="button" onClick={() => setSavedRevision((value) => value + 1)}>Try again</button></div>}
        {savedLoading && !currentSavedPosts.length && <p role="status">Loading your reading list…</p>}
        {currentSavedPosts.length > 0 && <BlogPostGrid posts={currentSavedPosts} layout="rows" headingLevel={3} showExcerpt />}
        {savedOwner === identity && savedPage < savedPages && <button type="button" className="blog-comments-all" disabled={savedLoading} onClick={loadMoreSaved}>
          {savedLoading ? 'Loading…' : 'Load more saved articles'}</button>}
      </ProfileSection>

      <ProfileSection id="profile-wishlist" title="Wishlist" count={wishlist.total || undefined}
        countLabel={wishlist.total === 1 ? 'item' : 'items'} description="Products you want to keep in mind.">
        {wishlist.error && <div className="blog-public-error" role="alert"><p>{wishlist.error}</p><button type="button" onClick={wishlist.retry}>Try again</button></div>}
        {wishlist.loading && !wishlist.rows.length && <p role="status">Loading wishlist…</p>}
        {!wishlist.loading && !wishlist.rows.length && <p className="profile-empty">Nothing in your wishlist yet.</p>}
        <ProfileWishlistManager key={identity} items={wishlist.rows} onChanged={() => {
          if (readerRef.current === identity) setWishlistRevision((value) => value + 1);
        }} />
        {wishlist.page < wishlist.totalPages && <button type="button" className="blog-comments-all" disabled={wishlist.loading} onClick={wishlist.more}>Load more</button>}
      </ProfileSection>

      <ProfileSection id="profile-account" title="Account" description="Your details and your public profile settings.">
        {profileErrorMessage && <div className="blog-public-error" role="alert"><p>{profileErrorMessage}</p>
          <button type="button" onClick={() => setProfileRevision((value) => value + 1)}>Try again</button></div>}
        <dl className="profile-account"><div><dt>Name</dt><dd>{currentProfile?.name || user.name || '—'}</dd></div>
          <div><dt>Email</dt><dd>{currentProfile?.email || user.email || '—'}</dd></div></dl>
        {currentProfile && <ProfileEditor key={identity} profile={currentProfile} onSaved={(updated) => {
          if (readerRef.current === identity) setProfile(updated);
        }} />}
        <p className="profile-account-links"><Link href="/links">Contact me</Link></p>
      </ProfileSection>
    </>}
  </main>;
}
