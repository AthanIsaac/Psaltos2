import { ADMIN_API } from '../config.js';
import { useEffect, useState, useRef } from 'react';

const API = ADMIN_API;

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function SeasonManager() {
  const [seasons, setSeasons] = useState([]);
  const [aliases, setAliases] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSeason, setNewSeason] = useState({ id: '', name_en: '', name_coptic: '', name_ar: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const dragIdx = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/seasons`).then(r => r.json()),
      fetch(`${API}/aliases`).then(r => r.json()),
    ])
      .then(([s, a]) => { setSeasons(s); setAliases(a); })
      .catch(() => setError('Backend not reachable.'))
      .finally(() => setLoading(false));
  }, []);

  function flash(text) { setMsg(text); setTimeout(() => setMsg(''), 2500); }

  async function saveEdit(id) {
    setSaving(true);
    const res = await fetch(`${API}/seasons/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editValues),
    });
    const updated = await res.json();
    setSeasons(prev => prev.map(s => s.id === id ? updated : s));
    setEditId(null);
    setSaving(false);
    flash('Saved.');
  }

  async function deleteSeason(id) {
    if (!window.confirm(`Delete "${id}"? This cannot be undone.`)) return;
    await fetch(`${API}/seasons/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setSeasons(prev => prev.filter(s => s.id !== id));
    flash('Deleted.');
  }

  async function addSeason() {
    if (!newSeason.name_en.trim()) { flash('Name is required.'); return; }
    const id = newSeason.id.trim() || slugify(newSeason.name_en);
    const payload = { ...newSeason, id };
    setSaving(true);
    const res = await fetch(`${API}/seasons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json(); flash(e.error); setSaving(false); return; }
    const created = await res.json();
    setSeasons(prev => [...prev, created]);
    setNewSeason({ id: '', name_en: '', name_coptic: '', name_ar: '' });
    setShowAddForm(false);
    setSaving(false);
    flash('Season added.');
  }

  async function saveOrder(reordered) {
    setSeasons(reordered);
    await fetch(`${API}/seasons-order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map(s => s.id) }),
    });
  }

  function onDragStart(idx) { dragIdx.current = idx; }
  function onDragOver(e, idx) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const reordered = [...seasons];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(idx, 0, moved);
    dragIdx.current = idx;
    setSeasons(reordered);
  }
  function onDrop() {
    if (dragIdx.current !== null) saveOrder(seasons);
    dragIdx.current = null;
  }

  if (loading) return <p className="admin-muted">Loading seasons…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  return (
    <div>
      <div className="admin-page-header">
        <h2>Season Manager</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddForm(v => !v)}>
          {showAddForm ? 'Cancel' : '+ Add Season'}
        </button>
      </div>

      {msg && <div className="admin-toast">{msg}</div>}

      {showAddForm && (
        <div className="admin-card admin-add-form">
          <h3>New Season</h3>
          <div className="admin-field-row">
            <label>English name *</label>
            <input
              value={newSeason.name_en}
              onChange={e => setNewSeason(p => ({ ...p, name_en: e.target.value, id: slugify(e.target.value) }))}
              placeholder="e.g. St. Cyril Liturgy"
            />
          </div>
          <div className="admin-field-row">
            <label>Slug (auto)</label>
            <input
              value={newSeason.id}
              onChange={e => setNewSeason(p => ({ ...p, id: e.target.value }))}
              placeholder="auto-generated from name"
            />
          </div>
          <div className="admin-field-row">
            <label>Coptic name</label>
            <input
              value={newSeason.name_coptic}
              onChange={e => setNewSeason(p => ({ ...p, name_coptic: e.target.value }))}
              placeholder="Optional Coptic script"
            />
          </div>
          <div className="admin-field-row">
            <label>Arabic name</label>
            <input
              value={newSeason.name_ar}
              dir="rtl"
              onChange={e => setNewSeason(p => ({ ...p, name_ar: e.target.value }))}
              placeholder="Optional Arabic"
            />
          </div>
          <button className="admin-btn admin-btn-primary" onClick={addSeason} disabled={saving}>
            {saving ? 'Saving…' : 'Add Season'}
          </button>
        </div>
      )}

      <p className="admin-muted" style={{ marginBottom: 8 }}>
        Drag rows to reorder. Click a row to edit names inline.
      </p>

      <table className="admin-table admin-seasons-table">
        <thead>
          <tr>
            <th style={{ width: 24 }}></th>
            <th>#</th>
            <th>Slug (ID)</th>
            <th>English name</th>
            <th>Coptic</th>
            <th>Arabic</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s, idx) => (
            <tr
              key={s.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={onDrop}
              className={editId === s.id ? 'admin-row-editing' : ''}
            >
              <td className="admin-drag-handle" title="Drag to reorder">⠿</td>
              <td>{s.sort_order}</td>
              <td><code className="admin-slug">{s.id}</code></td>
              {editId === s.id ? (
                <>
                  <td><input value={editValues.name_en || ''} onChange={e => setEditValues(p => ({ ...p, name_en: e.target.value }))} /></td>
                  <td><input value={editValues.name_coptic || ''} onChange={e => setEditValues(p => ({ ...p, name_coptic: e.target.value }))} /></td>
                  <td><input value={editValues.name_ar || ''} dir="rtl" onChange={e => setEditValues(p => ({ ...p, name_ar: e.target.value }))} /></td>
                  <td>
                    <button className="admin-btn admin-btn-sm admin-btn-primary" onClick={() => saveEdit(s.id)} disabled={saving}>Save</button>
                    <button className="admin-btn admin-btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{s.name_en}</td>
                  <td className="admin-muted">{s.name_coptic || '—'}</td>
                  <td className="admin-muted" dir="rtl">{s.name_ar || '—'}</td>
                  <td>
                    <button className="admin-btn admin-btn-sm" onClick={() => { setEditId(s.id); setEditValues({ name_en: s.name_en, name_coptic: s.name_coptic, name_ar: s.name_ar }); }}>Edit</button>
                    <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => deleteSeason(s.id)}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 32 }}>Season Aliases</h3>
      <p className="admin-muted">Informal folder names that map to a canonical season. Used by the Season Assigner to auto-suggest.</p>
      <AliasEditor aliases={aliases} setAliases={setAliases} seasons={seasons} flash={flash} />
    </div>
  );
}

function AliasEditor({ aliases, setAliases, seasons, flash }) {
  const [saving, setSaving] = useState(false);
  const [newAlias, setNewAlias] = useState({ from: '', to: '' });

  async function save(updated) {
    setSaving(true);
    await fetch(`${API}/aliases`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    setSaving(false);
    flash('Aliases saved.');
  }

  function removeAlias(key) {
    const updated = { ...aliases };
    delete updated[key];
    setAliases(updated);
    save(updated);
  }

  function addAlias() {
    if (!newAlias.from.trim() || !newAlias.to.trim()) return;
    const updated = { ...aliases, [newAlias.from.trim()]: newAlias.to.trim() };
    setAliases(updated);
    setNewAlias({ from: '', to: '' });
    save(updated);
  }

  const seasonIds = seasons.map(s => s.id);

  return (
    <div className="admin-card">
      <table className="admin-table">
        <thead><tr><th>Folder name (alias)</th><th>Maps to season</th><th></th></tr></thead>
        <tbody>
          {Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b)).map(([from, to]) => (
            <tr key={from}>
              <td><code>{from}</code></td>
              <td>
                <select
                  value={to}
                  onChange={e => {
                    const updated = { ...aliases, [from]: e.target.value };
                    setAliases(updated);
                    save(updated);
                  }}
                >
                  {seasonIds.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </td>
              <td><button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => removeAlias(from)}>Remove</button></td>
            </tr>
          ))}
          <tr>
            <td><input value={newAlias.from} onChange={e => setNewAlias(p => ({ ...p, from: e.target.value }))} placeholder="Folder name" /></td>
            <td>
              <select value={newAlias.to} onChange={e => setNewAlias(p => ({ ...p, to: e.target.value }))}>
                <option value="">— select —</option>
                {seasonIds.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
            </td>
            <td><button className="admin-btn admin-btn-sm admin-btn-primary" onClick={addAlias} disabled={saving}>Add</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
