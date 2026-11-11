import { useCallback, useEffect, useState } from 'react';
import { LIBRARY_API } from '../config.js';

async function api(path, options) {
  const res = await fetch(`${LIBRARY_API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

export default function Seasons() {
  const [seasons, setSeasons] = useState(null);
  const [message, setMessage] = useState(null);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => api('/seasons').then(setSeasons).catch(e => setMessage(`Could not load seasons: ${e.message}`)), []);
  useEffect(() => { load(); }, [load]);

  const flash = (text) => { setMessage(text); setTimeout(() => setMessage(null), 3000); };

  async function save(season, patch) {
    setSeasons(prev => prev.map(s => (s.id === season.id ? { ...s, ...patch } : s)));
    try { await api(`/seasons/${season.id}`, { method: 'PUT', body: JSON.stringify(patch) }); }
    catch (e) { flash(`Save failed: ${e.message}`); load(); }
  }

  async function move(index, delta) {
    const next = [...seasons];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSeasons(next);
    await api('/seasons-order', { method: 'PUT', body: JSON.stringify({ ids: next.map(s => s.id) }) }).catch(() => load());
  }

  async function remove(season) {
    if (!window.confirm(`Delete “${season.name_en}”?`)) return;
    try { await api(`/seasons/${season.id}`, { method: 'DELETE' }); load(); }
    catch (e) { flash(e.message); }
  }

  async function add(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try { await api('/seasons', { method: 'POST', body: JSON.stringify({ name_en: newName }) }); setNewName(''); load(); }
    catch (err) { flash(err.message); }
  }

  if (!seasons) return <p className="admin-muted">{message || 'Loading…'}</p>;

  return (
    <div className="seasons-page">
      <h2>Seasons</h2>
      <p className="admin-muted">
        Changes save as you type. A <b>catch-all</b> season (like MISC) marks files that still need a real season:
        they stay in the naming queue until you move them.
      </p>
      {message && <div className="admin-error">{message}</div>}

      <table className="seasons-table">
        <thead>
          <tr><th></th><th>English name</th><th>Coptic</th><th>Arabic</th><th title="Files here still need a real season">Catch-all</th><th>Folders</th><th>Files</th><th></th></tr>
        </thead>
        <tbody>
          {seasons.map((s, i) => (
            <tr key={s.id}>
              <td className="season-order">
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === seasons.length - 1} aria-label="Move down">▼</button>
              </td>
              <td><input defaultValue={s.name_en} onBlur={e => e.target.value.trim() && e.target.value !== s.name_en && save(s, { name_en: e.target.value })} /><div className="season-id">{s.id}</div></td>
              <td><input defaultValue={s.name_coptic} onBlur={e => e.target.value !== s.name_coptic && save(s, { name_coptic: e.target.value })} /></td>
              <td><input dir="auto" defaultValue={s.name_ar} onBlur={e => e.target.value !== s.name_ar && save(s, { name_ar: e.target.value })} /></td>
              <td className="center"><input type="checkbox" checked={s.is_catchall} onChange={e => save(s, { is_catchall: e.target.checked })} /></td>
              <td className="center">{s.folders || ''}</td>
              <td className="center">{s.recordings + s.placements || ''}</td>
              <td><button className="btn-small" onClick={() => remove(s)} disabled={s.folders + s.recordings + s.placements > 0} title={s.folders + s.recordings + s.placements > 0 ? 'In use' : 'Delete'}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="seasons-add" onSubmit={add}>
        <input placeholder="New season name" value={newName} onChange={e => setNewName(e.target.value)} />
        <button className="btn" type="submit">Add season</button>
      </form>
    </div>
  );
}
