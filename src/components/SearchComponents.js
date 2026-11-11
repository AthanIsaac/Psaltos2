import { FavoriteButton, PlayAllButton } from './PlaybackControls.js';
import HymnsData from '../hymns.json';
import { hymnPath, browsePath } from '../utils/routes.js';
import { Link } from 'react-router-dom';
import HymnItem from '../HymnItem.js';
import Audio from '../Audio.js';
import ArtistData from '../artists.json';

const isDebugMode = () =>
  process.env.NODE_ENV === 'development' &&
  new URLSearchParams(window.location.search).has('showScores');

export const SearchItem = ({ hymn, index, onClick, isActive = false }) => (
  <div
    id={`main-search-option-${index}`}
    role="option"
    aria-selected={isActive}
    className={`main-search-result${isActive ? ' is-active' : ''}`}
    onClick={onClick}
  >
    <div className="main-search-result-title">{hymn.name}</div>
    <div className="main-search-result-meta">
      <span className="main-search-result-artist">{hymn.artist}</span>
      <span className="main-search-result-season">{hymn.season}</span>
    </div>
  </div>
);

export const SearchResults = ({
  searchResults,
  searchMeta,
  searchTiming,
  expandedHymns,
  toggleHymnExpansion,
  handleShowMoreResults,
  goBackToHome,
  navigate,
}) => (
  <div className="search-results-compact">
    <div className="search-results-header">
      <button className="search-back-btn" onClick={goBackToHome}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 13L5 8L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Home
      </button>
      <div className="search-results-meta">
        <span className="search-results-count-label">{searchResults.length} results</span>
        {searchMeta.hasMore && !searchMeta.showingAll && <span>· top matches</span>}
      </div>
    </div>

    {searchResults.length > 0 && (
      <div className="list-toolbar"><PlayAllButton hymns={searchResults} /></div>
    )}
    <div className="search-results-list">
      {searchResults.length === 0 ? (
        <div className="search-no-results">
          <div className="search-no-results-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5L21 3V16M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C7.65685 15 9 16.3431 9 18ZM21 16C21 17.6569 19.6569 19 18 19C16.3431 19 15 17.6569 15 16C15 14.3431 16.3431 13 18 13C19.6569 13 21 14.3431 21 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>No hymns found</h3>
          <p>Try different keywords or check your spelling.</p>
        </div>
      ) : (
        <>
          {searchResults.map((hymn, index) => {
            const hymnId = `${hymn.name}-${hymn.artist}-${hymn.season || 'unknown'}-${index}`;
            return (
              <HymnItem
                key={index}
                hymn={hymn}
                type="search"
                index={index}
                isExpanded={expandedHymns.has(hymnId)}
                score={hymn._swScore}
                showScore={isDebugMode()}
                onExpand={toggleHymnExpansion}
                onGoto={() => navigate(hymnPath(hymn))}
              />
            );
          })}

          {searchMeta.hasMore && searchResults.length < 100 && (
            <button className="show-more-btn" onClick={handleShowMoreResults}>
              Load 10 more · {searchResults.length} of {Math.min(searchMeta.totalResults, 100)} shown
            </button>
          )}
        </>
      )}
    </div>
  </div>
);

const normalizeName = (name) => name.toLowerCase().replace(/[^a-z0-9\u0080-\uffff]+/g, ' ').trim();

export const IndividualHymn = ({ selectedHymn, navigate }) => {
  if (!selectedHymn || typeof selectedHymn !== 'object') return null;

  const artistInfo = ArtistData.find(a => a.artistName === selectedHymn.artist);
  const key = normalizeName(selectedHymn.name);
  const otherRecordings = HymnsData.filter(h => h.mp3 !== selectedHymn.mp3 && normalizeName(h.name) === key);

  return (
    <div className="individual-hymn-page">
      <button
        className="individual-hymn-back"
        onClick={() => navigate('/')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 13L5 8L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="individual-hymn-header">
        <div className="individual-hymn-avatar">
          {artistInfo?.img
            ? <img src={artistInfo.img} alt={selectedHymn.artist} />
            : <span className="individual-hymn-avatar-initial">{selectedHymn.artist?.charAt(0)}</span>
          }
        </div>
        <div className="individual-hymn-info">
          <div className="individual-hymn-label">Hymn</div>
          <h1 className="individual-hymn-title">
            {selectedHymn.name} <FavoriteButton hymn={selectedHymn} />
          </h1>
          <div className="individual-hymn-meta">
            <Link
              className="individual-hymn-artist"
              to={browsePath('cantor', ArtistData.find(a => a.artistName === selectedHymn.artist))}
            >
              {selectedHymn.artist}
            </Link>
            <span className="individual-hymn-season-pill">{selectedHymn.season}</span>
          </div>
        </div>
      </div>

      <div className="individual-hymn-player">
        <Audio hymn={selectedHymn} autoPlay={true} />
      </div>

      {otherRecordings.length > 0 && (
        <section className="other-recordings">
          <div className="shelf-header">
            <h2 className="recently-played-title">
              Other recordings · {otherRecordings.length}
            </h2>
            <PlayAllButton hymns={[selectedHymn, ...otherRecordings]} label="Play all recordings" />
          </div>
          <div className="search-results-list">
            {otherRecordings.map((h, i) => (
              <HymnItem
                key={h.mp3}
                hymn={h}
                type="cantor"
                index={i}
                onClick={() => navigate(hymnPath(h))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const SearchDropdown = ({
  showDropdown,
  filteredHymns,
  activeIndex = -1,
  onSelect,
}) => {
  if (!showDropdown || filteredHymns.length === 0) return null;

  return (
    // preventDefault on mousedown keeps focus in the input so the click lands before blur closes the list
    <div id="main-search-listbox" role="listbox" onMouseDown={(e) => e.preventDefault()}>
      {filteredHymns.slice(0, 8).map((hymnItem, index) => (
        <SearchItem
          key={index}
          hymn={hymnItem}
          index={index}
          isActive={index === activeIndex}
          onClick={() => onSelect(hymnItem)}
        />
      ))}
    </div>
  );
};
