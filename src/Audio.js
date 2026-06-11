import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useAudio } from './AudioContext.js'
import playButtonIcon from './img/icons/playButton.svg'
import pauseButtonIcon from './img/icons/pauseButton.svg'
import forwardIcon from './img/icons/15Forward.svg'
import rewindIcon from './img/icons/15Rewind.svg'
import './styles/audio.css'

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function Audio({ hymn, autoPlay = false }) {
    const {
        currentHymn,
        isPlaying,
        currentTime,
        duration,
        audioElement,
        playHymn,
        togglePlayPause,
        skipForward,
        skipBackward,
        formatTime,
    } = useAudio();

    const isThisHymn = currentHymn?.mp3 === hymn?.mp3;

    const [isBuffering, setIsBuffering] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    // Local seek value while the user is dragging
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);

    const speedControlRef = useRef(null);

    // Auto-play on mount — used for shareable /hymn/:name/:artist/:mp3 links
    useEffect(() => {
        if (autoPlay && hymn) playHymn(hymn);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Detect buffering from native audio events (only when this hymn is active)
    useEffect(() => {
        if (!audioElement || !isThisHymn) return;
        const onWaiting  = () => setIsBuffering(true);
        const onPlaying  = () => setIsBuffering(false);
        const onCanPlay  = () => setIsBuffering(false);
        audioElement.addEventListener('waiting',  onWaiting);
        audioElement.addEventListener('playing',  onPlaying);
        audioElement.addEventListener('canplay',  onCanPlay);
        return () => {
            audioElement.removeEventListener('waiting',  onWaiting);
            audioElement.removeEventListener('playing',  onPlaying);
            audioElement.removeEventListener('canplay',  onCanPlay);
        };
    }, [audioElement, isThisHymn]);

    // Close speed slider on outside click
    useEffect(() => {
        const handler = (e) => {
            if (speedControlRef.current && !speedControlRef.current.contains(e.target)) {
                setShowSpeedSlider(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handlePlayPause = useCallback(() => {
        if (!isThisHymn || !currentHymn) {
            if (hymn) playHymn(hymn);
        } else {
            togglePlayPause();
        }
    }, [isThisHymn, currentHymn, hymn, playHymn, togglePlayPause]);

    // Seeking: show local value while dragging, commit on release
    const handleSeekStart = useCallback(() => {
        if (!isThisHymn) return;
        setIsSeeking(true);
        setSeekValue(currentTime);
    }, [isThisHymn, currentTime]);

    const handleSeekMove = useCallback((e) => {
        if (!isThisHymn) return;
        setSeekValue(parseFloat(e.target.value));
    }, [isThisHymn]);

    const handleSeekCommit = useCallback((e) => {
        setIsSeeking(false);
        if (!isThisHymn || !audioElement) return;
        audioElement.currentTime = parseFloat(e.target.value);
    }, [isThisHymn, audioElement]);

    const handleSpeedChange = useCallback((speed) => {
        setPlaybackSpeed(speed);
        if (audioElement) audioElement.playbackRate = speed;
    }, [audioElement]);

    const handleSliderChange = useCallback((e) => {
        handleSpeedChange(SPEED_OPTIONS[parseFloat(e.target.value)]);
    }, [handleSpeedChange]);

    if (!hymn?.mp3) return <div className="audio-no-src">No audio available</div>;

    const displayTime     = isThisHymn ? (isSeeking ? seekValue : currentTime) : 0;
    const displayDuration = isThisHymn ? duration : 0;
    const fillPct         = displayDuration > 0 ? (displayTime / displayDuration) * 100 : 0;
    const showSpinner     = isThisHymn && isBuffering && isPlaying;

    return (
        <div className="audio-container" onClick={e => e.stopPropagation()}>

            {/* ── Seek bar ─────────────────────────────────────────── */}
            <div className="audio-seek-container">
                <input
                    type="range"
                    className="audio-seek-bar"
                    min={0}
                    max={displayDuration || 100}
                    step={0.1}
                    value={displayTime}
                    disabled={!isThisHymn}
                    style={{ '--fill': `${fillPct}%` }}
                    onMouseDown={handleSeekStart}
                    onTouchStart={handleSeekStart}
                    onChange={handleSeekMove}
                    onMouseUp={handleSeekCommit}
                    onTouchEnd={handleSeekCommit}
                />
            </div>

            {/* ── Controls row ──────────────────────────────────────── */}
            <div className="audio-player-container">

                {/* Time */}
                <div className="audio-info-left">
                    <div className="time-display-section">
                        <span className="time-display">{formatTime(displayTime)}</span>
                        <span className="time-separator">/</span>
                        <span className="time-display">{formatTime(displayDuration)}</span>
                    </div>
                </div>

                {/* Play / skip */}
                <div className="audio-controls-center">
                    <span
                        className="audio-control-btn"
                        onClick={isThisHymn ? skipBackward : undefined}
                        title="Skip back 10 s"
                        style={!isThisHymn ? { opacity: 0.35, pointerEvents: 'none' } : {}}
                    >
                        <img src={rewindIcon} alt="Rewind" width="20" height="20" />
                    </span>

                    <span className="audio-control-btn play-pause-btn" onClick={handlePlayPause}>
                        {showSpinner ? (
                            <div className="loading-spinner" />
                        ) : isThisHymn && isPlaying ? (
                            <img src={pauseButtonIcon} alt="Pause" width="24" height="24" />
                        ) : (
                            <img src={playButtonIcon}  alt="Play"  width="24" height="24" />
                        )}
                    </span>

                    <span
                        className="audio-control-btn"
                        onClick={isThisHymn ? skipForward : undefined}
                        title="Skip forward 10 s"
                        style={!isThisHymn ? { opacity: 0.35, pointerEvents: 'none' } : {}}
                    >
                        <img src={forwardIcon} alt="Forward" width="20" height="20" />
                    </span>
                </div>

                {/* Speed */}
                <div className="audio-controls-right">
                    <div className="speed-control-section" ref={speedControlRef}>
                        <div
                            className={`speed-slider-inline ${showSpeedSlider ? 'expanded' : 'collapsed'}`}
                            onClick={() => { if (!showSpeedSlider) setShowSpeedSlider(true); }}
                        >
                            <div className="speed-current-display">{playbackSpeed}x</div>
                            {showSpeedSlider && (
                                <div className="speed-slider-track">
                                    <input
                                        type="range"
                                        min="0"
                                        max={SPEED_OPTIONS.length - 1}
                                        step="1"
                                        value={SPEED_OPTIONS.indexOf(playbackSpeed)}
                                        onChange={handleSliderChange}
                                        className="speed-slider"
                                        title="Adjust playback speed"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(Audio, (prevProps, nextProps) => (
    prevProps.hymn?.mp3    === nextProps.hymn?.mp3    &&
    prevProps.hymn?.name   === nextProps.hymn?.name   &&
    prevProps.hymn?.artist === nextProps.hymn?.artist
));
