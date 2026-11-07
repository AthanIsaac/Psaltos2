import { ADMIN_API } from '../config.js';
import { useEffect, useState, useRef } from 'react';

const API = ADMIN_API;
const AUDIO_URL = (p) => `${API}/audio/local?filePath=${encodeURIComponent(p)}`;
const PAGE_SIZE = 20;

export default function DuplicateReview() {
  const [tab, setTab] = useState('exact');
  const [exactRows, setExactRows] = useState(null);
  const [nearRows, setNearRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [saving, setSaving] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/dupes/exact`).then(r => r.json()),
      fetch(`${API}/dupes/near`).then(r => r.json()),
    ])
      .then(([exact, near]) => { setExactRows(exact); setNearRows(near); })
      .catch(() => setError('Backend not reachable.'))
      .finally(() => setLoading(false));
  }, []);

  function flash(text) { setMsg(text); setTimeout(() => setMsg(''), 2000); }

  async function updateExact(row, patch) {
    const key = `${row.sha256}__${row.drop_file_id}`;
    setSaving(p => ({ ...p, [key]: true }));
    await fetch(`${API}/dupes/exact/${encodeURIComponent(row.sha256)}/${encodeURIComponent(row.drop_file_id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setExactRows(prev => prev.map(r =>
      r.sha256 === row.sha256 && r.drop_file_id === row.drop_file_id ? { ...r, ...patch } : r
    ));
    setSaving(p => ({ ...p, [key]: false }));
    flash('Saved.');
  }

  async function updateNear(row, patch) {
    const key = `${row.file_id_a}__${row.file_id_b}`;
    setSaving(p => ({ ...p, [key]: true }));
    await fetch(`${API}/dupes/near/${encodeURIComponent(row.file_id_a)}/${encodeURIComponent(row.file_id_b)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setNearRows(prev => prev.map(r =>
      r.file_id_a === row.file_id_a && r.file_id_b === row.file_id_b ? { ...r, ...patch } : r
    ));
    setSaving(p => ({ ...p, [key]: false }));
    flash('Saved.');
  }

  if (loading) return <p className="admin-muted">Loading…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  const rows = tab === 'exact' ? exactRows : nearRows;
  const filtered = filterStatus === 'all' ? rows : rows.filter(r => r.status === filterStatus);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const pendingExact = exactRows.filter(r => r.status === 'pending').length;
  const pendingNear = nearRows.filter(r => r.status === 'pending').length;

  return (
    <div>
      <h2>Duplicate Review</h2>
      {msg && <div className="admin-toast">{msg}</div>}

      <div className="admin-tab-bar">
        <button
          className={`admin-tab${tab === 'exact' ? ' active' : ''}`}
          onClick={() => { setTab('exact'); setPage(0); }}
        >
          Exact duplicates <span className="admin-badge">{pendingExact} pending</span>
        </button>
        <button
          className={`admin-tab${tab === 'near' ? ' active' : ''}`}
          onClick={() => { setTab('near'); setPage(0); }}
        >
          Near duplicates <span className="admin-badge">{pendingNear} pending</span>
        </button>
      </div>

      <div className="admin-toolbar">
        <label>Show:&nbsp;
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}>
            <option value="pending">Pending only</option>
            <option value="confirmed">Confirmed dupes</option>
            <option value="confirmed_dupe">Confirmed dupes (near)</option>
            <option value="dismissed">Dismissed (not dupe)</option>
            <option value="not_dupe">Not dupes (near)</option>
            <option value="all">All</option>
          </select>
        </label>
        <span className="admin-muted">{filtered.length} rows</span>
      </div>

      {pageRows.length === 0 && (
        <p className="admin-muted" style={{ marginTop: 20 }}>
          {filterStatus === 'pending' ? 'No pending items — all reviewed!' : 'No items match this filter.'}
        </p>
      )}

      <div className="dupes-list">
        {tab === 'exact'
          ? pageRows.map(row => (
              <ExactDupePair
                key={`${row.sha256}__${row.drop_file_id}`}
                row={row}
                saving={!!saving[`${row.sha256}__${row.drop_file_id}`]}
                onUpdate={patch => updateExact(row, patch)}
              />
            ))
          : pageRows.map(row => (
              <NearDupePair
                key={`${row.file_id_a}__${row.file_id_b}`}
                row={row}
                saving={!!saving[`${row.file_id_a}__${row.file_id_b}`]}
                onUpdate={patch => updateNear(row, patch)}
              />
            ))
        }
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button className="admin-btn admin-btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
          <span className="admin-muted">Page {page + 1} of {totalPages}</span>
          <button className="admin-btn admin-btn-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Next →</button>
        </div>
      )}
    </div>
  );
}

function shortPath(p) {
  const parts = p.split('/');
  return parts.slice(-3).join('/');
}

function ExactDupePair({ row, saving, onUpdate }) {
  const statusColor = row.status === 'confirmed' ? '#dc2626' : row.status === 'dismissed' ? '#71717a' : '#d97706';
  return (
    <div className="dupe-pair">
      <div className="dupe-pair-header">
        <span className="dupe-similarity">EXACT</span>
        <span style={{ color: statusColor, fontWeight: 600, fontSize: 12 }}>{row.status.toUpperCase()}</span>
      </div>
      <div className="dupe-files">
        <DupeFile label="KEEP" path={row.keep_path} ext={row.keep_ext} size={row.keep_size} />
        <DupeFile label="DROP" path={row.drop_path} ext={row.drop_ext} size={row.drop_size} />
      </div>
      <div className="dupe-actions">
        <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={saving} onClick={() => onUpdate({ status: 'confirmed' })}>
          Confirm — drop duplicate
        </button>
        <button className="admin-btn admin-btn-sm" disabled={saving} onClick={() => onUpdate({ status: 'dismissed' })}>
          Dismiss — keep both
        </button>
        {row.status !== 'pending' && (
          <button className="admin-btn admin-btn-sm" disabled={saving} onClick={() => onUpdate({ status: 'pending' })}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function NearDupePair({ row, saving, onUpdate }) {
  const sim = parseFloat(row.similarity);
  const statusColor = row.status === 'confirmed_dupe' ? '#dc2626' : row.status === 'not_dupe' ? '#71717a' : '#d97706';
  return (
    <div className="dupe-pair">
      <div className="dupe-pair-header">
        <span className="dupe-similarity" style={{ background: sim > 0.9 ? '#fef2f2' : '#fffbeb', color: sim > 0.9 ? '#dc2626' : '#d97706' }}>
          {Math.round(sim * 100)}% match
        </span>
        <span className="admin-muted" style={{ fontSize: 12 }}>{row.cantor.split(' ').slice(0, 2).join(' ')}</span>
        <span style={{ color: statusColor, fontWeight: 600, fontSize: 12 }}>{row.status.replace('_', ' ').toUpperCase()}</span>
      </div>
      <div className="dupe-files">
        <DupeFile label="A" path={row.path_a} ext={row.ext_a} size={row.size_a} duration={row.duration_a} />
        <DupeFile label="B" path={row.path_b} ext={row.ext_b} size={row.size_b} duration={row.duration_b} />
      </div>
      <div className="dupe-actions">
        <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={saving} onClick={() => onUpdate({ status: 'confirmed_dupe' })}>
          Same hymn (duplicate)
        </button>
        <button className="admin-btn admin-btn-sm" disabled={saving} onClick={() => onUpdate({ status: 'not_dupe' })}>
          Different hymns
        </button>
        {row.status !== 'pending' && (
          <button className="admin-btn admin-btn-sm" disabled={saving} onClick={() => onUpdate({ status: 'pending' })}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function DupeFile({ label, path, ext, size, duration }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  const sizeKb = size ? Math.round(parseInt(size) / 1024) : null;
  const dur = duration ? Math.round(parseFloat(duration)) : null;
  const durStr = dur ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : null;

  return (
    <div className="dupe-file">
      <div className="dupe-file-label">{label}</div>
      <div className="dupe-file-info">
        <div className="dupe-file-name" title={path}>{shortPath(path)}</div>
        <div className="dupe-file-meta">
          <span className="admin-slug">{ext}</span>
          {sizeKb && <span>{sizeKb.toLocaleString()} KB</span>}
          {durStr && <span>{durStr}</span>}
        </div>
      </div>
      <button className="admin-btn admin-btn-sm dupe-play-btn" onClick={togglePlay}>
        {playing ? '⏸' : '▶'}
      </button>
      <audio
        ref={audioRef}
        src={AUDIO_URL(path)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}
