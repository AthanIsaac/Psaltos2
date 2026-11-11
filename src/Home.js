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
import HymnItem from "./HymnItem.js";
import { useAudio } from "./AudioContext.js";
import { useFavorites } from "./FavoritesContext.js";
import { HymnShelfHeader } from "./components/PlaybackControls.js";

// Custom hooks
import { useScrollDetection } from "./hooks/useScrollDetection.js";
import { useSearch } from "./hooks/useSearch.js";
import { useBrowseRoute } from "./hooks/useBrowseRoute.js";

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
  CantorProfile,
  SelectedChip
} from "./components/BrowseComponents.js";

// React imports
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { createSmithWatermanSearch } from "./smithWatermanSearch.js";

// Height of the sticky navbar plus breathing room, measured instead of hard-coded
const getStickyOffset = () =>
  (document.querySelector('nav')?.offsetHeight || 64) + 24;

function Home() {
  const { recentlyPlayed } = useAudio();
  const { favorites } = useFavorites();

  // Data is bundled, so it's available on the first render
  const hymnData = HymnsData;
  const artistData = ArtistData;

  // Everything about *what is shown* comes from the URL; see useBrowseRoute
  const {
    individualHymn,
    query,
    page,
    browseMode,
    selectedArtist,
    selectedSeason,
    selectedHymn,
    go,
    navigate,
  } = useBrowseRoute(hymnData, artistData);
  const { pathname } = useLocation();

  // Local UI state: the text in the search inputs and its dropdown
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [expandedHymns, setExpandedHymns] = useState(new Set());

  // Create search function using Smith-Waterman algorithm
  const performSearch = useMemo(() => createSmithWatermanSearch(hymnData), [hymnData]);

  // Scroll to content only when the target is outside the visible viewport
  const scrollToContent = useCallback((delay = 300) => {
    setTimeout(() => {
      const contentElement = document.querySelector('.TabList') ||
                             document.querySelector('.cantor-season-layout');

      if (contentElement) {
        const rect = contentElement.getBoundingClientRect();
        const alreadyVisible = rect.top >= -50 && rect.top <= window.innerHeight * 0.75;
        if (alreadyVisible) return;

        const scrollToPosition = Math.max(0, rect.top + window.pageYOffset - getStickyOffset());
        window.scrollTo({ top: scrollToPosition, behavior: 'smooth' });
      }
    }, delay);
  }, []);

  const { showStickySearch, searchBarRef } = useScrollDetection();

  const {
    searchResults,
    searchTiming,
    searchMeta,
    showSearchResults,
    filteredHymns,
    debouncedSearch,
    clearSuggestions,
  } = useSearch(performSearch, query, page);

  // Keep the input in step with the URL (e.g. back/forward, shared search links)
  useEffect(() => {
    setInputValue(query ?? '');
    setShowDropdown(false);
    clearSuggestions();
  }, [query, pathname, clearSuggestions]);

  // Shared by the main and sticky navbar inputs; the main dropdown only opens for the main input
  const handleSearchChange = useCallback((input, fromMain = false) => {
    setInputValue(input);
    setShowDropdown(fromMain && input.trim().length > 0);
    setActiveIndex(-1);
    debouncedSearch(input);
  }, [debouncedSearch]);

  const submitSearch = useCallback((text) => {
    if (!text.trim()) return;
    setShowDropdown(false);
    go.search(text.trim());
    scrollToContent();
  }, [go, scrollToContent]);

  const openHymn = useCallback((item) => {
    setShowDropdown(false);
    setActiveIndex(-1);
    go.hymn(item);
  }, [go]);

  const mainInputRef = useRef(null);
  const clearSearchInput = useCallback(() => {
    setInputValue('');
    setShowDropdown(false);
    setActiveIndex(-1);
    clearSuggestions();
    if (showSearchResults) go.home();
  }, [clearSuggestions, showSearchResults, go]);

  const dropdownItems = useMemo(
    () => (showDropdown ? filteredHymns.slice(0, 8) : []),
    [showDropdown, filteredHymns]
  );

  const handleSearchKeyDown = useCallback((event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (dropdownItems.length === 0) return;
      event.preventDefault();
      const n = dropdownItems.length;
      setActiveIndex(i => event.key === 'ArrowDown' ? (i + 1) % n : (i <= 0 ? n - 1 : i - 1));
    } else if (event.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && dropdownItems[activeIndex]) openHymn(dropdownItems[activeIndex]);
      else submitSearch(inputValue);
    }
  }, [inputValue, submitSearch, openHymn, dropdownItems, activeIndex]);

  const toggleBrowseMode = useCallback(() => {
    setExpandedHymns(new Set());
    setSeasonFilter('all');
    go.browse(browseMode === 'cantor' ? 'season' : 'cantor');
  }, [browseMode, go]);

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
            const elementTop = hymnElement.getBoundingClientRect().top + window.pageYOffset;
            const scrollToPosition = Math.max(0, elementTop - getStickyOffset());
            window.scrollTo({ top: scrollToPosition, behavior: 'smooth' });
          }
        });
      }
      
      return newSet;
    });
  }, []);

  // Browse handlers — each one is just a navigation
  const handleArtistSelect = useCallback((artist) => go.browse(browseMode, artist), [go, browseMode]);

  const handleSeasonSelect = useCallback((season) => {
    if (browseMode === 'cantor' && selectedArtist) go.browse('cantor', selectedArtist, season);
    else go.season(season);
  }, [go, browseMode, selectedArtist]);

  const handleHymnSelect = useCallback((hymnName) => {
    go.season(selectedSeason, hymnName);
    scrollToContent();
  }, [go, selectedSeason, scrollToContent]);

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

  const showShelves = !showSearchResults && !selectedHymn && !individualHymn;

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
          handleShowMoreResults={() => go.search(query, page + 1)}
          goBackToHome={go.home}
          navigate={navigate}
        />
      );
    }

    if (individualHymn) {
      return (
        <IndividualHymn
          selectedHymn={individualHymn}
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
                  onClear={() => go.browse(browseMode)}
                />
                <SelectedChip
                  imageSrc={getSeasonImageUrl(selectedSeason)}
                  label="Season"
                  name={selectedSeason}
                  onClear={() => go.browse(browseMode, selectedArtist)}
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
          {selectedArtist && <CantorProfile artist={selectedArtist} hymnData={hymnData} />}
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
            onBack={() => go.browse('season')}
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
              if (toSeasons) go.browse('season');
              else go.season(selectedSeason);
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
        searchValue={inputValue}
        searchResults={filteredHymns}
        showStickySearch={showStickySearch}
        onSearchChange={handleSearchChange}
        onSearchSubmit={submitSearch}
        onSearchResultClick={openHymn}
        onSearchClear={clearSearchInput}
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
              value={inputValue}
              placeholder="Search hymns..."
              ref={mainInputRef}
              onChange={(e) => handleSearchChange(e.target.value, true)}
              onKeyDown={handleSearchKeyDown}
              role="combobox"
              aria-label="Search hymns"
              aria-expanded={dropdownItems.length > 0}
              aria-controls="main-search-listbox"
              aria-activedescendant={activeIndex >= 0 ? `main-search-option-${activeIndex}` : undefined}
              autoComplete="off"
              onFocus={() => {
                if (inputValue.trim().length > 0) {
                  setShowDropdown(true);
                }
              }}
              onBlur={() => {
                setShowDropdown(false);
                setActiveIndex(-1);
              }}
            />
            {inputValue && (
              <button
                type="button"
                className="search-clear-btn"
                aria-label="Clear search"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { clearSearchInput(); mainInputRef.current?.focus(); }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="search-submit-btn"
              aria-label="Search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submitSearch(inputValue)}
            >
              <img src={search} alt="" />
            </button>
          </div>
          
          <SearchDropdown
            showDropdown={showDropdown}
            filteredHymns={filteredHymns}
            activeIndex={activeIndex}
            onSelect={openHymn}
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

        {renderMainContent()}

        {showShelves && favorites.length > 0 && (
          <div className="recently-played-section favorites-section">
            <HymnShelfHeader title="Favorites" hymns={favorites} />
            <div className="search-results-list">
              {favorites.map((item, i) => (
                <HymnItem key={item.mp3} hymn={item} type="hymn" index={i} onClick={() => go.hymn(item)} />
              ))}
            </div>
          </div>
        )}

        {showShelves && recentlyPlayed?.length > 0 && (
          <div className="recently-played-section">
            <HymnShelfHeader title="Recently Played" hymns={recentlyPlayed} />
            <div className="search-results-list">
              {recentlyPlayed.map((item, i) => (
                <HymnItem
                  key={item.mp3}
                  hymn={item}
                  type="hymn"
                  index={i}
                  onClick={() => go.hymn(item)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
      <img className="churchImg" src={Church} alt="church" />
    </div>
  );
}

export default Home;