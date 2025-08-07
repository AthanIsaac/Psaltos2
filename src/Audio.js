import WavesurferPlayer from '@wavesurfer/react'
import { useState, useRef, useEffect } from 'react'
import playButtonIcon from './img/icons/playButton.svg'
import pauseButtonIcon from './img/icons/pauseButton.svg'
import forwardIcon from './img/icons/15Forward.svg'
import rewindIcon from './img/icons/15Rewind.svg'

function Audio({ hymn, autoLoad = false }) {
    const [wavesurfer, setWavesurfer] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const canvasRef = useRef(null)

    // Handle cases where hymn or hymn.mp3 might be undefined
    const originalUrl = hymn?.mp3

    // Use our backend API to proxy the audio request
    const backendUrl = 'http://localhost:5001'
    const audioUrl = originalUrl ? `${backendUrl}/api/audio/proxy?url=${encodeURIComponent(originalUrl)}` : null

    // Auto-load audio when autoLoad prop is true
    useEffect(() => {
        if (autoLoad && !isLoaded && !isLoading && originalUrl) {
            setIsLoading(true)
            setIsLoaded(true)
        }
    }, [autoLoad, isLoaded, isLoading, originalUrl])

    // Draw flat wave placeholder
    useEffect(() => {
        if (!isLoaded && canvasRef.current && originalUrl) {
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
    }, [isLoaded, originalUrl])

    const onReady = (ws) => {
        setWavesurfer(ws)
        setIsLoading(false)
        setIsLoaded(true)
        setDuration(ws.getDuration())
        
        // If user clicked play before audio was loaded, start playing now
        if (isPlaying) {
            ws.play()
        } else {
            setIsPlaying(false)
        }
    }

    const onTimeUpdate = (currentTime) => {
        setCurrentTime(currentTime)
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
        } else if (!isLoading && !isLoaded && originalUrl) {
            // First time play - load the audio and auto-play when ready
            setIsLoading(true)
            setIsLoaded(true)
            // Set a flag to auto-play when the audio is ready
            setIsPlaying(true)
        }
    }

    // Don't render if no audio URL is available
    if (!originalUrl) {
        return <div>No audio available</div>
    }

    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

    return (
        <div>
            {!isLoaded ? (
                // Show flat wave placeholder
                <div style={{ position: 'relative', width: '100%', height: '100px', backgroundColor: 'transparent' }}>
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={100}
                        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                    />
                    {isLoading && (
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
                    )}
                </div>
            ) : (
                // Show actual WavesurferPlayer once loaded
                <WavesurferPlayer
                    height={100}
                    waveColor="#2C475C"
                    url={audioUrl}
                    onReady={onReady}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeupdate={onTimeUpdate}
                    barWidth={3}
                    barRadius={10}
                />
            )}
            <div>
                <div >
                    <span
                        onClick={skipBackward}
                        disabled={!isLoaded}
                        title="Skip back 10 seconds"
                    >
                        <img src={rewindIcon} alt="Rewind 15 seconds" width="46" height="45" />
                    </span>

                    <span
                        onClick={onPlayPause}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="loading-spinner"></div>
                        ) : isPlaying ? (
                            <img src={pauseButtonIcon} alt="Pause" width="65" height="65" />
                        ) : (
                            <img src={playButtonIcon} alt="Play" width="51" height="51" />
                        )}
                    </span>

                    <span
                        onClick={skipForward}
                        disabled={!isLoaded}
                        title="Skip forward 10 seconds"
                    >
                        <img src={forwardIcon} alt="Forward 15 seconds" width="46" height="45" />
                    </span>
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