#!/usr/bin/env node
/**
 * Finds recordings that sound the same by comparing the Chromaprint fingerprints made by
 * process-media.js (first two minutes of each file), whatever the file name or format.
 *
 *   node scripts/analyze-audio-dupes.js            analyse and store matches in audio_matches
 *   node scripts/analyze-audio-dupes.js --report   just print the summary of what is stored
 *
 * How: every fingerprint is a series of 32-bit numbers, one per ~0.124 s. Two copies of the same
 * audio (even re-encoded) share many identical numbers at a constant shift, so numbers are indexed
 * and pairs that agree on the shift become candidates. Each candidate is then checked by counting
 * differing bits over the whole overlap.
 */
const { openDb } = require('../db');

const SECONDS_PER_INT = 0.1238;   // Chromaprint's item duration
const MAX_BUCKET = 40;            // ignore numbers shared by lots of files (silence, hiss)
const MIN_VOTES = 6;              // identical numbers at one shift needed to become a candidate
const MAX_BER = 0.2;              // above this the overlap is not the same audio
const MIN_OVERLAP_S = 20;         // need at least this much audio in common

const popcount = (x) => {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

function main() {
  const db = openDb();
  const report = process.argv.includes('--report');

  if (!report) {
    const rows = db.prepare(`SELECT m.recording_id id, m.fingerprint fp, m.duration_s dur, r.size_bytes size
      FROM media m JOIN recordings r ON r.id = m.recording_id
      WHERE m.fingerprint IS NOT NULL AND r.status != 'merged'`).all();
    const fps = rows.map(r => new Int32Array(r.fp.buffer, r.fp.byteOffset, r.fp.length / 4));
    console.log(`Comparing ${rows.length} fingerprints…`);

    // Inverted index: number -> [(file, position)]
    const index = new Map();
    fps.forEach((fp, f) => fp.forEach((v, pos) => {
      if (v === 0 || v === -1) return;
      let list = index.get(v);
      if (!list) index.set(v, list = []);
      list.push(f, pos);
    }));

    // Votes per (file a, file b, shift)
    const votes = new Map();
    for (const list of index.values()) {
      const n = list.length / 2;
      if (n < 2 || n > MAX_BUCKET) continue;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const fa = list[2 * i], fb = list[2 * j];
          if (fa === fb) continue;
          const [x, y, shift] = fa < fb ? [fa, fb, list[2 * i + 1] - list[2 * j + 1]] : [fb, fa, list[2 * j + 1] - list[2 * i + 1]];
          const key = `${x}|${y}|${shift}`;
          votes.set(key, (votes.get(key) || 0) + 1);
        }
      }
    }

    const insert = db.prepare(`INSERT INTO audio_matches (a_id, b_id, offset_s, ber, overlap_s, kind)
      VALUES (?,?,?,?,?,?) ON CONFLICT(a_id, b_id) DO UPDATE SET offset_s=excluded.offset_s, ber=excluded.ber, overlap_s=excluded.overlap_s, kind=excluded.kind`);

    // Best shift per pair, verified over the whole overlap
    const best = new Map();
    for (const [key, count] of votes) {
      if (count < MIN_VOTES) continue;
      const [x, y, shift] = key.split('|').map(Number);
      const pair = `${x}|${y}`;
      if (!best.has(pair) || best.get(pair).count < count) best.set(pair, { x, y, shift, count });
    }

    let stored = 0;
    db.transaction(() => {
      for (const { x, y, shift } of best.values()) {
        const a = fps[x], b = fps[y];
        // position p in a lines up with position p - shift in b
        const start = Math.max(0, shift), end = Math.min(a.length, b.length + shift);
        const overlap = end - start;
        if (overlap * SECONDS_PER_INT < MIN_OVERLAP_S) continue;
        let bits = 0;
        for (let p = start; p < end; p++) bits += popcount(a[p] ^ b[p - shift]);
        const ber = bits / (overlap * 32);
        if (ber > MAX_BER) continue;

        const da = rows[x].dur, db_ = rows[y].dur;
        const similarLength = Math.abs(da - db_) <= Math.max(2, 0.01 * Math.max(da, db_));
        const kind = similarLength && Math.abs(shift) * SECONDS_PER_INT < 8 ? 'same'
          : (Math.abs(shift) * SECONDS_PER_INT < 8 || overlap * SECONDS_PER_INT >= 100) ? 'contained' : 'partial';
        insert.run(rows[x].id, rows[y].id, shift * SECONDS_PER_INT, ber, overlap * SECONDS_PER_INT, kind);
        stored++;
      }
    })();
    console.log(`Stored ${stored} matching pairs`);
  }

  const summary = db.prepare(`SELECT kind, COUNT(*) n, ROUND(AVG(ber), 3) ber FROM audio_matches GROUP BY kind`).all();
  console.table(summary);
  const strict = db.prepare("SELECT COUNT(*) n FROM audio_matches WHERE kind = 'same' AND ber < 0.1").get().n;
  console.log(`'same' pairs with a bit error rate under 0.10 (near-certain duplicates): ${strict}`);
}

main();
