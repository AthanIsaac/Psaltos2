import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LIBRARY_API } from '../config.js';

const SPEEDS = [1, 1.5, 2, 3];
const SPEED_KEY = 'psaltos_admin_speed';

const formatTime = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};

/**
 * Plays the small preview of a recording, with a clickable waveform for seeking.
 * Exposes toggle(), seek(seconds) and seekFraction(0-1) so the page can drive it from the keyboard.
 */
const PreviewPlayer = forwardRef(function PreviewPlayer({ file, autoPlayToken }, ref) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [peaks, setPeaks] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(() => Number(localStorage.getItem(SPEED_KEY)) || 1);
  const [error, setError] = useState(null);

  const playable = file?.preview_ok;

  // New file: reset, load waveform
  useEffect(() => {
    setPeaks(null); setTime(0); setDuration(file?.duration_s || 0); setPlaying(false); setError(null);
    if (!file || !playable) return;
    let cancelled = false;
    fetch(`${LIBRARY_API}/waveform/${file.id}`).then(r => r.ok ? r.json() : null).then(p => { if (!cancelled) setPeaks(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start playing when asked (clicking a file); keep the chosen speed
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !autoPlayToken || !playable) return;
    el.playbackRate = speed;
    el.play().catch(() => {});
  }, [autoPlayToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed, file?.id]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth: w, clientHeight: h } = canvas;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    if (!peaks) return;
    const played = duration ? time / duration : 0;
    const bar = w / peaks.length;
    peaks.forEach((p, i) => {
      const barH = Math.max(1, (p / 255) * h);
      ctx.fillStyle = i / peaks.length <= played ? '#2563eb' : '#a1a1aa';
      ctx.fillRect(i * bar, (h - barH) / 2, Math.max(1, bar - 0.5), barH);
    });
  }, [peaks, time, duration]);

  useEffect(draw, [draw]);
  useEffect(() => { window.addEventListener('resize', draw); return () => window.removeEventListener('resize', draw); }, [draw]);

  const seek = useCallback((delta) => {
    const el = audioRef.current;
    if (el) el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta));
  }, []);
  const seekFraction = useCallback((f) => {
    const el = audioRef.current;
    if (el && el.duration) el.currentTime = Math.max(0, Math.min(1, f)) * el.duration;
  }, []);
  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !playable) return;
    if (el.paused) el.play().catch(() => {}); else el.pause();
  }, [playable]);
  const cycleSpeed = useCallback(() => {
    setSpeed(s => {
      const next = SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length];
      localStorage.setItem(SPEED_KEY, String(next));
      return next;
    });
  }, []);

  useImperativeHandle(ref, () => ({ toggle, seek, seekFraction, cycleSpeed }), [toggle, seek, seekFraction, cycleSpeed]);

  if (!file) return <div className="preview-player empty">Select a file to listen</div>;

  return (
    <div className="preview-player">
      <div className="preview-title" title={file.filename}>{file.filename}</div>

      {playable ? (
        <>
          <audio
            ref={audioRef}
            src={`${LIBRARY_API}/audio/${file.id}`}
            preload="auto"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
            onError={() => setError('Could not play this preview.')}
          />
          <canvas
            ref={canvasRef}
            className="waveform"
            onClick={e => {
              const r = e.currentTarget.getBoundingClientRect();
              seekFraction((e.clientX - r.left) / r.width);
            }}
          />
          <div className="preview-controls">
            <button className="btn-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
            <span className="preview-time">{formatTime(time)} / {formatTime(duration)}</span>
            <button className="btn-small" onClick={cycleSpeed} title="Playback speed">{speed}×</button>
            <button className="btn-small" onClick={() => seek(-10)} title="Back 10 s (,)">−10</button>
            <button className="btn-small" onClick={() => seek(10)} title="Forward 10 s (.)">+10</button>
            <a className="btn-small" href={`${LIBRARY_API}/original/${file.id}`} target="_blank" rel="noreferrer" title="Open the untouched original file">Open original</a>
          </div>
          {error && <div className="preview-error">{error}</div>}
        </>
      ) : (
        <div className="preview-error">
          Unreadable: {file.error ? file.error.split(':').slice(0, 2).join(':').slice(0, 140) : 'no preview yet'}
        </div>
      )}
    </div>
  );
});

export default PreviewPlayer;
