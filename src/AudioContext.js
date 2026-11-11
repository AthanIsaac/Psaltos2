import { API_BASE } from './config.js';
import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState } from 'react';

const AudioContext = createContext();
// Time updates fire several times a second; keeping them in their own context
// stops every useAudio() consumer (e.g. Home) from re-rendering on each tick.
const AudioTimeContext = createContext({ currentTime: 0, duration: 0 });

const RECENTLY_PLAYED_KEY = 'psaltos_recently_played';
const MAX_RECENT = 10;
const VOLUME_KEY = 'psaltos_volume';
const QUEUE_KEY = 'psaltos_queue';
const SESSION_KEY = 'psaltos_session';
export const SKIP_SECONDS = 15;

function loadJSON(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const isHymn = (h) => h && typeof h.mp3 === 'string' && typeof h.name === 'string';

// What was playing last time (hymn + position) and the queue it came from
function loadSavedPlayback() {
  const session = loadJSON(SESSION_KEY, null);
  const hymn = isHymn(session?.hymn) ? session.hymn : null;
  const time = hymn && isFinite(session.time) ? session.time : 0;

  const stored = loadJSON(QUEUE_KEY, null);
  let items = Array.isArray(stored?.items) ? stored.items.filter(isHymn) : [];
  let index = Number.isInteger(stored?.index) ? stored.index : -1;

  if (hymn && items[index]?.mp3 !== hymn.mp3) {
    items = [hymn];
    index = 0;
  } else if (!hymn) {
    items = [];
    index = -1;
  }
  return { hymn, time, queue: { items, index } };
}

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
  const savedRef = useRef(null);
  if (!audioElRef.current) {
    audioElRef.current = new window.Audio();
    audioElRef.current.volume = loadVolume();

    // Restore the last hymn paused at its saved position (nothing plays until the user presses play)
    savedRef.current = loadSavedPlayback();
    const { hymn, time } = savedRef.current;
    if (hymn) {
      audioElRef.current.preload = 'metadata';
      audioElRef.current.src = getProxyUrl(hymn.mp3);
      if (time > 0) {
        audioElRef.current.addEventListener('loadedmetadata', () => {
          audioElRef.current.currentTime = time;
        }, { once: true });
      }
    }
  }
  const el = audioElRef.current;

  const [currentHymn, setCurrentHymn] = useState(savedRef.current.hymn);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(savedRef.current.time);
  const [duration, setDuration]       = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState(loadRecentlyPlayed);
  const currentHymnRef = useRef(savedRef.current.hymn);

  // Queue: `items` in play order, `index` of the one that's current (-1 when empty)
  const [queue, setQueueState] = useState(savedRef.current.queue);
  const queueRef = useRef(queue);
  const updateQueue = useCallback((next) => {
    queueRef.current = next;
    setQueueState(next);
    saveJSON(QUEUE_KEY, next);
  }, []);

  const saveSession = useCallback(() => {
    const hymn = currentHymnRef.current;
    if (hymn) saveJSON(SESSION_KEY, { hymn, time: el.currentTime || 0 });
    else { try { localStorage.removeItem(SESSION_KEY); } catch {} }
  }, []);

  const nextTrackRef = useRef(() => false);
  const [audioError, setAudioError] = useState(null);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);

  // Wire native events — these run for the entire app lifetime.
  useEffect(() => {
    let lastSave = 0;
    const onTime  = () => {
      setCurrentTime(el.currentTime);
      const now = Date.now();
      if (now - lastSave > 3000) { lastSave = now; saveSession(); }
    };
    const onDur   = () => setDuration(isFinite(el.duration) ? el.duration : 0);
    const onPlay  = () => { setIsPlaying(true); setAudioError(null); };
    const onPause = () => { setIsPlaying(false); saveSession(); };
    const onEnded = () => {
      // Autoplay-next: move on if the queue has another hymn, otherwise rest at the start
      if (nextTrackRef.current()) return;
      setIsPlaying(false);
      setCurrentTime(0);
      el.currentTime = 0;
      saveSession();
    };
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
    window.addEventListener('pagehide',   saveSession);

    return () => {
      window.removeEventListener('pagehide', saveSession);
      el.removeEventListener('timeupdate',     onTime);
      el.removeEventListener('durationchange', onDur);
      el.removeEventListener('play',           onPlay);
      el.removeEventListener('pause',          onPause);
      el.removeEventListener('ended',          onEnded);
      el.removeEventListener('error',          onError);
    };
  }, []); // el is stable

  // Load and play a hymn without touching the queue
  const startTrack = useCallback((hymn) => {
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
    saveSession();
  }, []); // stable — uses ref + el ref

  // Play one hymn, as part of the current queue if it's in it, otherwise on its own
  const playHymn = useCallback((hymn) => {
    const q = queueRef.current;
    const i = q.items.findIndex(h => h.mp3 === hymn.mp3);
    updateQueue(i >= 0 ? { ...q, index: i } : { items: [hymn], index: 0 });
    startTrack(hymn);
  }, [startTrack, updateQueue]);

  const playQueue = useCallback((hymns, startIndex = 0) => {
    if (!hymns?.length) return;
    updateQueue({ items: hymns, index: startIndex });
    startTrack(hymns[startIndex]);
  }, [startTrack, updateQueue]);

  const playQueueItem = useCallback((i) => {
    const q = queueRef.current;
    if (!q.items[i]) return;
    updateQueue({ ...q, index: i });
    startTrack(q.items[i]);
  }, [startTrack, updateQueue]);

  const nextTrack = useCallback(() => {
    const q = queueRef.current;
    if (q.index + 1 >= q.items.length) return false;
    updateQueue({ ...q, index: q.index + 1 });
    startTrack(q.items[q.index + 1]);
    return true;
  }, [startTrack, updateQueue]);
  nextTrackRef.current = nextTrack;

  // Like most players: restart the current hymn unless it just began
  const prevTrack = useCallback(() => {
    const q = queueRef.current;
    if (el.currentTime > 3 || q.index <= 0) {
      el.currentTime = 0;
      return;
    }
    updateQueue({ ...q, index: q.index - 1 });
    startTrack(q.items[q.index - 1]);
  }, [startTrack, updateQueue]);

  const addToQueue = useCallback((hymn) => {
    const q = queueRef.current;
    if (!currentHymnRef.current) return playQueue([hymn]);
    if (q.items.some(h => h.mp3 === hymn.mp3)) return;
    updateQueue({ ...q, items: [...q.items, hymn] });
  }, [playQueue, updateQueue]);

  const playNext = useCallback((hymn) => {
    const q = queueRef.current;
    if (!currentHymnRef.current) return playQueue([hymn]);
    if (q.items[q.index]?.mp3 === hymn.mp3) return;
    // Everything up to and including the current hymn, then the new one, then the remainder
    const before = q.items.slice(0, q.index).filter(h => h.mp3 !== hymn.mp3);
    const after = q.items.slice(q.index + 1).filter(h => h.mp3 !== hymn.mp3);
    const items = [...before, q.items[q.index], hymn, ...after];
    updateQueue({ items, index: before.length });
  }, [playQueue, updateQueue]);

  const removeFromQueue = useCallback((i) => {
    const q = queueRef.current;
    if (i === q.index || !q.items[i]) return; // the playing hymn stays until it ends
    updateQueue({ items: q.items.filter((_, n) => n !== i), index: i < q.index ? q.index - 1 : q.index });
  }, [updateQueue]);

  const clearQueue = useCallback(() => {
    const q = queueRef.current;
    const current = q.items[q.index];
    updateQueue(current ? { items: [current], index: 0 } : { items: [], index: -1 });
  }, [updateQueue]);

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
    updateQueue({ items: [], index: -1 });
    saveSession();
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
    queue,
    playHymn,
    playQueue,
    playQueueItem,
    nextTrack,
    prevTrack,
    addToQueue,
    playNext,
    removeFromQueue,
    clearQueue,
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
    audioError, playbackSpeed, setPlaybackSpeed, toggleMute, queue,
    playHymn, playQueue, playQueueItem, nextTrack, prevTrack, addToQueue, playNext, removeFromQueue, clearQueue,
    pauseHymn, resumeHymn, stopHymn,
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
