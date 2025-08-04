import { useState, useEffect } from 'react';

function Audio({ audioSrc }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audio, setAudio] = useState(null);

    useEffect(() => {
        if (audioSrc) {
            const audioElement = new Audio(audioSrc);
            setAudio(audioElement);
            
            return () => {
                audioElement.pause();
                audioElement.src = '';
            };
        }
    }, [audioSrc]);

    const onPlayPause = () => {
        if (audio) {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                audio.play().then(() => {
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
        </div>
    );
}

export default Audio;