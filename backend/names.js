// Helpers for relating file names to each other.

const STOP = new Set(['track', 'part', 'cd', 'mp3', 'wav', 'the', 'and', 'copy', 'final', 'new', 'old', 'take']);

// Unify Arabic spelling variants so "الباسيلي" files from different cantors line up
const normalizeArabic = (s) => s
  .replace(/[ً-ٰٟـ]/g, '')   // diacritics, tatweel
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه');

const stripExtension = (name) => name.replace(/\.[a-z0-9]{2,4}$/i, '');

/** Order-independent word key of a file name, ignoring track numbers and format: "02 Ti Shori.mp3" ~ "Ti_Shori (2).wav" */
function nameKey(filename) {
  const text = normalizeArabic(stripExtension(filename.normalize('NFKC'))).toLowerCase();
  const tokens = (text.match(/[a-z؀-ۿⲀ-⳿]+/g) || []).filter(t => t.length >= 2 && !STOP.has(t));
  return [...new Set(tokens)].sort().join(' ');
}

/** A readable guess at a title from a file name: no extension, leading track number or underscores */
function cleanName(filename) {
  return stripExtension(filename.normalize('NFC'))
    .replace(/^\s*(?:track\s*)?\d+\s*[-_.)]*\s*/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const tokenSet = (text) => new Set(nameKey(text).split(' ').filter(Boolean));

function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
}

module.exports = { nameKey, cleanName, tokenSet, overlap };
