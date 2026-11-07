import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { artistSlug, hymnPath, searchPath, browsePath, seasonPath } from '../utils/routes.js';

/**
 * Derives everything Home needs from the URL and exposes navigation helpers.
 * There is no separate selection state to keep in sync: changing the view means
 * navigating, and the next render reads the new route.
 */
export const useBrowseRoute = (hymnData, artistData) => {
  // useParams() already returns decoded values
  const params = useParams();
  const navigate = useNavigate();

  const route = useMemo(() => {
    const { mode, artist: artistParam, season, hymn: seasonHymn, query, page, hymnName, mp3Id } = params;

    // /hymn/:name/:artist[/:mp3] — prefer the exact mp3, fall back to name + artist for old links
    const individualHymn = hymnName && params.artist
      ? (mp3Id
          ? hymnData.find(h => h.mp3 === mp3Id)
          : hymnData.find(h => h.name === hymnName && h.artist === params.artist))
      : undefined;

    const selectedArtist = mode && artistParam
      ? artistData.find(a => artistSlug(a.artistName) === artistParam)
      : undefined;

    return {
      individualHymn,
      query: query || null,
      page: page ? parseInt(page, 10) || 1 : 1,
      browseMode: mode === 'season' || (season && !mode) ? 'season' : 'cantor',
      selectedArtist,
      selectedSeason: season,
      selectedHymn: seasonHymn || null, // hymn *name*, only on /season/:season/:hymn
    };
  }, [params, hymnData, artistData]);

  const go = useMemo(() => ({
    home: () => navigate('/'),
    hymn: (hymn) => navigate(hymnPath(hymn)),
    search: (query, page = 1) => navigate(searchPath(query, page)),
    browse: (mode, artist, season) => navigate(browsePath(mode, artist, season)),
    season: (season, hymnName) => navigate(seasonPath(season, hymnName)),
  }), [navigate]);

  return { ...route, go, navigate };
};
