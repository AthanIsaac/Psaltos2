import { useCallback, useEffect, useRef, useState } from 'react';
import { LIBRARY_API } from '../config.js';
import { api, post, formatDuration } from './libraryApi.js';
import './triage.css';
import './duplicates.css';

const FILTERS = [['confident', 'Confident'], ['review', 'Needs a look'], ['all', 'All']];

export default function Duplicates() {
  const [filter, setFilter] = useState('confident');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [keepers, setKeepers] = useState({});   // group id -> chosen keeper
  const [playing, setPlaying] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef(null);
  const rowRefs = useRef(new Map());

  const showToast = useCallback((m) => {
    setToast(m);
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    try {
      setData(await api(`/dupes/groups?filter=${filter}`));
      setError(null);
    } catch (e) { setError(`Could not load duplicates (${e.message}). Restart the backend and reload.`); }
  }, [filter]);
  useEffect(() => { load(); setCursor(0); }, [load]);

  const groups = data?.groups || [];
  const keeperOf = (g) => keepers[g.id] || g.keeper_id;

  const play = useCallback((id) => {
    const el = audioRef.current;
    if (!el) return;
    if (playing === id) { el.pause(); setPlaying(null); return; }
    el.src = `${LIBRARY_API}/audio/${id}`;
    el.play().catch(() => {});
    setPlaying(id);
  }, [playing]);

  const removeGroup = useCallback((g) => {
    setData(prev => ({ ...prev, groups: prev.groups.filter(x => x.id !== g.id), counts: { ...prev.counts, all: prev.counts.all - 1 } }));
  }, []);

  const merge = useCallback(async (g) => {
    if (!g || busy) return;
    const keeper = keeperOf(g);
    setBusy(true);
    try {
      await post('/dupes/merge', { keeper_id: keeper, drop_ids: g.files.filter(f => f.id !== keeper).map(f => f.id) });
      removeGroup(g);
      showToast(`Merged ${g.files.length - 1} copy${g.files.length > 2 ? ' copies' : ''} — ⌘Z to undo`);
    } catch (e) { showToast(`Failed: ${e.message}`); }
    setBusy(false);
  }, [busy, keepers]); // eslint-disable-line react-hooks/exhaustive-deps

  const different = useCallback(async (g) => {
    if (!g || busy) return;
    setBusy(true);
    try {
      await post('/dupes/different', { ids: g.files.map(f => f.id) });
      removeGroup(g);
      showToast('Marked as different recordings — ⌘Z to undo');
    } catch (e) { showToast(`Failed: ${e.message}`); }
    setBusy(false);
  }, [busy, removeGroup, showToast]);

  const autoMerge = async () => {
    const n = data?.counts.confident || 0;
    if (!n || !window.confirm(`Merge ${n} confident groups, keeping the suggested copy in each? Nothing is deleted, and ⌘Z undoes it.`)) return;
    setBusy(true);
    try {
      const r = await post('/dupes/auto-merge');
      showToast(`Merged ${r.merged} duplicate files in ${r.groups} groups — ⌘Z to undo`);
      await load();
    } catch (e) { showToast(`Failed: ${e.message}`); }
    setBusy(false);
  };

  const undo = useCallback(async () => {
    try { const r = await post('/undo'); showToast(r.label ? `Undid: ${r.label}` : 'Nothing to undo'); await load(); }
    catch (e) { showToast(`Failed: ${e.message}`); }
  }, [load, showToast]);

  useEffect(() => { rowRefs.current.get(cursor)?.scrollIntoView({ block: 'nearest' }); }, [cursor]);

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const g = groups[Math.min(cursor, groups.length - 1)];
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(groups.length - 1, c + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); merge(g); }
      else if (e.key === 'n') { e.preventDefault(); different(g); }
      else if (e.key === ' ') { e.preventDefault(); if (g) play(keeperOf(g)); }
      else if (/^[1-6]$/.test(e.key) && g?.files[Number(e.key) - 1]) {
        e.preventDefault();
        setKeepers(k => ({ ...k, [g.id]: g.files[Number(e.key) - 1].id }));
        play(g.files[Number(e.key) - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [groups, cursor, merge, different, play, undo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="admin-error">{error}</div>;
  if (!data) return <p className="admin-muted">Loading…</p>;

  return (
    <div className="dupes">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />
      <h2>Audio duplicates</h2>
      <p className="admin-muted">
        These files <b>sound identical</b> (compared by audio fingerprint, not by name). Merging keeps one copy to name;
        the others are hidden from the naming queue but their locations stay on the kept file, and the season each was
        filed under is kept as an extra placement. No file is changed or deleted.
      </p>

      <div className="dupes-bar">
        <div className="naming-pills">
          {FILTERS.map(([id, label]) => (
            <button key={id} className={`pill${filter === id ? ' active' : ''}`} onClick={() => setFilter(id)}>
              {label} {id === 'all' ? data.counts.all : data.counts[id]}
            </button>
          ))}
        </div>
        <span className="muted">{data.counts.redundant} redundant files in {data.counts.all} groups</span>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={autoMerge} disabled={busy || !data.counts.confident}>
          Merge all {data.counts.confident} confident groups
        </button>
        <button className="btn" onClick={undo}>Undo</button>
      </div>
      <p className="dupes-keys">↑↓ group · <kbd>Enter</kbd> merge keeping the selected copy · <kbd>1</kbd>–<kbd>6</kbd> choose the copy to keep (and play it) · <kbd>Space</kbd> play · <kbd>N</kbd> not the same · <kbd>⌘Z</kbd> undo</p>

      <div className="dupes-list">
        {groups.map((g, gi) => {
          const keeper = keeperOf(g);
          return (
            <section key={g.id} ref={el => { if (el) rowRefs.current.set(gi, el); }} className={`dupe-group${gi === cursor ? ' current' : ''}`} onClick={() => setCursor(gi)}>
              <header>
                <span>{g.files.length} copies · {Math.round((1 - g.max_ber) * 100)}% match{g.length_spread > 0.002 ? ` · lengths differ ${(g.length_spread * 100).toFixed(1)}%` : ''}</span>
                {!g.confident && <span className="badge">check</span>}
                <span className="dupe-actions">
                  <button className="btn-small" onClick={() => different(g)} disabled={busy}>Not the same (N)</button>
                  <button className="btn btn-primary" onClick={() => merge(g)} disabled={busy}>Merge, keep selected ↵</button>
                </span>
              </header>
              {g.files.map((f, i) => (
                <div key={f.id} className={`dupe-file${f.id === keeper ? ' keeper' : ''}`}>
                  <label className="dupe-pick">
                    <input type="radio" name={`keeper-${g.id}`} checked={f.id === keeper} onChange={() => setKeepers(k => ({ ...k, [g.id]: f.id }))} />
                    <kbd>{i + 1}</kbd>
                  </label>
                  <button className="btn-small" onClick={() => play(f.id)} disabled={!f.preview_ok}>{playing === f.id ? '❚❚' : '▶'}</button>
                  <span className="dupe-name" title={f.original_path}>
                    <b>{f.filename}</b>
                    <small>{f.rel_path.split('/').slice(1, -1).join(' / ')}</small>
                  </span>
                  <span className="dupe-meta">{f.ext.replace('.', '')} · {Math.round(f.size_bytes / 1e5) / 10} MB{f.kbps ? ` · ${f.kbps} kbps` : ''}</span>
                  <span className="dupe-meta">{formatDuration(f.duration_s)}</span>
                  <span>{f.season_name ? <span className={`chip ${f.needs_season ? 'chip-warn' : 'chip-season'}`}>{f.season_name}</span> : <span className="chip chip-warn">no season</span>}</span>
                  {['tape', 'video', 'review', 'done'].includes(f.status) && <span className="badge">{f.status}</span>}
                  {f.id === keeper && <span className="badge keep-badge">keep</span>}
                </div>
              ))}
            </section>
          );
        })}
        {!groups.length && <p className="admin-muted">Nothing left in this view. 🎉</p>}
      </div>

      {toast && <div className="triage-toast" role="status">{toast}</div>}
    </div>
  );
}
