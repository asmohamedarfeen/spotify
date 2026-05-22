import React, { useRef, useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import { usePlayer } from '../context/PlayerContext';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Shuffle, Repeat, Radio, ListMusic, WifiOff, Download 
} from 'lucide-react';
import { getOfflineSong } from '../utils/offlineDb';

export default function Player() {
  const {
    currentSong,
    isPlaying,
    isAutoplayEnabled,
    isSidebarOpen,
    togglePlay,
    playNext,
    playPrevious,
    toggleAutoplay,
    toggleSidebar,
    toggleNowPlaying,
    queue,
    history,
    recommendations,
    isOfflineMode,
    downloadedSongs,
    downloadingSongs,
    toggleOfflineMode,
    downloadSong,
    audioQuality,
    setAudioQuality,
    audioRef
  } = usePlayer();

  const [player, setPlayer] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffleActive, setIsShuffleActive] = useState(false);
  const [isRepeatActive, setIsRepeatActive] = useState(false);

  // audioRef is now shared via PlayerContext
  const [audioUrl, setAudioUrl] = useState('');
  const [isOfflinePlaying, setIsOfflinePlaying] = useState(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowQualityDropdown(false);
      }
    };
    if (showQualityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQualityDropdown]);

  // Sync volume to HTML5 audio tag
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Load offline song blob if available, or direct lossless stream if requested
  useEffect(() => {
    let active = true;
    const loadAudioBlob = async () => {
      if (!currentSong) {
        setIsOfflinePlaying(false);
        setAudioUrl('');
        return;
      }

      const isDownloaded = !!downloadedSongs[currentSong.videoId];
      const shouldPlayOffline = isOfflineMode && isDownloaded;

      if (shouldPlayOffline) {
        try {
          const songData = await getOfflineSong(currentSong.videoId);
          if (songData && songData.blob && active) {
            // Revoke old URL first
            if (audioUrl && audioUrl.startsWith('blob:')) {
              try { URL.revokeObjectURL(audioUrl); } catch(e){}
            }
            const localUrl = URL.createObjectURL(songData.blob);
            setAudioUrl(localUrl);
            setIsOfflinePlaying(true);
            
            // Pause YouTube player
            if (player && typeof player.pauseVideo === 'function') {
              try { player.pauseVideo(); } catch(e){}
            }
            return;
          }
        } catch (err) {
          console.error("Failed to load offline audio blob:", err);
        }
      }

      // Online Lossless audio quality streaming: bypass YouTube player and stream directly from backend
      if (!isOfflineMode && audioQuality === 'lossless') {
        if (audioUrl && audioUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(audioUrl); } catch(e){}
        }
        const backendStreamUrl = `http://localhost:8000/api/stream/${currentSong.videoId}?quality=lossless`;
        setAudioUrl(backendStreamUrl);
        setIsOfflinePlaying(true);

        // Pause YouTube player
        if (player && typeof player.pauseVideo === 'function') {
          try { player.pauseVideo(); } catch(e){}
        }
        return;
      }

      // Fallback: YouTube playing
      setIsOfflinePlaying(false);
      setAudioUrl('');
    };

    loadAudioBlob();

    return () => {
      active = false;
    };
  }, [currentSong, isOfflineMode, downloadedSongs, player, audioQuality]);

  // Control HTML5 audio playback state
  useEffect(() => {
    if (isOfflinePlaying && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isOfflinePlaying, audioUrl]);

  // Sync volume with YouTube player when ready
  const onReady = (event) => {
    setPlayer(event.target);
    setDuration(event.target.getDuration());
    event.target.setVolume(isMuted ? 0 : volume);
    if (isPlaying) {
      event.target.playVideo();
    }
  };

  const onStateChange = (event) => {
    // 1 is PLAYING, 2 is PAUSED
    if (event.data === 1 && !isPlaying) {
      togglePlay();
    } else if (event.data === 2 && isPlaying) {
      togglePlay();
    }
    setDuration(event.target.getDuration());
  };

  // Sync play/pause state
  useEffect(() => {
    let interval;
    if (isPlaying && player && !isOfflinePlaying) {
      interval = setInterval(() => {
        try {
          if (player && typeof player.getCurrentTime === 'function') {
            setProgress(player.getCurrentTime());
          }
        } catch (e) {}
      }, 1000);
      try {
        if (typeof player.playVideo === 'function') {
          player.playVideo();
        }
      } catch(e) {}
    } else if (!isPlaying && player && !isOfflinePlaying) {
      try {
        if (typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        }
      } catch(e) {}
    }
    return () => clearInterval(interval);
  }, [isPlaying, player, isOfflinePlaying]);

  // Adjust volume
  const handleVolumeChange = (e) => {
    const bar = e.currentTarget;
    const clickX = e.clientX - bar.getBoundingClientRect().left;
    const pct = Math.min(1, Math.max(0, clickX / bar.offsetWidth));
    const newVol = Math.round(pct * 100);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (isOfflinePlaying && audioRef.current) {
      audioRef.current.volume = newVol === 0 ? 0 : newVol / 100;
    } else if (player && typeof player.setVolume === 'function') {
      player.setVolume(newVol);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const targetMute = !isMuted;
    setIsMuted(targetMute);
    if (isOfflinePlaying && audioRef.current) {
      audioRef.current.muted = targetMute;
    } else if (player) {
      player.setVolume(targetMute ? 0 : volume);
    }
  };

  // Progress seeking
  const handleProgressChange = (e) => {
    if (!duration) return;
    const bar = e.currentTarget;
    const clickX = e.clientX - bar.getBoundingClientRect().left;
    const pct = Math.min(1, Math.max(0, clickX / bar.offsetWidth));
    const newProgress = pct * duration;
    
    if (isOfflinePlaying && audioRef.current) {
      audioRef.current.currentTime = newProgress;
      setProgress(newProgress);
    } else if (player && typeof player.seekTo === 'function') {
      player.seekTo(newProgress);
      setProgress(newProgress);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time) => {
    if (!time) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const opts = {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 1,
      controls: 0,
    },
  };

  const hasNext = queue.length > 0 || (isAutoplayEnabled && recommendations.length > 0);
  const hasPrev = history.length > 0;

  // Custom song ended logic: supports repeat mode
  const handleSongEnded = () => {
    if (isRepeatActive) {
      if (isOfflinePlaying && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setProgress(0);
      } else if (player) {
        player.seekTo(0);
        player.playVideo();
        setProgress(0);
      }
    } else {
      playNext();
    }
  };

  const isDownloaded = currentSong ? !!downloadedSongs[currentSong.videoId] : false;
  const isCurrentSongLossless = currentSong && (
    (!isOfflineMode && audioQuality === 'lossless') ||
    (isOfflineMode && isDownloaded && downloadedSongs[currentSong.videoId]?.quality === 'lossless')
  );

  return (
    <div className="player-bar">
      {/* 1. Track Info (Left) */}
      <div className="player-left">
        {currentSong ? (
          <>
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="now-playing-img now-playing-img-clickable"
              onClick={toggleNowPlaying}
              title="Open Now Playing view"
            />
            <div className="now-playing-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  className="now-playing-title"
                  style={{ maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                  onClick={toggleNowPlaying}
                >
                  {currentSong.title}
                </div>
                {downloadedSongs[currentSong.videoId] && (
                  <div 
                    title="Downloaded for Offline listening" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1db954', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'rgba(29, 185, 84, 0.1)', padding: '2px', flexShrink: 0 }}
                  >
                    <Download size={10} strokeWidth={3} />
                  </div>
                )}
                {/* Mini Visualizer Bars */}
                {isPlaying && (
                  <div className="mini-visualizer">
                    <span className="mini-bar" style={{ animationDelay: '0s' }}></span>
                    <span className="mini-bar" style={{ animationDelay: '0.15s' }}></span>
                    <span className="mini-bar" style={{ animationDelay: '0.3s' }}></span>
                    <span className="mini-bar" style={{ animationDelay: '0.1s' }}></span>
                    <span className="mini-bar" style={{ animationDelay: '0.25s' }}></span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                <div className="now-playing-artist" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.artist}</div>
                {isCurrentSongLossless && (
                  <span className="lossless-badge" title="Playing in Lossless FLAC Quality (1411kbps)">
                    HiFi
                  </span>
                )}
              </div>
            </div>
            <button 
              className={`heart-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => setIsLiked(!isLiked)}
              title={isLiked ? "Remove from Liked Songs" : "Save to Liked Songs"}
            >
              <Heart fill={isLiked ? "currentColor" : "none"} size={18} />
            </button>
          </>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>No song selected</div>
        )}
      </div>

      {/* 2. Controls & Progress (Center) */}
      <div className="player-center">
        <div className="player-controls">
          {/* Shuffle Mode */}
          <button 
            className={`control-btn ${isShuffleActive ? 'active' : ''}`}
            onClick={() => setIsShuffleActive(!isShuffleActive)}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>

          {/* Previous Button */}
          <button 
            className="control-btn" 
            onClick={playPrevious} 
            disabled={!hasPrev}
            title="Previous"
          >
            <SkipBack size={20} />
          </button>

          {/* Center Play Button */}
          <button className="play-pause-btn" onClick={togglePlay} disabled={!currentSong}>
            {isPlaying ? <Pause fill="black" size={16} /> : <Play fill="black" size={16} style={{ marginLeft: '2px' }} />}
          </button>

          {/* Next Button */}
          <button 
            className="control-btn" 
            onClick={playNext} 
            disabled={!hasNext}
            title="Next"
          >
            <SkipForward size={20} />
          </button>

          {/* Repeat Mode */}
          <button 
            className={`control-btn ${isRepeatActive ? 'active' : ''}`}
            onClick={() => setIsRepeatActive(!isRepeatActive)}
            title="Enable repeat"
          >
            <Repeat size={18} />
          </button>
        </div>

        {/* Progress Timeline Slider */}
        <div className="progress-container">
          <span className="time-text">{formatTime(progress)}</span>
          <div className="progress-bar-container" onClick={handleProgressChange}>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              ></div>
              <div 
                className="progress-thumb" 
                style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <span className="time-text">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Utility & Volume (Right) */}
      <div className="player-right">
        {/* Lossless HiFi Dropdown Button */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            className={`control-btn hifi-btn ${audioQuality === 'lossless' ? 'active' : ''}`}
            onClick={() => setShowQualityDropdown(!showQualityDropdown)}
            title="Audio Quality Settings (HiFi)"
            style={{ 
              marginRight: '8px', 
              color: audioQuality === 'lossless' ? '#1db954' : 'var(--text-subdued)',
              border: audioQuality === 'lossless' ? '1.5px solid #1db954' : '1.5px solid var(--text-subdued)',
              borderRadius: '4px',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '0.5px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: audioQuality === 'lossless' ? 'rgba(29,185,84,0.1)' : 'transparent',
              transition: 'all 0.2s ease',
              boxShadow: audioQuality === 'lossless' ? '0 0 8px rgba(29,185,84,0.25)' : 'none',
              cursor: 'pointer'
            }}
          >
            HiFi
          </button>

          {showQualityDropdown && (
            <div className="hifi-dropdown-menu">
              <div className="hifi-dropdown-header">
                <h3>Audio Quality</h3>
                <p>Configure streaming and download audio quality settings.</p>
              </div>
              
              <div className="hifi-dropdown-option">
                <span className="option-label">Quality Level</span>
                <select 
                  value={audioQuality} 
                  onChange={(e) => {
                    setAudioQuality(e.target.value);
                    localStorage.setItem('spotify-clone-audio-quality', e.target.value);
                  }}
                  className="hifi-select"
                >
                  <option value="standard">Standard Quality (160 kbps)</option>
                  <option value="lossless">Lossless Quality (1411 kbps FLAC)</option>
                </select>
              </div>

              <div className="hifi-dropdown-info">
                {audioQuality === 'lossless' ? (
                  <div className="hifi-status-glow">
                    <span className="status-dot"></span>
                    <span>HiFi Streaming Enabled</span>
                  </div>
                ) : (
                  <div className="hifi-status-muted">
                    <span>Standard Quality Active</span>
                  </div>
                )}
                <p className="hifi-desc">
                  {audioQuality === 'lossless' 
                    ? "HiFi mode bypasses YouTube compression, streaming direct CD-quality audio (16-bit FLAC) for absolute depth and clarity."
                    : "Standard quality uses optimized web formats to save bandwidth and load tracks instantly on slower connections."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Offline Mode Toggle Switch */}
        <button 
          className={`control-btn offline-toggle-btn ${isOfflineMode ? 'active' : ''}`}
          onClick={toggleOfflineMode}
          title={isOfflineMode ? "Offline Mode (ON)" : "Offline Mode (OFF)"}
          style={{ marginRight: '4px', color: isOfflineMode ? '#1db954' : 'var(--text-subdued)' }}
        >
          <WifiOff size={18} />
        </button>

        {/* Autoplay Radio Toggle */}
        <button 
          className={`control-btn autoplay-toggle-btn ${isAutoplayEnabled ? 'active' : ''}`}
          onClick={toggleAutoplay}
          title={isAutoplayEnabled ? "Autoplay similar songs (ON)" : "Autoplay similar songs (OFF)"}
          style={{ marginRight: '4px' }}
        >
          <Radio size={18} />
        </button>

        {/* Queue Toggle */}
        <button 
          className={`control-btn queue-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
          onClick={toggleSidebar}
          title="Play Queue"
          style={{ marginRight: '8px' }}
        >
          <ListMusic size={20} />
        </button>

        {/* Mute/Volume Icon */}
        <button className="control-btn" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Clickable Volume Slider */}
        <div className="volume-bar-container" onClick={handleVolumeChange}>
          <div className="volume-bar">
            <div 
              className="volume-fill" 
              style={{ width: `${isMuted ? 0 : volume}%` }}
            ></div>
            <div 
              className="volume-thumb" 
              style={{ left: `${isMuted ? 0 : volume}%` }}
            ></div>
          </div>
        </div>
      </div>

      {isOfflinePlaying && audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onEnded={handleSongEnded}
        />
      )}

      {currentSong && !isOfflinePlaying && (
        <div className="hidden-player">
          <YouTube 
            videoId={currentSong.videoId} 
            opts={opts} 
            onReady={onReady} 
            onStateChange={onStateChange} 
            onEnd={handleSongEnded}
          />
        </div>
      )}
    </div>
  );
}
