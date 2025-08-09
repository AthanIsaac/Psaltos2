import WavesurferPlayer from '@wavesurfer/react'
import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useAudio } from './AudioContext.js'
import playButtonIcon from './img/icons/playButton.svg'
import pauseButtonIcon from './img/icons/pauseButton.svg'
import forwardIcon from './img/icons/15Forward.svg'
import rewindIcon from './img/icons/15Rewind.svg'
import './playButton.css'

// Global cache to store audio states across component mounts/unmounts and browser sessions
const audioCache = new Map()

// Enhanced cache with localStorage persistence
const getPersistedCache = (key) => {
    try {
        const stored = localStorage.getItem(`audio_cache_${key}`)
        return stored ? JSON.parse(stored) : null
    } catch (error) {
        console.warn('Failed to get persisted cache:', error)
        return null
    }
}

const setPersistedCache = (key, data) => {
    try {
        localStorage.setItem(`audio_cache_${key}`, JSON.stringify(data))
    } catch (error) {
        console.warn('Failed to persist cache:', error)
    }
}

function Audio({ hymn, autoLoad = false, compact = true }) {
    const {
        currentHymn,
        playHymn,
        updateTime,
        updateDuration,
        updatePlayState,
        setWavesurferInstance
    } = useAudio();
    
    // Handle cases where hymn or hymn.mp3 might be undefined
    const originalUrl = hymn?.mp3
    
    // Use our backend API to proxy the audio request
    const backendUrl = 'http://localhost:5002'
    const audioUrl = originalUrl ? `${backendUrl}/api/audio/proxy?url=${encodeURIComponent(originalUrl)}` : null
    
    // Create a unique cache key for this audio
    const cacheKey = audioUrl || 'no-url'
    
    // State for speed control slider
    const [showSpeedSlider, setShowSpeedSlider] = useState(false)
    
    // Initialize state from cache or defaults
    const getCachedState = () => {
        // First check memory cache
        if (audioCache.has(cacheKey)) {
            return audioCache.get(cacheKey)
        }
        
        // Then check localStorage for persistence across sessions
        const persistedState = getPersistedCache(cacheKey)
        if (persistedState) {
            // Restore from localStorage but reset wavesurfer instance
            const restoredState = {
                ...persistedState,
                wavesurfer: null, // This will be recreated
                isLoading: false  // Reset loading state
            }
            audioCache.set(cacheKey, restoredState)
            return restoredState
        }
        
        return {
            wavesurfer: null,
            isPlaying: false,
            isLoaded: false,
            isLoading: false,
            hasStartedPlaying: false,
            shouldAutoPlay: false,
            currentTime: 0,
            duration: 0,
            playbackSpeed: 1
        }
    }
    
    const cachedState = getCachedState()
    
    const [wavesurfer, setWavesurfer] = useState(cachedState.wavesurfer)
    const [isPlaying, setIsPlaying] = useState(cachedState.isPlaying)
    const [isLoaded, setIsLoaded] = useState(cachedState.isLoaded)
    const [isLoading, setIsLoading] = useState(cachedState.isLoading)
    const [hasStartedPlaying, setHasStartedPlaying] = useState(cachedState.hasStartedPlaying)
    const [shouldAutoPlay, setShouldAutoPlay] = useState(cachedState.shouldAutoPlay)
    const [currentTime, setCurrentTime] = useState(cachedState.currentTime)
    const [duration, setDuration] = useState(cachedState.duration)
    const [playbackSpeed, setPlaybackSpeed] = useState(cachedState.playbackSpeed)
    const canvasRef = useRef(null)
    const speedControlRef = useRef(null)
    const speedDropdownRef = useRef(null)
    
    // Debug logging (after state initialization)
    console.log('Audio component render - showSpeedSlider:', showSpeedSlider)
    console.log('Audio component render - playbackSpeed:', playbackSpeed)
    console.log('Audio component render - isLoaded:', isLoaded)
    
    // Update cache whenever state changes - optimized to reduce frequency
    useEffect(() => {
        if (cacheKey !== 'no-url') {
            const cacheData = {
                wavesurfer,
                isPlaying,
                isLoaded,
                isLoading,
                hasStartedPlaying,
                shouldAutoPlay,
                currentTime,
                duration,
                playbackSpeed
            }
            
            // Update memory cache
            audioCache.set(cacheKey, cacheData)
            
            // Only persist to localStorage when there's meaningful state to save
            if (hasStartedPlaying && (isPlaying || currentTime > 0)) {
                const persistData = {
                    isPlaying,
                    hasStartedPlaying,
                    currentTime,
                    duration,
                    playbackSpeed
                }
                setPersistedCache(cacheKey, persistData)
            }
        }
    }, [cacheKey, isPlaying, hasStartedPlaying, currentTime, duration, playbackSpeed]) // Removed less critical dependencies
    
    // Sync current time with wavesurfer when it's available and playing - optimized
    useEffect(() => {
        if (wavesurfer && isLoaded && isPlaying) {
            const syncTime = () => {
                try {
                    const actualTime = wavesurfer.getCurrentTime()
                    if (actualTime >= 0 && !isNaN(actualTime) && Math.abs(actualTime - currentTime) > 0.5) {
                        setCurrentTime(actualTime)
                        updateTime(actualTime)
                    }
                } catch (error) {
                    console.warn('Failed to get current time:', error);
                }
            }
            
            // Increased interval to reduce re-renders
            const interval = setInterval(syncTime, 1000) // Update every 1000ms instead of 500ms
            
            return () => clearInterval(interval)
        }
    }, [wavesurfer, isLoaded, isPlaying, currentTime, updateTime]) // Added currentTime to dependencies for comparison
    
    // Close speed slider when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (speedControlRef.current && !speedControlRef.current.contains(event.target)) {
                setShowSpeedSlider(false)
            }
        }
        
        if (showSpeedSlider) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showSpeedSlider])
    
    // Cleanup: preserve audio state during navigation and re-renders
    useEffect(() => {
        return () => {
            // Don't stop audio on component unmount - let it continue playing
            // Just update the cache to maintain state
            if (wavesurfer && cacheKey !== 'no-url') {
                try {
                    const currentCache = audioCache.get(cacheKey) || {}
                    audioCache.set(cacheKey, {
                        ...currentCache,
                        currentTime: wavesurfer.getCurrentTime(),
                        isPlaying: wavesurfer.isPlaying(),
                        hasStartedPlaying: true
                    })
                } catch (error) {
                    console.warn('Failed to cache audio state:', error);
                }
            }
        }
    }, [wavesurfer, cacheKey])

    // Auto-load audio when autoLoad prop is true
    useEffect(() => {
        if (autoLoad && !isLoaded && !isLoading && originalUrl) {
            setIsLoading(true)
            // Don't set isLoaded=true here, let the WavesurferPlayer load and call onReady
            // setIsLoaded(true) - this was causing the issue
        }
    }, [autoLoad, isLoaded, isLoading, originalUrl])

    // Draw flat wave placeholder
    useEffect(() => {
        if (!hasStartedPlaying && canvasRef.current && originalUrl) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            const width = canvas.width
            const height = canvas.height
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height)
            
            // Set wave color
            ctx.fillStyle = '#2C475C'
            
            // Draw flat wave (small rectangles across the width)
            const barWidth = 2
            const barSpacing = 1
            const barHeight = 4
            const centerY = height / 2
            
            for (let x = 0; x < width; x += barWidth + barSpacing) {
                ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight)
            }
        }
    }, [hasStartedPlaying, originalUrl])

    const onReady = (ws) => {
        setWavesurfer(ws)
        setIsLoading(false)
        setIsLoaded(true)
        setDuration(ws.getDuration())
        
        // Update global audio context
        setWavesurferInstance(ws)
        updateDuration(ws.getDuration())
        
        // Restore cached state if available
        const cachedState = audioCache.get(cacheKey)
        if (cachedState && cachedState.hasStartedPlaying && cachedState.currentTime > 0) {
            // Restore playback position
            setTimeout(() => {
                try {
                    const seekPosition = cachedState.currentTime / ws.getDuration()
                    if (seekPosition > 0 && seekPosition < 1) {
                        ws.seekTo(seekPosition)
                        setCurrentTime(cachedState.currentTime)
                    }
                    
                    // Restore playing state
                    if (cachedState.isPlaying) {
                        setTimeout(() => {
                            ws.play()
                            setIsPlaying(true)
                            setHasStartedPlaying(true)
                            playHymn(hymn)
                        }, 200)
                    }
                } catch (error) {
                    console.warn('Failed to restore audio position:', error);
                }
            }, 100)
        } else {
            setCurrentTime(ws.getCurrentTime())
        }
        
        // Set the playback speed if it was cached
        if (playbackSpeed !== 1) {
            ws.setPlaybackRate(playbackSpeed)
        }
        
        // If user clicked play before audio was loaded, start playing now
        if (shouldAutoPlay) {
            ws.play()
            setHasStartedPlaying(true)
            setShouldAutoPlay(false)
            playHymn(hymn)
        }
    }


    const onTimeUpdate = (time) => {
        // Only update if the time is valid and different from current
        if (time >= 0 && !isNaN(time) && Math.abs(time - currentTime) > 0.1) {
            setCurrentTime(time)
            updateTime(time)
            
            // Update cache immediately to keep it in sync
            if (cacheKey !== 'no-url') {
                const currentCache = audioCache.get(cacheKey) || {}
                audioCache.set(cacheKey, {
                    ...currentCache,
                    currentTime: time
                })
            }
        }
    }

    const skipForward = () => {
        if (wavesurfer && isLoaded) {
            try {
                wavesurfer.skip(10)
            } catch (error) {
                console.warn('Audio skip forward failed:', error);
            }
        }
    }

    const skipBackward = () => {
        if (wavesurfer && isLoaded) {
            try {
                wavesurfer.skip(-10)
            } catch (error) {
                console.warn('Audio skip backward failed:', error);
            }
        }
    }

    const handleSpeedChange = (speed) => {
        console.log('Speed changed to:', speed)
        setPlaybackSpeed(speed)
        if (wavesurfer && isLoaded) {
            wavesurfer.setPlaybackRate(speed)
        }
    }
    
    const handleSliderChange = (event) => {
        const sliderValue = parseFloat(event.target.value)
        const speed = speedOptions[sliderValue]
        console.log('Slider changed - index:', sliderValue, 'speed:', speed)
        handleSpeedChange(speed)
    }

    const formatTime = (time) => {
        if (time && !isNaN(time)) {
            const minutes = Math.floor(time / 60)
            const formatMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`
            const seconds = Math.floor(time % 60)
            const formatSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`
            return `${formatMinutes}:${formatSeconds}`
        }
        return '00:00'
    }

    const onPlayPause = useCallback(() => {
        if (isLoaded && wavesurfer) {
            try {
                wavesurfer.playPause()
                if (!hasStartedPlaying) {
                    setHasStartedPlaying(true)
                    // Update global context when starting to play
                    playHymn(hymn)
                }
            } catch (error) {
                console.warn('Audio playPause failed:', error);
                // Try to recover by toggling the playing state
                setIsPlaying(prev => !prev);
            }
        } else if (!isLoading && originalUrl) {
            // First time play - set flag to auto-play when ready
            setIsLoading(true)
            setHasStartedPlaying(true)
            setShouldAutoPlay(true)
            // Update global context
            playHymn(hymn)
        }
    }, [isLoaded, wavesurfer, hasStartedPlaying, isLoading, originalUrl, playHymn, hymn])

    // Don't render if no audio URL is available
    if (!originalUrl) {
        return <div>No audio available</div>
    }

    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

    return (
        <div className="audio-container">
            {/* Always render WavesurferPlayer but control visibility */}
            <div className={hasStartedPlaying ? 'audio-visible' : 'audio-hidden'}>
                {(isLoading || hasStartedPlaying || autoLoad) && (
                    <WavesurferPlayer
                        key={audioUrl} // Stable key based on audio URL to prevent unnecessary re-creation
                        height={100}
                        waveColor="#2C475C"
                        progressColor="#D4AF37"
                        url={audioUrl}
                        onReady={onReady}
                        onPlay={() => {
                            setIsPlaying(true)
                            setHasStartedPlaying(true)
                            playHymn(hymn)
                            updatePlayState(true)
                        }}
                        onPause={() => {
                            setIsPlaying(false)
                            updatePlayState(false)
                            // Update time when paused but don't cause flickering
                            if (wavesurfer) {
                                try {
                                    const time = wavesurfer.getCurrentTime()
                                    if (time >= 0 && !isNaN(time)) {
                                        setCurrentTime(time)
                                        updateTime(time)
                                    }
                                } catch (error) {
                                    console.warn('Failed to get time on pause:', error);
                                }
                            }
                        }}
                        onTimeupdate={onTimeUpdate}
                        barWidth={3}
                        barRadius={2}
                        barGap={1}
                    />
                )}
            </div>
            
            {/* Show placeholder when not started playing */}
            {!hasStartedPlaying && (
                <div className="audio-placeholder">
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={120}
                        className="audio-canvas"
                    />
                </div>
            )}
            <div className="audio-player-container">
                <div className="audio-info-left">
                    <div className="time-display-section">
                        <span className="time-display">{formatTime(currentTime)}</span>
                        <span className="time-separator">/</span>
                        <span className="time-display">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="audio-controls-center">
                    <span
                        className="audio-control-btn"
                        onClick={skipBackward}
                        disabled={!isLoaded}
                        title="Skip back 10 seconds"
                    >
                        <img src={rewindIcon} alt="Rewind 10 seconds" width="20" height="20" />
                    </span>

                    <span
                        className="audio-control-btn play-pause-btn"
                        onClick={onPlayPause}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="audio-loading-container">
                                <img src={playButtonIcon} alt="Loading..." width="24" height="24" className="audio-loading-icon" />
                                <div className="loading-spinner audio-loading-spinner"></div>
                            </div>
                        ) : isPlaying ? (
                            <img src={pauseButtonIcon} alt="Pause" width="24" height="24" />
                        ) : (
                            <img src={playButtonIcon} alt="Play" width="24" height="24" />
                        )}
                    </span>

                    <span
                        className="audio-control-btn"
                        onClick={skipForward}
                        disabled={!isLoaded}
                        title="Skip forward 10 seconds"
                    >
                        <img src={forwardIcon} alt="Forward 10 seconds" width="20" height="20" />
                    </span>
                </div>

                <div className="audio-controls-right">
                    <div className="speed-control-section" ref={speedControlRef}>
                        <div
                            className={`speed-slider-inline ${showSpeedSlider ? 'expanded' : 'collapsed'}`}
                            onClick={() => {
                                if (!showSpeedSlider) {
                                    console.log('Speed control clicked - expanding slider')
                                    setShowSpeedSlider(true)
                                }
                            }}
                        >
                            <div className="speed-current-display">{playbackSpeed}x</div>
                            {showSpeedSlider && (
                                <div className="speed-slider-track">
                                    <input
                                        type="range"
                                        min="0"
                                        max={speedOptions.length - 1}
                                        step="1"
                                        value={speedOptions.indexOf(playbackSpeed)}
                                        onChange={handleSliderChange}
                                        className="speed-slider"
                                        disabled={!isLoaded}
                                        title="Adjust playback speed"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Memoize the Audio component to prevent unnecessary re-renders
export default memo(Audio, (prevProps, nextProps) => {
    // Only re-render if hymn data actually changes
    return (
        prevProps.hymn?.mp3 === nextProps.hymn?.mp3 &&
        prevProps.hymn?.name === nextProps.hymn?.name &&
        prevProps.autoLoad === nextProps.autoLoad &&
        prevProps.compact === nextProps.compact
    );
});