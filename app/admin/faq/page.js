'use client';

import { useEffect, useMemo, useState } from 'react';

import { useServiceCatalog } from '../../../context/ServiceCatalogContext';
import { authFetch } from '../../../lib/authHelper';

const EMPTY_FORM = { question: '', answer: '', category: 'all-services', order: 0, isActive: true };

function scopeLabel(scopes, category) {
  return scopes.find((scope) => scope.value === category)?.label || category || 'All service pages';
}

function toForm(item, scopes) {
  return {
    question: item?.question || '',
    answer: item?.answer || '',
    category: scopes.some((scope) => scope.value === item?.category) ? item.category : 'all-services',
    order: Number.isInteger(item?.order) ? item.order : 0,
    isActive: item?.isActive ?? true,
  };
}

export default function FaqAdminPage() {
  const { catalog } = useServiceCatalog();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const scopes = useMemo(() => [
    { value: 'all-services', label: 'All service pages' },
    ...(catalog?.families || []).map((family) => ({ value: family.id, label: family.title })),
  ], [catalog]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => (a.order - b.order) || (a.id - b.id)), [items]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/faq/admin');
      setItems(Array.isArray(response?.items) ? response.items : []);
    } catch (requestError) {
      setError(requestError?.data?.error || 'FAQs could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditing('new');
    setForm(EMPTY_FORM);
    setError('');
  }

  function startEdit(item) {
    setEditing(item);
    setForm(toForm(item, scopes));
    setError('');
  }

  function closeEditor() {
    if (saving) return;
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function save(event) {
    event.preventDefault();
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category,
      order: Number.parseInt(form.order, 10) || 0,
      isActive: Boolean(form.isActive),
    };
    if (!payload.question || !payload.answer) {
      setError('Write both the question and its answer before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = editing === 'new'
        ? await authFetch('/api/faq', { method: 'POST', body: JSON.stringify(payload) })
        : await authFetch(`/api/faq/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setItems((current) => editing === 'new' ? [...current, response] : current.map((item) => item.id === response.id ? response : item));
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (requestError) {
      setError(requestError?.data?.error || 'The FAQ could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item) {
    setWorkingId(item.id);
    setError('');
    try {
      const response = await authFetch(`/api/faq/${item.id}/toggle`, { method: 'PATCH' });
      setItems((current) => current.map((entry) => entry.id === response.id ? response : entry));
    } catch (requestError) {
      setError(requestError?.data?.error || 'The FAQ status could not be changed.');
    } finally {
      setWorkingId(null);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.question}”? This cannot be undone.`)) return;
    setWorkingId(item.id);
    setError('');
    try {
      await authFetch(`/api/faq/${item.id}`, { method: 'DELETE' });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (requestError) {
      setError(requestError?.data?.error || 'The FAQ could not be deleted.');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="ienyell-admin-page ienyell-faq-admin-page">
      <header className="ienyell-admin-page-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Service content</p>
          <h1>Keep every answer useful.</h1>
          <p>Create FAQs once, choose where they appear and keep the service pages current without editing their code.</p>
        </div>
        <button type="button" className="ienyell-admin-refresh" onClick={startCreate}>New FAQ</button>
      </header>
      {error ? <p className="ienyell-admin-notice is-error" role="alert">{error}</p> : null}
      <p className="ienyell-faq-admin-guide">“All service pages” appears on every active service page. A page-specific FAQ only appears in the selected service.</p>

      {loading ? <div className="ienyell-admin-empty">Loading FAQs…</div> : (
        <div className="ienyell-admin-table-wrap">
          <table className="ienyell-admin-table ienyell-faq-admin-table">
            <thead><tr><th>Question</th><th>Appears in</th><th>Order</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>{sortedItems.length ? sortedItems.map((item) => <tr key={item.id}>
              <td><strong>{item.question}</strong><span>{item.answer}</span></td>
              <td>{scopeLabel(scopes, item.category)}</td>
              <td>{item.order}</td>
              <td><span className={`ienyell-faq-status${item.isActive ? ' is-active' : ''}`}>{item.isActive ? 'Visible' : 'Hidden'}</span></td>
              <td><div className="ienyell-faq-admin-actions"><button type="button" onClick={() => startEdit(item)}>Edit</button><button type="button" disabled={workingId === item.id} onClick={() => toggle(item)}>{item.isActive ? 'Hide' : 'Show'}</button><button type="button" className="is-danger" disabled={workingId === item.id} onClick={() => remove(item)}>Delete</button></div></td>
            </tr>) : <tr><td colSpan="5">No FAQs exist yet. Create the first one for these service pages.</td></tr>}</tbody>
          </table>
        </div>
      )}

      {editing ? <div className="ienyell-faq-modal-backdrop" role="presentation" onMouseDown={closeEditor}>
        <form className="ienyell-faq-modal" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
          <div className="ienyell-faq-modal-heading"><div><p className="ienyell-admin-eyebrow">{editing === 'new' ? 'New FAQ' : 'Edit FAQ'}</p><h2>{editing === 'new' ? 'Add a helpful answer' : 'Refine this answer'}</h2></div><button type="button" aria-label="Close" onClick={closeEditor}>×</button></div>
          <label className="ienyell-calculator-field"><span>Question</span><input value={form.question} onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))} required /></label>
          <label className="ienyell-calculator-field"><span>Answer</span><textarea rows="6" value={form.answer} onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))} required /></label>
          <div className="ienyell-faq-modal-grid"><label className="ienyell-calculator-field"><span>Appears in</span><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{scopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}</select></label><label className="ienyell-calculator-field"><span>Order</span><input type="number" value={form.order} onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))} /></label></div>
          <label className="ienyell-calculator-switch"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /><span aria-hidden="true" /><span>Visible to visitors</span></label>
          <div className="ienyell-faq-modal-actions"><button type="button" onClick={closeEditor} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save FAQ'}</button></div>
        </form>
      </div> : null}
    </section>
  );
}
