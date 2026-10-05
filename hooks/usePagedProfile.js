'use client';

import { useEffect, useRef, useState } from 'react';
import { profilePage, profileError } from '../lib/readerProfile';

export default function usePagedProfile(path, key, identity, revision = 0) {
  const empty = { rows: [], page: 0, totalPages: 0, total: 0 };
  const [data, setData] = useState({ ...empty, path, identity, revision, refresh: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const requestRef = useRef({ path, identity, revision, refresh });
  requestRef.current = { path, identity, revision, refresh };

  useEffect(() => {
    setData({ ...empty, path, identity, revision, refresh }); setError('');
    if (!path || !identity) return undefined;
    const controller = new AbortController();
    setLoading(true);
    profilePage(path, 1, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData({ rows: result[key] || [], page: result.page,
        totalPages: result.totalPages, total: result.total, path, identity, revision, refresh });
    }).catch((failure) => { if (!controller.signal.aborted) setError(profileError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, key, identity, revision, refresh]);

  const currentData = data.path === path && data.identity === identity && data.revision === revision && data.refresh === refresh ? data : empty;
  const more = async () => {
    if (loading || !path || currentData.page >= currentData.totalPages) return;
    const requested = { path, identity, revision, refresh };
    setLoading(true); setError('');
    try {
      const result = await profilePage(path, currentData.page + 1);
      if (Object.keys(requested).every((field) => requestRef.current[field] === requested[field]))
        setData((current) => ({ rows: [...current.rows, ...(result[key] || [])], page: result.page,
          totalPages: result.totalPages, total: result.total }));
    } catch (failure) {
      if (Object.keys(requested).every((field) => requestRef.current[field] === requested[field])) setError(profileError(failure));
    } finally { setLoading(false); }
  };

  return { ...currentData, loading, error, more, retry: () => setRefresh((value) => value + 1) };
}
