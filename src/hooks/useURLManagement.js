import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Custom hook for managing URL parameters and navigation
 * @param {Object} dependencies - Required data and functions
 * @returns {Object} - URL state and navigation functions
 */
export const useURLManagement = ({
  hymnData,
  artistData,
  performSearch,
  isUserTypingMain,
  executeSearch,
  clearSearch,
  setHymn,
  setSelectedHymn,
  setSelectedArtist,
  setSelectedSeason,
  setBrowseMode,
}) => {
  const params = useParams();
  const navigate = useNavigate();

  // Helper function to encode artist name for URL
  const encodeArtistName = useCallback((artistName) => {
    return encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'));
  }, []);

  // Helper function to update URL based on current state
  const updateURL = useCallback((newBrowseMode, newArtist, newSeason, newHymn, newSearchQuery, page = 1) => {
    if (newSearchQuery) {
      if (page > 1) {
        navigate(`/search/${encodeURIComponent(newSearchQuery)}/${page}`);
      } else {
        navigate(`/search/${encodeURIComponent(newSearchQuery)}`);
      }
    } else if (newBrowseMode === 'season' && newSeason && newHymn) {
      navigate(`/season/${encodeURIComponent(newSeason)}/${encodeURIComponent(newHymn)}`);
    } else if (newBrowseMode === 'season' && newSeason) {
      navigate(`/season/${encodeURIComponent(newSeason)}`);
    } else if (newBrowseMode === 'cantor' && newArtist && newSeason) {
      navigate(`/browse/${newBrowseMode}/${encodeArtistName(newArtist.artistName)}/${encodeURIComponent(newSeason)}`);
    } else if (newBrowseMode === 'cantor' && newArtist) {
      navigate(`/browse/${newBrowseMode}/${encodeArtistName(newArtist.artistName)}`);
    } else if (newBrowseMode) {
      navigate(`/browse/${newBrowseMode}`);
    } else {
      navigate('/');
    }
  }, [navigate, encodeArtistName]);

  // URL parameter synchronization
  useEffect(() => {
    if (!hymnData.length || !artistData.length) return;

    // Clear search results when not on search page
    if (!params.query && !params.hymnName) {
      clearSearch();
      // Only clear hymn input if user is not actively typing
      if (!isUserTypingMain) {
        setHymn('');
      }
    }

    // Handle individual hymn URLs
    if (params.hymnName && params.artist) {
      const decodedHymnName = decodeURIComponent(params.hymnName);
      const decodedArtist = decodeURIComponent(params.artist);
      const decodedMp3Id = params.mp3Id ? decodeURIComponent(params.mp3Id) : null;
      
      // Find the specific hymn - prefer mp3 ID for exact match, fallback to name+artist
      let specificHymn;
      if (decodedMp3Id) {
        specificHymn = hymnData.find(h => h.mp3 === decodedMp3Id);
      } else {
        // Fallback for old URLs - find first match by name and artist
        specificHymn = hymnData.find(h =>
          h.name === decodedHymnName && h.artist === decodedArtist
        );
      }
      
      if (specificHymn) {
        setSelectedHymn(specificHymn);
        clearSearch();
        setSelectedArtist();
        setSelectedSeason();
        return;
      }
    }

    // Handle search URLs
    if (params.query) {
      const decodedQuery = decodeURIComponent(params.query);
      const pageFromUrl = params.page ? parseInt(params.page, 10) : 1;
      
      // Only update hymn input if user is not actively typing
      if (!isUserTypingMain) {
        setHymn(decodedQuery);
      }
      
      executeSearch(decodedQuery, pageFromUrl);
      
      // Clear other selections when searching
      setSelectedArtist();
      setSelectedSeason();
      setSelectedHymn(null);
      return;
    }

    // Handle browse mode URLs
    if (params.mode) {
      setBrowseMode(params.mode);
      
      if (params.artist) {
        const artist = artistData.find(a =>
          encodeArtistName(a.artistName) === params.artist
        );
        if (artist) {
          setSelectedArtist(artist);
          
          if (params.season) {
            const decodedSeason = decodeURIComponent(params.season);
            setSelectedSeason(decodedSeason);
          } else {
            setSelectedSeason();
            setSelectedHymn(null);
          }
        } else {
          // Artist not found, clear selections
          setSelectedArtist();
          setSelectedSeason();
          setSelectedHymn(null);
        }
      } else {
        // No artist in URL, clear selections
        setSelectedArtist();
        setSelectedSeason();
        setSelectedHymn(null);
      }
    }

    // Handle season-only URLs
    if (params.season && !params.mode) {
      const decodedSeason = decodeURIComponent(params.season);
      setBrowseMode('season');
      setSelectedSeason(decodedSeason);
      setSelectedArtist(); // Clear artist when browsing by season
      
      if (params.hymn) {
        const decodedHymn = decodeURIComponent(params.hymn);
        setSelectedHymn(decodedHymn);
      } else {
        setSelectedHymn(null);
      }
    }

    // Handle home page (no params)
    if (!params.query && !params.mode && !params.season && !params.hymnName) {
      setSelectedArtist();
      setSelectedSeason();
      setSelectedHymn(null);
      setBrowseMode('cantor'); // Default to cantor mode
    }
  }, [
    params, 
    hymnData, 
    artistData, 
    performSearch, 
    isUserTypingMain,
    executeSearch,
    clearSearch,
    setHymn,
    setSelectedHymn,
    setSelectedArtist,
    setSelectedSeason,
    setBrowseMode,
    encodeArtistName
  ]);

  return {
    params,
    navigate,
    updateURL,
    encodeArtistName
  };
};