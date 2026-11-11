import { LIBRARY_API } from '../config.js';

/** JSON request to the library API; throws an Error carrying the server's message */
export async function api(path, options) {
  const res = await fetch(`${LIBRARY_API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

export const post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data || {}) });
export const put = (path, data) => api(path, { method: 'PUT', body: JSON.stringify(data || {}) });

export const formatDuration = (s) => {
  if (!s) return '';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
