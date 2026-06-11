import React, { useState } from 'react';

const SeasonDropdown = ({
  value,
  onChange,
  seasons,
  placeholder = "Select Season",
  disabled = false,
  className = "",
  showSuggestion = false,
  suggestedSeason = null,
  onAddSeason = null
}) => {
  const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');

  const handleSelectChange = (selectedValue) => {
    if (selectedValue === '__ADD_NEW__') {
      setShowNewSeasonInput(true);
      setNewSeasonName('');
    } else {
      onChange(selectedValue);
    }
  };

  const handleAddNewSeason = () => {
    if (newSeasonName.trim() && onAddSeason) {
      const trimmedName = newSeasonName.trim();
      onAddSeason(trimmedName);
      onChange(trimmedName);
      setShowNewSeasonInput(false);
      setNewSeasonName('');
    }
  };

  const handleCancelNewSeason = () => {
    setShowNewSeasonInput(false);
    setNewSeasonName('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddNewSeason();
    } else if (e.key === 'Escape') {
      handleCancelNewSeason();
    }
  };

  if (showNewSeasonInput) {
    return (
      <div className={`season-dropdown ${className}`}>
        <div className="new-season-input">
          <input
            type="text"
            value={newSeasonName}
            onChange={(e) => setNewSeasonName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter new season name"
            className="season-input"
            autoFocus
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
          />
          <div className="new-season-actions">
            <button
              type="button"
              onClick={handleAddNewSeason}
              className="add-season-btn"
              disabled={!newSeasonName.trim()}
            >
              ✓ Add
            </button>
            <button
              type="button"
              onClick={handleCancelNewSeason}
              className="cancel-season-btn"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`season-dropdown ${className}`}>
      <select
        value={value}
        onChange={(e) => handleSelectChange(e.target.value)}
        disabled={disabled}
        className={`season-select ${suggestedSeason && !value ? 'has-suggestion' : ''}`}
      >
        <option value="">{placeholder}</option>
        
        {/* Show suggested season first if available */}
        {suggestedSeason && !seasons.includes(suggestedSeason) && (
          <option value={suggestedSeason} className="suggested-option">
            {suggestedSeason} (suggested)
          </option>
        )}
        
        {seasons.map((season) => (
          <option
            key={season}
            value={season}
            className={season === suggestedSeason ? 'suggested-option' : ''}
          >
            {season === suggestedSeason ? `${season} (suggested)` : season}
          </option>
        ))}
        
        {/* Add new season option */}
        {onAddSeason && (
          <option value="__ADD_NEW__" style={{ fontStyle: 'italic', color: '#007bff' }}>
            + Add New Season...
          </option>
        )}
      </select>
      
      {showSuggestion && suggestedSeason && !value && (
        <div className="season-suggestion">
          <span className="suggestion-text">💡 Suggested: {suggestedSeason}</span>
          <button
            type="button"
            className="use-suggestion-btn"
            onClick={() => onChange(suggestedSeason)}
          >
            Use
          </button>
        </div>
      )}
    </div>
  );
};

export default SeasonDropdown;