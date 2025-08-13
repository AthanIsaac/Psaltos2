import "./style.css";
import "./styleguide.css";
import "./cantorTab.css";
import "./searchResultsStyles.css";
import logo from './img/logo.svg';
import search from './img/search.svg';
import jesus from './img/jesus.svg';
import Navbar from "./Navbar.js";
import Footer from "./Footer.js";
import Church from "./img/church.svg";
import Nativity from "./img/Nativity.jpg";
import Audio from "./Audio.js";
import Resurrection from "./img/resurrection.jpg";
import Theophany from "./img/theopany.jpg";
import Apostles from "./img/apostles.jpg";
import SundayTesbaha from "./img/tasbeha.jpg";
import Weekday from "./img/weekdayTasbeha.jpg";
import SundayVespers from "./img/vespers.jpg"
import ArtistIcon from "./img/icons/artistIcon.js";
import HymnsData from "./hymns.json";
import ArtistData from "./artists.json";
import SeasonsData from "./seasons.json";
import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createSmithWatermanSearch } from "./smithWatermanSearch.js";

function Home() {
  // URL parameters and navigation
  const params = useParams();
  const navigate = useNavigate();
  
  // State management
  const [hymnData, setHymnData] = useState([]);
  const [hymn, setHymn] = useState("");
  const [artistData, setArtistData] = useState([]);
  const [filteredHymns, setFilteredHymns] = useState([]);
  const [selectedHymn, setSelectedHymn] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState();
  const [selectedArtist, setSelectedArtist] = useState();
  const [expandedHymns, setExpandedHymns] = useState(new Set());
  const [browseMode, setBrowseMode] = useState('cantor');
  const [click, setClick] = useState(0);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTiming, setSearchTiming] = useState({ smithWaterman: 0 });
  const [searchMeta, setSearchMeta] = useState({ hasMore: false, totalResults: 0, cutoffPosition: 0, showingAll: false });
  const [currentPage, setCurrentPage] = useState(1);
  const [allSearchResults, setAllSearchResults] = useState([]);
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBarRef = useRef(null);

  // Data initialization
  useEffect(() => {
    setHymnData(HymnsData);
    setFilteredHymns([]);
    setArtistData(ArtistData);
  }, []);

  // Scroll detection for sticky search - optimized with better throttling
  useEffect(() => {
    let ticking = false;
    let lastScrollTime = 0;
    let lastShowStickySearch = showStickySearch;
    const THROTTLE_DELAY = 100; // Increased throttle delay
    
    const handleScroll = () => {
      const now = Date.now();
      
      // More aggressive throttling - only process if enough time has passed
      if (now - lastScrollTime < THROTTLE_DELAY) {
        return;
      }
      
      if (!ticking) {
        requestAnimationFrame(() => {
          if (searchBarRef.current) {
            const searchBarRect = searchBarRef.current.getBoundingClientRect();
            const headerHeight = 80; // Approximate navbar height
            const isSearchBarBehindHeader = searchBarRect.top < headerHeight;
            const newShowStickySearch = isSearchBarBehindHeader;
            
            // Only update state if the value actually changed
            if (lastShowStickySearch !== newShowStickySearch) {
              lastShowStickySearch = newShowStickySearch;
              setShowStickySearch(newShowStickySearch);
            }
          }
          ticking = false;
          lastScrollTime = now;
        });
        ticking = true;
      }
    };

    // Use passive scroll listener with better throttling
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showSearchResults]); // Removed showStickySearch dependency to prevent re-binding

  // Create search function using Smith-Waterman algorithm
  const performSearch = useMemo(() => {
    return createSmithWatermanSearch(hymnData);
  }, [hymnData]);

  // URL parameter synchronization
  useEffect(() => {
    if (!hymnData.length || !artistData.length) return;

    // Clear search results when not on search page
    if (!params.query && !params.hymnName) {
      setShowSearchResults(false);
      setSearchResults([]);
      setAllSearchResults([]);
      setSearchQuery('');
      setHymn('');
      // Don't clear expandedHymns here - preserve user's expanded state
    }

    // Handle individual hymn URLs
    if (params.hymnName && params.artist) {
      const decodedHymnName = decodeURIComponent(params.hymnName);
      const decodedArtist = decodeURIComponent(params.artist);
      
      // Find the specific hymn
      const specificHymn = hymnData.find(h =>
        h.name === decodedHymnName && h.artist === decodedArtist
      );
      
      if (specificHymn) {
        setSelectedHymn(specificHymn);
        setShowSearchResults(false);
        setSelectedArtist();
        setSelectedSeason();
        return;
      }
    }

    // Handle search URLs
    if (params.query) {
      const decodedQuery = decodeURIComponent(params.query);
      const pageFromUrl = params.page ? parseInt(params.page, 10) : 1;
      
      setSearchQuery(decodedQuery);
      setHymn(decodedQuery);
      
      // Measure Smith-Waterman search time
      const startTime = performance.now();
      const searchResult = performSearch(decodedQuery);
      const allResults = performSearch(decodedQuery, { showAll: true });
      const endTime = performance.now();
      
      // Calculate results to show based on page from URL
      const pageSize = 10;
      const initialCount = searchResult.cutoffPosition || searchResult.results.length;
      const additionalResults = (pageFromUrl - 1) * pageSize;
      const totalToShow = initialCount + additionalResults;
      
      const resultsToShow = pageFromUrl > 1 ? allResults.results.slice(0, totalToShow) : searchResult.results;
      const hasMoreResults = totalToShow < allResults.totalResults;
      
      setSearchResults(resultsToShow);
      setAllSearchResults(allResults.results);
      setSearchMeta({
        hasMore: pageFromUrl > 1 ? hasMoreResults : searchResult.hasMore,
        totalResults: searchResult.totalResults,
        cutoffPosition: searchResult.cutoffPosition,
        showingAll: pageFromUrl > 1 ? !hasMoreResults : false
      });
      setCurrentPage(pageFromUrl);
      setSearchTiming({
        smithWaterman: endTime - startTime
      });
      setShowSearchResults(true);
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
          encodeURIComponent(a.artistName.toLowerCase().replace(/\s+/g, '-')) === params.artist
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
  }, [params, hymnData, artistData, performSearch]);

  // Helper function to encode artist name for URL
  const encodeArtistName = (artistName) => {
    return encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'));
  };

  // Helper function to scroll to content with smooth animation
  const scrollToContent = useCallback((delay = 300) => {
    setTimeout(() => {
      // Find the main content area (TabList or similar)
      const contentElement = document.querySelector('.TabList') ||
                           document.querySelector('.cantor-season-layout') ||
                           document.querySelector('.seasonContainer');
      
      if (contentElement) {
        const headerHeight = 120; // Account for navbar and title
        const elementTop = contentElement.getBoundingClientRect().top + window.pageYOffset;
        const scrollToPosition = Math.max(0, elementTop - headerHeight);
        
        window.scrollTo({
          top: scrollToPosition,
          behavior: 'smooth'
        });
      }
    }, delay);
  }, []);

  // Handle scrolling when URL parameters change (for navigation from external sources)
  useEffect(() => {
    if (params.mode || params.season || params.query || params.hymnName) {
      scrollToContent(500); // Longer delay for URL parameter changes
    }
  }, [params.mode, params.season, params.query, params.hymnName, scrollToContent]);

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
  }, [navigate]);

  // Debounced search to prevent excessive re-renders
  const debouncedSearch = useCallback(
    useMemo(() => {
      let timeoutId;
      return (input) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (input.trim()) {
            const result = performSearch(input.trim());
            setFilteredHymns(result.results);
          } else {
            setFilteredHymns([]);
          }
        }, 500); // 500ms debounce delay - optimized for better performance
      };
    }, [performSearch]),
    [performSearch]
  );

  const hymnSearch = useCallback((event) => {
    const input = event.target.value;
    setHymn(input);
    setSearchQuery(input);
    setShowDropdown(input.trim().length > 0);
    
    // Use debounced search to prevent excessive calls
    debouncedSearch(input);
  }, [debouncedSearch]);

  // Separate search handler for navbar that doesn't affect main dropdown
  const handleNavbarSearch = useCallback((event) => {
    const input = event.target.value;
    // Don't update main search states, let navbar handle its own dropdown
    if (input.trim()) {
      const result = performSearch(input.trim());
      // Only update search results for navbar, not main dropdown
      return result.results;
    }
    return [];
  }, [performSearch]);

  const handleSearchKeyPress = useCallback((event) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      // Measure Smith-Waterman search time
      const startTime = performance.now();
      const searchResult = performSearch(searchQuery);
      const allResults = performSearch(searchQuery, { showAll: true });
      const endTime = performance.now();
      
      setSearchResults(searchResult.results);
      setAllSearchResults(allResults.results);
      setSearchMeta({
        hasMore: searchResult.hasMore,
        totalResults: searchResult.totalResults,
        cutoffPosition: searchResult.cutoffPosition,
        showingAll: false
      });
      setCurrentPage(1);
      setSearchTiming({
        smithWaterman: endTime - startTime
      });
      setShowSearchResults(true);
      setShowDropdown(false);
      updateURL(null, null, null, null, searchQuery, 1);
      scrollToContent();
    }
  }, [searchQuery, performSearch, updateURL, scrollToContent]);

  // Navigation helpers - memoized to prevent unnecessary re-renders
  const goBackToHome = useCallback(() => {
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
    setAllSearchResults([]);
    setSearchMeta({ hasMore: false, totalResults: 0, cutoffPosition: 0, showingAll: false });
    setCurrentPage(1);
    setSearchTiming({ smithWaterman: 0 });
    setShowDropdown(false);
    setHymn('');
    navigate('/');
  }, [navigate]);

  // Show more results handler - loads next 10 results incrementally
  const handleShowMoreResults = useCallback(() => {
    if (!searchQuery.trim() || !allSearchResults.length) return;
    
    const startTime = performance.now();
    const nextPage = currentPage + 1;
    const pageSize = 10;
    
    // Calculate how many results to show (initial filtered + additional pages)
    const initialCount = searchMeta.cutoffPosition || (searchResults.length > 0 ? searchResults.length : 10);
    const additionalResults = (nextPage - 1) * pageSize;
    const totalToShow = initialCount + additionalResults;
    
    // Use the cached allSearchResults instead of re-searching
    const newResults = allSearchResults.slice(0, totalToShow);
    const hasMoreResults = totalToShow < allSearchResults.length;
    
    const endTime = performance.now();
    
    setSearchResults(newResults);
    setCurrentPage(nextPage);
    setSearchMeta(prev => ({
      ...prev,
      hasMore: hasMoreResults,
      showingAll: !hasMoreResults
    }));
    setSearchTiming({
      smithWaterman: endTime - startTime
    });
    
    // Update URL with new page number
    updateURL(null, null, null, null, searchQuery, nextPage);
  }, [searchQuery, allSearchResults, currentPage, searchMeta.cutoffPosition, searchResults.length, updateURL]);

  const resetSelections = useCallback((preserveExpanded = false) => {
    setSelectedArtist();
    setSelectedSeason();
    setSelectedHymn(null);
    if (!preserveExpanded) {
      setExpandedHymns(new Set());
    }
    setClick(0);
    setSeasonFilter('all');
  }, []);

  const toggleBrowseMode = useCallback(() => {
    resetSelections(false); // Clear expanded hymns when switching browse modes
    const newMode = browseMode === 'cantor' ? 'season' : 'cantor';
    setBrowseMode(newMode);
    updateURL(newMode, null, null, null, null);
    scrollToContent();
  }, [browseMode, resetSelections, updateURL, scrollToContent]);

  // Hymn expansion logic - optimized with useCallback
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
        
        // Scroll to the hymn element after expansion with proper offset for navbar
        setTimeout(() => {
          const hymnElement = document.querySelector(`[data-hymn-id="${hymnId}"]`);
          if (hymnElement) {
            const navbarHeight = 120; // Height of the navbar
            const elementTop = hymnElement.getBoundingClientRect().top + window.pageYOffset;
            const scrollToPosition = Math.max(0, elementTop - navbarHeight);
            
            window.scrollTo({
              top: scrollToPosition,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
      
      return newSet;
    });
  }, []);

  // Season categorization and filtering
  const categorizeSeasons = (seasons) => ({
    annual: seasons.filter(season => 
      season.toLowerCase().includes('annual') || season.toLowerCase().includes('liturg')
    ),
    feasts: seasons.filter(season => season.toLowerCase().includes('feast')),
    fasts: seasons.filter(season => season.toLowerCase().includes('fast')),
    other: seasons.filter(season => {
      const lowerSeason = season.toLowerCase();
      return !lowerSeason.includes('annual') &&
             !lowerSeason.includes('liturg') &&
             !lowerSeason.includes('feast') &&
             !lowerSeason.includes('fast');
    })
  });

  const getFilteredCategories = (categorizedSeasons) => {
    if (seasonFilter === 'all') return categorizedSeasons;
    return {
      annual: seasonFilter === 'annual' ? categorizedSeasons.annual : [],
      feasts: seasonFilter === 'feasts' ? categorizedSeasons.feasts : [],
      fasts: seasonFilter === 'fasts' ? categorizedSeasons.fasts : [],
      other: seasonFilter === 'other' ? categorizedSeasons.other : []
    };
  };

  // Season image rendering
  const seasonRender = (season) => {
    const seasonData = SeasonsData.find(s => s.seasonName === season);
    
    if (seasonData && seasonData.img !== 'placeholder.jpg') {
      return <img src={seasonData.img} alt={`${season} Season`} />;
    }
    
    // Fallback images
    const imageMap = {
      'Nativity': Nativity,
      'Major Feasts of the Lord - Nativity': Nativity,
      'Resurrection': Resurrection,
      'Major Feasts of the Lord - Resurrection': Resurrection,
      'Theophany': Theophany,
      'Major Feasts of the Lord - Epiphany': Theophany,
      'Apostles Fast': Apostles,
      'Fasts - Apostles': Apostles,
      'Sunday Tasbeha (Midnight Praises)': SundayTesbaha,
      'Weekday Tasbeha (Midnight Praises)': Weekday,
      'Sunday Vespers Praise': SundayVespers
    };

    const imageSrc = imageMap[season] || SundayTesbaha;
    return <img src={imageSrc} alt={`${season} Season`} />;
  };

  // Reusable components - memoized to prevent unnecessary re-renders
  const HeaderComponent = useCallback(({ placeHolder }) => (
    <div className="headerContainer">
      <h1>{placeHolder}</h1>
    </div>
  ), []);

  const BackButton = useCallback(({ onClick, text = "← Back" }) => (
    <button
      onClick={onClick}
      className="back-button"
    >
      {text}
    </button>
  ), []);

  const SeasonFilterButtons = () => (
    <div className="season-filter-container">
      {['all', 'annual', 'feasts', 'fasts', 'other'].map(filter => (
        <button
          key={filter}
          onClick={() => setSeasonFilter(filter)}
          className={`season-filter-button ${seasonFilter === filter ? 'active' : 'inactive'}`}
        >
          {filter === 'all' ? 'All Categories' : filter}
        </button>
      ))}
    </div>
  );

  const SeasonCategory = ({ title, seasons }) => (
    seasons.length > 0 && (
      <div className="seasonCategorySection">
        <h2 className="season-category-title">
          {title}
        </h2>
        <div className="seasonContainer">
          {seasons.map((season, index) => (
            <div key={index} className="seasonItem" onClick={() => {
              setSelectedSeason(season);
              if (browseMode === 'cantor' && selectedArtist) {
                updateURL(browseMode, selectedArtist, season, null, null);
              } else {
                updateURL('season', null, season, null, null);
              }
              scrollToContent();
            }}>
              {seasonRender(season)}
              <HeaderComponent placeHolder={season} />
            </div>
          ))}
        </div>
      </div>
    )
  );

  const CategorizedSeasons = ({ filteredCategories }) => (
    <>
      <SeasonCategory title="Annual" seasons={filteredCategories.annual} />
      <SeasonCategory title="Feasts" seasons={filteredCategories.feasts} />
      <SeasonCategory title="Fasts" seasons={filteredCategories.fasts} />
      <SeasonCategory title="Other" seasons={filteredCategories.other} />
    </>
  );

  // Create a memoized component that only re-renders when its specific expansion state changes
  const ExpandableHymnItemMemo = memo(({ hymn, hymnId, title, isExpanded, onToggle }) => {
    return (
      <div className="expandable-hymn-container" data-hymn-id={hymnId}>
        <div
          className="hymnTitleBackground expandable-hymn-title"
          onClick={(e) => onToggle(hymnId, e)}
        >
          <HeaderComponent placeHolder={title} />
          <div className="expand-indicator">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
        
        {isExpanded && (
          <div className="hymn-content-expanded">
            <Audio hymn={hymn} autoLoad={true} />
          </div>
        )}
      </div>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if this specific hymn's expansion state or hymn data changes
    return (
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.hymn?.mp3 === nextProps.hymn?.mp3 &&
      prevProps.hymn?.name === nextProps.hymn?.name &&
      prevProps.title === nextProps.title &&
      prevProps.hymnId === nextProps.hymnId
    );
  });

  // Wrapper component that passes the expansion state
  const ExpandableHymnItem = useCallback(({ hymn, hymnId, title }) => {
    const isExpanded = expandedHymns.has(hymnId);
    
    return (
      <ExpandableHymnItemMemo
        hymn={hymn}
        hymnId={hymnId}
        title={title}
        isExpanded={isExpanded}
        onToggle={toggleHymnExpansion}
      />
    );
  }, [expandedHymns, toggleHymnExpansion]);

  // Artist components
  const ArtistCard = ({ artist }) => (
    <div className="seasonItem" onClick={() => {
      setSelectedArtist(artist);
      updateURL(browseMode, artist, null, null, null);
      scrollToContent();
    }}>
      <img src={artist.img} alt={`${artist.artistName}`} />
      <HeaderComponent placeHolder={artist.artistName} />
    </div>
  );

  const SelectedArtist = () => (
    <div className="seasonContainer">
      <div className="seasonItem selectedSeasonItem" onClick={() => {
        setSelectedArtist();
        setSelectedSeason();
        updateURL(browseMode, null, null, null, null);
      }}>
        <img src={selectedArtist.img} alt={`${selectedArtist.artistName}`} className="artist-image" />
        <div className="headerContainer artist-header-spacing">
          <h1>{selectedArtist.artistName}</h1>
        </div>
        <div className="artist artist-label-spacing">
          <span>
            <ArtistIcon />
            <p>CANTOR</p>
          </span>
        </div>
      </div>
    </div>
  );

  // Navigation arrows
  const NavigationArrow = ({ direction, onClick }) => (
    <svg 
      className={`${direction}Arrow`} 
      onClick={onClick} 
      width="22" 
      height="32" 
      viewBox="0 0 22 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1.05873 17.5848C0.0187157 16.7842 0.0187151 15.2158 1.05873 14.4152L18.28 1.15824C19.5951 0.145845 21.5 1.08337 21.5 2.74305V29.2569C21.5 30.9166 19.5951 31.8542 18.28 30.8418L1.05873 17.5848Z" />
    </svg>
  );

  // Main render functions
  const ArtistList = () => {
    const nextFour = () => setClick(prev => Math.min(prev + 4, artistData.length - 4));
    const prevFour = () => setClick(prev => Math.max(prev - 4, 0));

    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder="cantors" />
          <p>Choose a Coptic deacon to enrich your spiritual journey with traditional hymns</p>
        </span>
        {!selectedArtist ? (
          <span>
            <NavigationArrow direction="left" onClick={prevFour} />
            <div className="list">
              {artistData.slice(click, click + 4).map((artist, index) => (
                <div key={index}>
                  <ArtistCard artist={artist} />
                </div>
              ))}
            </div>
            <NavigationArrow direction="right" onClick={nextFour} />
          </span>
        ) : (
          <div><SelectedArtist /></div>
        )}
      </div>
    );
  };

  const renderSeasons = () => {
    const seasons = [...new Set(hymnData.filter(hymn => hymn.artist === selectedArtist.artistName).map(hymn => hymn.season))];
    const categorizedSeasons = categorizeSeasons(seasons);
    const filteredCategories = getFilteredCategories(categorizedSeasons);

    return (
      <div className="TabList">
        {!selectedSeason ? (
          <>
            <span>
              <HeaderComponent placeHolder="Seasons" />
              <p>Choose a liturgical season to explore hymns by this cantor</p>
            </span>
            <SeasonFilterButtons />
            <CategorizedSeasons filteredCategories={filteredCategories} />
          </>
        ) : (
          <div className="seasonContainer">
            <div className="seasonItem selectedSeasonItem" onClick={() => {
              setSelectedSeason();
              updateURL(browseMode, selectedArtist, null, null, null);
            }}>
              {seasonRender(selectedSeason)}
              <HeaderComponent placeHolder={selectedSeason} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHymns = () => {
    const hymns = [...new Set(hymnData.filter(hymn => 
      hymn.artist === selectedArtist.artistName && hymn.season === selectedSeason
    ))];

    return (
      <div>
        {hymns.map((hymn, index) => {
          const hymnId = `${hymn.name}-${hymn.artist}`;
          return (
            <ExpandableHymnItem 
              key={index}
              hymn={hymn}
              hymnId={hymnId}
              title={hymn.name}
            />
          );
        })}
      </div>
    );
  };

  const renderAllSeasons = () => {
    const allSeasons = [...new Set(hymnData.map(hymn => hymn.season))];
    const categorizedSeasons = categorizeSeasons(allSeasons);
    const filteredCategories = getFilteredCategories(categorizedSeasons);
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder="Seasons" />
          <p>Choose a liturgical season to explore hymns</p>
        </span>
        
        {/* Filter Buttons */}
        <SeasonFilterButtons />
        
        {/* Annual Seasons */}
        {filteredCategories.annual.length > 0 && (
          <div className="seasonCategorySection">
            <h2 className="season-category-title">Annual</h2>
            <div className="seasonContainer">
              {filteredCategories.annual.map((season, index) => (
                <div key={`annual-${index}`} className="seasonItem" onClick={() => {
                  setSelectedSeason(season);
                  updateURL('season', null, season, null, null);
                  scrollToContent();
                }}>
                  {seasonRender(season)}
                  <HeaderComponent placeHolder={season} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feasts */}
        {filteredCategories.feasts.length > 0 && (
          <div className="seasonCategorySection">
            <h2 className="season-category-title">Feasts</h2>
            <div className="seasonContainer">
              {filteredCategories.feasts.map((season, index) => (
                <div key={`feasts-${index}`} className="seasonItem" onClick={() => {
                  setSelectedSeason(season);
                  updateURL('season', null, season, null, null);
                  scrollToContent();
                }}>
                  {seasonRender(season)}
                  <HeaderComponent placeHolder={season} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fasts */}
        {filteredCategories.fasts.length > 0 && (
          <div className="seasonCategorySection">
            <h2 className="season-category-title">Fasts</h2>
            <div className="seasonContainer">
              {filteredCategories.fasts.map((season, index) => (
                <div key={`fasts-${index}`} className="seasonItem" onClick={() => {
                  setSelectedSeason(season);
                  updateURL('season', null, season, null, null);
                  scrollToContent();
                }}>
                  {seasonRender(season)}
                  <HeaderComponent placeHolder={season} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other */}
        {filteredCategories.other.length > 0 && (
          <div className="seasonCategorySection">
            <h2 className="season-category-title">Other Seasons</h2>
            <div className="seasonContainer">
              {filteredCategories.other.map((season, index) => (
                <div key={`other-${index}`} className="seasonItem" onClick={() => {
                  setSelectedSeason(season);
                  updateURL('season', null, season, null, null);
                  scrollToContent();
                }}>
                  {seasonRender(season)}
                  <HeaderComponent placeHolder={season} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHymnsForSeason = () => {
    const hymnsInSeason = [...new Set(hymnData.filter(hymn => hymn.season === selectedSeason).map(hymn => hymn.name))];
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder={selectedSeason} />
          <p>Choose a hymn to explore different cantor interpretations</p>
          <BackButton onClick={() => {
            setSelectedSeason();
            updateURL('season', null, null, null, null);
          }} text="← Back to Seasons" />
        </span>
        
        {/* Show selected season as a card */}
        <div className="seasonContainer">
          <div className="seasonItem selectedSeasonItem" onClick={() => {
            setSelectedSeason();
            updateURL('season', null, null, null, null);
          }}>
            {seasonRender(selectedSeason)}
            <HeaderComponent placeHolder={selectedSeason} />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', marginTop: '20px' }}>
          {hymnsInSeason.map((hymnName, index) => {
            const hymnRecordings = hymnData.filter(hymn => hymn.season === selectedSeason && hymn.name === hymnName);
            const cantorCount = hymnRecordings.length;
            
            return (
              <div
                key={index}
                className="seasonItem"
                onClick={() => {
                  setSelectedHymn(hymnName);
                  updateURL('season', null, selectedSeason, hymnName, null);
                  scrollToContent();
                }}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginBottom: '10px', opacity: '0.8'}}>
                    <path d="M9 18V5L21 3V16M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C7.65685 15 9 16.3431 9 18ZM21 16C21 17.6569 19.6569 19 18 19C16.3431 19 15 17.6569 15 16C15 14.3431 16.3431 13 18 13C19.6569 13 21 14.3431 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <HeaderComponent placeHolder={hymnName} />
                <div style={{padding: '10px', display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap'}}>
                  {hymnRecordings.slice(0, 4).map((recording, idx) => (
                    <div key={idx} style={{
                      width: '25px',
                      height: '25px',
                      borderRadius: '50%',
                      background: 'var(--primary-color)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }} title={recording.artist}>
                      {recording.artist.charAt(0)}
                    </div>
                  ))}
                  {cantorCount > 4 && (
                    <div style={{
                      width: '25px',
                      height: '25px',
                      borderRadius: '50%',
                      background: 'var(--secondary-color)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 'bold'
                    }}>
                      +{cantorCount - 4}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCantorsForHymn = () => {
    const cantorsForHymn = hymnData.filter(hymn => hymn.name === selectedHymn && hymn.season === selectedSeason);
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder={`Cantors for "${selectedHymn}"`} />
          <p>Listen to different interpretations of this hymn</p>
          <BackButton onClick={() => {
            setSelectedHymn(null);
            updateURL('season', null, selectedSeason, null, null);
          }} text="← Back to Hymns" />
        </span>
        
        {/* Show selected season as a card */}
        <div className="seasonContainer">
          <div className="seasonItem selectedSeasonItem" onClick={() => {
            setSelectedSeason();
            updateURL('season', null, null, null, null);
          }}>
            {seasonRender(selectedSeason)}
            <HeaderComponent placeHolder={selectedSeason} />
          </div>
        </div>
        
        <div>
          {cantorsForHymn.map((hymn, index) => {
            const hymnId = `${hymn.name}-${hymn.artist}`;
            return (
              <ExpandableHymnItem 
                key={index}
                hymn={hymn}
                hymnId={hymnId}
                title={`${hymn.artist} - ${hymn.name}`}
              />
            );
          })}
        </div>
      </div>
    );
  };


  const SearchItem = useCallback(({ hymn, index, onClick }) => (
    <div key={index} className="main-search-result" onClick={onClick}>
      <div className="main-search-result-title">{hymn.name}</div>
      <div className="main-search-result-artist">
        {hymn.artist} • {hymn.season}
      </div>
    </div>
  ), []);

  // Render individual hymn page
  const renderIndividualHymn = () => {
    if (!selectedHymn || typeof selectedHymn !== 'object') return null;
    
    return (
      <div className="TabList">
        <span>
          <HeaderComponent placeHolder={selectedHymn.name} />
          {/* <p>{selectedHymn.artist}</p> */}
          <BackButton onClick={() => {
            setSelectedHymn(null);
            navigate('/');
          }} text="← Back to Home" />
        </span>
        <div className="individual-hymn-container">
          <div className="hymnTitleBackground">
            <HeaderComponent placeHolder={`${selectedHymn.artist} - ${selectedHymn.name}`} />
            <div className="individual-hymn-meta">
              <p><strong>Season:</strong> {selectedHymn.season}</p>
              <p><strong>Cantor:</strong> {selectedHymn.artist}</p>
            </div>
          </div>
          <div className="hymn-content-expanded">
            <Audio hymn={selectedHymn} autoLoad={true} />
          </div>
        </div>
      </div>
    );
  };

  const renderSearchResults = () => (
    <div className="search-results-compact">
      {/* Compact Hero Section */}
      <div className="hymns-hero-section">
        <div className="hymns-hero-content">
          <div className="hymns-hero-badge">Search Results</div>
          <div className="hymns-stats">
            <div className="hymns-stat">
              <span className="hymns-stat-number">{searchResults.length}</span>
              <span className="hymns-stat-label">
                {searchMeta.showingAll ? 'Total Results' : 'Top Results'}
              </span>
            </div>
            <div className="hymns-stat">
              <span className="hymns-stat-number">{searchTiming.smithWaterman.toFixed(1)}</span>
              <span className="hymns-stat-label">ms Search Time</span>
            </div>
            {searchMeta.totalResults > searchResults.length && (
              <div className="hymns-stat">
                <span className="hymns-stat-number">{Math.min(searchMeta.totalResults, 100)}</span>
                <span className="hymns-stat-label">Total Available</span>
              </div>
            )}
          </div>
          <button className="hymns-back-button" onClick={goBackToHome}>
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Search Results Info */}
      {searchMeta.hasMore && !searchMeta.showingAll && (
        <div className="search-results-info">
          <div className="search-filter-notice">
            <span className="search-filter-icon">🎯</span>
            <div className="search-filter-text">
              <strong>Smart filtering applied:</strong> Showing {searchResults.length} most relevant results out of {Math.min(searchMeta.totalResults, 100)} total matches.
              <br />
              <small>Results are filtered based on natural quality breakpoints in the scoring system.</small>
            </div>
          </div>
        </div>
      )}

      {/* Compact Search Results List */}
      <div className="search-results-list">
        {searchResults.length === 0 ? (
          <div className="search-no-results">
            <h3 className="search-no-results-title">No hymns found matching your search.</h3>
            <p>Try searching with different keywords or check your spelling.</p>
          </div>
        ) : (
          <>
            {searchResults.map((hymn, index) => {
              // Use a stable ID that doesn't depend on array index
              const hymnId = `${hymn.name}-${hymn.artist}`;
              const isExpanded = expandedHymns.has(hymnId);
              
              return (
                <div
                  key={index}
                  className="search-result-item-compact"
                  data-hymn-id={hymnId}
                  onClick={(e) => {
                    // Only toggle if clicking on the main content area, not on buttons or audio controls
                    if (e.target === e.currentTarget ||
                        e.target.closest('.search-result-main-content') ||
                        e.target.closest('.search-result-text-content')) {
                      toggleHymnExpansion(hymnId);
                    }
                  }}
                >
                  <div className="search-result-main-content">
                    <div className="search-result-text-content">
                      <h3 className="search-result-title-compact">{hymn.name}</h3>
                      <div className="search-result-meta-compact">
                        <span className="search-result-artist-compact">{hymn.artist}</span>
                        <span className="search-result-season-compact">• {hymn.season}</span>
                        {hymn._swScore && (
                          <span className="search-result-score" title={`Relevance score: ${hymn._swScore.toFixed(1)}`}>
                            • {hymn._swScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="search-result-actions">
                    <button
                      className={`search-result-expand-btn ${isExpanded ? 'expanded' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHymnExpansion(hymnId, e);
                      }}
                      title={isExpanded ? 'Collapse' : 'Expand to play'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <button
                      className="search-result-goto-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}`);
                        scrollToContent();
                      }}
                      title="Go to hymn page"
                    >
                      →
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div
                      className="search-result-expanded-content"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Audio hymn={hymn} autoLoad={true} compact={true} />
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Show More Results Button */}
            {searchMeta.hasMore && searchResults.length < 100 && (
              <div className="show-more-results-container">
                <button
                  className="show-more-results-btn"
                  onClick={handleShowMoreResults}
                >
                  Show Next 10 Results
                  <small>({searchResults.length} of {Math.min(searchMeta.totalResults, 100)} shown)</small>
                </button>
              </div>
            )}
            
            {!searchMeta.hasMore && searchMeta.totalResults > searchMeta.cutoffPosition && (
              <div className="search-results-footer">
                <div className="search-results-note">
                  <span className="search-note-icon">ℹ️</span>
                  Showing all {searchResults.length} results. The first {searchMeta.cutoffPosition} were identified as most relevant by smart filtering.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="mainContainer">
      <div className="backgroundOverlay"></div>
      <div className="contents">
        <Navbar
          onSearch={handleNavbarSearch}
          searchValue={hymn}
          showStickySearch={showStickySearch}
          searchResults={[]} // Navbar will handle its own search results
          onSearchResultClick={(hymn) => {
            // Navigate to individual hymn page
            navigate(`/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}`);
          }}
          performSearch={performSearch} // Pass search function to navbar
        />
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
                if (hymn.trim().length > 0) {
                  setShowDropdown(true);
                }
              }}
              onBlur={() => {
                // Delay hiding dropdown to allow clicks on results
                setTimeout(() => setShowDropdown(false), 200);
              }}
            />
            <img src={search} alt="search" />
          </div>
          {showDropdown && filteredHymns.length > 0 && (
            <div>
              {filteredHymns.slice(0, 8).map((hymnItem, index) => (
                <SearchItem
                  key={index}
                  hymn={hymnItem}
                  index={index}
                  onClick={() => {
                    setShowDropdown(false);
                    setHymn('');
                    navigate(`/hymn/${encodeURIComponent(hymnItem.name)}/${encodeURIComponent(hymnItem.artist)}`);
                    scrollToContent();
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Compact Toggle Button */}
        <button
          onClick={toggleBrowseMode}
          style={{
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            margin: '10px auto',
            display: 'block',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minWidth: 'auto',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
          }}
        >
          {browseMode === 'cantor' ? 'Browse by Season' : 'Browse by Cantor'}
        </button>

        {showSearchResults ? renderSearchResults() :
         selectedHymn && typeof selectedHymn === 'object' ? renderIndividualHymn() : (
          <>
            {browseMode === 'cantor' && (
              <>
                {selectedArtist && selectedSeason ? (
                  <div className="cantor-season-layout">
                    <div className="selected-cantor-season">
                      <div className="seasonContainer">
                        <div className="seasonItem selectedSeasonItem" onClick={() => {
                          setSelectedArtist();
                          setSelectedSeason();
                          updateURL(browseMode, null, null, null, null);
                        }}>
                          <img src={selectedArtist.img} alt={`${selectedArtist.artistName}`} />
                          <div className="headerContainer">
                            <h1>{selectedArtist.artistName}</h1>
                          </div>
                          <div className="artist artist-label-spacing">
                            <span>
                              <ArtistIcon />
                              <p>CANTOR</p>
                            </span>
                          </div>
                        </div>
                        <div className="seasonItem selectedSeasonItem" onClick={() => {
                          setSelectedSeason();
                          updateURL(browseMode, selectedArtist, null, null, null);
                        }}>
                          {seasonRender(selectedSeason)}
                          <HeaderComponent placeHolder={selectedSeason} />
                        </div>
                      </div>
                    </div>
                    {renderHymns()}
                  </div>
                ) : (
                  <>
                    {ArtistList()}
                    {selectedArtist && renderSeasons()}
                  </>
                )}
              </>
            )}

            {browseMode === 'season' && (
              <>
                {!selectedSeason && renderAllSeasons()}
                {selectedSeason && !selectedHymn && renderHymnsForSeason()}
                {selectedSeason && selectedHymn && renderCantorsForHymn()}
              </>
            )}
          </>
        )}
        
        <Footer />
      </div>
      <img className="churchImg" src={Church} alt="church" />
    </div>
  );
}

export default Home;