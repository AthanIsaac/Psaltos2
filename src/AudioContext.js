import React, { createContext, useContext, useState, useEffect } from 'react';

const AudioContext = createContext();

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const [currentHymn, setCurrentHymn] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [wavesurfer, setWavesurfer] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  // Global audio control functions
  const playHymn = (hymn) => {
    // Only update if it's a different hymn
    if (!currentHymn || currentHymn.mp3 !== hymn.mp3) {
      setCurrentHymn(hymn);
    }
    setIsPlaying(true);
  };

  const pauseHymn = () => {
    setIsPlaying(false);
    if (wavesurfer) {
      try {
        wavesurfer.pause();
      } catch (error) {
        console.warn('Failed to pause audio:', error);
      }
    }
  };

  const resumeHymn = () => {
    setIsPlaying(true);
    if (wavesurfer) {
      try {
        wavesurfer.play();
      } catch (error) {
        console.warn('Failed to resume audio:', error);
      }
    }
  };

  const updatePlayState = (playing) => {
    setIsPlaying(playing);
  };

  const stopHymn = () => {
    if (wavesurfer) {
      try {
        wavesurfer.stop();
      } catch (error) {
        console.warn('Failed to stop audio:', error);
      }
    }
    setCurrentHymn(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setWavesurfer(null);
    setAudioElement(null);
  };

  const updateTime = (time) => {
    // Only update if time is valid and significantly different
    if (time >= 0 && !isNaN(time) && Math.abs(time - currentTime) > 0.1) {
      setCurrentTime(time);
    }
  };

  const updateDuration = (dur) => {
    if (dur > 0 && !isNaN(dur)) {
      setDuration(dur);
    }
  };

  const setWavesurferInstance = (ws) => {
    setWavesurfer(ws);
    // Store reference to the underlying audio element for persistence
    if (ws && ws.getMediaElement) {
      try {
        const audioEl = ws.getMediaElement();
        setAudioElement(audioEl);
      } catch (error) {
        console.warn('Could not get audio element:', error);
      }
    }
  };

  const skipForward = () => {
    if (wavesurfer) {
      try {
        wavesurfer.skip(10);
      } catch (error) {
        console.warn('Audio skip forward failed:', error);
      }
    }
  };

  const skipBackward = () => {
    if (wavesurfer) {
      try {
        wavesurfer.skip(-10);
      } catch (error) {
        console.warn('Audio skip backward failed:', error);
      }
    }
  };

  const togglePlayPause = () => {
    if (wavesurfer) {
      try {
        wavesurfer.playPause();
      } catch (error) {
        console.warn('Audio playback toggle failed:', error);
        // Try to recover by updating the play state
        setIsPlaying(prev => !prev);
      }
    }
  };

  const formatTime = (time) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const formatMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const seconds = Math.floor(time % 60);
      const formatSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
      return `${formatMinutes}:${formatSeconds}`;
    }
    return '00:00';
  };

  const value = {
    currentHymn,
    isPlaying,
    currentTime,
    duration,
    wavesurfer,
    audioElement,
    playHymn,
    pauseHymn,
    resumeHymn,
    stopHymn,
    updateTime,
    updateDuration,
    updatePlayState,
    setWavesurferInstance,
    skipForward,
    skipBackward,
    togglePlayPause,
    formatTime
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};