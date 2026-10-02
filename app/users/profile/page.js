'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import ProfileSection from '../../../components/users/ProfileSection';
import ProfileWishlist from '../../../components/users/ProfileWishlist';
import ProfileHighlights from '../../../components/users/ProfileHighlights';
import BlogNote from '../../../components/blog/BlogNote';
import BlogComment from '../../../components/blog/BlogComment';
import BlogPostGrid from '../../../components/blog/BlogPostGrid';
import { getProfilePlaceholder } from '../../../data/profilePlaceholder';
import { getPlaceholderNotes } from '../../../data/blogPlaceholderNotes';
import { getPlaceholderComments } from '../../../data/blogPlaceholderComments';
import { getPlaceholderPosts } from '../../../data/blogPlaceholderPosts';

/**
 * The reader's profile.
 *
 * WHAT IT IS: closer to a Steam profile than to a social network. There is no
 * private messaging and there are no friends. Other people can see what someone
 * has read, their comments and their public notes. A reader may add their own
 * social links and may not upload, post or publish anything else.
 *
 * It is TIERED. This is the reader tier. Buying a course, requesting a service
 * or ordering a product unlocks further panels — downloads, shipping, invoicing.
 * Those are agreed later work and are not sketched here; neither are the
 * reader's courses, their exercise results or the teacher's comments on them.
 *
 * WHAT SOMEONE HAS READ is part of the public profile and is NOT built, because
 * nothing records it: "Read later" is what a reader kept, not what they read.
 * Two decisions come before the table — what counts as read, and whether a
 * reader can hide it. See blog-backend-contracts.md §4.4.
 *
 * THE PUBLIC PREVIEW is not decoration. The whole point of publishing a note is
 * that other people read it, so being able to check exactly what is exposed
 * before publishing more is the feature. It renders this same page with the
 * private sections removed, which is also the honest way to build it: there is
 * one definition of what is public, not two that can drift.
 *
 * NOTHING HERE PERSISTS. Notes and comments come from the blog's own placeholder
 * files, so the profile shows the same data the post page does; everything else
 * comes from data/profilePlaceholder.js. No endpoint exists for any of it — see
 * blog-backend-contracts.md.
 */

/** What a visitor is allowed to see. One list, used to build the public view. */
const PUBLIC_SECTIONS = ['notes', 'comments', 'highlights'];

export default function UserProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [asPublic, setAsPublic] = useState(false);

  const profile = useMemo(() => getProfilePlaceholder(), []);
  const notes = useMemo(() => getPlaceholderNotes(), []);
  const comments = useMemo(() => getPlaceholderComments().slice(0, 4), []);
  const savedPosts = useMemo(() => {
    const byId = new Map(getPlaceholderPosts().map((post) => [post.id, post]));
    return profile.savedIds.map((id) => byId.get(id)).filter(Boolean);
  }, [profile.savedIds]);

  // A profile is the one page on the site that cannot be read without a session.
  useEffect(() => {
    if (!isLoading && !user) router.replace('/users/login');
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <main className="profile-page">
        <div className="blog-loading" role="status" aria-live="polite">
          <span className="blog-loading-spinner" />
          Loading your profile…
        </div>
      </main>
    );
  }

  if (!user) {
    // The effect above is already navigating; this is what shows for the frame
    // in between, rather than a flash of an empty profile.
    return (
      <main className="profile-page">
        <p className="profile-empty">Sign in to see your profile.</p>
      </main>
    );
  }

  const visible = (section) => !asPublic || PUBLIC_SECTIONS.includes(section);
  const publicNotes = notes.filter((note) => note.isPublic);
  const shownNotes = asPublic ? publicNotes : notes;

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div className="profile-identity">
          {user.avatarUrl ? (
            <img className="profile-avatar" src={user.avatarUrl} alt="" />
          ) : (
            <span className="profile-avatar profile-avatar--fallback" aria-hidden="true">
              {(user.name || '?').trim().charAt(0)}
            </span>
          )}

          <div>
            <h1 className="profile-name">{user.name || 'Reader'}</h1>
            {/* (Dynamic metadata: user.name) */}
            {user.pronouns ? <p className="profile-pronouns">{user.pronouns}</p> : null}
            {/* (Expected dynamic field: user.pronouns — not a column on model User) */}

            {profile.socials.length ? (
              <ul className="profile-socials">
                {profile.socials.map((social) => (
                  <li key={social.id}>
                    <a href={social.url} rel="me noreferrer" target="_blank">
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {/* The reader's own links — the only thing they publish about
                themselves. (Expected dynamic field: user.socials[]) */}
          </div>
        </div>

        {/* Points are earned for commenting, doing practices, sharing posts,
            following on social and recommending the site, and redeem for
            benefits only account holders get. THE RULES ARE NOT DECIDED, so the
            total is shown and the ledger is marked as illustrative. */}
        <div className="profile-points">
          <p className="profile-points-total">
            <strong>{profile.points.total.toLocaleString()}</strong> points
          </p>
          <p className="profile-points-hint">
            Earned by reading, commenting and sharing. Spend them on things only
            readers with an account can get.
          </p>
          {/* (Future content: the rewards catalogue, once the rules exist) */}
        </div>
      </header>

      <div className="profile-viewswitch" role="group" aria-label="How to view this profile">
        <button
          type="button"
          className={`profile-viewbtn${asPublic ? '' : ' is-active'}`}
          onClick={() => setAsPublic(false)}
          aria-pressed={!asPublic}
        >
          Your view
        </button>
        <button
          type="button"
          className={`profile-viewbtn${asPublic ? ' is-active' : ''}`}
          onClick={() => setAsPublic(true)}
          aria-pressed={asPublic}
        >
          What others see
        </button>
      </div>

      {asPublic ? (
        <p className="profile-public-banner" role="status">
          This is your profile as a visitor sees it. Your private notes, your
          reading list, your wishlist and your account details are not here.
        </p>
      ) : null}

      <ProfileSection
        id="profile-notes"
        title="My notes"
        count={shownNotes.length}
        countLabel={shownNotes.length === 1 ? 'note' : 'notes'}
        description={
          asPublic
            ? 'Only the notes you published appear here.'
            : 'Everything you wrote for yourself, published or not.'
        }
        empty={asPublic ? 'No published notes.' : 'You have not written any notes yet.'}
      >
        <div className="profile-list">
          {shownNotes.map((note) => (
            <BlogNote key={note.id} note={note} />
          ))}
        </div>
      </ProfileSection>

      <ProfileSection
        id="profile-comments"
        title="My comments"
        count={comments.length}
        countLabel={comments.length === 1 ? 'comment' : 'comments'}
        description="What you said, and the conversations that came out of it."
        note="Replies, reaction notifications and muting a conversation are agreed but not built."
      >
        <div className="profile-list">
          {comments.map((comment) => (
            <BlogComment key={comment.id} comment={comment} />
          ))}
        </div>
      </ProfileSection>

      <ProfileSection
        id="profile-highlights"
        title="My highlights"
        count={profile.highlights.length}
        countLabel={profile.highlights.length === 1 ? 'passage' : 'passages'}
        description="Passages you marked. Each one links back to where it sits."
      >
        <ProfileHighlights highlights={profile.highlights} />
      </ProfileSection>

      {visible('saved') ? (
        <ProfileSection
          id="profile-saved"
          title="Read later"
          count={savedPosts.length}
          countLabel={savedPosts.length === 1 ? 'post' : 'posts'}
          description="What you kept with the bookmark."
          note="What you have actually read is a separate, public section, and nothing records it yet."
          empty="Nothing saved yet."
        >
          <BlogPostGrid posts={savedPosts} layout="rows" headingLevel={3} showExcerpt />
        </ProfileSection>
      ) : null}

      {visible('wishlist') ? (
        <ProfileSection
          id="profile-wishlist"
          title="Wishlist"
          count={profile.wishlist.length}
          countLabel={profile.wishlist.length === 1 ? 'item' : 'items'}
          description="Things you want for later."
          note="No wishlist table exists yet, and the product pages these would open do not either."
        >
          <ProfileWishlist items={profile.wishlist} />
        </ProfileSection>
      ) : null}

      {visible('account') ? (
        <ProfileSection
          id="profile-account"
          title="Account"
          description="Your details, and the way out."
        >
          <dl className="profile-account">
            <div>
              <dt>Name</dt>
              <dd>{user.name || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email || '—'}</dd>
            </div>
          </dl>

          <p className="profile-account-links">
            <Link href="/links">Contact me</Link>
          </p>
        </ProfileSection>
      ) : null}
    </main>
  );
}
