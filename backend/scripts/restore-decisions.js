#!/usr/bin/env node
/**
 * Re-apply a decisions backup to the database. Use it after rebuilding the database:
 *   node scripts/import-library.js            (file list)
 *   node scripts/process-media.js             (previews; only needed if data/previews is gone)
 *   node scripts/restore-decisions.js         (your decisions, from data/backups/decisions.json)
 *   node scripts/restore-decisions.js path/to/decisions-2026-….json
 * Safe to run on a database that already has decisions: it overwrites with the backup's values.
 */
const fs = require('fs');
const { openDb } = require('../db');
const { LATEST } = require('../backup');

const file = process.argv[2] || LATEST;
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const db = openDb();

const missing = { folders: 0, recordings: 0 };

db.transaction(() => {
  // Seasons you renamed, added, reordered or marked as catch-all
  const season = db.prepare(`INSERT INTO seasons (id, name_en, name_coptic, name_ar, sort_order, is_catchall) VALUES (?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name_en=excluded.name_en, name_coptic=excluded.name_coptic, name_ar=excluded.name_ar,
      sort_order=excluded.sort_order, is_catchall=excluded.is_catchall`);
  for (const s of data.seasons || []) season.run(s.id, s.name_en, s.name_coptic, s.name_ar, s.sort_order, s.is_catchall);

  const tag = db.prepare('INSERT INTO tags (id, label, sort_order) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label, sort_order=excluded.sort_order');
  for (const t of data.tags) tag.run(t.id, t.label, t.sort_order);

  const folder = db.prepare('UPDATE folders SET season_id=?, flag=?, year_text=? WHERE path=?');
  const clearTags = db.prepare('DELETE FROM folder_tags WHERE folder_path=?');
  const addTag = db.prepare('INSERT OR IGNORE INTO folder_tags (folder_path, tag_id) VALUES (?,?)');
  for (const f of data.folders) {
    if (!folder.run(f.season_id, f.flag, f.year_text, f.path).changes) { missing.folders++; continue; }
    clearTags.run(f.path);
    for (const t of f.tags) addTag.run(f.path, t);
  }

  const hymn = db.prepare(`INSERT INTO hymns (id, english_title, coptic_name, coptic_title, english_name) VALUES (?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET english_title=excluded.english_title, coptic_name=excluded.coptic_name,
      coptic_title=excluded.coptic_title, english_name=excluded.english_name`);
  for (const h of data.hymns) hymn.run(h.id, h.english_title, h.coptic_name, h.coptic_title, h.english_name);

  const rec = db.prepare(`UPDATE recordings SET status=?, merged_into=?, hymn_id=?, season_id=?, year_text=?, version_label=?, context_note=?, notes=? WHERE id=?`);
  for (const r of data.recordings) {
    if (!rec.run(r.status, r.merged_into ?? null, r.hymn_id, r.season_id, r.year_text, r.version_label, r.context_note, r.notes, r.id).changes) missing.recordings++;
  }

  const extraPath = db.prepare('INSERT OR IGNORE INTO recording_paths (recording_id, rel_path, original_path, is_primary) VALUES (?,?,?,0)');
  for (const p of data.extra_paths || []) extraPath.run(p.recording_id, p.rel_path, p.original_path);
  const audioDecision = db.prepare('UPDATE audio_matches SET decision=? WHERE a_id=? AND b_id=?');
  for (const d of data.audio_decisions || []) audioDecision.run(d.decision, d.a_id, d.b_id);

  const place = db.prepare(`INSERT INTO placements (recording_id, season_id, is_base, note) VALUES (?,?,?,?)
    ON CONFLICT(recording_id, season_id) DO UPDATE SET is_base=excluded.is_base, note=excluded.note`);
  for (const p of data.placements) place.run(p.recording_id, p.season_id, p.is_base, p.note);

  const rtag = db.prepare('INSERT OR IGNORE INTO recording_tags (recording_id, tag_id) VALUES (?,?)');
  for (const t of data.recording_tags) rtag.run(t.recording_id, t.tag_id);

  const attr = db.prepare(`INSERT INTO recording_attributes (recording_id, key, value) VALUES (?,?,?)
    ON CONFLICT(recording_id, key) DO UPDATE SET value=excluded.value`);
  for (const a of data.recording_attributes) attr.run(a.recording_id, a.key, a.value);

  const sug = db.prepare("INSERT INTO suggestions (field, text, source, uses) VALUES (?,?,'entered',?) ON CONFLICT(field, text) DO UPDATE SET uses=excluded.uses");
  for (const s of data.suggestions) sug.run(s.field, s.text, s.uses);
})();

console.log(`Restored from ${file} (exported ${data.exported_at})`);
console.log(`  ${data.folders.length} folders, ${data.recordings.length} recordings, ${data.hymns.length} hymns, ${data.tags.length} tags`);
if (missing.folders || missing.recordings) {
  console.log(`  Skipped ${missing.folders} folders and ${missing.recordings} recordings that are not in this database (re-run the import first).`);
}
