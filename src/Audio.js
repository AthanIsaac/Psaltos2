import WavesurferPlayer from '@wavesurfer/react'
import { useState, useRef, useEffect } from 'react'

function Audio({ hymn }) {
    const [wavesurfer, setWavesurfer] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const canvasRef = useRef(null)

    // Handle cases where hymn or hymn.mp3 might be undefined
    const originalUrl = hymn?.mp3

    // Use our backend API to proxy the audio request
    const backendUrl = 'http://localhost:5001'
    const audioUrl = originalUrl ? `${backendUrl}/api/audio/proxy?url=${encodeURIComponent(originalUrl)}` : null

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
        
        // If user clicked play before audio was loaded, start playing now
        if (isPlaying) {
            ws.play()
        } else {
            setIsPlaying(false)
        }
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

    return (
        <>
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
                />
            )}
            <button onClick={onPlayPause} disabled={isLoading}>
                {isLoading ? 'Loading...' : (isPlaying ? 'Pause' : 'Play')}
            </button>
        </>
    )
}

export default Audio;