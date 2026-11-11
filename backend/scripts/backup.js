#!/usr/bin/env node
// Write a backup right now:  npm run backup
const { openDb } = require('../db');
const { writeBackup, writeDbSnapshot, LATEST } = require('../backup');

(async () => {
  const db = openDb();
  const r = writeBackup(db, { force: true });
  await writeDbSnapshot(db);
  console.log(`Backed up ${r.counts.folders} folder decisions, ${r.counts.recordings} recording decisions, ${r.counts.hymns} hymns`);
  console.log(`Latest: ${LATEST}`);
})();
