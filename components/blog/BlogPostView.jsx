'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildOutline } from '../../lib/blogOutline';
import { slugifyCmsValue } from '../../lib/publishing';
import BlogPostSequenceNav from './BlogPostSequenceNav';
import BlogPostActions from './BlogPostActions';
import BlogPostAuthor from './BlogPostAuthor';
import BlogPostComments from './BlogPostComments';
import BlogCommentsPanel from './BlogCommentsPanel';
import BlogHighlightPanel from './BlogHighlightPanel';
import BlogNotesPanel from './BlogNotesPanel';
import BlogPostHeader from './BlogPostHeader';
import BlogPostRail from './BlogPostRail';
import BlogPostRelated from './BlogPostRelated';
import BlogPostCourses from './BlogPostCourses';
import BlogPostTools from './BlogPostTools';
import BlogPostBody from './BlogPostBody';
import NewsletterForm from './NewsletterForm';
import { getPlaceholderHighlights } from '../../data/blogPlaceholderHighlights';
import { getPlaceholderNotes } from '../../data/blogPlaceholderNotes';
import { getPlaceholderCommentCount } from '../../data/blogPlaceholderComments';
import { getPlaceholderCourses } from '../../data/blogPlaceholderCourses';

/**
 * Everything on the post page that a reader can touch.
 *
 * Split out of app/blog/[slug]/page.js so the page itself can be a server
 * component: the post and its sanitised body are resolved on the server and
 * handed down, which is what puts the article in the initial HTML. This half
 * still renders on the server too — client components do — it simply also
 * hydrates.
 *
 * It owns no data. `post` and `safeHtml` arrive as props and are never fetched
 * here; the state below is interface state only, and every piece of it is
 * documented where it sits.
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
  const commentTotal = getPlaceholderCommentCount();
  // The fragment whose reactions panel is open, or null. Opened from a comment's
  // quoted fragment and from a highlight painted in the article itself.
  const [highlightFragment, setHighlightFragment] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  // One bookmark shown in two places — the action bar and the tools panel — so
  // the state sits above both. Not persisted: there is no bookmarks endpoint.
  const [saved, setSaved] = useState(false);
  // Hiding the inline highlights is a reading preference the action bar offers
  // from its "..." menu. It sits here for the same reason `saved` does: the bar
  // renders twice and the two copies must not disagree.
  const [highlightsHidden, setHighlightsHidden] = useState(false);
  // State, not a memo: the selection toolbar adds to it. NOT PERSISTED — a
  // highlight made here lives until the page is reloaded.
  const [highlights, setHighlights] = useState(() => getPlaceholderHighlights());
  // The passage a note is being written about, or null for a note on the post
  // as a whole.
  const [noteAnchor, setNoteAnchor] = useState(null);
  // The reader's own notes, for the markers in the margin. Same source the notes
  // panel reads; NOT PERSISTED, like everything else in this phase.
  const notes = useMemo(() => getPlaceholderNotes(), []);

  // See the note in the component header: empty on the server and on the first
  // client render, filled once the body is in the DOM.
  const [outline, setOutline] = useState([]);
  useEffect(() => {
    setOutline(buildOutline(safeHtml));
  }, [safeHtml]);

  const addHighlight = (selector) => {
    setHighlights((current) => [
      ...current,
      { id: `local-${Date.now()}`, mine: true, count: 1, selector },
    ]);
  };

  const relatedPosts = Array.isArray(post?.relatedPosts) ? post.relatedPosts : [];
  const previousPost = post?.previousPost || null;
  const nextPost = post?.nextPost || null;

  return (
    <article className="blog-post-article">
      <div className="blog-post-detail-layout has-rail">
        <BlogPostHeader
          post={post}
          stats={{ ...post.stats, comments: commentTotal }}
          onOpenComments={() => setCommentsOpen(true)}
          saved={saved}
          onToggleSave={() => setSaved((v) => !v)}
          highlightsHidden={highlightsHidden}
          onToggleHighlights={() => setHighlightsHidden((v) => !v)}
        />

        <BlogPostRail post={post} outline={outline} />

        <div className="blog-post-main">
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
            onOpenHighlight={(id, text) => setHighlightFragment(text)}
            onHighlight={addHighlight}
            // Commenting on a passage highlights it too: a comment anchored
            // to text nobody can see the boundaries of is a comment about
            // nothing in particular.
            onComment={(selector, text) => {
              addHighlight(selector);
              setHighlightFragment(text);
            }}
            onNote={(selector, text) => {
              setNoteAnchor(text);
              setNotesOpen(true);
            }}
            notes={notes}
            onOpenNotes={() => setNotesOpen(true)}
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
            stats={{ ...post.stats, comments: commentTotal }}
            onOpenComments={() => setCommentsOpen(true)}
            saved={saved}
            onToggleSave={() => setSaved((v) => !v)}
            highlightsHidden={highlightsHidden}
            onToggleHighlights={() => setHighlightsHidden((v) => !v)}
          />

          <BlogPostAuthor author={post.author} />

          <BlogPostComments
            slug={slug}
            total={commentTotal}
            onOpenHighlight={setHighlightFragment}
          />

          <div className="blog-post-newsletter">
            <h2>Get new articles by email</h2>
            <NewsletterForm variant="inline" />
          </div>
        </div>

        <BlogPostRelated recommendations={relatedPosts} />

        <BlogPostCourses courses={getPlaceholderCourses()} />

        <BlogCommentsPanel
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          slug={slug}
          total={commentTotal}
        />

        <BlogHighlightPanel
          open={Boolean(highlightFragment)}
          onClose={() => setHighlightFragment(null)}
          slug={slug}
          fragment={highlightFragment}
        />

        <BlogNotesPanel
          anchor={noteAnchor}
          open={notesOpen}
          onClose={() => {
            setNotesOpen(false);
            setNoteAnchor(null);
          }}
          slug={slug}
        />

        <BlogPostTools
          stats={{ ...post.stats, comments: commentTotal }}
          sequence={post.sequence}
          seriesHref={
            post.sequence?.seriesName
              ? `/blog/series/${slugifyCmsValue(post.sequence.seriesName, 'series')}`
              : null
          }
          saved={saved}
          onToggleSave={() => setSaved((v) => !v)}
          onAddNote={() => setNotesOpen(true)}
          onReadNotes={() => setNotesOpen(true)}
          onOpenComments={() => setCommentsOpen(true)}
        />
      </div>
    </article>
  );
}
