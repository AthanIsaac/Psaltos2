import { hymnPath } from './utils/routes.js';
import React, { memo, useCallback, useRef } from 'react';
import { useAudio, useAudioTime, SKIP_SECONDS } from './AudioContext';
import VolumeControl from './VolumeControl.js';
import { useNavigate } from 'react-router-dom';
import playButtonIcon from './img/icons/playButton.svg';
import pauseButtonIcon from './img/icons/pauseButton.svg';
import forwardIcon from './img/icons/15Forward.svg';
import rewindIcon from './img/icons/15Rewind.svg';
import ArtistIcon from './img/icons/artistIcon.js';
import './styles/audio.css';

const MiniPlayer = () => {
  const {
    currentHymn,
    isPlaying,
    mainPlayerVisible,
    togglePlayPause,
    skipForward,
    skipBackward,
    seekTo,
    formatTime,
    stopHymn,
    audioError,
  } = useAudio();
  const { currentTime, duration } = useAudioTime();
  const navigate = useNavigate();

  const handlePlayPause  = useCallback(() => { try { togglePlayPause(); } catch {} }, [togglePlayPause]);
  const handleSkipForward  = useCallback(() => { try { skipForward(); } catch {} }, [skipForward]);
  const handleSkipBackward = useCallback(() => { try { skipBackward(); } catch {} }, [skipBackward]);
  const handleStop       = useCallback(() => { try { stopHymn(); } catch {} }, [stopHymn]);

  const handleGoToHymn = useCallback(() => {
    if (currentHymn) {
      navigate(hymnPath(currentHymn));
    }
  }, [currentHymn, navigate]);

  const handleSeek = useCallback((e) => {
    seekTo(parseFloat(e.target.value));
  }, [seekTo]);

  const touchStartX = useRef(null);
  const handleTouchStart = useCallback((e) => {
    // Dragging a slider must not be mistaken for a skip swipe
    touchStartX.current = e.target.closest('input[type="range"]') ? null : e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) handleSkipForward();
    else handleSkipBackward();
  }, [handleSkipForward, handleSkipBackward]);

  if (!currentHymn || mainPlayerVisible) return null;

  const fillPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="mini-player"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {audioError && <div className="mini-player-error" role="alert">{audioError}</div>}
      <div className="mini-player-content">
        {/* Hymn info — click to navigate */}
        <div className="mini-player-info" onClick={handleGoToHymn}>
          <div className="mini-player-title">{currentHymn.name}</div>
          <div className="mini-player-artist">
            <ArtistIcon />
            <span>{currentHymn.artist}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="mini-player-controls">
          <button className="mini-control-btn" onClick={handleSkipBackward} title={`Skip back ${SKIP_SECONDS}s`}>
            <img src={rewindIcon} alt="Rewind" width="16" height="16" />
          </button>
          <button className="mini-control-btn mini-play-pause" onClick={handlePlayPause}>
            {isPlaying
              ? <img src={pauseButtonIcon} alt="Pause" width="18" height="18" />
              : <img src={playButtonIcon}  alt="Play"  width="18" height="18" />
            }
          </button>
          <button className="mini-control-btn" onClick={handleSkipForward} title={`Skip forward ${SKIP_SECONDS}s`}>
            <img src={forwardIcon} alt="Forward" width="16" height="16" />
          </button>
        </div>

        {/* Time */}
        <div className="mini-player-time">
          <span>{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <VolumeControl prefix="mini" />

        {/* Close */}
        <button className="mini-player-close" onClick={handleStop} title="Stop and close">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Seek bar — runs full width at bottom of pill */}
      <input
        type="range"
        className="mini-seek-bar"
        style={{ '--fill': `${fillPercent}%` }}
        min={0}
        max={duration || 0}
        value={currentTime}
        step={0.5}
        onChange={handleSeek}
        aria-label="Seek"
      />
    </div>
  );
};

export default memo(MiniPlayer, () => true);
