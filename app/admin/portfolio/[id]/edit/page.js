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
} from '../../../../../lib/publishing';
import BlogEditor from '../../../../../components/cms/BlogEditor';
import CmsCoverUpload from '../../../../../components/cms/CmsCoverUpload';
import CmsSidebarSection from '../../../../../components/cms/CmsSidebarSection';
import CmsPairEditor from '../../../../../components/cms/CmsPairEditor';
import PortfolioCategoryChips from '../../../../../components/cms/PortfolioCategoryChips';
import PortfolioBudgetInput from '../../../../../components/cms/PortfolioBudgetInput';
import SoftwarePicker from '../../../../../components/cms/SoftwarePicker';
import TechnologyPicker from '../../../../../components/cms/TechnologyPicker';
import {
  normalizePortfolioSoftwareEntry,
  normalizePortfolioTechnologyEntry,
} from '../../../../../data/portfolioSoftwareCatalog';

const EMPTY_FORM = {
  title: '',
  slug: '',
  client: '',
  date: '',
  summary: '',
  approach: '',
  budget: '',
  aspectRatio: '4/3',
  liveUrl: '',
  showBrowserFrame: false,
  coverUrl: '',
  categories: [],
  software: [],
  technologies: [],
  results: [],
  content: '',
  isPublished: false,
  publishedAt: null,
};

function projectToForm(project) {
  return {
    ...EMPTY_FORM,
    ...project,
    client: project.client || '',
    date: project.date || '',
    budget: project.budget || '',
    liveUrl: project.liveUrl || '',
    coverUrl: project.coverUrl || '',
    categories: Array.isArray(project.categories) ? project.categories : [],
    software: (Array.isArray(project.software) ? project.software : [])
      .map(normalizePortfolioSoftwareEntry)
      .filter(Boolean),
    technologies: (Array.isArray(project.technologies) ? project.technologies : [])
      .map(normalizePortfolioTechnologyEntry)
      .filter(Boolean),
    results: Array.isArray(project.results) ? project.results : [],
    content: typeof project.content === 'string'
      ? project.content
      : project.content?.html || '',
    publishedAt: project.publishedAt || null,
  };
}

function createPayload(source) {
  return {
    ...source,
    content: typeof source.content === 'string'
      ? source.content
      : source.content?.html || '',
  };
}

export default function PortfolioEditorPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params?.id ? Number(params.id) : null;

  const [form, setForm] = useState(EMPTY_FORM);
  const [projectId, setProjectId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const formRef = useRef(EMPTY_FORM);
  const projectIdRef = useRef(null);
  const saveTimerRef = useRef(null);
  const savePromiseRef = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    async function loadEditor() {
      setLoading(true);
      setSaveStatus('idle');

      try {
        const categoryData = await authFetch('/api/portfolio/categories');
        if (cancelled) return;
        setCategories(Array.isArray(categoryData?.categories) ? categoryData.categories : []);

        if (!routeId) {
          formRef.current = EMPTY_FORM;
          projectIdRef.current = null;
          setForm(EMPTY_FORM);
          setProjectId(null);
          return;
        }

        const projectData = await authFetch('/api/portfolio/projects?all=true');
        const projectSummary = (projectData?.projects || []).find(
          (project) => Number(project.id) === routeId,
        );

        if (!projectSummary) throw new Error('Project not found.');

        const detailData = await authFetch(`/api/portfolio/projects/${projectSummary.slug}`);
        if (cancelled) return;

        const nextForm = projectToForm(detailData.project);
        formRef.current = nextForm;
        projectIdRef.current = Number(detailData.project.id);
        setForm(nextForm);
        setProjectId(Number(detailData.project.id));
      } catch (error) {
        if (!cancelled) {
          console.error('Portfolio editor load failed:', error);
          setSaveStatus('error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEditor();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [routeId]);

  const persistDraft = useCallback((overrides = {}) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const nextForm = { ...formRef.current, ...overrides };
    formRef.current = nextForm;
    setForm(nextForm);

    if (!nextForm.title.trim() || !nextForm.summary.trim()) {
      return Promise.resolve(null);
    }

    setSaveStatus('saving');

    const save = async () => {
      const currentId = projectIdRef.current;
      const payload = createPayload(nextForm);

      try {
        if (!currentId) {
          const result = await authFetch('/api/portfolio/projects', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          const newId = Number(result?.project?.id);
          if (!newId) throw new Error('The project was created without an ID.');

          projectIdRef.current = newId;
          setProjectId(newId);
          router.replace(`/admin/portfolio/${newId}/edit`);
        } else {
          await authFetch(`/api/portfolio/projects/${currentId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
        }

        setSaveStatus('saved');
        return true;
      } catch (error) {
        console.error('Portfolio draft save failed:', error);
        setSaveStatus('error');
        throw error;
      }
    };

    const queuedSave = savePromiseRef.current
      .catch(() => undefined)
      .then(save);
    savePromiseRef.current = queuedSave;
    return queuedSave;
  }, [router]);

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
    const publishing = !formRef.current.isPublished;
    try {
      await persistDraft({
        isPublished: publishing,
        publishedAt: null,
      });
    } catch (_) {
      // persistDraft exposes the failure through saveStatus.
    }
  }, [persistDraft]);

  const handleSchedulePublish = useCallback(async (datetimeValue) => {
    const publishedAt = fromDateTimeLocalValue(datetimeValue);
    if (!publishedAt || new Date(publishedAt).getTime() <= Date.now()) {
      setSaveStatus('error');
      return;
    }

    try {
      await persistDraft({ isPublished: false, publishedAt });
    } catch (_) {
      // persistDraft exposes the failure through saveStatus.
    }
  }, [persistDraft]);

  const handleClearSchedule = useCallback(async () => {
    try {
      await persistDraft({ isPublished: false, publishedAt: null });
    } catch (_) {
      // persistDraft exposes the failure through saveStatus.
    }
  }, [persistDraft]);

  if (loading) {
    return (
      <main className="cms-editor-page">
        <div className="blog-empty">Loading project editor…</div>
      </main>
    );
  }

  const publicationState = getPublicationState(form);

  return (
    <main className="cms-editor-page" data-project-id={projectId || undefined}>
      <div className="cms-editor-topbar">
        <Link href="/admin/portfolio" className="cms-back-button">
          ← Portfolio
        </Link>
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
            placeholder="Project title"
            className="cms-title-input"
          />
          <BlogEditor
            content={form.content}
            onChange={(html) => updateField('content', html)}
          />
        </div>

        {sidebarOpen && (
          <aside className="cms-editor-sidebar">
            <CmsSidebarSection title="Cover image">
              <CmsCoverUpload
                coverUrl={form.coverUrl}
                onChange={(url) => updateField('coverUrl', url)}
                uploadFile={(file) => authUpload('/api/uploads', file)}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Description">
              <textarea
                value={form.summary}
                onChange={(event) => updateField('summary', event.target.value)}
                placeholder="Summary (required)"
                className="cms-input cms-textarea"
                rows={3}
              />
              <textarea
                value={form.approach}
                onChange={(event) => updateField('approach', event.target.value)}
                placeholder="Approach"
                className="cms-input cms-textarea"
                rows={3}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Details">
              <input
                type="text"
                value={form.client}
                onChange={(event) => updateField('client', event.target.value)}
                placeholder="Client"
                className="cms-input"
              />
              <input
                type="text"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                placeholder="Date (e.g. Mar 2026)"
                className="cms-input"
              />
              <PortfolioBudgetInput
                value={form.budget}
                onChange={(value) => updateField('budget', value)}
              />
              <input
                type="text"
                value={form.liveUrl}
                onChange={(event) => updateField('liveUrl', event.target.value)}
                placeholder="Live URL"
                className="cms-input"
              />
              <div className="cms-field-row">
                <input
                  type="text"
                  value={form.aspectRatio}
                  onChange={(event) => updateField('aspectRatio', event.target.value)}
                  placeholder="4/3"
                  className="cms-input"
                  style={{ maxWidth: 120 }}
                />
                <label className="cms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.showBrowserFrame}
                    onChange={(event) => updateField('showBrowserFrame', event.target.checked)}
                  />
                  Browser frame
                </label>
              </div>
            </CmsSidebarSection>

            <CmsSidebarSection title="Categories">
              <PortfolioCategoryChips
                categories={categories}
                value={form.categories}
                onChange={(value) => updateField('categories', value)}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Software" defaultOpen={false}>
              <SoftwarePicker
                value={form.software}
                onChange={(value) => updateField('software', value)}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Techniques / Media" defaultOpen={false}>
              <TechnologyPicker
                value={form.technologies}
                onChange={(value) => updateField('technologies', value)}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Results" defaultOpen={false}>
              <CmsPairEditor
                items={form.results}
                onChange={(value) => updateField('results', value)}
                keys={['value', 'label']}
                placeholders={[
                  'Value (e.g. 95%)',
                  'Label (e.g. Client satisfaction)',
                ]}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="SEO / URL" defaultOpen={false}>
              <div className="cms-slug-preview">
                <span>URL Preview</span>
                <code>/work/{form.slug || slugifyCmsValue(form.title)}</code>
              </div>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => updateField('slug', event.target.value)}
                placeholder="Custom slug"
                className="cms-input"
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
