import React from 'react';
import Audio from './Audio.js';
import { FavoriteButton, AddToQueueButton } from './components/PlaybackControls.js';
import ArtistData from './artists.json';

const HymnItem = ({
  hymn,
  hymnName,
  artist,
  season,
  type = 'hymn',
  title,
  isExpanded = false,
  isClickable = true,
  onClick,
  onExpand,
  onGoto,
  cantorCount,
  cantorList = [],
  score,
  index,
  showScore = false,
  className = ''
}) => {
  const itemData = hymn || { name: hymnName, artist, season };
  const hymnId = `${itemData.name}-${itemData.artist}-${itemData.season || 'unknown'}-${index || 0}`;
  const artistInfo = ArtistData.find(a => a.artistName === itemData.artist);

  const getDisplayContent = () => {
    switch (type) {
      case 'cantor':
        return { title: itemData.artist, subtitle: itemData.name, season: itemData.season };
      case 'hymnList':
        return { title: title || itemData.name, subtitle: `${cantorCount} cantor${cantorCount !== 1 ? 's' : ''}`, season: null };
      default:
        return { title: itemData.name, subtitle: itemData.artist, season: itemData.season };
    }
  };

  const displayContent = getDisplayContent();

  const renderAvatar = () => {
    if (type === 'hymnList') {
      return (
        <div className="hymn-item-avatar hymn-item-avatar--icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5L21 3V16M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C7.65685 15 9 16.3431 9 18ZM21 16C21 17.6569 19.6569 19 18 19C16.3431 19 15 17.6569 15 16C15 14.3431 16.3431 13 18 13C19.6569 13 21 14.3431 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }
    return (
      <div className="hymn-item-avatar">
        {artistInfo?.img
          ? <img src={artistInfo.img} alt={itemData.artist} />
          : <span className="hymn-item-avatar-initial">{itemData.artist?.charAt(0)}</span>
        }
      </div>
    );
  };

  const renderCantorStrip = () => {
    if (type !== 'hymnList' || !cantorList.length) return null;
    return (
      <div className="hymn-item-cantor-strip">
        {cantorList.slice(0, 3).map((cantor, idx) => {
          const cantorInfo = ArtistData.find(a => a.artistName === cantor.artist);
          return (
            <div key={idx} className="hymn-item-cantor-avatar" title={cantor.artist}>
              {cantorInfo?.img
                ? <img src={cantorInfo.img} alt={cantor.artist} />
                : <span>{cantor.artist.charAt(0)}</span>
              }
            </div>
          );
        })}
        {cantorCount > 3 && (
          <div className="hymn-item-cantor-avatar hymn-item-cantor-more">
            +{cantorCount - 3}
          </div>
        )}
      </div>
    );
  };

  const handleClick = (e) => {
    if (!isClickable) return;
    if (e.target.closest('.hymn-item-goto')) return;
    if (onClick) {
      onClick(e);
    } else if (onExpand) {
      onExpand(hymnId);
    }
  };

  return (
    <div
      className={`hymn-item ${isExpanded ? 'hymn-item--expanded' : ''} ${className}`}
      data-hymn-id={hymnId}
      onClick={handleClick}
      style={!isClickable ? { cursor: 'default' } : {}}
    >
      <div className="hymn-item-row">
        {renderAvatar()}
        <div className="hymn-item-text">
          <h3 className="hymn-item-title">{displayContent.title}</h3>
          <div className="hymn-item-meta">
            <span className="hymn-item-subtitle">{displayContent.subtitle}</span>
            {displayContent.season && (
              <span className="hymn-item-season-pill">{displayContent.season}</span>
            )}
            {showScore && score && (
              <span className="hymn-item-score">{score.toFixed(1)}</span>
            )}
          </div>
        </div>
        <div className="hymn-item-actions">
          {renderCantorStrip()}
          {type !== 'hymnList' && itemData.mp3 && (
            <>
              <AddToQueueButton hymn={itemData} />
              <FavoriteButton hymn={itemData} />
            </>
          )}
          {onGoto && (
            <button
              className="hymn-item-goto"
              onClick={(e) => { e.stopPropagation(); onGoto(e); }}
              title="Go to hymn page"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="hymn-item-player" onClick={(e) => e.stopPropagation()}>
          <Audio hymn={itemData} />
        </div>
      )}
    </div>
  );
};

export default HymnItem;
