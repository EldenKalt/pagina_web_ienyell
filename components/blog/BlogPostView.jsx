'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildOutline } from '../../lib/blogOutline';
import { slugifyCmsValue } from '../../lib/publishing';
import BlogPostSequenceNav from './BlogPostSequenceNav';
import BlogPostActions from './BlogPostActions';
import BlogPostAuthor from './BlogPostAuthor';
import BlogPostComments from './BlogPostComments';
import BlogCommentsPanel from './BlogCommentsPanel';
import BlogNotesPanel from './BlogNotesPanel';
import BlogPostHeader from './BlogPostHeader';
import BlogPostRail from './BlogPostRail';
import BlogPostRelated from './BlogPostRelated';
import BlogPostTools from './BlogPostTools';
import BlogPostBody from './BlogPostBody';
import NewsletterForm from './NewsletterForm';
import { useAuth } from '../../context/AuthContext';
import useReaderAnnotations from '../../hooks/useReaderAnnotations';
import { annotationError } from '../../lib/notes';
import { useBlogSignIn } from './BlogSignInPrompt';
import BlogPublicNotes from './BlogPublicNotes';
import BlogPersonalHighlights from './BlogPersonalHighlights';
import { fetchCommentLocations, commentError } from '../../lib/comments';
import { fetchSavedState, saveBlogPost, unsaveBlogPost, savedError } from '../../lib/savedBlog';
import { fetchPostReactions, setPostLike, recordPostShare, reactionError } from '../../lib/reactions';

/**
 * Everything on the post page that a reader can touch.
 *
 * Split out of app/blog/[slug]/page.js so the page itself can be a server
 * component: the post and its sanitised body are resolved on the server and
 * handed down, which is what puts the article in the initial HTML. This half
 * still renders on the server too — client components do — it simply also
 * hydrates.
 *
 * `post` and `safeHtml` arrive from the server. Reader annotations load
 * separately for the current account and are cleared when that account changes.
 *
 * THE OUTLINE IS BUILT AFTER MOUNT, not during render. buildOutline parses the
 * body with DOMParser and so returns [] on the server. Computing it during
 * render would give the server an empty rail index and the client a full one,
 * and React would tear the two apart as a hydration mismatch. Starting empty on
 * both sides and filling in afterwards is the same end state, arrived at
 * honestly.
 */
export default function BlogPostView({ post, safeHtml, slug }) {
  // The comments panel is opened from the action bar, which renders twice — above
  // and below the article — so the state has to sit above both of them.
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null);
  const [commentRevision, setCommentRevision] = useState(0);
  const [commentLocations, setCommentLocations] = useState({ paragraphs: [], total: 0, previousCount: 0, generalCount: 0 });
  const [commentErrorMessage, setCommentErrorMessage] = useState('');
  const commentTotal = commentLocations.total;
  const [notesOpen, setNotesOpen] = useState(false);
  const [personalHighlightsOpen, setPersonalHighlightsOpen] = useState(false);
  const [annotationMessage, setAnnotationMessage] = useState('');
  const { user, isLoading } = useAuth();
  const readerRef = useRef({ userId: user?.id, slug });
  readerRef.current = { userId: user?.id, slug };
  const requestSignIn = useBlogSignIn();
  const notesEnabled = post.notesEnabled !== false;
  const commentsEnabled = post.commentsEnabled !== false;
  const annotations = useReaderAnnotations(slug, notesEnabled);
  useEffect(() => {
    if (!commentsEnabled) return undefined;
    const controller = new AbortController();
    setCommentErrorMessage('');
    setCommentLocations({ paragraphs: [], total: 0, previousCount: 0, generalCount: 0 });
    fetchCommentLocations(slug, controller.signal).then((data) => {
      if (!controller.signal.aborted) setCommentLocations(data);
    }).catch((error) => { if (!controller.signal.aborted) setCommentErrorMessage(commentError(error)); });
    return () => controller.abort();
  }, [slug, commentsEnabled, commentRevision]);
  const openAllComments = () => { setCommentTarget(null); setCommentsOpen(true); };
  const openComment = (comment) => {
    setCommentTarget({ paragraphId: comment.paragraphStatus === 'current' ? comment.paragraphId : null,
      anchor: null, quote: comment.highlight || null });
    setCommentsOpen(true);
  };
  // One bookmark and one reaction are shown in all three post controls.
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveReady, setSaveReady] = useState(!user?.id);
  const [engagementError, setEngagementError] = useState('');
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.stats?.likes || 0);
  const [shares, setShares] = useState(post.stats?.shares || 0);
  const [shareBusy, setShareBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [reactionReady, setReactionReady] = useState(false);
  const [engagementRevision, setEngagementRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setSaved(false); setLiked(false); setLikes(post.stats?.likes || 0); setShares(post.stats?.shares || 0);
    setSaveReady(!user?.id); setReactionReady(false); setEngagementError('');
    const reads = [fetchPostReactions(slug, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setLikes(result.likes); setLiked(result.liked); setShares(result.shares); setReactionReady(true); }
    })];
    if (user?.id) reads.push(fetchSavedState(slug, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setSaved(result.saved); setSaveReady(true); }
    }));
    Promise.all(reads).catch((error) => { if (!controller.signal.aborted) setEngagementError(error.message || 'Reading activity could not be loaded.'); });
    return () => controller.abort();
  }, [slug, user?.id, engagementRevision]);
  const toggleSave = async () => {
    if (isLoading || saveBusy || !saveReady) return;
    if (!user) { requestSignIn('save this article'); return; }
    const identity = { userId: user.id, slug };
    setSaveBusy(true); setEngagementError('');
    try {
      const result = await (saved ? unsaveBlogPost(slug) : saveBlogPost(slug));
      if (readerRef.current.userId === identity.userId && readerRef.current.slug === identity.slug) setSaved(result.saved);
    } catch (error) {
      if (readerRef.current.userId === identity.userId && readerRef.current.slug === identity.slug) {
        setEngagementError(savedError(error));
        if (error.status === 401) requestSignIn('save this article');
      }
    }
    finally { setSaveBusy(false); }
  };
  const toggleLike = async () => {
    if (isLoading || likeBusy || !reactionReady) return;
    if (!user) { requestSignIn('like this article'); return; }
    const identity = { userId: user.id, slug };
    setLikeBusy(true); setEngagementError('');
    try {
      const result = await setPostLike(slug, !liked);
      if (readerRef.current.userId === identity.userId && readerRef.current.slug === identity.slug) {
        setLiked(result.liked); setLikes(result.likes);
      }
    } catch (error) {
      if (readerRef.current.userId === identity.userId && readerRef.current.slug === identity.slug) {
        setEngagementError(reactionError(error));
        if (error.status === 401) requestSignIn('like this article');
      }
    }
    finally { setLikeBusy(false); }
  };
  const sharePost = async () => {
    if (shareBusy) return;
    setShareBusy(true); setEngagementError('');
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: post.title, url });
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else { setEngagementError('Sharing is not available in this browser.'); return; }
      const result = await recordPostShare(slug);
      if (readerRef.current.slug === slug) setShares(result.shares);
    } catch (error) {
      if (error?.name !== 'AbortError') setEngagementError(error?.status ? 'The link was shared, but its counter could not update.' : 'Could not share this article.');
    } finally { setShareBusy(false); }
  };
  useEffect(() => {
    setNotesOpen(false);
    setPersonalHighlightsOpen(false);
    setNoteAnchor(null);
    setAnnotationMessage('');
  }, [user?.id]);
  // Hiding the inline highlights is a reading preference the action bar offers
  // from its "..." menu. It sits here for the same reason `saved` does: the bar
  // renders twice and the two copies must not disagree.
  const [highlightsHidden, setHighlightsHidden] = useState(false);
  // Reader highlights are persisted by the annotation API and shown only to
  // their owner.
  // The passage a note is being written about, or null for a note on the post
  // as a whole.
  const [noteAnchor, setNoteAnchor] = useState(null);
  // The margin markers and the notes panel read the same owner-only collection.
  const highlights = useMemo(() => annotations.highlights.map((item) => ({ ...item, mine: true, count: 1 })), [annotations.highlights]);
  const notes = annotations.notes;

  // See the note in the component header: empty on the server and on the first
  // client render, filled once the body is in the DOM.
  const [outline, setOutline] = useState([]);
  useEffect(() => {
    setOutline(buildOutline(safeHtml));
  }, [safeHtml]);

  const addHighlight = async (selector) => {
    if (isLoading || annotations.loading || annotations.error) return;
    if (!user) { requestSignIn('save a highlight'); return; }
    try { setAnnotationMessage(''); await annotations.addHighlight(selector); }
    catch (error) { setAnnotationMessage(annotationError(error)); if (error.status === 401) requestSignIn('save a highlight'); }
  };

  const relatedPosts = Array.isArray(post?.relatedPosts) ? post.relatedPosts : [];
  const previousPost = post?.previousPost || null;
  const nextPost = post?.nextPost || null;

  return (
    <article className="blog-post-article">
      <div className="blog-post-detail-layout has-rail">
        <BlogPostHeader
          post={post}
          stats={{ ...post.stats, comments: commentTotal, likes, shares }}
          onOpenComments={commentsEnabled ? openAllComments : undefined}
          saved={saved}
          onToggleSave={toggleSave}
          saveBusy={saveBusy || !saveReady}
          liked={liked}
          onToggleLike={toggleLike}
          likeBusy={likeBusy || !reactionReady}
          onShare={sharePost}
          shareBusy={shareBusy}
          highlightsHidden={highlightsHidden}
          onToggleHighlights={() => setHighlightsHidden((v) => !v)}
        />

        <BlogPostRail post={post} outline={outline} />

        <div className="blog-post-main">
          {(annotationMessage || annotations.error) && <div className="blog-public-error" role="alert">
            <p>{annotationMessage || annotations.error}</p>
            {annotations.error && <button type="button" onClick={annotations.reload}>Try again</button>}
          </div>}
          {commentErrorMessage && <div className="blog-public-error" role="alert">
            <p>{commentErrorMessage}</p>
            <button type="button" onClick={() => setCommentRevision((value) => value + 1)}>Try again</button>
          </div>}
          {engagementError && <div className="blog-public-error" role="alert">
            <p>{engagementError}</p>
            <button type="button" onClick={() => setEngagementRevision((value) => value + 1)}>Try again</button>
          </div>}
          {/* The cover opens the article itself, in the reading column —
              not a full-width band above both columns. */}
          {post.coverUrl ? (
            <img className="blog-post-cover" src={post.coverUrl} alt={post.title} />
          ) : null}

          <BlogPostBody
            html={safeHtml}
            outline={outline}
            highlights={highlights}
            highlightsHidden={highlightsHidden}
            onOpenHighlight={() => setPersonalHighlightsOpen(true)}
            onHighlight={addHighlight}
            onComment={commentsEnabled ? (selector, _text, paragraphId) => {
              setCommentTarget({ paragraphId, anchor: selector, quote: null });
              setCommentsOpen(true);
            } : undefined}
            commentLocations={commentsEnabled ? commentLocations.paragraphs : []}
            onOpenParagraphComments={commentsEnabled ? (paragraphId) => {
              setCommentTarget({ paragraphId, anchor: null, quote: null });
              setCommentsOpen(true);
            } : undefined}
            onNote={notesEnabled ? (selector) => {
              setNoteAnchor(selector);
              setNotesOpen(true);
            } : undefined}
            notes={notes}
            onOpenNotes={notesEnabled ? () => setNotesOpen(true) : undefined}
          />

          {/* Chapter navigation replaces the older prev / back / next row:
              the reference puts one control here, and two sets of previous
              and next links on the same page would compete. */}
          <BlogPostSequenceNav
            sequence={post.sequence}
            previousPost={previousPost}
            nextPost={nextPost}
          />

          {/* The action bar repeats under the article, as in the reference —
              a reader who has finished should not have to scroll back up to
              react to it. */}
          <BlogPostActions
            stats={{ ...post.stats, comments: commentTotal, likes, shares }}
            onOpenComments={commentsEnabled ? openAllComments : undefined}
            saved={saved}
            onToggleSave={toggleSave}
            saveBusy={saveBusy || !saveReady}
            liked={liked}
            onToggleLike={toggleLike}
            likeBusy={likeBusy || !reactionReady}
            onShare={sharePost}
            shareBusy={shareBusy}
            highlightsHidden={highlightsHidden}
            onToggleHighlights={() => setHighlightsHidden((v) => !v)}
          />

          <BlogPostAuthor author={post.author} />

          {highlights.length > 0 && <button type="button" className="blog-personal-highlights-link" onClick={() => setPersonalHighlightsOpen(true)}>Your highlights ({highlights.length})</button>}

          {notesEnabled && <BlogPublicNotes key={`${slug}-${annotations.publicRevision}`} slug={slug} />}

          {commentsEnabled && <BlogPostComments
            slug={slug}
            total={commentTotal}
            revision={commentRevision}
            onCreated={() => setCommentRevision((value) => value + 1)}
            onOpenHighlight={openComment}
          />}

          <div className="blog-post-newsletter">
            <h2>Get new articles by email</h2>
            <NewsletterForm variant="inline" />
          </div>
        </div>

        <BlogPostRelated recommendations={relatedPosts} />


        {commentsEnabled && <BlogCommentsPanel
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          slug={slug}
          total={commentTotal}
          paragraphId={commentTarget?.paragraphId || null}
          anchor={commentTarget?.anchor || null}
          quote={commentTarget?.quote || null}
          revision={commentRevision}
          onCreated={() => setCommentRevision((value) => value + 1)}
          onOpenHighlight={openComment}
        />}

        {notesEnabled && <BlogNotesPanel
          anchor={noteAnchor}
          annotations={annotations}
          open={notesOpen}
          onClose={() => {
            setNotesOpen(false);
            setNoteAnchor(null);
          }}
        />}

        <BlogPersonalHighlights open={personalHighlightsOpen} onClose={() => setPersonalHighlightsOpen(false)} annotations={annotations} />

        <BlogPostTools
          stats={{ ...post.stats, comments: commentTotal, likes, shares }}
          sequence={post.sequence}
          seriesHref={post.sequence?.seriesSlug
            ? `/blog/series/${post.sequence.seriesSlug}`
            : post.sequence?.seriesName
              ? `/blog/series/${slugifyCmsValue(post.sequence.seriesName, 'series')}`
              : null}
          saved={saved}
          onToggleSave={toggleSave}
          saveBusy={saveBusy || !saveReady}
          liked={liked}
          onToggleLike={toggleLike}
          likeBusy={likeBusy || !reactionReady}
          onShare={sharePost}
          shareBusy={shareBusy}
          onAddNote={notesEnabled ? () => setNotesOpen(true) : undefined}
          onReadNotes={notesEnabled ? () => setNotesOpen(true) : undefined}
          onOpenComments={commentsEnabled ? openAllComments : undefined}
        />
      </div>
    </article>
  );
}
