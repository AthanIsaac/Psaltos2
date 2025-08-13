import React from 'react';
import Audio from './Audio.js';
import ArtistData from './artists.json';

const HymnItem = ({
  // Data props
  hymn,
  hymnName,
  artist,
  season,
  
  // Display props
  type = 'hymn', // 'hymn', 'cantor', 'hymnList', 'individual', 'search'
  title,
  subtitle,
  metadata,
  
  // State props
  isExpanded = false,
  isClickable = true,
  
  // Event handlers
  onClick,
  onExpand,
  onGoto,
  
  // Additional data
  cantorCount,
  cantorList = [],
  score,
  index, // Add index prop for uniqueness
  
  // Style overrides
  imageSize = 50,
  showActions = true,
  showScore = false,
  className = ''
}) => {
  // Determine the data to use based on type
  const itemData = hymn || { name: hymnName, artist, season };
  // Create unique ID including season and index to prevent conflicts
  const hymnId = `${itemData.name}-${itemData.artist}-${itemData.season || 'unknown'}-${index || 0}`;
  
  // Get artist data for image
  const artistData = ArtistData.find(a => a.artistName === itemData.artist);
  
  // Determine display content based on type
  const getDisplayContent = () => {
    switch (type) {
      case 'cantor':
        return {
          title: itemData.artist,
          subtitle: itemData.name,
          metadata: `• ${itemData.season}`
        };
      case 'hymnList':
        return {
          title: title || itemData.name,
          subtitle: `${cantorCount} cantor${cantorCount !== 1 ? 's' : ''}`,
          metadata: `• ${itemData.season}`
        };
      case 'individual':
        return {
          title: title || itemData.name,
          subtitle: itemData.artist,
          metadata: `• ${itemData.season}`
        };
      case 'search':
        return {
          title: itemData.name,
          subtitle: itemData.artist,
          metadata: `• ${itemData.season}`
        };
      default: // 'hymn'
        return {
          title: itemData.name,
          subtitle: itemData.artist,
          metadata: `• ${itemData.season}`
        };
    }
  };
  
  const displayContent = getDisplayContent();
  
  // Render image based on type
  const renderImage = () => {
    const imageStyle = {
      width: `${imageSize}px`,
      height: `${imageSize}px`,
      borderRadius: '50%',
      overflow: 'hidden',
      marginRight: '15px',
      flexShrink: 0,
      background: 'var(--bg-secondary)'
    };
    
    if (type === 'hymnList') {
      // Show hymn icon for hymn lists
      return (
        <div className="search-result-hymn-icon" style={{
          ...imageStyle,
          background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{color: 'white'}}>
            <path d="M9 18V5L21 3V16M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C7.65685 15 9 16.3431 9 18ZM21 16C21 17.6569 19.6569 19 18 19C16.3431 19 15 17.6569 15 16C15 14.3431 16.3431 13 18 13C19.6569 13 21 14.3431 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }
    
    // Show artist image for other types
    return (
      <div className="search-result-artist-image" style={imageStyle}>
        {artistData?.img ? (
          <img 
            src={artistData.img} 
            alt={itemData.artist}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary-color)',
            color: 'white',
            fontSize: `${imageSize / 3}px`,
            fontWeight: 'bold'
          }}>
            {itemData.artist.charAt(0)}
          </div>
        )}
      </div>
    );
  };
  
  // Render actions based on type
  const renderActions = () => {
    if (!showActions) return null;
    
    const actions = [];
    
    // Show cantor avatars for hymn lists
    if (type === 'hymnList' && cantorList.length > 0) {
      actions.push(
        <div key="avatars" style={{display: 'flex', gap: '3px', marginRight: '10px', alignItems: 'center'}}>
          {cantorList.slice(0, 3).map((cantor, idx) => {
            const cantorArtistData = ArtistData.find(artist => artist.artistName === cantor.artist);
            return (
              <div key={idx} style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }} title={cantor.artist}>
                {cantorArtistData?.img ? (
                  <img 
                    src={cantorArtistData.img} 
                    alt={cantor.artist}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--primary-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    fontWeight: 'bold'
                  }}>
                    {cantor.artist.charAt(0)}
                  </div>
                )}
              </div>
            );
          })}
          {cantorCount > 3 && (
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--secondary-color)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              fontWeight: 'bold',
              border: '1px solid var(--border-color)'
            }}>
              +{cantorCount - 3}
            </div>
          )}
        </div>
      );
    }
    
    // Show expand button for expandable items
    if (onExpand) {
      actions.push(
        <button
          key="expand"
          className={`search-result-expand-btn ${isExpanded ? 'expanded' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onExpand(hymnId, e);
          }}
          title={isExpanded ? 'Collapse' : 'Expand to play'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      );
    }
    
    // Show goto button
    if (onGoto) {
      actions.push(
        <button
          key="goto"
          className="search-result-goto-btn"
          onClick={(e) => {
            e.stopPropagation();
            onGoto(e);
          }}
          title="Go to hymn page"
        >
          →
        </button>
      );
    }
    
    return actions.length > 0 ? (
      <div className="search-result-actions">
        {actions}
      </div>
    ) : null;
  };
  
  const handleClick = (e) => {
    if (!isClickable) return;
    
    // Only toggle if clicking on the main content area, not on buttons or audio controls
    if (e.target === e.currentTarget ||
        e.target.closest('.search-result-main-content') ||
        e.target.closest('.search-result-text-content')) {
      if (onClick) {
        onClick(e);
      } else if (onExpand) {
        onExpand(hymnId);
      }
    }
  };
  
  return (
    <div
      className={`search-result-item-compact ${className}`}
      data-hymn-id={hymnId}
      onClick={handleClick}
      style={!isClickable ? {cursor: 'default'} : {}}
    >
      <div className="search-result-main-content">
        {renderImage()}
        
        <div className="search-result-text-content">
          <h3 className="search-result-title-compact" style={
            type === 'individual' ? {fontSize: '1.4rem', marginBottom: '8px'} : {}
          }>
            {displayContent.title}
          </h3>
          <div className="search-result-meta-compact" style={
            type === 'individual' ? {fontSize: '1rem'} : {}
          }>
            <span className="search-result-artist-compact" style={
              type === 'individual' ? {fontWeight: '600'} : {}
            }>
              {displayContent.subtitle}
            </span>
            <span className="search-result-season-compact">{displayContent.metadata}</span>
            {showScore && score && (
              <span className="search-result-score" title={`Relevance score: ${score.toFixed(1)}`}>
                • {score.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {renderActions()}
      
      {isExpanded && (
        <div
          className="search-result-expanded-content"
          onClick={(e) => e.stopPropagation()}
        >
          <Audio hymn={itemData} autoLoad={true} compact={true} />
        </div>
      )}
    </div>
  );
};

export default HymnItem;