import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

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

  // Memoized audio control functions to prevent unnecessary re-renders
  const playHymn = useCallback((hymn) => {
    // Only update if it's a different hymn to prevent unnecessary re-renders
    if (!currentHymn || currentHymn.mp3 !== hymn.mp3 || currentHymn.name !== hymn.name || currentHymn.artist !== hymn.artist) {
      setCurrentHymn(hymn);
    }
    setIsPlaying(true);
  }, [currentHymn]);

  const pauseHymn = useCallback(() => {
    setIsPlaying(false);
    if (wavesurfer) {
      try {
        wavesurfer.pause();
      } catch (error) {
        console.warn('Failed to pause audio:', error);
      }
    }
  }, [wavesurfer]);

  const resumeHymn = useCallback(() => {
    setIsPlaying(true);
    if (wavesurfer) {
      try {
        wavesurfer.play();
      } catch (error) {
        console.warn('Failed to resume audio:', error);
      }
    }
  }, [wavesurfer]);

  const updatePlayState = useCallback((playing) => {
    setIsPlaying(playing);
  }, []);

  const stopHymn = useCallback(() => {
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
  }, [wavesurfer]);

  const updateTime = useCallback((time) => {
    // Only update if time is valid and significantly different
    if (time >= 0 && !isNaN(time) && Math.abs(time - currentTime) > 0.5) {
      setCurrentTime(time);
    }
  }, [currentTime]);

  const updateDuration = useCallback((dur) => {
    if (dur > 0 && !isNaN(dur) && Math.abs(dur - duration) > 0.1) {
      setDuration(dur);
    }
  }, [duration]);

  const setWavesurferInstance = useCallback((ws) => {
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
  }, []);

  const skipForward = useCallback(() => {
    if (wavesurfer) {
      try {
        wavesurfer.skip(10);
      } catch (error) {
        console.warn('Audio skip forward failed:', error);
      }
    }
  }, [wavesurfer]);

  const skipBackward = useCallback(() => {
    if (wavesurfer) {
      try {
        wavesurfer.skip(-10);
      } catch (error) {
        console.warn('Audio skip backward failed:', error);
      }
    }
  }, [wavesurfer]);

  const togglePlayPause = useCallback(() => {
    if (wavesurfer) {
      try {
        wavesurfer.playPause();
      } catch (error) {
        console.warn('Audio playback toggle failed:', error);
        // Try to recover by updating the play state
        setIsPlaying(prev => !prev);
      }
    }
  }, [wavesurfer]);

  const formatTime = useCallback((time) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const formatMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const seconds = Math.floor(time % 60);
      const formatSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
      return `${formatMinutes}:${formatSeconds}`;
    }
    return '00:00';
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
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
  }), [
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
  ]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};