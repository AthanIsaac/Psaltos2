import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useAudio, useAudioTime, SKIP_SECONDS } from './AudioContext.js'
import VolumeControl from './VolumeControl.js'
import playButtonIcon from './img/icons/playButton.svg'
import pauseButtonIcon from './img/icons/pauseButton.svg'
import forwardIcon from './img/icons/15Forward.svg'
import rewindIcon from './img/icons/15Rewind.svg'
import './styles/audio.css'

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

function Audio({ hymn, autoPlay = false }) {
    const {
        currentHymn,
        isPlaying,
        audioElement,
        playHymn,
        togglePlayPause,
        skipForward,
        skipBackward,
        formatTime,
        setMainPlayerVisible,
        audioError,
        queue,
        nextTrack,
        prevTrack,
        playbackSpeed,
        setPlaybackSpeed,
    } = useAudio();
    const { currentTime, duration } = useAudioTime();

    const isThisHymn = currentHymn?.mp3 === hymn?.mp3;
    const hasQueue = queue.items.length > 1;

    const [isBuffering, setIsBuffering] = useState(false);
    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);

    const speedControlRef = useRef(null);
    const containerRef = useRef(null);
    const playerId = useRef(Symbol('audio-player')).current;

    // Report visibility so MiniPlayer knows when to appear
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => setMainPlayerVisible(playerId, entry.isIntersecting),
            { threshold: 0.1 }
        );
        obs.observe(el);
        return () => {
            obs.disconnect();
            setMainPlayerVisible(playerId, false);
        };
    }, [setMainPlayerVisible, playerId]);

    // Auto-play on mount — used for shareable /hymn/:name/:artist/:mp3 links
    useEffect(() => {
        if (autoPlay && hymn) playHymn(hymn);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!audioElement || !isThisHymn) return;
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => setIsBuffering(false);
        const onCanPlay = () => setIsBuffering(false);
        audioElement.addEventListener('waiting',  onWaiting);
        audioElement.addEventListener('playing',  onPlaying);
        audioElement.addEventListener('canplay',  onCanPlay);
        return () => {
            audioElement.removeEventListener('waiting',  onWaiting);
            audioElement.removeEventListener('playing',  onPlaying);
            audioElement.removeEventListener('canplay',  onCanPlay);
        };
    }, [audioElement, isThisHymn]);

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

    const handleSeekStart = useCallback(() => {
        if (!isThisHymn) return;
        setIsSeeking(true);
        setSeekValue(currentTime);
    }, [isThisHymn, currentTime]);

    const handleSeekMove = useCallback((e) => {
        if (!isThisHymn) return;
        const value = parseFloat(e.target.value);
        setSeekValue(value);
        // Keyboard adjustments arrive without a mouse/touch drag, so apply them directly
        if (!isSeeking && audioElement) audioElement.currentTime = value;
    }, [isThisHymn, isSeeking, audioElement]);

    const handleSeekCommit = useCallback((e) => {
        setIsSeeking(false);
        if (!isThisHymn || !audioElement) return;
        audioElement.currentTime = parseFloat(e.target.value);
    }, [isThisHymn, audioElement]);

    const handleSpeedChange = setPlaybackSpeed;

    const handleSliderChange = useCallback((e) => {
        handleSpeedChange(SPEED_OPTIONS[parseFloat(e.target.value)]);
    }, [handleSpeedChange]);

    if (!hymn?.mp3) return <div className="audio-no-src">No audio available</div>;

    const displayTime     = isThisHymn ? (isSeeking ? seekValue : currentTime) : 0;
    const displayDuration = isThisHymn ? duration : 0;
    const fillPct         = displayDuration > 0 ? (displayTime / displayDuration) * 100 : 0;
    const showSpinner     = isThisHymn && isBuffering && isPlaying;

    return (
        <div className="audio-container" ref={containerRef} onClick={e => e.stopPropagation()}>

            {/* Seek bar — top strip */}
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

            {isThisHymn && audioError && (
                <div className="audio-error" role="alert">{audioError}</div>
            )}

            {/* Controls row */}
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
                    {hasQueue && isThisHymn && (
                        <button className="audio-control-btn" onClick={prevTrack} title="Previous hymn" aria-label="Previous hymn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 3h2v10H3zM14 3v10L6.5 8z" /></svg>
                        </button>
                    )}
                    <button
                        className="audio-control-btn"
                        onClick={isThisHymn ? skipBackward : undefined}
                        title={`Skip back ${SKIP_SECONDS} s`}
                        disabled={!isThisHymn}
                    >
                        <img src={rewindIcon} alt="Rewind" width="18" height="18" />
                    </button>

                    <button className="audio-control-btn play-pause-btn" onClick={handlePlayPause}>
                        {showSpinner ? (
                            <div className="loading-spinner" />
                        ) : isThisHymn && isPlaying ? (
                            <img src={pauseButtonIcon} alt="Pause" width="20" height="20" />
                        ) : (
                            <img src={playButtonIcon}  alt="Play"  width="20" height="20" />
                        )}
                    </button>

                    <button
                        className="audio-control-btn"
                        onClick={isThisHymn ? skipForward : undefined}
                        title={`Skip forward ${SKIP_SECONDS} s`}
                        disabled={!isThisHymn}
                    >
                        <img src={forwardIcon} alt="Forward" width="18" height="18" />
                    </button>
                    {hasQueue && isThisHymn && (
                        <button className="audio-control-btn" onClick={nextTrack} title="Next hymn" aria-label="Next hymn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11 3h2v10h-2zM2 3v10l7.5-5z" /></svg>
                        </button>
                    )}
                </div>

                {/* Volume + Speed */}
                <div className="audio-controls-right">
                    <VolumeControl prefix="audio" />

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
