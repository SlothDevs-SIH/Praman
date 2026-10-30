import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'praman_token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = getToken();
  if (t) headers.authorization = `Bearer ${t}`;
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(`/api${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && t) { setToken(null); window.location.href = '/login'; }
  if (!res.ok && res.status !== 422) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Download a file that sits behind auth (PDF / CSV).
export async function download(path, filename) {
  const res = await fetch(`/api${path}`, { headers: { authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function useApi(path, { poll = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(async (silent) => {
    if (!silent) setState((s) => ({ ...s, loading: true }));
    try { setState({ data: await api(path), error: null, loading: false }); }
    catch (e) { setState({ data: null, error: e.message, loading: false }); }
  }, [path]);
  useEffect(() => {
    load();
    if (!poll) return;
    const id = setInterval(() => load(true), poll);
    return () => clearInterval(id);
  }, [load, poll]);
  return { ...state, reload: () => load(true) };
}
