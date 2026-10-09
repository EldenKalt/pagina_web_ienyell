'use client';

export function getAuthHeaders() {
  return {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  };
}

export function getAuthUploadHeaders() {
  return {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  };
}

export function getApiBase() {
  return String(process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
}

export async function authFetch(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

  const auth = getAuthHeaders();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: auth.credentials,
    headers: {
      ...auth.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch (_) { /* ignore */ }
    throw error;
  }

  return response.json();
}

export async function authUpload(path, file) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function authFetchBlob(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

  const auth = getAuthHeaders();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: auth.credentials,
    headers: {
      ...auth.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch (_) { /* ignore */ }
    throw error;
  }

  return response.blob();
}
