'use client';

import Link from 'next/link';
import ProfileSection from './ProfileSection';
import ProfileHighlights from './ProfileHighlights';
import BlogNote from '../blog/BlogNote';
import BlogComment from '../blog/BlogComment';

function FeedState({ feed, noun }) {
  return <>
    {feed.error && <div className="blog-public-error" role="alert"><p>{feed.error}</p><button type="button" onClick={feed.retry}>Try again</button></div>}
    {feed.loading && !feed.rows.length && <p role="status">Loading {noun}…</p>}
  </>;
}

function FeedMore({ feed }) {
  return feed.page < feed.totalPages ? <button type="button" className="blog-comments-all" disabled={feed.loading} onClick={feed.more}>
    {feed.loading ? 'Loading…' : 'Load more'}
  </button> : null;
}

export default function ProfileActivity({ notes, comments, highlights, publicView = false }) {
  const noteCount = notes.loading && notes.page === 0 || notes.error ? undefined : notes.total;
  const commentCount = comments.loading && comments.page === 0 || comments.error ? undefined : comments.total;
  const highlightCount = highlights && (highlights.loading && highlights.page === 0 || highlights.error ? undefined : highlights.total);
  return <>
    <ProfileSection id="profile-notes" title={publicView ? 'Public notes' : 'My notes'} count={noteCount}
      countLabel={notes.total === 1 ? 'note' : 'notes'}
      description={publicView ? 'Notes this reader chose to publish.' : 'Everything you wrote for yourself, published or not.'}
      empty={publicView ? 'No published notes.' : 'You have not written any notes yet.'}>
      <FeedState feed={notes} noun="notes" />
      <div className="profile-list">{notes.rows.map((note) => <div key={note.id}>
        <BlogNote note={note} />
        {note.postSlug ? <Link className="profile-entry-source" href={`/blog/${note.postSlug}`}>{note.postTitle}</Link> :
          <span className="profile-entry-source">{note.postTitle}</span>}
      </div>)}</div>
      <FeedMore feed={notes} />
    </ProfileSection>

    <ProfileSection id="profile-comments" title={publicView ? 'Comments' : 'My comments'} count={commentCount}
      countLabel={comments.total === 1 ? 'comment' : 'comments'}
      description="What this reader said, and the conversations that came out of it."
      empty="No comments yet.">
      <FeedState feed={comments} noun="comments" />
      <div className="profile-list">{comments.rows.map((comment) => <div key={comment.id}>
        <BlogComment comment={comment} reactable={comment.available} isReply={Boolean(comment.rootId)} />
        {comment.postSlug ? <Link className="profile-entry-source" href={`/blog/${comment.postSlug}`}>{comment.postTitle}</Link> :
          <span className="profile-entry-source">{comment.postTitle}</span>}
      </div>)}</div>
      <FeedMore feed={comments} />
    </ProfileSection>

    {!publicView && highlights && <ProfileSection id="profile-highlights" title="My highlights" count={highlightCount}
      countLabel={highlights.total === 1 ? 'passage' : 'passages'}
      description="Passages you marked. Only you can see these marks." empty="No highlights yet.">
      <FeedState feed={highlights} noun="highlights" />
      <ProfileHighlights highlights={highlights.rows} />
      <FeedMore feed={highlights} />
    </ProfileSection>}
  </>;
}
