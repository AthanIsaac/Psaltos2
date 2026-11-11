// Naming queue API: give each recording its hymn (four names) and season, and keep the
// season list. Everything that changes a recording is undoable through the shared undo log.
const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../db');
const { withUndo } = require('../undo');
const { scheduleBackup } = require('../backup');
const { buildFolderIndex } = require('../folderEffective');
const { nameKey, cleanName, tokenSet, overlap } = require('../names');

const router = express.Router();
const db = getDb();

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const HYMN_FIELDS = ['english_title', 'coptic_name', 'coptic_title', 'english_name'];
const SETTABLE_STATUSES = ['junk', 'skipped', 'tape', 'multi', 'video'];

// A file name never changes, so each key is computed once
const keyCache = new Map();
const keyOf = (rec) => {
  let k = keyCache.get(rec.id);
  if (k === undefined) { k = nameKey(rec.filename); keyCache.set(rec.id, k); }
  return k;
};

// ── Shared reads ──────────────────────────────────────────────────────────────

const catchallIds = () => new Set(db.prepare('SELECT id FROM seasons WHERE is_catchall = 1').all().map(s => s.id));

const RECORDING_SELECT = `
  SELECT r.id, r.cantor_id, r.folder, r.rel_path, r.original_path, r.filename, r.ext, r.size_bytes, r.kind,
         r.status, r.hymn_id, r.season_id, r.year_text, r.version_label, r.context_note, r.notes,
         r.hint_coptic_name, r.hint_notes, r.hint_year, r.hint_tags,
         m.duration_s, m.preview_ok, m.error,
         h.english_title, h.coptic_name, h.coptic_title, h.english_name
  FROM recordings r
  LEFT JOIN media m ON m.recording_id = r.id
  LEFT JOIN hymns h ON h.id = r.hymn_id`;

/** Add what each row inherits from its folder, and whether it still needs a real season */
function decorate(rows) {
  const { byPath, effective } = buildFolderIndex(db);
  const catchall = catchallIds();
  const ownTags = new Map();
  for (const t of db.prepare('SELECT recording_id, tag_id FROM recording_tags').all()) {
    if (!ownTags.has(t.recording_id)) ownTags.set(t.recording_id, []);
    ownTags.get(t.recording_id).push(t.tag_id);
  }
  const alsoAt = new Map();
  for (const p of db.prepare('SELECT recording_id, rel_path FROM recording_paths WHERE is_primary = 0').all()) {
    if (!alsoAt.has(p.recording_id)) alsoAt.set(p.recording_id, []);
    alsoAt.get(p.recording_id).push(p.rel_path);
  }
  const effCache = new Map();
  return rows.map(r => {
    if (!effCache.has(r.folder)) effCache.set(r.folder, effective(byPath.get(r.folder)));
    const eff = effCache.get(r.folder);
    const season = r.season_id || eff.season_id || null;
    const own = ownTags.get(r.id) || [];
    return {
      ...r,
      preview_ok: !!r.preview_ok,
      season,
      season_source: r.season_id ? 'recording' : (eff.season_id ? 'folder' : null),
      needs_season: !season || catchall.has(season),
      year: r.year_text || eff.year_text || '',
      tags: own,
      inherited_tags: eff.tags,
      folder_flag: eff.flag,
      suggested_title: cleanName(r.filename),
      also_at: alsoAt.get(r.id) || [],
    };
  });
}

const recordingById = (id) => {
  const row = db.prepare(`${RECORDING_SELECT} WHERE r.id = ?`).get(id);
  return row ? decorate([row])[0] : null;
};

// ── Hymns (for autocomplete) ──────────────────────────────────────────────────

router.get('/hymns', (req, res) => {
  const hymns = db.prepare(`
    SELECT h.id, h.english_title, h.coptic_name, h.coptic_title, h.english_name,
           (SELECT COUNT(*) FROM recordings r WHERE r.hymn_id = h.id) AS count
    FROM hymns h ORDER BY h.english_title`).all();
  const seeds = db.prepare('SELECT field, text FROM suggestions ORDER BY uses DESC, text').all();
  res.json({ hymns, seeds });
});

// ── Queue ─────────────────────────────────────────────────────────────────────

/**
 *  GET /queue?folder=&recursive=1&status=open|todo|review|done|flagged|all&cantor=&needsSeason=1
 *  Recordings in track order. "open" = not named yet, or named but not confirmed.
 */
router.get('/queue', (req, res) => {
  const { folder, cantor, needsSeason, status = 'open' } = req.query;
  const recursive = req.query.recursive !== '0';
  const statusSets = {
    open: ['todo', 'review'], active: ['todo', 'review', 'done'], todo: ['todo'], review: ['review'], done: ['done'],
    flagged: ['junk', 'skipped', 'tape', 'multi', 'video'],
    all: ['todo', 'review', 'done', 'junk', 'skipped', 'tape', 'multi', 'video'],
  };
  const statuses = statusSets[status] || statusSets.open;

  const where = [`r.status IN (${statuses.map(() => '?').join(',')})`];
  const params = [...statuses];
  if (folder) {
    where.push(recursive ? '(r.folder = ? OR r.folder LIKE ?)' : 'r.folder = ?');
    params.push(folder);
    if (recursive) params.push(`${folder}/%`);
  }
  if (cantor) { where.push('r.cantor_id = ?'); params.push(cantor); }

  let rows = decorate(db.prepare(`${RECORDING_SELECT} WHERE ${where.join(' AND ')}`).all(...params));
  if (needsSeason === '1') rows = rows.filter(r => r.needs_season);
  rows.sort((a, b) => collator.compare(`${a.folder}/${a.filename}`, `${b.folder}/${b.filename}`));

  const counts = db.prepare(`SELECT status, COUNT(*) n FROM recordings WHERE status != 'merged' GROUP BY status`).all();
  res.json({ recordings: rows.slice(0, 5000), total: rows.length, counts: Object.fromEntries(counts.map(c => [c.status, c.n])) });
});

// ── Suggestions and similar files ─────────────────────────────────────────────

/** Hymns this file is probably an instance of, with the reason */
router.get('/suggest', (req, res) => {
  const rec = db.prepare('SELECT id, filename, hint_coptic_name FROM recordings WHERE id = ?').get(req.query.id);
  if (!rec) return res.status(404).json({ error: 'not found' });

  const hymns = new Map(db.prepare('SELECT * FROM hymns').all().map(h => [h.id, h]));
  const found = new Map();
  const add = (hymnId, score, reason) => {
    const h = hymns.get(hymnId);
    if (!h) return;
    const entry = found.get(hymnId) || { hymn: h, score: 0, reasons: [] };
    entry.score += score;
    if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
    found.set(hymnId, entry);
  };

  // 1. Files with the same name that already have a hymn (e.g. the same hymn from another cantor)
  const key = keyOf(rec);
  if (key) {
    const counts = new Map();
    for (const r of db.prepare('SELECT id, filename, hymn_id FROM recordings WHERE hymn_id IS NOT NULL AND id != ?').all(rec.id)) {
      if (keyOf(r) === key) counts.set(r.hymn_id, (counts.get(r.hymn_id) || 0) + 1);
    }
    for (const [id, n] of counts) add(id, 100 + Math.min(n, 10), `${n} file${n > 1 ? 's' : ''} with the same name`);
  }
  // 2. The Coptic name entered during the old import
  if (rec.hint_coptic_name) {
    for (const h of hymns.values()) if (h.coptic_name && h.coptic_name === rec.hint_coptic_name) add(h.id, 80, 'earlier Coptic name');
  }
  // 3. Words in common with a hymn's English title or name
  const mine = tokenSet(cleanName(rec.filename));
  for (const h of hymns.values()) {
    const o = Math.max(overlap(mine, tokenSet(h.english_title || '')), overlap(mine, tokenSet(h.english_name || '')));
    if (o >= 0.6) add(h.id, 40 * o, 'similar words');
  }

  const out = [...found.values()].sort((a, b) => b.score - a.score).slice(0, 6)
    .map(e => ({ ...e.hymn, reasons: e.reasons, count: db.prepare('SELECT COUNT(*) n FROM recordings WHERE hymn_id = ?').get(e.hymn.id).n }));
  res.json(out);
});

/** Not-yet-named files whose name matches this one, to apply the same hymn in one go */
router.get('/similar', (req, res) => {
  const rec = db.prepare('SELECT id, filename FROM recordings WHERE id = ?').get(req.query.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  const key = keyOf(rec);
  if (!key) return res.json([]);
  const rows = db.prepare(`${RECORDING_SELECT} WHERE r.status = 'todo' AND r.id != ?`).all(rec.id).filter(r => keyOf(r) === key);
  res.json(decorate(rows).slice(0, 60));
});

// ── Saving a recording ────────────────────────────────────────────────────────

const snapshotRecording = (id) => {
  const r = db.prepare('SELECT hymn_id, season_id, year_text, version_label, context_note, notes, status FROM recordings WHERE id = ?').get(id);
  const tags = db.prepare('SELECT tag_id FROM recording_tags WHERE recording_id = ?').all(id).map(t => t.tag_id);
  const placements = db.prepare('SELECT season_id, is_base, note FROM placements WHERE recording_id = ?').all(id);
  return [
    { sql: 'UPDATE recordings SET hymn_id=?, season_id=?, year_text=?, version_label=?, context_note=?, notes=?, status=? WHERE id=?',
      params: [r.hymn_id, r.season_id, r.year_text, r.version_label, r.context_note, r.notes, r.status, id] },
    { sql: 'DELETE FROM recording_tags WHERE recording_id=?', params: [id] },
    ...tags.map(t => ({ sql: 'INSERT INTO recording_tags (recording_id, tag_id) VALUES (?,?)', params: [id, t] })),
    { sql: 'DELETE FROM placements WHERE recording_id=?', params: [id] },
    ...placements.map(p => ({ sql: 'INSERT INTO placements (recording_id, season_id, is_base, note) VALUES (?,?,?,?)', params: [id, p.season_id, p.is_base, p.note] })),
  ];
};

const hymnCount = (id) => db.prepare('SELECT COUNT(*) n FROM recordings WHERE hymn_id = ?').get(id).n;

const bumpSuggestions = (names) => {
  const up = db.prepare(`INSERT INTO suggestions (field, text, source, uses) VALUES (?,?,'entered',1)
    ON CONFLICT(field, text) DO UPDATE SET uses = uses + 1`);
  for (const f of HYMN_FIELDS) if (names[f]) up.run(f, names[f]);
};

/**
 * Decide which hymn a save refers to, creating or updating one when needed.
 * Pushes the statements that undo any hymn change onto `inverse`.
 */
function resolveHymn(rec, body, names, inverse) {
  const hasNames = names.english_title || names.coptic_name;
  if (!hasNames) return null;

  const fillBlank = (hymn) => {
    // Fill blank fields on an existing hymn; never overwrite a name that's already there
    const updates = HYMN_FIELDS.filter(f => names[f] && !hymn[f]);
    if (!updates.length) return;
    inverse.push({ sql: `UPDATE hymns SET ${HYMN_FIELDS.map(f => `${f}=?`).join(', ')} WHERE id=?`, params: [...HYMN_FIELDS.map(f => hymn[f]), hymn.id] });
    db.prepare(`UPDATE hymns SET ${updates.map(f => `${f}=?`).join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(...updates.map(f => names[f]), hymn.id);
  };
  // Names agree when they match ignoring case and spacing; a blank on either side never conflicts
  const same = (a, b) => a.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim() === b.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  const agrees = (hymn) => HYMN_FIELDS.every(f => !names[f] || !hymn[f] || same(names[f], hymn[f]));

  // A hymn picked from the suggestions, as long as the typed names still agree with it
  const picked = body.hymn_id ? db.prepare('SELECT * FROM hymns WHERE id = ?').get(body.hymn_id) : null;
  if (picked && agrees(picked)) { fillBlank(picked); return picked.id; }

  // The same hymn typed out in full
  if (names.english_title) {
    const match = db.prepare('SELECT * FROM hymns').all().find(h => h.english_title && same(h.english_title, names.english_title) && agrees(h));
    if (match) { fillBlank(match); return match.id; }
  }
  if (names.coptic_name && !names.english_title) {
    const match = db.prepare('SELECT * FROM hymns WHERE coptic_name = ?').all(names.coptic_name).find(agrees);
    if (match) { fillBlank(match); return match.id; }
  }

  // This file's own hymn, if it is the only file using it: treat the edit as a correction
  const current = rec.hymn_id ? db.prepare('SELECT * FROM hymns WHERE id = ?').get(rec.hymn_id) : null;
  if (current && hymnCount(current.id) === 1) {
    inverse.push({ sql: `UPDATE hymns SET ${HYMN_FIELDS.map(f => `${f}=?`).join(', ')} WHERE id=?`, params: [...HYMN_FIELDS.map(f => current[f]), current.id] });
    db.prepare(`UPDATE hymns SET ${HYMN_FIELDS.map(f => `${f}=?`).join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(...HYMN_FIELDS.map(f => names[f] || ''), current.id);
    return current.id;
  }

  const info = db.prepare(`INSERT INTO hymns (${HYMN_FIELDS.join(', ')}) VALUES (?,?,?,?)`).run(...HYMN_FIELDS.map(f => names[f] || ''));
  inverse.push({ sql: 'DELETE FROM hymns WHERE id=?', params: [info.lastInsertRowid] });
  return Number(info.lastInsertRowid);
}

/**
 * PUT /recordings/:id
 * { hymn_id?, english_title, coptic_name, coptic_title, english_name, season_id, year_text,
 *   version_label, context_note, notes, tags: [ids], confirm?: bool }
 * Becomes "done" when the hymn has an English title and Coptic name and the season is a real one;
 * otherwise it's "review" (named but incomplete) or stays "todo".
 */
router.put('/recordings/:id', (req, res) => {
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(req.params.id);
  if (!rec || rec.status === 'merged') return res.status(404).json({ error: 'not found' });
  const body = req.body;
  const text = (v) => (typeof v === 'string' ? v.trim() : '');
  const names = Object.fromEntries(HYMN_FIELDS.map(f => [f, text(body[f]).normalize('NFC')]));

  if (body.season_id && !db.prepare('SELECT 1 FROM seasons WHERE id = ?').get(body.season_id)) return res.status(400).json({ error: 'unknown season' });
  const tags = Array.isArray(body.tags) ? body.tags : [];
  for (const t of tags) if (!db.prepare('SELECT 1 FROM tags WHERE id = ?').get(t)) return res.status(400).json({ error: `unknown tag ${t}` });

  const label = names.english_title || rec.filename;
  const saved = withUndo(db, `named “${label.slice(0, 40)}”`, () => {
    const inverse = snapshotRecording(rec.id);
    const hymnInverse = [];
    const hymnId = resolveHymn(rec, body, names, hymnInverse);
    inverse.push(...hymnInverse.reverse());

    const hymn = hymnId ? db.prepare('SELECT * FROM hymns WHERE id = ?').get(hymnId) : null;
    const seasonId = body.season_id || null;
    const realSeason = seasonId && !catchallIds().has(seasonId);
    const complete = !!(hymn && hymn.english_title && hymn.coptic_name && realSeason);
    const status = complete ? 'done' : (hymn ? 'review' : 'todo');

    db.prepare(`UPDATE recordings SET hymn_id=?, season_id=?, year_text=?, version_label=?, context_note=?, notes=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(hymnId, seasonId, text(body.year_text), text(body.version_label), text(body.context_note), text(body.notes), status, rec.id);

    // The base season is mirrored in placements; extra placements are added later
    db.prepare('DELETE FROM placements WHERE recording_id = ? AND is_base = 1').run(rec.id);
    if (seasonId) db.prepare('INSERT OR REPLACE INTO placements (recording_id, season_id, is_base, note) VALUES (?,?,1,?)').run(rec.id, seasonId, '');

    db.prepare('DELETE FROM recording_tags WHERE recording_id = ?').run(rec.id);
    for (const t of tags) db.prepare('INSERT OR IGNORE INTO recording_tags (recording_id, tag_id) VALUES (?,?)').run(rec.id, t);

    bumpSuggestions(names);
    return { inverse, result: hymnId };
  });

  res.json({ recording: recordingById(rec.id), hymn_id: saved });
});

/** Rename a hymn everywhere it is used (corrects a typo for every recording at once) */
router.put('/hymns/:id', (req, res) => {
  const hymn = db.prepare('SELECT * FROM hymns WHERE id = ?').get(req.params.id);
  if (!hymn) return res.status(404).json({ error: 'not found' });
  const next = Object.fromEntries(HYMN_FIELDS.map(f => [f, f in req.body ? String(req.body[f] || '').normalize('NFC').trim() : hymn[f]]));
  withUndo(db, `renamed hymn “${(hymn.english_title || hymn.coptic_name).slice(0, 40)}”`, () => {
    db.prepare(`UPDATE hymns SET ${HYMN_FIELDS.map(f => `${f}=?`).join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...HYMN_FIELDS.map(f => next[f]), hymn.id);
    bumpSuggestions(next);
    // A confirmed recording whose hymn is no longer complete goes back to review (nothing is confirmed automatically)
    const affected = db.prepare("SELECT id, season_id, status FROM recordings WHERE hymn_id = ? AND status IN ('review', 'done')").all(hymn.id);
    const inverse = [{ sql: `UPDATE hymns SET ${HYMN_FIELDS.map(f => `${f}=?`).join(', ')} WHERE id=?`, params: [...HYMN_FIELDS.map(f => hymn[f]), hymn.id] }];
    for (const r of affected) {
      inverse.push({ sql: 'UPDATE recordings SET status=? WHERE id=?', params: [r.status, r.id] });
      if (r.status === 'done' && !(next.english_title && next.coptic_name)) db.prepare("UPDATE recordings SET status='review' WHERE id=?").run(r.id);
    }
    return inverse;
  });
  res.json({ ok: true });
});

/** Mark a recording junk / skipped / tape / multi-hymn / video, or put it back in the queue */
router.post('/recordings/:id/status', (req, res) => {
  const rec = db.prepare('SELECT id, status, hymn_id FROM recordings WHERE id = ?').get(req.params.id);
  if (!rec || rec.status === 'merged') return res.status(404).json({ error: 'not found' });
  const { status } = req.body;
  if (status !== 'todo' && !SETTABLE_STATUSES.includes(status)) return res.status(400).json({ error: 'unknown status' });
  const next = status === 'todo' ? (rec.hymn_id ? 'review' : 'todo') : status;
  withUndo(db, `${status === 'todo' ? 'returned to queue' : `marked ${status}`}`, () => {
    db.prepare('UPDATE recordings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(next, rec.id);
    return [{ sql: 'UPDATE recordings SET status = ? WHERE id = ?', params: [rec.status, rec.id] }];
  });
  res.json({ recording: recordingById(rec.id) });
});

/**
 * Apply the same hymn, season, year or version to many recordings at once.
 * These are left as "review": every file still gets confirmed individually.
 */
router.post('/recordings/bulk', (req, res) => {
  const { ids, hymn_id, season_id, year_text, version_label } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids required' });
  if (hymn_id && !db.prepare('SELECT 1 FROM hymns WHERE id = ?').get(hymn_id)) return res.status(400).json({ error: 'unknown hymn' });
  if (season_id && !db.prepare('SELECT 1 FROM seasons WHERE id = ?').get(season_id)) return res.status(400).json({ error: 'unknown season' });

  const parts = [];
  if (hymn_id) parts.push('hymn');
  if ('season_id' in req.body) parts.push('season');
  if ('year_text' in req.body) parts.push('year');
  if ('version_label' in req.body) parts.push('version');
  withUndo(db, `${parts.join(', ')} on ${ids.length} files`, () => {
    const inverse = [];
    for (const id of ids) {
      const rec = db.prepare('SELECT id, status FROM recordings WHERE id = ?').get(id);
      if (!rec || rec.status === 'merged') continue;
      inverse.push(...snapshotRecording(id));
      if (hymn_id) {
        db.prepare("UPDATE recordings SET hymn_id = ?, status = 'review' WHERE id = ?").run(hymn_id, id);
      }
      if ('season_id' in req.body) {
        db.prepare('UPDATE recordings SET season_id = ? WHERE id = ?').run(season_id || null, id);
        db.prepare('DELETE FROM placements WHERE recording_id = ? AND is_base = 1').run(id);
        if (season_id) db.prepare('INSERT OR REPLACE INTO placements (recording_id, season_id, is_base, note) VALUES (?,?,1,?)').run(id, season_id, '');
        if (rec.status === 'done') db.prepare("UPDATE recordings SET status = 'review' WHERE id = ?").run(id);
      }
      if ('year_text' in req.body) db.prepare('UPDATE recordings SET year_text = ? WHERE id = ?').run((year_text || '').trim(), id);
      if ('version_label' in req.body) db.prepare('UPDATE recordings SET version_label = ? WHERE id = ?').run((version_label || '').trim(), id);
    }
    return inverse;
  });
  res.json({ ok: true });
});

// ── Seasons ───────────────────────────────────────────────────────────────────

router.get('/seasons', (req, res) => {
  res.json(db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM folders f WHERE f.season_id = s.id) AS folders,
      (SELECT COUNT(*) FROM recordings r WHERE r.season_id = s.id) AS recordings,
      (SELECT COUNT(*) FROM placements p WHERE p.season_id = s.id) AS placements
    FROM seasons s ORDER BY s.sort_order, s.id`).all().map(s => ({ ...s, is_catchall: !!s.is_catchall })));
});

router.post('/seasons', (req, res) => {
  const name = String(req.body.name_en || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID();
  let id = slug, n = 2;
  while (db.prepare('SELECT 1 FROM seasons WHERE id = ?').get(id)) id = `${slug}-${n++}`;
  const order = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM seasons').get().n;
  db.prepare('INSERT INTO seasons (id, name_en, name_coptic, name_ar, sort_order) VALUES (?,?,?,?,?)')
    .run(id, name, String(req.body.name_coptic || '').trim(), String(req.body.name_ar || '').trim(), order);
  scheduleBackup(db);
  res.json({ id });
});

router.put('/seasons/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  const name = 'name_en' in req.body ? String(req.body.name_en).trim() : s.name_en;
  if (!name) return res.status(400).json({ error: 'name required' });
  db.prepare('UPDATE seasons SET name_en=?, name_coptic=?, name_ar=?, is_catchall=? WHERE id=?').run(
    name,
    'name_coptic' in req.body ? String(req.body.name_coptic).trim() : s.name_coptic,
    'name_ar' in req.body ? String(req.body.name_ar).trim() : s.name_ar,
    'is_catchall' in req.body ? (req.body.is_catchall ? 1 : 0) : s.is_catchall,
    s.id);
  scheduleBackup(db);
  res.json({ ok: true });
});

router.put('/seasons-order', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids required' });
  db.transaction(() => ids.forEach((id, i) => db.prepare('UPDATE seasons SET sort_order = ? WHERE id = ?').run(i + 1, id)))();
  scheduleBackup(db);
  res.json({ ok: true });
});

router.delete('/seasons/:id', (req, res) => {
  const used = db.prepare(`SELECT
      (SELECT COUNT(*) FROM folders WHERE season_id = @id) +
      (SELECT COUNT(*) FROM recordings WHERE season_id = @id) +
      (SELECT COUNT(*) FROM placements WHERE season_id = @id) AS n`).get({ id: req.params.id }).n;
  if (used) return res.status(409).json({ error: `In use by ${used} folder/file assignments — move those first.` });
  db.prepare('DELETE FROM seasons WHERE id = ?').run(req.params.id);
  scheduleBackup(db);
  res.json({ ok: true });
});

module.exports = router;
