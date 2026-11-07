import { ADMIN_API } from '../config.js';
import { useEffect, useState, useCallback, useRef } from 'react';
import SeasonPicker from './SeasonPicker';

const API = ADMIN_API;
const AUDIO_URL = (p) => `${API}/audio/local?filePath=${encodeURIComponent(p)}`;

export default function SeasonAssigner() {
  const [cantors, setCantors] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [cantor, setCantor] = useState('');
  const [tab, setTab] = useState('map');
  const [editSeason, setEditSeason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/manifest/cantors`).then(r => r.json()),
      fetch(`${API}/seasons`).then(r => r.json()),
    ])
      .then(([c, s]) => {
        setCantors(c.sort((a, b) => a.name.localeCompare(b.name)));
        setSeasons(s);
        if (c.length) setCantor(c[0].name);
      })
      .catch(() => setError('Backend not reachable.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  return (
    <div>
      <div className="admin-page-header">
        <h2>Organizer</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>Cantor:</label>
          <select
            value={cantor}
            onChange={e => { setCantor(e.target.value); setTab('map'); }}
            style={{ padding: '5px 8px', border: '1px solid #d4d4d8', borderRadius: 5, fontSize: 13 }}
          >
            {cantors.map(c => (
              <option key={c.name} value={c.name}>{c.name.split(' ').slice(0, 4).join(' ')} ({c.count})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-tab-bar">
        <button className={`admin-tab${tab === 'map' ? ' active' : ''}`} onClick={() => setTab('map')}>
          Folder Map
        </button>
        <button className={`admin-tab${tab === 'unassigned' ? ' active' : ''}`} onClick={() => setTab('unassigned')}>
          Unassigned Files
        </button>
        <button className={`admin-tab${tab === 'edit' ? ' active' : ''}`} onClick={() => setTab('edit')}>
          Season Editor
        </button>
      </div>

      {tab === 'map' && cantor && (
        <FolderMapper
          cantor={cantor}
          seasons={seasons}
          onSelectSeason={s => { setEditSeason(s); setTab('edit'); }}
        />
      )}
      {tab === 'unassigned' && cantor && (
        <UnassignedFiles
          cantor={cantor}
          seasons={seasons}
          onSeasonAssigned={() => {}}
        />
      )}
      {tab === 'edit' && cantor && (
        <SeasonEditor
          cantor={cantor}
          seasons={seasons}
          initialSeason={editSeason}
        />
      )}
    </div>
  );
}

// ── Folder Mapper ─────────────────────────────────────────────────────────────

function FolderMapper({ cantor, seasons, onSelectSeason }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [msg, setMsg] = useState('');
  const [aliases, setAliases] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/manifest/folders?cantor=${encodeURIComponent(cantor)}`).then(r => r.json()),
      fetch(`${API}/aliases`).then(r => r.json()),
    ])
      .then(([data, a]) => { setFolders(data.folders || []); setAliases(a); })
      .finally(() => setLoading(false));
  }, [cantor]);

  useEffect(() => { load(); }, [load]);

  function flash(t) { setMsg(t); setTimeout(() => setMsg(''), 2000); }

  async function assignFolder(folderPath, seasonId) {
    setSaving(p => ({ ...p, [folderPath]: true }));
    await fetch(`${API}/assignments/folder`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath, seasonId: seasonId || null }),
    });
    setFolders(prev => prev.map(f => f.path === folderPath ? { ...f, season: seasonId || null } : f));
    setSaving(p => ({ ...p, [folderPath]: false }));
    flash('Saved.');
  }

  function suggestSeason(folderName) {
    for (const [alias, seasonId] of Object.entries(aliases)) {
      if (folderName.toLowerCase().includes(alias.toLowerCase())) return seasonId;
    }
    return '';
  }

  if (loading) return <p className="admin-muted">Loading folders…</p>;

  const unassignedCount = folders.filter(f => f.depth === 0 && !f.season).length;

  return (
    <div>
      {msg && <div className="admin-toast">{msg}</div>}
      <p className="admin-muted" style={{ marginBottom: 12 }}>
        Assign entire folders to seasons. Child folders inherit their parent's season unless overridden.
        {unassignedCount > 0 && <strong style={{ color: '#d97706' }}> {unassignedCount} top-level folders unassigned.</strong>}
      </p>

      <div className="folder-map-table-wrap">
        <table className="admin-table folder-map-table">
          <thead>
            <tr>
              <th>Folder</th>
              <th style={{ width: 80, textAlign: 'right' }}>Files</th>
              <th style={{ width: 320 }}>Season</th>
              <th style={{ width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {folders.map(f => {
              const folderName = f.relative.split('/').pop();
              const suggested = !f.season ? suggestSeason(folderName) : '';
              const isInherited = !f.season && folders.some(p => f.path.startsWith(p.path + '/') && p.season);
              const inheritedSeason = isInherited
                ? folders.find(p => f.path.startsWith(p.path + '/') && p.season)?.season
                : null;

              return (
                <tr key={f.path} className={f.season ? 'folder-row-assigned' : ''}>
                  <td>
                    <span style={{ marginLeft: f.depth * 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {f.depth > 0 && <span style={{ color: '#a1a1aa', fontSize: 11 }}>▸</span>}
                      <span className="folder-name">{folderName}</span>
                      {isInherited && (
                        <span className="folder-inherited-badge" title={`Inherits: ${inheritedSeason}`}>↑ inherited</span>
                      )}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: '#71717a', fontSize: 12 }}>
                    {f.assignedFiles}/{f.totalFiles}
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    <SeasonPicker
                      seasons={seasons}
                      value={f.season || (suggested && !f.season ? suggested : '') || ''}
                      placeholder={suggested ? `★ ${seasons.find(s => s.id === suggested)?.name_en || suggested} (suggested)` : 'Assign season…'}
                      onChange={id => assignFolder(f.path, id)}
                    />
                  </td>
                  <td>
                    {(f.season || isInherited) && (
                      <button className="admin-btn admin-btn-sm" onClick={() => onSelectSeason(f.season || inheritedSeason)}>
                        Edit ›
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Unassigned Files ──────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'filename', label: 'Filename A→Z' },
  { value: 'filename_desc', label: 'Filename Z→A' },
  { value: 'folder', label: 'Folder path' },
  { value: 'duration', label: 'Duration (longest first)' },
  { value: 'duration_asc', label: 'Duration (shortest first)' },
  { value: 'size', label: 'File size (largest first)' },
  { value: 'ext', label: 'Extension' },
];

function sortFiles(files, sortBy) {
  const copy = [...files];
  switch (sortBy) {
    case 'filename': return copy.sort((a, b) => a.filename.localeCompare(b.filename));
    case 'filename_desc': return copy.sort((a, b) => b.filename.localeCompare(a.filename));
    case 'folder': return copy.sort((a, b) => a.original_path.localeCompare(b.original_path));
    case 'duration': return copy.sort((a, b) => parseFloat(b.duration_s || 0) - parseFloat(a.duration_s || 0));
    case 'duration_asc': return copy.sort((a, b) => parseFloat(a.duration_s || 0) - parseFloat(b.duration_s || 0));
    case 'size': return copy.sort((a, b) => parseInt(b.size_bytes || 0) - parseInt(a.size_bytes || 0));
    case 'ext': return copy.sort((a, b) => a.ext.localeCompare(b.ext) || a.filename.localeCompare(b.filename));
    default: return copy;
  }
}

function UnassignedFiles({ cantor, seasons }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('folder');
  const [selected, setSelected] = useState(new Set());
  const [bulkSeason, setBulkSeason] = useState('');
  const [saving, setSaving] = useState({});
  const [playingId, setPlayingId] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setSelected(new Set());
    fetch(`${API}/unassigned-files?cantor=${encodeURIComponent(cantor)}`)
      .then(r => r.json())
      .then(d => setFiles(d.files || []))
      .finally(() => setLoading(false));
  }, [cantor]);

  useEffect(() => { load(); }, [load]);

  function flash(t) { setMsg(t); setTimeout(() => setMsg(''), 2500); }

  async function assignFile(fileId, seasonId) {
    setSaving(p => ({ ...p, [fileId]: true }));
    await fetch(`${API}/assignments/file`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, seasonId }),
    });
    setFiles(prev => prev.filter(f => f.file_id !== fileId));
    setSelected(prev => { const s = new Set(prev); s.delete(fileId); return s; });
    setSaving(p => ({ ...p, [fileId]: false }));
  }

  async function removeFile(fileId) {
    setSaving(p => ({ ...p, [fileId]: true }));
    await fetch(`${API}/assignments/file`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, seasonId: null, removed: true }),
    });
    setFiles(prev => prev.filter(f => f.file_id !== fileId));
    setSelected(prev => { const s = new Set(prev); s.delete(fileId); return s; });
    setSaving(p => ({ ...p, [fileId]: false }));
  }

  async function assignBulk() {
    if (!bulkSeason || selected.size === 0) return;
    const ids = [...selected];
    flash(`Assigning ${ids.length} files…`);
    for (const fileId of ids) {
      await fetch(`${API}/assignments/file`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, seasonId: bulkSeason }),
      });
    }
    setFiles(prev => prev.filter(f => !selected.has(f.file_id)));
    setSelected(new Set());
    setBulkSeason('');
    flash(`${ids.length} files assigned.`);
  }

  async function removeBulk() {
    if (selected.size === 0) return;
    if (!window.confirm(`Remove ${selected.size} files from the library?`)) return;
    const ids = [...selected];
    for (const fileId of ids) {
      await fetch(`${API}/assignments/file`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, seasonId: null, removed: true }),
      });
    }
    setFiles(prev => prev.filter(f => !selected.has(f.file_id)));
    setSelected(new Set());
    flash(`${ids.length} files removed.`);
  }

  const sorted = sortFiles(files, sortBy);
  const pageFiles = sorted;

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleAll() {
    const allIds = pageFiles.map(f => f.file_id);
    const allSelected = allIds.every(id => selected.has(id));
    setSelected(prev => {
      const s = new Set(prev);
      allIds.forEach(id => allSelected ? s.delete(id) : s.add(id));
      return s;
    });
  }

  if (loading) return <p className="admin-muted">Loading…</p>;

  return (
    <div>
      {msg && <div className="admin-toast">{msg}</div>}

      <div className="unassigned-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="admin-muted"><strong>{files.length}</strong> unassigned files</span>
          <label style={{ fontSize: 13 }}>Sort:
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); }} style={{ marginLeft: 6, padding: '3px 6px', border: '1px solid #d4d4d8', borderRadius: 5, fontSize: 13 }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        {selected.size > 0 && (
          <div className="bulk-actions">
            <span className="admin-muted">{selected.size} selected</span>
            <div style={{ width: 280 }}>
              <SeasonPicker
                seasons={seasons}
                value={bulkSeason}
                onChange={setBulkSeason}
                placeholder="Assign to season…"
              />
            </div>
            <button className="admin-btn admin-btn-sm admin-btn-primary" onClick={assignBulk} disabled={!bulkSeason}>
              Assign
            </button>
            <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={removeBulk}>
              Remove
            </button>
          </div>
        )}
      </div>

      <table className="admin-table unassigned-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>
              <input type="checkbox"
                checked={pageFiles.length > 0 && pageFiles.every(f => selected.has(f.file_id))}
                onChange={toggleAll}
              />
            </th>
            <th style={{ width: 32 }}></th>
            <th>Filename</th>
            <th>Folder context</th>
            <th style={{ width: 60 }}>Ext</th>
            <th style={{ width: 70 }}>Duration</th>
            <th style={{ width: 280 }}>Assign season</th>
            <th style={{ width: 70 }}></th>
          </tr>
        </thead>
        <tbody>
          {pageFiles.map(f => {
            const dur = f.duration_s ? parseFloat(f.duration_s) : null;
            const durStr = dur ? `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}` : '—';
            const folderCtx = f.original_path.split('/').slice(-3, -1).join('/');

            return (
              <tr key={f.file_id} className={selected.has(f.file_id) ? 'unassigned-row-selected' : ''}>
                <td>
                  <input type="checkbox" checked={selected.has(f.file_id)} onChange={() => toggleSelect(f.file_id)} />
                </td>
                <td>
                  <button className="season-play-btn" onClick={() => setPlayingId(playingId === f.file_id ? null : f.file_id)}>
                    {playingId === f.file_id ? '⏸' : '▶'}
                  </button>
                  {playingId === f.file_id && (
                    <audio src={AUDIO_URL(f.original_path)} autoPlay onEnded={() => setPlayingId(null)} style={{ display: 'none' }} />
                  )}
                </td>
                <td>
                  <span className="season-file-name">{f.filename}</span>
                </td>
                <td>
                  <span className="season-file-path" style={{ fontSize: 11, color: '#a1a1aa' }}>{folderCtx}</span>
                </td>
                <td><span className="admin-slug">{f.ext}</span></td>
                <td style={{ fontSize: 12, color: '#71717a' }}>{durStr}</td>
                <td style={{ padding: '3px 8px' }}>
                  <SeasonPicker
                    seasons={seasons}
                    value=""
                    onChange={id => assignFile(f.file_id, id)}
                    placeholder="Pick season…"
                  />
                </td>
                <td>
                  <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={!!saving[f.file_id]} onClick={() => removeFile(f.file_id)} title="Remove from library">✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Season Editor ─────────────────────────────────────────────────────────────

function SeasonEditor({ cantor, seasons, initialSeason }) {
  const [expanded, setExpanded] = useState(initialSeason || null);
  const [fileCache, setFileCache] = useState({});
  const [loadingSeasons, setLoadingSeasons] = useState({});
  const [counts, setCounts] = useState({});
  const [countsLoaded, setCountsLoaded] = useState(false);
  const [saving, setSaving] = useState({});
  const [playingId, setPlayingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [dragState, setDragState] = useState({ seasonId: null, idx: null });

  // Load counts for all seasons at once
  useEffect(() => {
    setCounts({});
    setCountsLoaded(false);
    setFileCache({});
    setExpanded(initialSeason || null);
    fetch(`${API}/season-counts?cantor=${encodeURIComponent(cantor)}`)
      .then(r => r.json())
      .then(data => { setCounts(data); setCountsLoaded(true); })
      .catch(() => { setCountsLoaded(true); });
  }, [cantor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load files if initialSeason provided
  useEffect(() => {
    if (initialSeason && fileCache[initialSeason] === undefined) {
      loadFiles(initialSeason);
    }
  }, [initialSeason]); // eslint-disable-line react-hooks/exhaustive-deps

  function flash(t) { setMsg(t); setTimeout(() => setMsg(''), 2000); }

  async function loadFiles(seasonId) {
    setLoadingSeasons(p => ({ ...p, [seasonId]: true }));
    const data = await fetch(`${API}/season-files?cantor=${encodeURIComponent(cantor)}&season=${encodeURIComponent(seasonId)}`).then(r => r.json());
    setFileCache(p => ({ ...p, [seasonId]: data }));
    setLoadingSeasons(p => ({ ...p, [seasonId]: false }));
  }

  function toggle(seasonId) {
    if (expanded === seasonId) {
      setExpanded(null);
    } else {
      setExpanded(seasonId);
      if (fileCache[seasonId] === undefined) loadFiles(seasonId);
    }
  }

  async function moveFile(fileId, fromSeason, newSeasonId) {
    setSaving(p => ({ ...p, [fileId]: true }));
    await fetch(`${API}/assignments/file`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, seasonId: newSeasonId }),
    });
    setFileCache(p => ({ ...p, [fromSeason]: (p[fromSeason] || []).filter(f => f.file_id !== fileId) }));
    setFileCache(p => { const n = { ...p }; delete n[newSeasonId]; return n; });
    setCounts(p => ({
      ...p,
      [fromSeason]: Math.max(0, (p[fromSeason] || 0) - 1),
      [newSeasonId]: (p[newSeasonId] || 0) + 1,
    }));
    setSaving(p => ({ ...p, [fileId]: false }));
    flash('Moved.');
  }

  async function removeFile(fileId, seasonId) {
    if (!window.confirm('Remove this file from the library?')) return;
    setSaving(p => ({ ...p, [fileId]: true }));
    await fetch(`${API}/assignments/file`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, seasonId: null, removed: true }),
    });
    setFileCache(p => ({ ...p, [seasonId]: (p[seasonId] || []).filter(f => f.file_id !== fileId) }));
    setCounts(p => ({ ...p, [seasonId]: Math.max(0, (p[seasonId] || 0) - 1) }));
    setSaving(p => ({ ...p, [fileId]: false }));
    flash('Removed.');
  }

  async function saveOrder(seasonId, reordered) {
    setFileCache(p => ({ ...p, [seasonId]: reordered }));
    for (let i = 0; i < reordered.length; i++) {
      await fetch(`${API}/assignments/file`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: reordered[i].file_id, seasonId, order: i }),
      });
    }
    flash('Order saved.');
  }

  function onDragStart(seasonId, idx) { setDragState({ seasonId, idx }); }
  function onDragOver(e, seasonId, idx) {
    e.preventDefault();
    if (dragState.seasonId !== seasonId || dragState.idx === idx) return;
    const files = [...(fileCache[seasonId] || [])];
    const [moved] = files.splice(dragState.idx, 1);
    files.splice(idx, 0, moved);
    setDragState({ seasonId, idx });
    setFileCache(p => ({ ...p, [seasonId]: files }));
  }
  function onDrop(seasonId) {
    if (dragState.seasonId === seasonId) saveOrder(seasonId, fileCache[seasonId] || []);
    setDragState({ seasonId: null, idx: null });
  }

  return (
    <div>
      {msg && <div className="admin-toast">{msg}</div>}
      <div className="season-accordion">
        {seasons.map(s => {
          const isOpen = expanded === s.id;
          const files = fileCache[s.id];
          const isLoading = !!loadingSeasons[s.id];
          const count = files !== undefined ? files.length : (countsLoaded ? (counts[s.id] ?? 0) : null);

          return (
            <div key={s.id} className={`season-section${isOpen ? ' open' : ''}`}>
              <div className="season-section-header" onClick={() => toggle(s.id)}>
                <span className="season-section-chevron">{isOpen ? '▾' : '▸'}</span>
                <span className="season-section-name">{s.name_en}</span>
                <span className="admin-slug" style={{ marginLeft: 6 }}>{s.id}</span>
                {count !== null && (
                  <span className="admin-badge" style={{ marginLeft: 'auto' }}>{count}</span>
                )}
              </div>

              {isOpen && (
                <div className="season-section-body">
                  {isLoading && <p className="admin-muted" style={{ padding: '6px 0', margin: 0 }}>Loading…</p>}
                  {!isLoading && files && files.length === 0 && (
                    <p className="admin-muted" style={{ padding: '6px 0', margin: 0 }}>No files assigned to this season yet.</p>
                  )}
                  {!isLoading && files && files.length > 0 && (
                    <div className="season-file-list">
                      {files.map((f, idx) => (
                        <SeasonFileRow
                          key={f.file_id}
                          file={f}
                          idx={idx}
                          seasons={seasons}
                          currentSeason={s.id}
                          playing={playingId === f.file_id}
                          saving={!!saving[f.file_id]}
                          onPlay={() => setPlayingId(playingId === f.file_id ? null : f.file_id)}
                          onMove={newSeason => moveFile(f.file_id, s.id, newSeason)}
                          onRemove={() => removeFile(f.file_id, s.id)}
                          onDragStart={() => onDragStart(s.id, idx)}
                          onDragOver={e => onDragOver(e, s.id, idx)}
                          onDrop={() => onDrop(s.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SeasonFileRow({ file, idx, seasons, currentSeason, playing, saving, onPlay, onMove, onRemove, onDragStart, onDragOver, onDrop }) {
  const [movePicker, setMovePicker] = useState(false);
  const dur = file.duration_s ? parseFloat(file.duration_s) : null;
  const durStr = dur ? `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}` : null;
  const sizeKb = file.size_bytes ? Math.round(parseInt(file.size_bytes) / 1024) : null;

  return (
    <div
      className={`season-file-row${playing ? ' playing' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="admin-drag-handle">⠿</span>
      <span className="season-file-num">{idx + 1}</span>
      <button className="season-play-btn" onClick={onPlay}>{playing ? '⏸' : '▶'}</button>

      <div className="season-file-info">
        <div className="season-file-name">{file.filename}</div>
        <div className="season-file-path">{file.original_path.split('/').slice(-3, -1).join('/')}</div>
      </div>

      <div className="season-file-meta">
        <span className="admin-slug">{file.ext}</span>
        {sizeKb && <span>{sizeKb.toLocaleString()} KB</span>}
        {durStr && <span>{durStr}</span>}
      </div>

      {movePicker ? (
        <div style={{ width: 240, flexShrink: 0 }}>
          <SeasonPicker
            seasons={seasons.filter(s => s.id !== currentSeason)}
            value=""
            onChange={id => { onMove(id); setMovePicker(false); }}
            placeholder="Move to…"
          />
        </div>
      ) : (
        <button className="admin-btn admin-btn-sm" disabled={saving} onClick={() => setMovePicker(true)}>Move…</button>
      )}

      <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={saving} onClick={onRemove} title="Remove">✕</button>

      {playing && (
        <audio src={AUDIO_URL(file.original_path)} autoPlay onEnded={onPlay} style={{ display: 'none' }} />
      )}
    </div>
  );
}
