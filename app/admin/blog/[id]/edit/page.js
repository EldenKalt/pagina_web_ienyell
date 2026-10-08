'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { authFetch, authUpload } from '../../../../../lib/authHelper';
import {
  slugifyCmsValue,
  toDateTimeLocalValue,
  fromDateTimeLocalValue,
  getPublicationState,
  hasMeaningfulHtmlContent,
} from '../../../../../lib/publishing';
import BlogEditor from '../../../../../components/cms/BlogEditor';
import CmsCoverUpload from '../../../../../components/cms/CmsCoverUpload';
import CmsSidebarSection from '../../../../../components/cms/CmsSidebarSection';
import CmsKeywordsInput from '../../../../../components/cms/CmsKeywordsInput';
import CmsRelatedSelector from '../../../../../components/cms/CmsRelatedSelector';
import BlogThreadManager from '../../../../../components/cms/BlogThreadManager';

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  coverUrl: '',
  content: '',
  slug: '',
  isPublished: false,
  publishedAt: null,
  keywords: [],
  relatedPostIds: [],
  notesEnabled: true,
  commentsEnabled: true,
};

function postToForm(post) {
  return {
    ...EMPTY_FORM,
    title: post.title || '',
    excerpt: post.excerpt || '',
    coverUrl: post.coverUrl || '',
    content: typeof post.content === 'string' ? post.content : post.content?.html || '',
    slug: post.slug || '',
    isPublished: Boolean(post.isPublished),
    publishedAt: post.publishedAt || null,
    keywords: Array.isArray(post.keywords) ? post.keywords : [],
    relatedPostIds: Array.isArray(post.relatedPostIds) ? post.relatedPostIds : [],
    notesEnabled: post.notesEnabled !== false,
    commentsEnabled: post.commentsEnabled !== false,
  };
}

function createPayload(source) {
  return {
    title: source.title,
    slug: source.slug || slugifyCmsValue(source.title, 'post', 60),
    content: source.content,
    notesEnabled: source.notesEnabled,
    commentsEnabled: source.commentsEnabled,
    excerpt: source.excerpt,
    coverUrl: source.coverUrl,
    keywords: source.keywords,
    relatedPostIds: source.relatedPostIds,
    isPublished: source.isPublished,
    publishedAt: source.publishedAt,
  };
}

export default function BlogEditorPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = !params?.id;
  const routeId = params?.id ? Number(params.id) : null;

  const [form, setForm] = useState(EMPTY_FORM);
  const [postId, setPostId] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const saveTimerRef = useRef(null);
  const formRef = useRef(EMPTY_FORM);
  const postIdRef = useRef(null);
  const savePromiseRef = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadEditor() {
      setLoadFailed(false);
      setLoading(true);
      setSaveStatus('idle');

      const validId = Number.isInteger(routeId) && routeId > 0;
      const requests = [authFetch('/api/blog/admin?view=summary', { signal: controller.signal })];
      if (!isNew && validId) {
        requests.push(authFetch(`/api/blog/admin/${routeId}`, { signal: controller.signal }));
      }
      const results = await Promise.allSettled(requests);
      if (cancelled || results.some((result) => (
        result.status === 'rejected' && result.reason?.name === 'AbortError'
      ))) return;

      const [summaryResult, detailResult] = results;
      setAllPosts(summaryResult.status === 'fulfilled' ? summaryResult.value?.posts ?? [] : []);

      if (isNew) {
        formRef.current = EMPTY_FORM;
        postIdRef.current = null;
        setForm(EMPTY_FORM);
        setPostId(null);
      } else if (!validId || detailResult.status === 'rejected') {
        setLoadFailed(true);
      } else {
        const fullPost = detailResult.value;
        if (Number(fullPost?.id) !== routeId || (
          typeof fullPost?.content !== 'string' && typeof fullPost?.content?.html !== 'string'
        )) {
          setLoadFailed(true);
          setLoading(false);
          return;
        }
        const nextForm = postToForm(fullPost);
        formRef.current = nextForm;
        postIdRef.current = Number(fullPost.id);
        setForm(nextForm);
        setPostId(Number(fullPost.id));
      }
      setLoading(false);
    }

    loadEditor();

    return () => {
      cancelled = true;
      controller.abort();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [routeId, isNew, reloadKey]);

  const persistDraft = useCallback((overrides = {}) => {
    if (!isNew && postIdRef.current == null) return Promise.resolve(null);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const nextForm = { ...formRef.current, ...overrides };
    formRef.current = nextForm;
    setForm(nextForm);

    if (!nextForm.title.trim() || !hasMeaningfulHtmlContent(nextForm.content)) {
      return Promise.resolve(null);
    }

    setSaveStatus('saving');

    const save = async () => {
      const currentId = postIdRef.current;
      const payload = createPayload(nextForm);

      try {
        let savedPost;
        if (!currentId) {
          savedPost = await authFetch('/api/blog', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          const newId = Number(savedPost?.id);
          if (!newId) throw new Error('The post was created without an ID.');

          postIdRef.current = newId;
          setPostId(newId);
          setAllPosts((currentPosts) => [savedPost, ...currentPosts]);
          router.replace(`/admin/blog/${newId}/edit`);
        } else {
          savedPost = await authFetch(`/api/blog/${currentId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          setAllPosts((currentPosts) => currentPosts.map((post) => (
            post.id === currentId ? { ...post, ...savedPost } : post
          )));
        }

        setSaveStatus('saved');
        return savedPost;
      } catch (requestError) {
        console.error('Blog draft save failed:', requestError);
        setSaveStatus('error');
        throw requestError;
      }
    };

    const queuedSave = savePromiseRef.current
      .catch(() => undefined)
      .then(save);
    savePromiseRef.current = queuedSave;
    return queuedSave;
  }, [router, isNew]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('idle');
    saveTimerRef.current = setTimeout(() => {
      persistDraft().catch(() => undefined);
    }, 2000);
  }, [persistDraft]);

  const updateField = useCallback((key, value) => {
    const nextForm = { ...formRef.current, [key]: value };
    formRef.current = nextForm;
    setForm(nextForm);
    scheduleSave();
  }, [scheduleSave]);

  const handlePublish = useCallback(async () => {
    try {
      const savedPost = await persistDraft();
      const currentId = postIdRef.current;
      if (!savedPost || !currentId) {
        setSaveStatus('error');
        return;
      }

      setSaveStatus('saving');
      const updatedPost = await authFetch(`/api/blog/${currentId}/publish`, {
        method: 'PATCH',
      });
      const nextForm = {
        ...formRef.current,
        isPublished: Boolean(updatedPost.isPublished),
        publishedAt: updatedPost.publishedAt || null,
      };
      formRef.current = nextForm;
      setForm(nextForm);
      setAllPosts((currentPosts) => currentPosts.map((post) => (
        post.id === currentId ? { ...post, ...updatedPost } : post
      )));
      setSaveStatus('saved');
    } catch (requestError) {
      console.error('Blog publish toggle failed:', requestError);
      setSaveStatus('error');
    }
  }, [persistDraft]);

  const handleSchedulePublish = useCallback(async (datetimeValue) => {
    const publishedAt = fromDateTimeLocalValue(datetimeValue);
    if (!publishedAt || new Date(publishedAt).getTime() <= Date.now()) {
      setSaveStatus('error');
      return;
    }

    try {
      const savedPost = await persistDraft({ isPublished: false, publishedAt });
      if (!savedPost) setSaveStatus('error');
    } catch (_) {
      // persistDraft exposes the failure through saveStatus.
    }
  }, [persistDraft]);

  const handleClearSchedule = useCallback(async () => {
    try {
      const savedPost = await persistDraft({ isPublished: false, publishedAt: null });
      if (!savedPost) setSaveStatus('error');
    } catch (_) {
      // persistDraft exposes the failure through saveStatus.
    }
  }, [persistDraft]);

  if (loading) {
    return (
      <main className="cms-editor-page">
        <div className="blog-loading" role="status">
          <span className="blog-loading-spinner" /> Loading…
        </div>
      </main>
    );
  }

  if (loadFailed) {
    return (
      <main className="cms-editor-page">
        <div className="blog-loading" role="alert">
          <p>This post could not be loaded. Nothing has been changed.</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Retry</button>
          <Link href="/admin/blog" className="cms-back-button">← Blog</Link>
        </div>
      </main>
    );
  }

  const publicationState = getPublicationState(form);

  return (
    <main className="cms-editor-page" data-post-id={postId || undefined}>
      <div className="cms-editor-topbar">
        <Link href="/admin/blog" className="cms-back-button">← Blog</Link>
        <span
          className={`cms-save-status ${saveStatus === 'saved' ? 'is-saved' : saveStatus === 'error' ? 'is-error' : ''}`}
        >
          {saveStatus === 'saving'
            ? 'Saving…'
            : saveStatus === 'saved'
              ? 'Saved'
              : saveStatus === 'error'
                ? 'Error saving'
                : ''}
        </span>
        <button
          type="button"
          className="cms-btn cms-btn-sm"
          onClick={() => setSidebarOpen((value) => !value)}
        >
          {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        </button>
      </div>

      <div className="cms-editor-layout">
        <div className="cms-editor-main">
          <input
            type="text"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Post title"
            className="cms-title-input"
          />
          <BlogEditor
            content={form.content}
            onChange={(html) => updateField('content', html)}
            placeholder="Start writing your post…"
          />
        </div>

        {sidebarOpen && (
          <aside className="cms-editor-sidebar">
            <CmsSidebarSection title="Reader participation">
              <label><input type="checkbox" checked={form.notesEnabled} onChange={(event) => updateField('notesEnabled', event.target.checked)} /> Enable notes</label>
              <label><input type="checkbox" checked={form.commentsEnabled} onChange={(event) => updateField('commentsEnabled', event.target.checked)} /> Enable comments</label>
            </CmsSidebarSection>
            {postId && <CmsSidebarSection title="Comment threads" defaultOpen={false}>
              <BlogThreadManager postId={postId} prepare={persistDraft} />
            </CmsSidebarSection>}
            <CmsSidebarSection title="Cover image">
              <CmsCoverUpload
                coverUrl={form.coverUrl}
                onChange={(url) => updateField('coverUrl', url)}
                uploadFile={(file) => authUpload('/api/uploads', file)}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="SEO">
              <div className="cms-slug-preview">
                <span>URL Preview</span>
                <code>/blog/{form.slug || slugifyCmsValue(form.title)}</code>
              </div>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => updateField('slug', event.target.value)}
                placeholder="Custom slug"
                className="cms-input"
              />
              <textarea
                value={form.excerpt}
                onChange={(event) => updateField('excerpt', event.target.value)}
                placeholder="Excerpt / meta description (max 200 chars)"
                className="cms-input cms-textarea"
                rows={3}
                maxLength={200}
              />
              <CmsKeywordsInput
                keywords={form.keywords}
                onChange={(value) => updateField('keywords', value)}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Related Posts" defaultOpen={false}>
              <CmsRelatedSelector
                label="posts"
                selectedIds={form.relatedPostIds}
                onChange={(value) => updateField('relatedPostIds', value)}
                items={allPosts
                  .filter((post) => post.id !== postId)
                  .map((post) => ({ id: post.id, title: post.title }))}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Publication" defaultOpen={false}>
              <div className="cms-publish-section">
                <span className={`cms-admin-badge cms-badge-${publicationState}`}>
                  {publicationState === 'published'
                    ? 'Published'
                    : publicationState === 'scheduled'
                      ? 'Scheduled'
                      : 'Draft'}
                </span>
                <button type="button" className="cms-btn" onClick={handlePublish}>
                  {form.isPublished ? 'Unpublish' : 'Publish Now'}
                </button>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(form.publishedAt)}
                  onChange={(event) => handleSchedulePublish(event.target.value)}
                  className="cms-input"
                />
                {form.publishedAt && !form.isPublished && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-sm"
                    onClick={handleClearSchedule}
                  >
                    Clear schedule
                  </button>
                )}
              </div>
            </CmsSidebarSection>
          </aside>
        )}
      </div>
    </main>
  );
}
