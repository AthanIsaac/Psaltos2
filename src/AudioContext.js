import { API_BASE } from './config.js';
import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState } from 'react';

const AudioContext = createContext();
// Time updates fire several times a second; keeping them in their own context
// stops every useAudio() consumer (e.g. Home) from re-rendering on each tick.
const AudioTimeContext = createContext({ currentTime: 0, duration: 0 });

const RECENTLY_PLAYED_KEY = 'psaltos_recently_played';
const MAX_RECENT = 10;
const VOLUME_KEY = 'psaltos_volume';
export const SKIP_SECONDS = 15;

function loadVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  } catch { return 1; }
}

function getProxyUrl(mp3Url) {
  return `${API_BASE}/api/audio/proxy?url=${encodeURIComponent(mp3Url)}`;
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

export const useAudioTime = () => useContext(AudioTimeContext);

export const AudioProvider = ({ children }) => {
  // Single persistent <audio> element — created once, never destroyed.
  // Survives navigation so audio continues playing across route changes.
  const audioElRef = useRef(null);
  if (!audioElRef.current) {
    audioElRef.current = new window.Audio();
    audioElRef.current.volume = loadVolume();
  }
  const el = audioElRef.current;

  const [currentHymn, setCurrentHymn] = useState(null);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState(loadRecentlyPlayed);
  const currentHymnRef = useRef(null);
  const [audioError, setAudioError] = useState(null);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);

  // Wire native events — these run for the entire app lifetime.
  useEffect(() => {
    const onTime  = () => setCurrentTime(el.currentTime);
    const onDur   = () => setDuration(isFinite(el.duration) ? el.duration : 0);
    const onPlay  = () => { setIsPlaying(true); setAudioError(null); };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onError = () => {
      const err = el.error;
      console.error('[AudioContext] audio error', err?.code, err?.message, el.src);
      // Ignore the error fired when stopHymn clears the src
      if (el.getAttribute('src')) {
        setAudioError('This hymn could not be loaded. Please check your connection and try again.');
        setIsPlaying(false);
      }
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
    setAudioError(null);
    if (el.src !== proxyUrl) {
      el.src = proxyUrl;
      setCurrentTime(0);
      setDuration(0);
    }
    el.play().catch((err) => {
      // AbortError: superseded by another load. NotAllowedError: browser blocked
      // autoplay (e.g. shared link) — the user can just press play.
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') return;
      console.error('[AudioContext] play failed:', err.name, err.message);
      setAudioError('Playback failed. Please try again.');
    });

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
    if (el.paused) el.play().catch((err) => {
      if (err.name !== 'AbortError') setAudioError('Playback failed. Please try again.');
    });
    else el.pause();
  }, []);

  const skipForward = useCallback(() => {
    el.currentTime = Math.min(el.currentTime + SKIP_SECONDS, el.duration || 0);
  }, []);

  const skipBackward = useCallback(() => {
    el.currentTime = Math.max(el.currentTime - SKIP_SECONDS, 0);
  }, []);

  const seekTo = useCallback((time) => {
    el.currentTime = Math.max(0, Math.min(time, el.duration || 0));
  }, []);

  const [volume, setVolume] = useState(loadVolume);
  const lastNonZeroVolume = useRef(volume > 0 ? volume : 1);

  const setVolumeLevel = useCallback((level) => {
    const clamped = Math.max(0, Math.min(1, level));
    el.volume = clamped;
    if (clamped > 0) lastNonZeroVolume.current = clamped;
    setVolume(clamped);
    try { localStorage.setItem(VOLUME_KEY, String(clamped)); } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    setVolumeLevel(el.volume > 0 ? 0 : lastNonZeroVolume.current);
  }, [setVolumeLevel]);

  // Playback rate is reset by the browser whenever src changes, so keep it as
  // shared state and mirror it to defaultPlaybackRate, which survives loads.
  const setPlaybackSpeed = useCallback((speed) => {
    el.defaultPlaybackRate = speed;
    el.playbackRate = speed;
    setPlaybackSpeedState(speed);
  }, []);

  // Several <Audio> players can be mounted at once (expanded list items), so
  // track visibility per player and show the mini player only when none are visible.
  const visiblePlayers = useRef(new Set());
  const [mainPlayerVisible, setMainPlayerVisibleState] = useState(false);
  const setMainPlayerVisible = useCallback((id, visible) => {
    if (visible) visiblePlayers.current.add(id);
    else visiblePlayers.current.delete(id);
    setMainPlayerVisibleState(visiblePlayers.current.size > 0);
  }, []);

  const stopHymn = useCallback(() => {
    el.pause();
    el.currentTime = 0;
    el.removeAttribute('src');
    el.load();
    currentHymnRef.current = null;
    setCurrentHymn(null);
    setAudioError(null);
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
    audioElement,
    volume,
    mainPlayerVisible,
    setMainPlayerVisible,
    audioError,
    playbackSpeed,
    setPlaybackSpeed,
    toggleMute,
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
    currentHymn, isPlaying, volume, mainPlayerVisible, recentlyPlayed,
    audioError, playbackSpeed, setPlaybackSpeed, toggleMute,
    playHymn, pauseHymn, resumeHymn, stopHymn,
    skipForward, skipBackward, seekTo, setVolumeLevel, togglePlayPause, formatTime, setMainPlayerVisible,
  ]);

  const timeValue = useMemo(() => ({ currentTime, duration }), [currentTime, duration]);

  return (
    <AudioContext.Provider value={value}>
      <AudioTimeContext.Provider value={timeValue}>
        {children}
      </AudioTimeContext.Provider>
    </AudioContext.Provider>
  );
};
