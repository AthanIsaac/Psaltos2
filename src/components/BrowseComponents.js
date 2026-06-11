import React, { useState } from 'react';
import HymnItem from '../HymnItem.js';
import { HeaderComponent, BackButton } from './SharedComponents.js';
import { getSeasonImageUrl, categorizeSeasons, getFilteredCategories } from '../utils/seasonUtils.js';

const SeasonScrollCard = ({ season, onClick }) => (
  <div className="season-scroll-card" onClick={() => onClick(season)}>
    <div className="season-scroll-card-img-wrap">
      <img src={getSeasonImageUrl(season)} alt={season} />
    </div>
    <div className="season-scroll-card-name">{season}</div>
  </div>
);

const CantorScrollCard = ({ artist, onClick }) => (
  <div className="cantor-scroll-card" onClick={() => onClick(artist)}>
    <div className="cantor-scroll-card-img-wrap">
      <img src={artist.img} alt={artist.artistName} />
    </div>
    <div className="cantor-scroll-card-name">{artist.artistName}</div>
    <div className="cantor-scroll-card-label">Cantor</div>
  </div>
);


export const SelectedChip = ({ imageSrc, label, name, onClear }) => (
  <div className="selected-chip" onClick={onClear}>
    <img src={imageSrc} alt={name} className="selected-chip-image" />
    <div className="selected-chip-info">
      <div className="selected-chip-label">{label}</div>
      <div className="selected-chip-name">{name}</div>
    </div>
    <span className="selected-chip-dismiss">×</span>
  </div>
);

export const SelectedArtist = ({ selectedArtist, onClear }) => (
  <SelectedChip
    imageSrc={selectedArtist.img}
    label="Cantor"
    name={selectedArtist.artistName}
    onClear={onClear}
  />
);

export const SeasonCategory = ({ title, seasons, onSeasonClick }) => {
  const [showAll, setShowAll] = useState(false);
  if (!seasons.length) return null;

  return (
    <div className="scroll-section">
      <div className="scroll-section-header">
        <h2 className="scroll-section-title">{title}</h2>
        <button className="show-all-btn" onClick={() => setShowAll(s => !s)}>
          {showAll ? 'Show less' : 'Show all'}
        </button>
      </div>
      {showAll ? (
        <div className="card-wrap-grid">
          {seasons.map((season, index) => (
            <SeasonScrollCard key={index} season={season} onClick={onSeasonClick} />
          ))}
        </div>
      ) : (
        <div className="scroll-row-wrapper">
          <div className="scroll-row">
            {seasons.map((season, index) => (
              <SeasonScrollCard key={index} season={season} onClick={onSeasonClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const CategorizedSeasons = ({ filteredCategories, onSeasonClick }) => (
  <>
    <SeasonCategory title="Annual" seasons={filteredCategories.annual} onSeasonClick={onSeasonClick} />
    <SeasonCategory title="Feasts" seasons={filteredCategories.feasts} onSeasonClick={onSeasonClick} />
    <SeasonCategory title="Fasts"  seasons={filteredCategories.fasts}  onSeasonClick={onSeasonClick} />
    <SeasonCategory title="Other"  seasons={filteredCategories.other}  onSeasonClick={onSeasonClick} />
  </>
);

export const ArtistList = ({ artistData, selectedArtist, onArtistSelect }) => {
  const [showAll, setShowAll] = useState(false);

  if (selectedArtist) {
    return <SelectedArtist selectedArtist={selectedArtist} onClear={() => onArtistSelect(null)} />;
  }

  return (
    <div className="TabList">
      <div className="scroll-section">
        <div className="scroll-section-header">
          <span className="scroll-section-title">Cantors</span>
          <button className="show-all-btn" onClick={() => setShowAll(s => !s)}>
            {showAll ? 'Show less' : 'Show all'}
          </button>
        </div>
        {showAll ? (
          <div className="card-wrap-grid">
            {artistData.map((artist, index) => (
              <CantorScrollCard key={index} artist={artist} onClick={onArtistSelect} />
            ))}
          </div>
        ) : (
          <div className="scroll-row-wrapper">
            <div className="scroll-row">
              {artistData.map((artist, index) => (
                <CantorScrollCard key={index} artist={artist} onClick={onArtistSelect} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const SeasonsForArtist = ({ seasons, selectedSeason, onSeasonSelect, onBack }) => {
  const categorizedSeasons = categorizeSeasons(seasons);
  const filteredCategories = getFilteredCategories(categorizedSeasons, 'all');

  return (
    <div className="TabList">
      {!selectedSeason ? (
        <CategorizedSeasons filteredCategories={filteredCategories} onSeasonClick={onSeasonSelect} />
      ) : (
        <SelectedChip
          imageSrc={getSeasonImageUrl(selectedSeason)}
          label="Season"
          name={selectedSeason}
          onClear={onBack}
        />
      )}
    </div>
  );
};

export const AllSeasons = ({ allSeasons, onSeasonSelect }) => {
  const categorizedSeasons = categorizeSeasons(allSeasons);
  const filteredCategories = getFilteredCategories(categorizedSeasons, 'all');

  return (
    <div className="TabList">
      <CategorizedSeasons filteredCategories={filteredCategories} onSeasonClick={onSeasonSelect} />
    </div>
  );
};

export const HymnsList = ({ hymns, expandedHymns, toggleHymnExpansion, navigate }) => (
  <div className="search-results-compact">
    <div className="search-results-list">
      {hymns.map((hymn, index) => {
        const hymnId = `${hymn.name}-${hymn.artist}-${hymn.season || 'unknown'}-${index}`;
        return (
          <HymnItem
            key={index}
            hymn={hymn}
            type="hymn"
            index={index}
            isExpanded={expandedHymns.has(hymnId)}
            onExpand={toggleHymnExpansion}
            onGoto={() => navigate(`/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}/${encodeURIComponent(hymn.mp3)}`)}
          />
        );
      })}
    </div>
  </div>
);

export const HymnsForSeason = ({ selectedSeason, hymnsInSeason, hymnData, onHymnSelect, onBack }) => (
  <div className="TabList">
    <span>
      <HeaderComponent placeHolder={selectedSeason} />
      <p>Choose a hymn to explore different cantor interpretations</p>
      <BackButton onClick={onBack} text="← Back to Seasons" />
    </span>

    <SelectedChip
      imageSrc={getSeasonImageUrl(selectedSeason)}
      label="Season"
      name={selectedSeason}
      onClear={onBack}
    />

    <div className="search-results-compact">
      <div className="search-results-list">
        {hymnsInSeason.map((hymnName, index) => {
          const hymnRecordings = hymnData.filter(h => h.season === selectedSeason && h.name === hymnName);
          return (
            <HymnItem
              key={index}
              hymnName={hymnName}
              season={selectedSeason}
              type="hymnList"
              index={index}
              cantorCount={hymnRecordings.length}
              cantorList={hymnRecordings}
              onClick={() => onHymnSelect(hymnName)}
            />
          );
        })}
      </div>
    </div>
  </div>
);

export const CantorsForHymn = ({ selectedHymn, selectedSeason, cantorsForHymn, expandedHymns, toggleHymnExpansion, navigate, onBack }) => (
  <div className="TabList">
    <span>
      <HeaderComponent placeHolder={`Cantors for "${selectedHymn}"`} />
      <p>Listen to different interpretations of this hymn</p>
      <BackButton onClick={onBack} text="← Back to Hymns" />
    </span>

    <SelectedChip
      imageSrc={getSeasonImageUrl(selectedSeason)}
      label="Season"
      name={selectedSeason}
      onClear={() => onBack(true)}
    />

    <div className="search-results-compact">
      <div className="search-results-list">
        {cantorsForHymn.map((hymn, index) => {
          const hymnId = `${hymn.name}-${hymn.artist}-${hymn.season || 'unknown'}-${index}`;
          return (
            <HymnItem
              key={index}
              hymn={hymn}
              type="cantor"
              index={index}
              isExpanded={expandedHymns.has(hymnId)}
              onExpand={toggleHymnExpansion}
              onGoto={() => navigate(`/hymn/${encodeURIComponent(hymn.name)}/${encodeURIComponent(hymn.artist)}/${encodeURIComponent(hymn.mp3)}`)}
            />
          );
        })}
      </div>
    </div>
  </div>
);
