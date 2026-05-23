import {
  ChevronDown,
  Download,
  Heart,
  ListMusic,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';

function formatTime(time) {
  if (!time || Number.isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function MobileNowPlaying() {
  const {
    currentSong,
    cycleRepeatMode,
    downloadedSongs,
    downloadSong,
    isLyricsOpen,
    isMobileNowPlayingOpen,
    isPlaying,
    isShuffleActive,
    likedSongs,
    lyrics,
    lyricsLoading,
    playNext,
    playPrevious,
    queue,
    history,
    isAutoplayEnabled,
    repeatMode,
    setMobileNowPlayingOpen,
    toggleLikedSong,
    toggleLyrics,
    togglePlay,
    toggleShuffle,
    audioRef,
  } = usePlayer();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const progressBarRef = useRef(null);
  const panelRef = useRef(null);
  const startYRef = useRef(0);
  const translateYRef = useRef(0);

  // Sync progress from audio element
  useEffect(() => {
    if (!audioRef?.current || isDragging) return;
    const audio = audioRef.current;
    const update = () => {
      setProgress(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', update);
    };
  }, [audioRef, isDragging]);

  // Swipe down to dismiss
  const handleTouchStart = useCallback((e) => {
    startYRef.current = e.touches[0].clientY;
    translateYRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0 && panelRef.current) {
      translateYRef.current = delta;
      panelRef.current.style.transform = `translateY(${delta}px)`;
      panelRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (panelRef.current) {
      panelRef.current.style.transition = '';
      if (translateYRef.current > 120) {
        setMobileNowPlayingOpen(false);
      }
      panelRef.current.style.transform = '';
    }
  }, [setMobileNowPlayingOpen]);

  // Progress bar touch handling
  const handleProgressTouch = useCallback((e) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const newTime = pct * duration;
    setProgress(newTime);
    return newTime;
  }, [duration]);

  const handleProgressTouchStart = useCallback((e) => {
    setIsDragging(true);
    handleProgressTouch(e);
  }, [handleProgressTouch]);

  const handleProgressTouchMove = useCallback((e) => {
    if (isDragging) handleProgressTouch(e);
  }, [isDragging, handleProgressTouch]);

  const handleProgressTouchEnd = useCallback(() => {
    if (isDragging && audioRef?.current) {
      audioRef.current.currentTime = progress;
    }
    setIsDragging(false);
  }, [isDragging, audioRef, progress]);

  if (!isMobileNowPlayingOpen || !currentSong) return null;

  const isLiked = likedSongs[currentSong.videoId];
  const isDownloaded = Boolean(downloadedSongs[currentSong.videoId]);
  const hasPrevious = history.length > 0;
  const hasNext = queue.length > 0 || isAutoplayEnabled;
  const repeatIcon = repeatMode === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />;
  const progressPct = duration ? (progress / duration) * 100 : 0;

  return (
    <div className="mobile-now-playing-overlay" id="mobile-now-playing">
      <div
        className="mobile-now-playing"
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="mnp-header">
          <button className="mnp-dismiss" onClick={() => setMobileNowPlayingOpen(false)} aria-label="Dismiss">
            <ChevronDown size={28} />
          </button>
          <div className="mnp-header-title">
            <span className="mnp-playing-from">PLAYING FROM PLAYLIST</span>
          </div>
          <button className="mnp-more" aria-label="More options">
            <MoreHorizontal size={24} />
          </button>
        </div>

        {/* Album Art */}
        <div className="mnp-artwork-container">
          <img
            className="mnp-artwork"
            src={currentSong.thumbnail}
            alt={currentSong.title}
          />
        </div>

        {/* Song Info */}
        <div className="mnp-song-info">
          <div className="mnp-song-details">
            <div className="mnp-title-wrap">
              <h2 className="mnp-title">{currentSong.title}</h2>
            </div>
            <p className="mnp-artist">{currentSong.artistName}</p>
          </div>
          <button
            className={`mnp-like-btn ${isLiked ? 'active' : ''}`}
            onClick={() => toggleLikedSong(currentSong)}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mnp-progress-section">
          <div
            className="mnp-progress-bar"
            ref={progressBarRef}
            onTouchStart={handleProgressTouchStart}
            onTouchMove={handleProgressTouchMove}
            onTouchEnd={handleProgressTouchEnd}
            onClick={(e) => {
              const rect = progressBarRef.current.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const newTime = pct * duration;
              setProgress(newTime);
              if (audioRef?.current) audioRef.current.currentTime = newTime;
            }}
          >
            <div className="mnp-progress-track">
              <div className="mnp-progress-fill" style={{ width: `${progressPct}%` }} />
              <div className="mnp-progress-thumb" style={{ left: `${progressPct}%` }} />
            </div>
          </div>
          <div className="mnp-time-row">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="mnp-controls">
          <button
            className={`mnp-ctrl-btn ${isShuffleActive ? 'active' : ''}`}
            onClick={toggleShuffle}
            aria-label="Shuffle"
          >
            <Shuffle size={22} />
          </button>
          <button
            className="mnp-ctrl-btn"
            onClick={playPrevious}
            disabled={!hasPrevious}
            aria-label="Previous"
          >
            <SkipBack size={28} fill="white" />
          </button>
          <button
            className="mnp-play-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={30} fill="black" /> : <Play size={30} fill="black" />}
          </button>
          <button
            className="mnp-ctrl-btn"
            onClick={playNext}
            disabled={!hasNext}
            aria-label="Next"
          >
            <SkipForward size={28} fill="white" />
          </button>
          <button
            className={`mnp-ctrl-btn ${repeatMode !== 'off' ? 'active' : ''}`}
            onClick={cycleRepeatMode}
            aria-label="Repeat"
          >
            {repeatIcon}
          </button>
        </div>

        {/* Action Bar */}
        <div className="mnp-actions">
          <button className="mnp-action-btn" onClick={() => { setShowLyrics(!showLyrics); if (!isLyricsOpen) toggleLyrics(); }}>
            <Mic2 size={20} />
          </button>
          {!isDownloaded ? (
            <button className="mnp-action-btn" onClick={() => downloadSong(currentSong)} aria-label="Download">
              <Download size={20} />
            </button>
          ) : (
            <span className="mnp-action-btn active" aria-label="Downloaded">
              <Download size={20} />
            </span>
          )}
          <button className="mnp-action-btn" aria-label="Share">
            <Share2 size={20} />
          </button>
          <button className="mnp-action-btn" onClick={() => setMobileNowPlayingOpen(false)} aria-label="Queue">
            <ListMusic size={20} />
          </button>
        </div>

        {/* Lyrics Section */}
        {showLyrics && (
          <div className="mnp-lyrics-section">
            <div className="mnp-lyrics-header">
              <h3>Lyrics</h3>
              <button className="mnp-lyrics-close" onClick={() => setShowLyrics(false)}>
                <X size={20} />
              </button>
            </div>
            {lyricsLoading && <p className="mnp-lyrics-loading">Loading lyrics...</p>}
            {!lyricsLoading && lyrics?.available && (
              <div className="mnp-lyrics-lines">
                {lyrics.lines?.slice(0, 20).map((line, i) => (
                  <p key={`${line}-${i}`} className="mnp-lyrics-line">{line}</p>
                ))}
              </div>
            )}
            {!lyricsLoading && !lyrics?.available && (
              <p className="mnp-lyrics-unavailable">{lyrics?.error || 'Lyrics unavailable for this track.'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
