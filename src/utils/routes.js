// URL builders for every Home route. The URL is the single source of truth for
// what Home shows, so all navigation goes through these.

const enc = encodeURIComponent;

export const artistSlug = (artistName) => artistName.toLowerCase().replace(/\s+/g, '-');

export const hymnPath = (hymn) => `/hymn/${enc(hymn.name)}/${enc(hymn.artist)}/${enc(hymn.mp3)}`;

export const searchPath = (query, page = 1) =>
  page > 1 ? `/search/${enc(query)}/${page}` : `/search/${enc(query)}`;

export const browsePath = (mode, artist, season) => {
  if (!mode) return '/';
  if (mode === 'cantor' && artist && season) return `/browse/cantor/${enc(artistSlug(artist.artistName))}/${enc(season)}`;
  if (mode === 'cantor' && artist) return `/browse/cantor/${enc(artistSlug(artist.artistName))}`;
  return `/browse/${mode}`;
};

export const seasonPath = (season, hymnName) =>
  hymnName ? `/season/${enc(season)}/${enc(hymnName)}` : `/season/${enc(season)}`;
