import WavesurferPlayer from '@wavesurfer/react'
import { useState, useRef, useEffect } from 'react'
import playButtonIcon from './img/icons/playButton.svg'
import pauseButtonIcon from './img/icons/pauseButton.svg'
import forwardIcon from './img/icons/15Forward.svg'
import rewindIcon from './img/icons/15Rewind.svg'
import './playButton.css'

// Global cache to store audio states across component mounts/unmounts
const audioCache = new Map()

function Audio({ hymn, autoLoad = false, compact = true }) {
    // Handle cases where hymn or hymn.mp3 might be undefined
    const originalUrl = hymn?.mp3
    
    // Use our backend API to proxy the audio request
    const backendUrl = 'http://localhost:5001'
    const audioUrl = originalUrl ? `${backendUrl}/api/audio/proxy?url=${encodeURIComponent(originalUrl)}` : null
    
    // Create a unique cache key for this audio
    const cacheKey = audioUrl || 'no-url'
    
    // Initialize state from cache or defaults
    const getCachedState = () => {
        if (audioCache.has(cacheKey)) {
            return audioCache.get(cacheKey)
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
    
    // Update cache whenever state changes
    useEffect(() => {
        if (cacheKey !== 'no-url') {
            audioCache.set(cacheKey, {
                wavesurfer,
                isPlaying,
                isLoaded,
                isLoading,
                hasStartedPlaying,
                shouldAutoPlay,
                currentTime,
                duration,
                playbackSpeed
            })
        }
    }, [cacheKey, wavesurfer, isPlaying, isLoaded, isLoading, hasStartedPlaying, shouldAutoPlay, currentTime, duration, playbackSpeed])
    
    // Sync current time with wavesurfer when it's available and playing
    useEffect(() => {
        if (wavesurfer && isPlaying && isLoaded) {
            const syncTime = () => {
                const actualTime = wavesurfer.getCurrentTime()
                if (Math.abs(actualTime - currentTime) > 0.5) { // Only update if there's a significant difference
                    setCurrentTime(actualTime)
                }
            }
            
            // Sync immediately
            syncTime()
            
            // Set up interval to keep time in sync during playback
            const interval = setInterval(syncTime, 100) // Update every 100ms
            
            return () => clearInterval(interval)
        }
    }, [wavesurfer, isPlaying, isLoaded, currentTime])
    
    // Cleanup: pause audio and update cache when component unmounts
    useEffect(() => {
        return () => {
            if (wavesurfer && isPlaying) {
                wavesurfer.pause()
                // Update cache to reflect paused state
                if (cacheKey !== 'no-url') {
                    const currentCache = audioCache.get(cacheKey) || {}
                    audioCache.set(cacheKey, {
                        ...currentCache,
                        isPlaying: false
                    })
                }
            }
        }
    }, [wavesurfer, isPlaying, cacheKey])

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
        
        // Sync current time with actual audio position
        setCurrentTime(ws.getCurrentTime())
        
        // Set the playback speed if it was cached
        if (playbackSpeed !== 1) {
            ws.setPlaybackRate(playbackSpeed)
        }
        
        // If user clicked play before audio was loaded, start playing now
        if (shouldAutoPlay) {
            ws.play()
            setHasStartedPlaying(true)
            setShouldAutoPlay(false)
        }
        // If we had cached playing state but component was remounted, reset to paused
        else if (isPlaying && !ws.isPlaying()) {
            setIsPlaying(false)
            setCurrentTime(0) // Reset time when paused
        }
        // If we had cached playing state and want to resume, start playing
        else if (isPlaying && hasStartedPlaying) {
            ws.play()
        }
    }

    const onTimeUpdate = (time) => {
        setCurrentTime(time)
        // Also update the cache immediately to keep it in sync
        if (cacheKey !== 'no-url') {
            const currentCache = audioCache.get(cacheKey) || {}
            audioCache.set(cacheKey, {
                ...currentCache,
                currentTime: time
            })
        }
    }

    const skipForward = () => {
        if (wavesurfer && isLoaded) {
            wavesurfer.skip(10)
        }
    }

    const skipBackward = () => {
        if (wavesurfer && isLoaded) {
            wavesurfer.skip(-10)
        }
    }

    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed)
        if (wavesurfer && isLoaded) {
            wavesurfer.setPlaybackRate(speed)
        }
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

    const onPlayPause = () => {
        if (isLoaded && wavesurfer) {
            wavesurfer.playPause()
            if (!hasStartedPlaying) {
                setHasStartedPlaying(true)
            }
        } else if (!isLoading && originalUrl) {
            // First time play - set flag to auto-play when ready
            setIsLoading(true)
            setHasStartedPlaying(true)
            setShouldAutoPlay(true)
        }
    }

    // Don't render if no audio URL is available
    if (!originalUrl) {
        return <div>No audio available</div>
    }

    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

    return (
        <div>
            {/* Always render WavesurferPlayer but control visibility */}
            <div style={{
                display: hasStartedPlaying ? 'block' : 'none',
                width: '100%',
                height: '100px'
            }}>
                <WavesurferPlayer
                    height={100}
                    waveColor="#2C475C"
                    url={audioUrl}
                    onReady={onReady}
                    onPlay={() => {
                        setIsPlaying(true)
                        setHasStartedPlaying(true)
                    }}
                    onPause={() => {
                        setIsPlaying(false)
                        // Update current time when paused to maintain accuracy
                        if (wavesurfer) {
                            setCurrentTime(wavesurfer.getCurrentTime())
                        }
                    }}
                    onTimeupdate={onTimeUpdate}
                    barWidth={2}
                    barRadius={10}
                />
            </div>
            
            {/* Show placeholder when not started playing */}
            {!hasStartedPlaying && (
                <div style={{ position: 'relative', width: '100%', height: '100px', backgroundColor: 'transparent' }}>
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={100}
                        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                    />
                    {/* {isLoading && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            fontSize: '12px'
                        }}>
                            Loading audio...
                        </div>
                    )} */}
                </div>
            )}
            <div className="audio-player-container">
                <div className="audio-controls-centered">
                    <span
                        className="audio-control-btn"
                        onClick={skipBackward}
                        disabled={!isLoaded}
                        title="Skip back 10 seconds"
                    >
                        <img src={rewindIcon} alt="Rewind 15 seconds" width={compact ? "24" : "46"} height={compact ? "23" : "45"} />
                    </span>

                    <span
                        className="audio-control-btn play-pause-btn"
                        onClick={onPlayPause}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={playButtonIcon} alt="Loading..." width={compact ? "28" : "51"} height={compact ? "28" : "51"} style={{opacity: 0.6}} />
                                <div className="loading-spinner" style={{ position: 'absolute' }}></div>
                            </div>
                        ) : isPlaying ? (
                            <img src={pauseButtonIcon} alt="Pause" width={compact ? "28" : "51"} height={compact ? "28" : "51"} />
                        ) : (
                            <img src={playButtonIcon} alt="Play" width={compact ? "28" : "51"} height={compact ? "28" : "51"} />
                        )}
                    </span>

                    <span
                        className="audio-control-btn"
                        onClick={skipForward}
                        disabled={!isLoaded}
                        title="Skip forward 10 seconds"
                    >
                        <img src={forwardIcon} alt="Forward 15 seconds" width={compact ? "24" : "46"} height={compact ? "23" : "45"} />
                    </span>
                </div>

                <div className="speed-control-section">
                    <span className="speed-label">Speed:</span>
                    <div className="speed-buttons">
                        {speedOptions.map(speed => (
                            <span
                                key={speed}
                                className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                                onClick={() => handleSpeedChange(speed)}
                                disabled={!isLoaded}
                            >
                                {speed}x
                            </span>
                        ))}
                    </div>
                </div>

                <div className="time-display-section">
                    <span className="time-display">{formatTime(currentTime)}</span>
                    <span className="time-separator">/</span>
                    <span className="time-display">{formatTime(duration)}</span>
                </div>

                {/* <div className="speed-control">
                    <label htmlFor="speed-select">Speed:</label>
                    <select
                        id="speed-select"
                        className="speed-dropdown"
                        value={playbackSpeed}
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    >
                        {speedOptions.map(speed => (
                            <option key={speed} value={speed}>
                                {speed}x
                            </option>
                        ))}
                    </select>
                </div> */}
            </div>
        </div>
    )
}

export default Audio;