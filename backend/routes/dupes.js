// Duplicate recordings found by comparing audio (see scripts/analyze-audio-dupes.js).
// Merging never touches files: the extra copy is marked "merged", its location is kept on the
// recording it was merged into, and the season it was filed under is kept as an extra placement.
const express = require('express');
const { getDb } = require('../db');
const { withUndo } = require('../undo');
const { buildFolderIndex } = require('../folderEffective');

const router = express.Router();
const db = getDb();

const MAX_BER = 0.12;           // a pair must be at least this close to be grouped
const CONFIDENT_BER = 0.10;     // every pair in a "confident" group is at least this close
const CONFIDENT_SPREAD = 0.01;  // ... and the lengths agree within 1%
const LOSSLESS = new Set(['.wav', '.flac', '.aiff', '.aif']);
const GENERIC_NAME = /^(track\s*)?\d+(\s*\(\d+\))?$/i;

// ── Groups ────────────────────────────────────────────────────────────────────

function loadGroups() {
  const pairs = db.prepare(`
    SELECT m.a_id, m.b_id, m.ber FROM audio_matches m
    JOIN recordings a ON a.id = m.a_id JOIN recordings b ON b.id = m.b_id
    WHERE m.kind = 'same' AND m.ber < ? AND m.decision IS NULL
      AND a.status != 'merged' AND b.status != 'merged'`).all(MAX_BER);

  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (const p of pairs) {
    for (const id of [p.a_id, p.b_id]) if (!parent.has(id)) parent.set(id, id);
    parent.set(find(p.a_id), find(p.b_id));
  }
  const members = new Map();
  for (const id of parent.keys()) {
    const root = find(id);
    if (!members.has(root)) members.set(root, []);
    members.get(root).push(id);
  }
  const maxBer = new Map();
  for (const p of pairs) {
    const root = find(p.a_id);
    maxBer.set(root, Math.max(maxBer.get(root) || 0, p.ber));
  }

  const { byPath, effective } = buildFolderIndex(db);
  const catchall = new Set(db.prepare('SELECT id FROM seasons WHERE is_catchall = 1').all().map(s => s.id));
  const seasonName = Object.fromEntries(db.prepare('SELECT id, name_en FROM seasons').all().map(s => [s.id, s.name_en]));
  const get = db.prepare(`
    SELECT r.id, r.filename, r.rel_path, r.original_path, r.folder, r.cantor_id, r.ext, r.size_bytes, r.status, r.kind,
           r.season_id, r.hymn_id, m.duration_s, m.preview_ok
    FROM recordings r LEFT JOIN media m ON m.recording_id = r.id WHERE r.id = ?`);

  const groups = [];
  for (const [root, ids] of members) {
    if (ids.length < 2) continue;
    const files = ids.map(id => {
      const r = get.get(id);
      const eff = effective(byPath.get(r.folder));
      const season = r.season_id || eff.season_id || null;
      return {
        ...r, preview_ok: !!r.preview_ok, season,
        season_name: season ? seasonName[season] : null,
        needs_season: !season || catchall.has(season),
        kbps: r.duration_s ? Math.round((r.size_bytes * 8) / r.duration_s / 1000) : null,
      };
    });
    const durations = files.map(f => f.duration_s || 0);
    const spread = (Math.max(...durations) - Math.min(...durations)) / Math.max(1, Math.max(...durations));
    const ber = maxBer.get(root) || 0;
    const hasVideo = files.some(f => f.kind === 'video');
    const named = files.filter(f => ['review', 'done'].includes(f.status)).length;
    scoreKeepers(files);
    groups.push({
      id: files.map(f => f.id).sort()[0],
      files: files.sort((a, b) => b.keeper_score - a.keeper_score),
      keeper_id: files.reduce((best, f) => (f.keeper_score > best.keeper_score ? f : best)).id,
      max_ber: ber,
      length_spread: spread,
      confident: ber < CONFIDENT_BER && spread <= CONFIDENT_SPREAD && !hasVideo && named <= 1 && files.length <= 6,
    });
  }
  return groups.sort((a, b) => b.files.length - a.files.length || a.max_ber - b.max_ber);
}

/** Which copy to keep: one you've already worked on, then real information (season, a real name), then quality */
function scoreKeepers(files) {
  for (const f of files) {
    let s = 0;
    s += { done: 100, review: 90, todo: 30, tape: 0, skipped: 5, junk: 0, multi: 0, video: 0 }[f.status] ?? 0;
    if (f.season && !f.needs_season) s += 20;
    if (!GENERIC_NAME.test(f.filename.replace(/\.[a-z0-9]{2,4}$/i, '').trim())) s += 10;
    if (LOSSLESS.has(f.ext)) s += 25; else s += Math.min(15, (f.kbps || 0) / 20);
    f.keeper_score = s;
  }
}

router.get('/dupes/groups', (req, res) => {
  const { filter = 'all', cantor } = req.query;
  let groups = loadGroups();
  if (cantor) groups = groups.filter(g => g.files[0].cantor_id === cantor);
  const counts = {
    all: groups.length,
    confident: groups.filter(g => g.confident).length,
    review: groups.filter(g => !g.confident).length,
    redundant: groups.reduce((n, g) => n + g.files.length - 1, 0),
  };
  if (filter === 'confident') groups = groups.filter(g => g.confident);
  else if (filter === 'review') groups = groups.filter(g => !g.confident);
  res.json({ groups: groups.slice(0, 400), counts });
});

// ── Merging ───────────────────────────────────────────────────────────────────

function mergeInto(keeperId, dropIds, effectiveFor) {
  const inverse = [];
  const keeper = db.prepare('SELECT * FROM recordings WHERE id = ?').get(keeperId);
  const keeperEff = effectiveFor(keeper);
  const keeperPaths = new Set(db.prepare('SELECT rel_path FROM recording_paths WHERE recording_id = ?').all(keeperId).map(p => p.rel_path));
  const hasPlacement = db.prepare('SELECT 1 FROM placements WHERE recording_id = ? AND season_id = ?');
  const catchall = new Set(db.prepare('SELECT id FROM seasons WHERE is_catchall = 1').all().map(s => s.id));

  for (const dropId of dropIds) {
    if (dropId === keeperId) continue;
    const drop = db.prepare('SELECT * FROM recordings WHERE id = ?').get(dropId);
    if (!drop || drop.status === 'merged') continue;
    const dropSeason = drop.season_id || effectiveFor(drop).season_id;

    inverse.push({ sql: 'UPDATE recordings SET status=?, merged_into=? WHERE id=?', params: [drop.status, drop.merged_into, dropId] });
    db.prepare("UPDATE recordings SET status = 'merged', merged_into = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(keeperId, dropId);

    // Anything already merged into the dropped copy now belongs to the keeper
    for (const child of db.prepare('SELECT id FROM recordings WHERE merged_into = ?').all(dropId)) {
      if (child.id === dropId) continue;
      inverse.push({ sql: 'UPDATE recordings SET merged_into=? WHERE id=?', params: [dropId, child.id] });
      db.prepare('UPDATE recordings SET merged_into = ? WHERE id = ?').run(keeperId, child.id);
    }

    // Keep every known location of the dropped copy on the keeper
    for (const p of db.prepare('SELECT rel_path, original_path FROM recording_paths WHERE recording_id = ?').all(dropId)) {
      if (keeperPaths.has(p.rel_path)) continue;
      keeperPaths.add(p.rel_path);
      db.prepare('INSERT OR IGNORE INTO recording_paths (recording_id, rel_path, original_path, is_primary) VALUES (?,?,?,0)').run(keeperId, p.rel_path, p.original_path);
      inverse.push({ sql: 'DELETE FROM recording_paths WHERE recording_id=? AND rel_path=?', params: [keeperId, p.rel_path] });
    }

    // The season the other copy was filed under becomes an extra placement on the keeper
    if (dropSeason && !catchall.has(dropSeason) && dropSeason !== keeperEff.season_id && !hasPlacement.get(keeperId, dropSeason)) {
      const folderName = drop.folder.split('/').pop();
      db.prepare("INSERT INTO placements (recording_id, season_id, is_base, note) VALUES (?,?,0,?)").run(keeperId, dropSeason, `also filed under “${folderName}”`);
      inverse.push({ sql: 'DELETE FROM placements WHERE recording_id=? AND season_id=?', params: [keeperId, dropSeason] });
    }

    // Earlier notes from the old import help when naming
    for (const col of ['hint_coptic_name', 'hint_notes']) {
      const current = db.prepare(`SELECT ${col} v FROM recordings WHERE id = ?`).get(keeperId).v;
      if (!current && drop[col]) {
        db.prepare(`UPDATE recordings SET ${col} = ? WHERE id = ?`).run(drop[col], keeperId);
        inverse.push({ sql: `UPDATE recordings SET ${col}=? WHERE id=?`, params: [current, keeperId] });
      }
    }
  }
  return inverse;
}

function effectiveForFactory() {
  const { byPath, effective } = buildFolderIndex(db);
  return (rec) => effective(byPath.get(rec.folder));
}

/** Merge one group: everything except the chosen keeper becomes a "merged" copy */
router.post('/dupes/merge', (req, res) => {
  const { keeper_id, drop_ids } = req.body;
  if (!keeper_id || !Array.isArray(drop_ids) || !drop_ids.length) return res.status(400).json({ error: 'keeper_id and drop_ids required' });
  withUndo(db, `merged ${drop_ids.length} duplicate${drop_ids.length > 1 ? 's' : ''}`, () => mergeInto(keeper_id, drop_ids, effectiveForFactory()));
  res.json({ ok: true });
});

/** Merge every confident group, keeping the suggested copy in each */
router.post('/dupes/auto-merge', (req, res) => {
  const groups = loadGroups().filter(g => g.confident);
  let merged = 0;
  withUndo(db, `auto-merged ${groups.length} duplicate groups`, () => {
    const effectiveFor = effectiveForFactory();
    const inverse = [];
    for (const g of groups) {
      const drops = g.files.filter(f => f.id !== g.keeper_id).map(f => f.id);
      inverse.push(...mergeInto(g.keeper_id, drops, effectiveFor));
      merged += drops.length;
    }
    return inverse;
  });
  res.json({ groups: groups.length, merged });
});

/** These files only sound alike: never offer them as duplicates again */
router.post('/dupes/different', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length < 2) return res.status(400).json({ error: 'ids required' });
  withUndo(db, 'marked as different recordings', () => {
    const inverse = [];
    for (const a of ids) for (const b of ids) {
      if (a >= b) continue;
      const row = db.prepare('SELECT decision FROM audio_matches WHERE (a_id=? AND b_id=?) OR (a_id=? AND b_id=?)').get(a, b, b, a);
      if (!row) continue;
      db.prepare("UPDATE audio_matches SET decision='different' WHERE (a_id=? AND b_id=?) OR (a_id=? AND b_id=?)").run(a, b, b, a);
      inverse.push({ sql: 'UPDATE audio_matches SET decision=? WHERE (a_id=? AND b_id=?) OR (a_id=? AND b_id=?)', params: [row.decision, a, b, b, a] });
    }
    return inverse;
  });
  res.json({ ok: true });
});

module.exports = router;
