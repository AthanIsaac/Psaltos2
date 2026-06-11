import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState } from 'react';

const AudioContext = createContext();

const RECENTLY_PLAYED_KEY = 'psaltos_recently_played';
const MAX_RECENT = 10;

function getProxyUrl(mp3Url) {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:5002';
  return `${base}/api/audio/proxy?url=${encodeURIComponent(mp3Url)}`;
}

function loadRecentlyPlayed() {
  try {
    const stored = localStorage.getItem(RECENTLY_PLAYED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveRecentlyPlayed(list) {
  try { localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(list)); } catch {}
}

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within an AudioProvider');
  return ctx;
};

export const AudioProvider = ({ children }) => {
  // Single persistent <audio> element — created once, never destroyed.
  // Survives navigation so audio continues playing across route changes.
  const audioElRef = useRef(null);
  if (!audioElRef.current) {
    audioElRef.current = new window.Audio();
  }
  const el = audioElRef.current;

  const [currentHymn, setCurrentHymn] = useState(null);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState(loadRecentlyPlayed);
  const currentHymnRef = useRef(null);

  // Wire native events — these run for the entire app lifetime.
  useEffect(() => {
    const onTime  = () => setCurrentTime(el.currentTime);
    const onDur   = () => setDuration(isFinite(el.duration) ? el.duration : 0);
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onError = () => {
      const err = el.error;
      console.error('[AudioContext] audio error', err?.code, err?.message, el.src);
    };

    el.addEventListener('timeupdate',     onTime);
    el.addEventListener('durationchange', onDur);
    el.addEventListener('play',           onPlay);
    el.addEventListener('pause',          onPause);
    el.addEventListener('ended',          onEnded);
    el.addEventListener('error',          onError);

    return () => {
      el.removeEventListener('timeupdate',     onTime);
      el.removeEventListener('durationchange', onDur);
      el.removeEventListener('play',           onPlay);
      el.removeEventListener('pause',          onPause);
      el.removeEventListener('ended',          onEnded);
      el.removeEventListener('error',          onError);
    };
  }, []); // el is stable

  const playHymn = useCallback((hymn) => {
    const proxyUrl = getProxyUrl(hymn.mp3);
    if (el.src !== proxyUrl) {
      el.src = proxyUrl;
      setCurrentTime(0);
      setDuration(0);
    }
    el.play().catch((err) => console.error('[AudioContext] play failed:', err.name, err.message));

    if (currentHymnRef.current?.mp3 !== hymn.mp3) {
      currentHymnRef.current = hymn;
      setCurrentHymn(hymn);
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(h => h.mp3 !== hymn.mp3);
        const updated = [hymn, ...filtered].slice(0, MAX_RECENT);
        saveRecentlyPlayed(updated);
        return updated;
      });
    }
  }, []); // stable — uses ref + el ref

  const togglePlayPause = useCallback(() => {
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const skipForward = useCallback(() => {
    el.currentTime = Math.min(el.currentTime + 10, el.duration || 0);
  }, []);

  const skipBackward = useCallback(() => {
    el.currentTime = Math.max(el.currentTime - 10, 0);
  }, []);

  const seekTo = useCallback((time) => {
    el.currentTime = Math.max(0, Math.min(time, el.duration || 0));
  }, []);

  const [volume, setVolume] = useState(1);

  const setVolumeLevel = useCallback((level) => {
    const clamped = Math.max(0, Math.min(1, level));
    el.volume = clamped;
    setVolume(clamped);
  }, []);

  const stopHymn = useCallback(() => {
    el.pause();
    el.currentTime = 0;
    el.src = '';
    currentHymnRef.current = null;
    setCurrentHymn(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const pauseHymn  = useCallback(() => { el.pause(); }, []);
  const resumeHymn = useCallback(() => { el.play().catch(() => {}); }, []);

  const formatTime = useCallback((time) => {
    if (time && !isNaN(time)) {
      const m = Math.floor(time / 60);
      const s = Math.floor(time % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return '00:00';
  }, []);

  const audioElement = el;

  const value = useMemo(() => ({
    currentHymn,
    isPlaying,
    currentTime,
    duration,
    audioElement,
    volume,
    recentlyPlayed,
    playHymn,
    pauseHymn,
    resumeHymn,
    stopHymn,
    skipForward,
    skipBackward,
    seekTo,
    setVolumeLevel,
    togglePlayPause,
    formatTime,
  }), [
    currentHymn, isPlaying, currentTime, duration, volume, recentlyPlayed,
    playHymn, pauseHymn, resumeHymn, stopHymn,
    skipForward, skipBackward, seekTo, setVolumeLevel, togglePlayPause, formatTime,
  ]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
