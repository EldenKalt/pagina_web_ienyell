'use client';

import { useState } from 'react';
import { useBlogSignIn } from './BlogSignInPrompt';
import { useAuth } from '../../context/AuthContext';
import BlogPostRailBlock from './BlogPostRailBlock';

/**
 * "Add to your interest" — follow the topics this post belongs to.
 *
 * NOT PERSISTED. There is no interests endpoint, so a topic added here lives in
 * component state and is gone on reload. The block exists so the states, the copy
 * and the keyboard path can be reviewed; wire it up when the account backend grows
 * a topics table.
 *
 * Signed out, the chips announce as disabled and route to the login page — the
 * same rule the action bar follows, so the two behave alike.
 *
 * The three-line explanation is interface copy, not editorial placeholder: it
 * tells the reader what following a topic actually does, and it is the reason
 * anyone would press the button.
 */
export default function BlogPostInterests({ topics = [] }) {
  const { user, isLoading } = useAuth();
  const requestSignIn = useBlogSignIn();
  const [followed, setFollowed] = useState(() => new Set());

  if (!topics.length) return null;

  const locked = !isLoading && !user;

  const toggle = (topic) => {
    if (locked) {
      requestSignIn();
      return;
    }
    setFollowed((current) => {
      const next = new Set(current);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  };

  return (
    <BlogPostRailBlock
      title="Add to your interest"
      collapsible
      showLabel="Show topics"
      hideLabel="Hide topics"
    >
      <p className="blog-post-rail-text">Adding topics to your interests:</p>
      <ul className="blog-post-rail-bullets">
        <li>makes more of them appear</li>
        <li>notifies you when new related topics are published</li>
        <li>lets me know what interests you about the subject</li>
      </ul>

      <ul className="blog-post-interest-list">
        {topics.map((topic) => {
          const isFollowed = followed.has(topic);

          return (
            <li key={topic}>
              <button
                type="button"
                className={`blog-post-interest${isFollowed ? ' is-followed' : ''}`}
                aria-pressed={locked ? undefined : isFollowed}
                aria-disabled={locked || undefined}
                aria-label={
                  isFollowed ? `Remove ${topic} from your interests` : `Add ${topic} to your interests`
                }
                title={locked ? 'Sign in to follow topics' : undefined}
                onClick={() => toggle(topic)}
              >
                {topic}
                <span className="blog-post-interest-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    {isFollowed ? <path d="M3.5 8.5l3 3 6-6.5" /> : <path d="M8 3.5v9M3.5 8h9" />}
                  </svg>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {/* (Dynamic metadata: derived from post.keywords[] — the topics a reader
          can follow are the ones this post is filed under) */}
    </BlogPostRailBlock>
  );
}
