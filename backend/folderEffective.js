// What each folder effectively has once values cascade down from its ancestors.
// season, flag and year come from the nearest ancestor (or the folder itself) that sets them;
// tags accumulate from every ancestor.
function buildFolderIndex(db) {
  const rows = db.prepare('SELECT * FROM folders ORDER BY path').all();
  const ownTags = new Map();
  for (const r of db.prepare('SELECT * FROM folder_tags').all()) {
    if (!ownTags.has(r.folder_path)) ownTags.set(r.folder_path, []);
    ownTags.get(r.folder_path).push(r.tag_id);
  }
  const byPath = new Map(rows.map(f => [f.path, { ...f, children: [] }]));
  for (const f of byPath.values()) if (f.parent && byPath.has(f.parent)) byPath.get(f.parent).children.push(f.path);

  function effective(f) {
    const eff = { season_id: null, season_from: null, flag: null, flag_from: null, year_text: '', year_from: null, tags: new Set() };
    for (let cur = f; cur; cur = cur.parent ? byPath.get(cur.parent) : null) {
      if (!eff.season_id && cur.season_id) { eff.season_id = cur.season_id; eff.season_from = cur.path; }
      if (!eff.flag && cur.flag) { eff.flag = cur.flag; eff.flag_from = cur.path; }
      if (!eff.year_text && cur.year_text) { eff.year_text = cur.year_text; eff.year_from = cur.path; }
      for (const t of ownTags.get(cur.path) || []) eff.tags.add(t);
    }
    return { ...eff, tags: [...eff.tags] };
  }
  return { byPath, ownTags, effective };
}

module.exports = { buildFolderIndex };
