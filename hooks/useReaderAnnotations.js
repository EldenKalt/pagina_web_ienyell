'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as notesApi from '../lib/notes';
import * as highlightsApi from '../lib/readerHighlights';

const EMPTY = { notes: [], highlights: [], loading: false, error: '' };

export default function useReaderAnnotations(slug, notesEnabled) {
  const { user, isLoading } = useAuth();
  const scope = `${slug}:${user?.id || 'guest'}:${notesEnabled}`;
  const active = useRef(scope);
  active.current = scope;
  const version = useRef(0);
  const [state, setState] = useState({ scope, notes: [], highlights: [], loading: false, error: '' });
  const [publicRevision, setPublicRevision] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const generation = ++version.current;
    setState({ scope, notes: [], highlights: [], loading: Boolean(user), error: '' });
    if (!user || isLoading) return () => controller.abort();
    Promise.all([
      notesEnabled ? notesApi.fetchNotes(slug, controller.signal) : { notes: [] },
      highlightsApi.fetchHighlights(slug, controller.signal),
    ]).then(([notes, highlights]) => {
      if (active.current === scope && generation === version.current && !controller.signal.aborted) {
        setState({ scope, notes: notes.notes, highlights: highlights.highlights, loading: false, error: '' });
      }
    }).catch((error) => {
      if (!controller.signal.aborted && active.current === scope && generation === version.current) {
        setState({ scope, notes: [], highlights: [], loading: false, error: notesApi.annotationError(error) });
      }
    });
    return () => controller.abort();
  }, [scope, user?.id, isLoading, slug, notesEnabled, reloadToken]);
  const mutate = async (operation, apply) => {
    if (!user || isLoading) throw new Error('Sign in before saving.');
    const result = await operation();
    if (active.current !== scope) return null;
    ++version.current;
    setState((current) => ({ ...current, ...apply(current, result), scope, loading: false, error: '' }));
    return result;
  };
  const visible = state.scope === scope ? state : EMPTY;
  return {
    ...visible, scope, publicRevision,
    reload: () => setReloadToken((value) => value + 1),
    saveNote: async (id, payload, key) => {
      const result = await mutate(() => id ? notesApi.updateNote(id, payload) : notesApi.createNote(slug, payload, key),
        (current, data) => ({ notes: id ? current.notes.map((n) => n.id === id ? data.note : n) : [data.note, ...current.notes.filter((n) => n.id !== data.note.id)] }));
      if (result) setPublicRevision((value) => value + 1);
      return result;
    },
    removeNote: async (id) => {
      const result = await mutate(() => notesApi.deleteNote(id), (current) => ({ notes: current.notes.filter((n) => n.id !== id) }));
      if (result) setPublicRevision((value) => value + 1);
    },
    addHighlight: (selector) => mutate(() => highlightsApi.createHighlight(slug, selector), (current, data) => ({ highlights: [...current.highlights.filter((h) => h.id !== data.highlight.id), data.highlight] })),
    removeHighlight: (id) => mutate(() => highlightsApi.deleteHighlight(slug, id), (current) => ({ highlights: current.highlights.filter((h) => h.id !== id) })),
  };
}
