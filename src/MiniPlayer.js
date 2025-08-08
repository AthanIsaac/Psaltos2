import React from 'react';
import { useAudio } from './AudioContext';
import playButtonIcon from './img/icons/playButton.svg';
import pauseButtonIcon from './img/icons/pauseButton.svg';
import forwardIcon from './img/icons/15Forward.svg';
import rewindIcon from './img/icons/15Rewind.svg';
import ArtistIcon from './img/icons/artistIcon.js';
import './MiniPlayer.css';

const MiniPlayer = () => {
  const {
    currentHymn,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    skipForward,
    skipBackward,
    formatTime,
    stopHymn,
    wavesurfer
  } = useAudio();

  // Don't render if no hymn is selected
  if (!currentHymn) {
    return null;
  }

  // Enhanced play/pause handler that's more resilient
  const handlePlayPause = () => {
    try {
      togglePlayPause();
    } catch (error) {
      console.warn('MiniPlayer play/pause failed:', error);
    }
  };

  // Enhanced skip handlers
  const handleSkipForward = () => {
    try {
      skipForward();
    } catch (error) {
      console.warn('MiniPlayer skip forward failed:', error);
    }
  };

  const handleSkipBackward = () => {
    try {
      skipBackward();
    } catch (error) {
      console.warn('MiniPlayer skip backward failed:', error);
    }
  };

  // Enhanced stop handler
  const handleStop = () => {
    try {
      stopHymn();
    } catch (error) {
      console.warn('MiniPlayer stop failed:', error);
    }
  };

  return (
    <div className="mini-player">
      <div className="mini-player-content">
        {/* Hymn Info */}
        <div className="mini-player-info">
          <div className="mini-player-title">{currentHymn.name}</div>
          <div className="mini-player-artist">
            <ArtistIcon />
            <span>{currentHymn.artist}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mini-player-controls">
          <button
            className="mini-control-btn"
            onClick={handleSkipBackward}
            title="Skip back 10 seconds"
          >
            <img src={rewindIcon} alt="Rewind" width="16" height="16" />
          </button>

          <button
            className="mini-control-btn mini-play-pause"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <img src={pauseButtonIcon} alt="Pause" width="20" height="20" />
            ) : (
              <img src={playButtonIcon} alt="Play" width="20" height="20" />
            )}
          </button>

          <button
            className="mini-control-btn"
            onClick={handleSkipForward}
            title="Skip forward 10 seconds"
          >
            <img src={forwardIcon} alt="Forward" width="16" height="16" />
          </button>
        </div>

        {/* Time Display */}
        <div className="mini-player-time">
          <span>{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Progress Bar */}
        <div className="mini-player-progress">
          <div 
            className="mini-progress-bar"
            style={{
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
            }}
          />
        </div>

        {/* Close Button */}
        <button
          className="mini-player-close"
          onClick={handleStop}
          title="Stop and close mini player"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default MiniPlayer;