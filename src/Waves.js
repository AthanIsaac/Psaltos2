import { useState, useEffect, useRef } from 'react';
import Waves from './Waves'; // Import the Waves component

function Audio({ audioSrc }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audio, setAudio] = useState(null);
    const audioRef = useRef(null); // Ref to directly access the audio element

    useEffect(() => {
        if (audioSrc) {
            // If you want Waves.js to handle the audio logic for visualization,
            // you might only need to pass the audioSrc to Waves.
            // However, for play/pause control here, you'd still create an Audio object.
            const audioElement = new Audio(audioSrc);
            audioRef.current = audioElement; // Assign to ref
            setAudio(audioElement);

            return () => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.src = '';
                }
            };
        }
    }, [audioSrc]);

    const onPlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch(error => {
                    console.error('Error playing audio:', error);
                });
            }
        }
    };

    if (!audioSrc) {
        return <div>No audio available</div>;
    }

    return (
        <div style={{ padding: '10px', background: '#f0f0f0', borderRadius: '5px', margin: '10px 0' }}>
            <button onClick={onPlayPause} style={{ padding: '10px 20px', fontSize: '16px' }}>
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                Audio: {audioSrc.split('/').pop()}
            </div>
            {/* Render the Waves component here, passing the mp3 source */}
            <Waves mp3={audioSrc} />
        </div>
    );
}

export default Audio;