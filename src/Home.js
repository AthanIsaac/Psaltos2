import "./styles/layout.css";
import "./styles/navbar.css";
import "./styles/browse.css";
import "./styles/search.css";
import "./styles/pages.css";
import logo from './img/logo.svg';
import search from './img/search.svg';
import jesus from './img/jesus.svg';
import Church from "./img/church.svg";

// Data imports
import HymnsData from "./hymns.json";
import ArtistData from "./artists.json";

// Component imports
import Navbar from "./Navbar.js";
import Footer from "./Footer.js";
import Audio from "./Audio.js";
import HymnItem from "./HymnItem.js";
import { useAudio } from "./AudioContext.js";

// Custom hooks
import { useScrollDetection } from "./hooks/useScrollDetection.js";
import { useSearch } from "./hooks/useSearch.js";
import { useURLManagement } from "./hooks/useURLManagement.js";

// Utility functions
import {
  getSeasonsForArtist,
  getAllSeasons,
  getHymnsForArtistAndSeason,
  getHymnNamesForSeason,
  getCantorsForHymn,
  getSeasonImageUrl
} from "./utils/seasonUtils.js";

// UI Components
import {
  SearchResults,
  IndividualHymn,
  SearchDropdown
} from "./components/SearchComponents.js";

import {
  ArtistList,
  SeasonsForArtist,
  HymnsList,
  AllSeasons,
  HymnsForSeason,
  CantorsForHymn,
  SelectedChip
} from "./components/BrowseComponents.js";

// React imports
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createSmithWatermanSearch } from "./smithWatermanSearch.js";

function Home() {
  const { recentlyPlayed } = useAudio();

  // Core state management
  const [hymnData, setHymnData] = useState([]);
  const [artistData, setArtistData] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [hymn, setHymn] = useState("");
  const [isUserTypingMain, setIsUserTypingMain] = useState(false);
  
  // Browse state
  const [selectedHymn, setSelectedHymn] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState();
  const [selectedArtist, setSelectedArtist] = useState();
  const [browseMode, setBrowseMode] = useState('cantor');
  const [seasonFilter, setSeasonFilter] = useState('all');
  
  // UI state
  const [expandedHymns, setExpandedHymns] = useState(new Set());
  const [showDropdown, setShowDropdown] = useState(false);

  // Data initialization
  useEffect(() => {
    setHymnData(HymnsData);
    setArtistData(ArtistData);
    setIsDataLoaded(true);
  }, []);

  // Create search function using Smith-Waterman algorithm
  const performSearch = useMemo(() => {
    return createSmithWatermanSearch(hymnData);
  }, [hymnData]);

  // Scroll to content only when the target is outside the visible viewport
  const scrollToContent = useCallback((delay = 300) => {
    setTimeout(() => {
      const contentElement = document.querySelector('.TabList') ||
                             document.querySelector('.cantor-season-layout');

      if (contentElement) {
        const rect = contentElement.getBoundingClientRect();
        const alreadyVisible = rect.top >= -50 && rect.top <= window.innerHeight * 0.75;
        if (alreadyVisible) return;

        const headerHeight = 120;
        const scrollToPosition = Math.max(0, rect.top + window.pageYOffset - headerHeight);
        window.scrollTo({ top: scrollToPosition, behavior: 'smooth' });
      }
    }, delay);
  }, []);

  // Custom hooks
  const { showStickySearch, searchBarRef } = useScrollDetection();

  // Ref so useSearch can call updateURL without a circular dependency
  const updateURLRef = useRef(null);

  const {
    searchQuery,
    searchResults,
    searchTiming,
    searchMeta,
    showSearchResults,
    filteredHymns,
    allSearchResults,
    currentPage,
    setSearchQuery,
    debouncedSearch,
    executeSearch,
    handleShowMoreResults,
    clearSearch
  } = useSearch(performSearch, updateURLRef, scrollToContent);

  const { params, navigate, updateURL } = useURLManagement({
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
  });

  // Keep the ref current every render so useSearch's handleShowMoreResults always has the latest updateURL
  updateURLRef.current = updateURL;

  // Search handlers
  const hymnSearch = useCallback((event) => {
    const input = event.target.value;
    setHymn(input);
    setSearchQuery(input);
    setShowDropdown(input.trim().length > 0);
    
    setIsUserTypingMain(true);
    debouncedSearch(input);
  }, [debouncedSearch, setSearchQuery]);

  const handleNavbarSearch = useCallback((event) => {
    const input = event.target.value;
    setHymn(input);
    setSearchQuery(input);
    
    debouncedSearch(input);
    
    if (input.trim()) {
      const result = performSearch(input.trim());
      return result.results;
    }
    return [];
  }, [performSearch, debouncedSearch, setSearchQuery]);

  const handleSearchKeyPress = useCallback((event) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      setIsUserTypingMain(false);
      executeSearch(searchQuery);
      setShowDropdown(false);
      updateURL(null, null, null, null, searchQuery, 1);
      scrollToContent();
    }
  }, [searchQuery, executeSearch, updateURL, scrollToContent]);

  // Navigation helpers
  const goBackToHome = useCallback(() => {
    clearSearch();
    setShowDropdown(false);
    setHymn('');
    navigate('/');
  }, [clearSearch, navigate]);

  const resetSelections = useCallback((preserveExpanded = false) => {
    setSelectedArtist();
    setSelectedSeason();
    setSelectedHymn(null);
    if (!preserveExpanded) {
      setExpandedHymns(new Set());
    }
    setSeasonFilter('all');
  }, []);

  const toggleBrowseMode = useCallback(() => {
    resetSelections(false);
    const newMode = browseMode === 'cantor' ? 'season' : 'cantor';
    setBrowseMode(newMode);
    updateURL(newMode, null, null, null, null);
  }, [browseMode, resetSelections, updateURL]);

  // Hymn expansion logic
  const toggleHymnExpansion = useCallback((hymnId, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setExpandedHymns(prev => {
      const isCurrentlyExpanded = prev.has(hymnId);
      const newSet = new Set(prev);
      
      if (isCurrentlyExpanded) {
        newSet.delete(hymnId);
      } else {
        newSet.add(hymnId);

        requestAnimationFrame(() => {
          const hymnElement = document.querySelector(`[data-hymn-id="${hymnId}"]`);
          if (hymnElement) {
            const navbarHeight = 120;
            const elementTop = hymnElement.getBoundingClientRect().top + window.pageYOffset;
            const scrollToPosition = Math.max(0, elementTop - navbarHeight);
            window.scrollTo({ top: scrollToPosition, behavior: 'smooth' });
          }
        });
      }
      
      return newSet;
    });
  }, []);

  // Browse handlers
  const handleArtistSelect = useCallback((artist) => {
    setSelectedArtist(artist);
    if (artist) {
      updateURL(browseMode, artist, null, null, null);
    } else {
      setSelectedSeason();
      updateURL(browseMode, null, null, null, null);
    }
  }, [browseMode, updateURL]);

  const handleSeasonSelect = useCallback((season) => {
    setSelectedSeason(season);
    if (browseMode === 'cantor' && selectedArtist) {
      updateURL(browseMode, selectedArtist, season, null, null);
    } else {
      updateURL('season', null, season, null, null);
    }
  }, [browseMode, selectedArtist, updateURL]);

  const handleHymnSelect = useCallback((hymnName) => {
    setSelectedHymn(hymnName);
    updateURL('season', null, selectedSeason, hymnName, null);
    scrollToContent();
  }, [selectedSeason, updateURL, scrollToContent]);

  // Data derivations
  const seasonsForArtist = useMemo(() => 
    selectedArtist ? getSeasonsForArtist(hymnData, selectedArtist.artistName) : []
  , [hymnData, selectedArtist]);

  const hymnsForArtistAndSeason = useMemo(() => 
    selectedArtist && selectedSeason ? 
      getHymnsForArtistAndSeason(hymnData, selectedArtist.artistName, selectedSeason) : []
  , [hymnData, selectedArtist, selectedSeason]);

  const allSeasons = useMemo(() => getAllSeasons(hymnData), [hymnData]);

  const hymnsInSeason = useMemo(() => 
    selectedSeason ? getHymnNamesForSeason(hymnData, selectedSeason) : []
  , [hymnData, selectedSeason]);

  const cantorsForHymn = useMemo(() => 
    selectedHymn && selectedSeason ? 
      getCantorsForHymn(hymnData, selectedHymn, selectedSeason) : []
  , [hymnData, selectedHymn, selectedSeason]);

  // Render main content based on current state
  const renderMainContent = () => {
    if (showSearchResults) {
      return (
        <SearchResults
          searchResults={searchResults}
          searchMeta={searchMeta}
          searchTiming={searchTiming}
          expandedHymns={expandedHymns}
          toggleHymnExpansion={toggleHymnExpansion}
          handleShowMoreResults={() =>
            handleShowMoreResults(searchQuery, allSearchResults, searchMeta, searchResults.length, currentPage)
          }
          goBackToHome={goBackToHome}
          navigate={navigate}
        />
      );
    }

    if (selectedHymn && typeof selectedHymn === 'object') {
      return (
        <IndividualHymn
          selectedHymn={selectedHymn}
          setSelectedHymn={setSelectedHymn}
          navigate={navigate}
        />
      );
    }

    if (browseMode === 'cantor') {
      if (selectedArtist && selectedSeason) {
        return (
          <div className="cantor-season-layout">
            <div className="selected-cantor-season">
              <div className="selected-chips-row">
                <SelectedChip
                  imageSrc={selectedArtist.img}
                  label="Cantor"
                  name={selectedArtist.artistName}
                  onClear={() => {
                    setSelectedArtist();
                    setSelectedSeason();
                    updateURL(browseMode, null, null, null, null);
                  }}
                />
                <SelectedChip
                  imageSrc={getSeasonImageUrl(selectedSeason)}
                  label="Season"
                  name={selectedSeason}
                  onClear={() => {
                    setSelectedSeason();
                    updateURL(browseMode, selectedArtist, null, null, null);
                  }}
                />
              </div>
            </div>
            <HymnsList
              hymns={hymnsForArtistAndSeason}
              expandedHymns={expandedHymns}
              toggleHymnExpansion={toggleHymnExpansion}
              navigate={navigate}
            />
          </div>
        );
      }

      return (
        <>
          <ArtistList
            artistData={artistData}
            selectedArtist={selectedArtist}
            onArtistSelect={handleArtistSelect}
          />
          {selectedArtist && (
            <SeasonsForArtist
              seasons={seasonsForArtist}
              selectedSeason={selectedSeason}
              seasonFilter={seasonFilter}
              setSeasonFilter={setSeasonFilter}
              onSeasonSelect={handleSeasonSelect}
              onBack={() => handleArtistSelect(null)}
            />
          )}
        </>
      );
    }

    if (browseMode === 'season') {
      if (!selectedSeason) {
        return (
          <AllSeasons
            allSeasons={allSeasons}
            seasonFilter={seasonFilter}
            setSeasonFilter={setSeasonFilter}
            onSeasonSelect={handleSeasonSelect}
          />
        );
      }

      if (selectedSeason && !selectedHymn) {
        return (
          <HymnsForSeason
            selectedSeason={selectedSeason}
            hymnsInSeason={hymnsInSeason}
            hymnData={hymnData}
            onHymnSelect={handleHymnSelect}
            onBack={() => {
              setSelectedSeason();
              updateURL('season', null, null, null, null);
            }}
          />
        );
      }

      if (selectedSeason && selectedHymn) {
        return (
          <CantorsForHymn
            selectedHymn={selectedHymn}
            selectedSeason={selectedSeason}
            cantorsForHymn={cantorsForHymn}
            expandedHymns={expandedHymns}
            toggleHymnExpansion={toggleHymnExpansion}
            navigate={navigate}
            onBack={(toSeasons = false) => {
              if (toSeasons) {
                setSelectedSeason();
                updateURL('season', null, null, null, null);
              } else {
                setSelectedHymn(null);
                updateURL('season', null, selectedSeason, null, null);
              }
            }}
          />
        );
      }
    }

    return null;
  };

  return (
    <div className="mainContainer">
      <div className="backgroundOverlay"></div>
      <Navbar
        onSearch={handleNavbarSearch}
        searchValue={hymn}
        showStickySearch={showStickySearch}
        onSearchResultClick={(hymn) => {
          navigate(`/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}/${encodeURIComponent(hymn.mp3)}`);
        }}
        performSearch={performSearch}
        isMainUserTyping={isUserTypingMain}
      />
      <div className="contents">
        <img className="Jesus" src={jesus} alt="Jesus" />

        <div className="titleContainer">
          <img className="mainLogo" src={logo} alt="logo" />
          <span>Psaltos</span>
        </div>
        
        <div className="searchBarContainer" ref={searchBarRef}>
          <div className="searchBar">
            <input
              type="text"
              value={hymn}
              placeholder="Search hymns..."
              onChange={hymnSearch}
              onKeyPress={handleSearchKeyPress}
              onFocus={() => {
                setIsUserTypingMain(true);
                if (hymn.trim().length > 0) {
                  setShowDropdown(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowDropdown(false), 200);
              }}
            />
            <img src={search} alt="search" />
          </div>
          
          <SearchDropdown
            showDropdown={showDropdown}
            filteredHymns={filteredHymns}
            setShowDropdown={setShowDropdown}
            setHymn={setHymn}
            setIsUserTypingMain={setIsUserTypingMain}
            navigate={navigate}
          />
        </div>
        
        <div className="browse-mode-tabs" data-mode={browseMode}>
          <button
            className={`browse-tab ${browseMode === 'cantor' ? 'active' : ''}`}
            onClick={() => browseMode !== 'cantor' && toggleBrowseMode()}
          >
            By Cantor
          </button>
          <button
            className={`browse-tab ${browseMode === 'season' ? 'active' : ''}`}
            onClick={() => browseMode !== 'season' && toggleBrowseMode()}
          >
            By Season
          </button>
        </div>

        {!isDataLoaded ? (
          <div className="loading-skeleton-container">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="loading-skeleton-item">
                <div className="skeleton-avatar" />
                <div className="skeleton-lines">
                  <div className="skeleton-line skeleton-line-long" />
                  <div className="skeleton-line skeleton-line-short" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {renderMainContent()}

            {!showSearchResults && !selectedHymn && recentlyPlayed?.length > 0 && (
              <div className="recently-played-section">
                <h2 className="recently-played-title">Recently Played</h2>
                <div className="search-results-list">
                  {recentlyPlayed.map((item, i) => (
                    <HymnItem
                      key={i}
                      hymn={item}
                      type="hymn"
                      index={i}
                      onClick={() => navigate(`/hymn/${encodeURIComponent(item.name)}/${encodeURIComponent(item.artist)}/${encodeURIComponent(item.mp3)}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
      <img className="churchImg" src={Church} alt="church" />
    </div>
  );
}

export default Home;