import { memo } from 'react';
import { useAudio } from './AudioContext.js';

const VolumeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6H5L9 3V13L5 10H2V6Z" fill="currentColor" />
    <path d="M11 5.5C11.8 6.3 12.2 7.1 12.2 8C12.2 8.9 11.8 9.7 11 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MuteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6H5L9 3V13L5 10H2V6Z" fill="currentColor" />
    <path d="M12 6L15 9M15 6L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Mute button + volume slider shared by the main player and the mini player. `prefix` selects the CSS family ("audio" or "mini"). */
function VolumeControl({ prefix }) {
  const { volume, setVolumeLevel, toggleMute } = useAudio();

  return (
    <div className={`${prefix}-volume-wrapper`}>
      <button className={`${prefix}-volume-btn`} onClick={toggleMute} title={volume > 0 ? 'Mute' : 'Unmute'}>
        {volume === 0 ? <MuteIcon /> : <VolumeIcon />}
      </button>
      <input
        type="range"
        className={`${prefix}-volume-slider`}
        min={0} max={1} step={0.02}
        value={volume}
        onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
        aria-label="Volume"
      />
    </div>
  );
}

export default memo(VolumeControl);
