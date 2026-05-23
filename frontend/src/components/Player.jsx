import { CheckCircle2, Laptop, ListMusic, Mic2, Pause, Play, Radio, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { api } from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { getOfflineSong } from '../utils/offlineDb';

function formatTime(time) {
  if (!time || Number.isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function Player() {
  const {
    audioQuality,
    audioRef,
    currentSong,
    cycleRepeatMode,
    downloadedSongs,
    history,
    isAutoplayEnabled,
    isLyricsOpen,
    isNowPlayingOpen,
    isOfflineMode,
    isPlaying,
    isShuffleActive,
    playNext,
    playPrevious,
    queue,
    repeatMode,
    restartSignal,
    setAudioQuality,
    setLyricsOpen,
    setMobileNowPlayingOpen,
    setNowPlayingOpen,
    toggleAutoplay,
    toggleOfflineMode,
    togglePlay,
    toggleShuffle,
  } = usePlayer();

  const [player, setPlayer] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [usesHtmlAudio, setUsesHtmlAudio] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const oldBlobUrl = useRef('');

  const runYouTube = useCallback((action) => {
    if (!player || usesHtmlAudio) return;
    try {
      const iframe = player.getIframe?.();
      if (!iframe?.src) return;
      action(player);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('YouTube player command skipped:', error);
      }
    }
  }, [player, usesHtmlAudio]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume / 100;
    audioRef.current.muted = isMuted;
  }, [audioRef, isMuted, volume]);

  useEffect(() => {
    runYouTube((target) => {
      if (isMuted) {
        target.mute?.();
        target.setVolume?.(0);
      } else {
        target.unMute?.();
        target.setVolume?.(volume);
      }
    });
  }, [isMuted, runYouTube, volume]);

  useEffect(() => {
    let active = true;
    async function loadPlayableSource() {
      if (!currentSong) {
        setUsesHtmlAudio(false);
        setAudioUrl('');
        return;
      }

      const isDownloaded = Boolean(downloadedSongs[currentSong.videoId]);
      if (isOfflineMode && isDownloaded) {
        const songData = await getOfflineSong(currentSong.videoId);
        if (!active || !songData?.blob) return;
        if (oldBlobUrl.current) URL.revokeObjectURL(oldBlobUrl.current);
        const localUrl = URL.createObjectURL(songData.blob);
        oldBlobUrl.current = localUrl;
        setAudioUrl(localUrl);
        setUsesHtmlAudio(true);
        runYouTube((target) => target.pauseVideo?.());
        return;
      }

      if (!isOfflineMode && audioQuality === 'lossless') {
        setAudioUrl(api.streamUrl(currentSong.videoId, 'lossless'));
        setUsesHtmlAudio(true);
        runYouTube((target) => target.pauseVideo?.());
        return;
      }

      setUsesHtmlAudio(false);
      setAudioUrl('');
    }

    loadPlayableSource();
    return () => {
      active = false;
    };
  }, [audioQuality, currentSong, downloadedSongs, isOfflineMode, runYouTube]);

  useEffect(() => {
    if (!usesHtmlAudio || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [audioRef, audioUrl, isPlaying, usesHtmlAudio]);

  useEffect(() => {
    let intervalId;
    if (isPlaying && player && !usesHtmlAudio) {
      runYouTube((target) => target.playVideo?.());
      intervalId = setInterval(() => {
        try {
          setProgress(player.getCurrentTime?.() || 0);
          setDuration(player.getDuration?.() || 0);
        } catch {
          clearInterval(intervalId);
        }
      }, 1000);
    } else if (player && !usesHtmlAudio) {
      runYouTube((target) => target.pauseVideo?.());
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, player, runYouTube, usesHtmlAudio]);

  useEffect(() => {
    if (!restartSignal) return;
    if (usesHtmlAudio && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setProgress(0);
      return;
    }
    runYouTube((target) => {
      target.seekTo?.(0);
      target.playVideo?.();
    });
    setProgress(0);
  }, [audioRef, restartSignal, runYouTube, usesHtmlAudio]);

  const onReady = (event) => {
    setPlayer(event.target);
    try {
      event.target.setVolume(isMuted ? 0 : volume);
      setDuration(event.target.getDuration?.() || 0);
      if (isPlaying && !usesHtmlAudio) {
        window.setTimeout(() => {
          try {
            if (event.target.getIframe?.()?.src) event.target.playVideo?.();
          } catch {
            // The YouTube iframe can be briefly unavailable after mount.
          }
        }, 0);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('YouTube player was not ready:', error);
      }
    }
  };

  const onStateChange = (event) => {
    if (event.data === 0) playNext();
  };

  const handleVolumeChange = (event) => {
    const bar = event.currentTarget;
    const pct = Math.min(1, Math.max(0, (event.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth));
    const nextVolume = Math.round(pct * 100);
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
    runYouTube((target) => target.setVolume?.(nextVolume));
  };

  const handleProgressChange = (event) => {
    if (!duration) return;
    const bar = event.currentTarget;
    const pct = Math.min(1, Math.max(0, (event.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth));
    const nextProgress = pct * duration;
    setProgress(nextProgress);
    if (usesHtmlAudio && audioRef.current) {
      audioRef.current.currentTime = nextProgress;
    } else {
      runYouTube((target) => target.seekTo?.(nextProgress));
    }
  };

  const repeatIcon = repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />;
  const hasPrevious = history.length > 0;
  const hasNext = queue.length > 0 || isAutoplayEnabled;
  const isCurrentLossless = currentSong && (
    (!isOfflineMode && audioQuality === 'lossless') ||
    (isOfflineMode && downloadedSongs[currentSong.videoId]?.quality === 'lossless')
  );
  const miniProgressPct = duration ? (progress / duration) * 100 : 0;

  return (
    <>
      {/* ---- MOBILE MINI PLAYER ---- */}
      {currentSong && (
        <div className="mobile-mini-player" onClick={() => setMobileNowPlayingOpen(true)}>
          <div className="mini-player-progress">
            <div className="mini-player-progress-fill" style={{ width: `${miniProgressPct}%` }} />
          </div>
          <div className="mini-player-content">
            <img src={currentSong.thumbnail} alt="" className="mini-player-img" />
            <div className="mini-player-info">
              <span className="mini-player-title">{currentSong.title}</span>
              <span className="mini-player-artist">{currentSong.artistName}</span>
            </div>
            <button
              className="mini-player-play"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
            </button>
          </div>
        </div>
      )}

      {/* ---- DESKTOP FULL PLAYER BAR ---- */}
      <footer className="player-bar">
        <div className="player-left">
          {currentSong ? (
            <>
              <img src={currentSong.thumbnail} alt="" className="now-playing-img" onClick={() => setNowPlayingOpen(true)} />
              <div className="now-playing-info">
                <button className="now-playing-title" onClick={() => setNowPlayingOpen(true)}>{currentSong.title}</button>
                <span className="now-playing-artist">{currentSong.artistName}</span>
              </div>
              {isCurrentLossless && <span className="lossless-badge">HiFi</span>}
            </>
          ) : <span className="muted">No song selected</span>}
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className={`control-btn ${isShuffleActive ? 'active' : ''}`} onClick={toggleShuffle} title={isShuffleActive ? 'Disable shuffle' : 'Enable shuffle'} aria-pressed={isShuffleActive}>
              <Shuffle size={18} />
            </button>
            <button className="control-btn" onClick={playPrevious} disabled={!hasPrevious} title="Previous">
              <SkipBack size={20} />
            </button>
            <button className="play-pause-btn" onClick={togglePlay} disabled={!currentSong}>
              {isPlaying ? <Pause fill="black" size={17} /> : <Play fill="black" size={17} />}
            </button>
            <button className="control-btn" onClick={playNext} disabled={!hasNext} title="Next">
              <SkipForward size={20} />
            </button>
            <button className={`control-btn ${repeatMode !== 'off' ? 'active' : ''}`} onClick={cycleRepeatMode} title={repeatMode === 'off' ? 'Enable repeat' : repeatMode === 'all' ? 'Enable repeat one' : 'Disable repeat'} aria-pressed={repeatMode !== 'off'}>
              {repeatIcon}
            </button>
          </div>
          <div className="progress-container">
            <span className="time-text">{formatTime(progress)}</span>
            <div className="progress-bar-container" onClick={handleProgressChange}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
                <div className="progress-thumb" style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }} />
              </div>
            </div>
            <span className="time-text">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-right">
          <button className={`control-btn ${isLyricsOpen ? 'active' : ''}`} onClick={() => setLyricsOpen((value) => !value)} title="Lyrics" aria-pressed={isLyricsOpen}>
            <Mic2 size={18} />
          </button>
          <button className={`control-btn ${!isNowPlayingOpen ? 'active' : ''}`} onClick={() => setNowPlayingOpen(false)} title="Queue" aria-pressed={!isNowPlayingOpen}>
            <ListMusic size={18} />
          </button>
          <button className={`control-btn ${isOfflineMode ? 'active' : ''}`} onClick={toggleOfflineMode} title={isOfflineMode ? 'Disable offline mode' : 'Enable offline mode'} aria-pressed={isOfflineMode}>
            <WifiOff size={18} />
          </button>
          <button className={`control-btn ${isAutoplayEnabled ? 'active' : ''}`} onClick={toggleAutoplay} title={isAutoplayEnabled ? 'Disable autoplay' : 'Enable autoplay'} aria-pressed={isAutoplayEnabled}>
            <Radio size={18} />
          </button>
          <div className="popover-wrap">
            <button className={`quality-button ${audioQuality === 'lossless' ? 'active' : ''}`} onClick={() => setQualityOpen((value) => !value)} title="Audio quality">HiFi</button>
            {qualityOpen && (
              <div className="small-popover">
                <h4>Audio quality</h4>
                <button className={audioQuality === 'standard' ? 'selected' : ''} onClick={() => setAudioQuality('standard')}>Standard</button>
                <button className={audioQuality === 'lossless' ? 'selected' : ''} onClick={() => setAudioQuality('lossless')}>Lossless FLAC</button>
                <p>HiFi appears only when the backend serves a real FLAC file.</p>
              </div>
            )}
          </div>
          <div className="popover-wrap">
            <button className="control-btn" onClick={() => setDeviceOpen((value) => !value)} title="Connect to a device">
              <Laptop size={18} />
            </button>
            {deviceOpen && (
              <div className="small-popover device-popover">
                <h4>Connect to a device</h4>
                <div className="device-row active-device"><Laptop size={16} /><span>This browser</span><CheckCircle2 size={15} /></div>
                <p>External Spotify Connect devices are not available in this local clone.</p>
              </div>
            )}
          </div>
          <button className="control-btn" onClick={() => setIsMuted((value) => !value)} title={isMuted ? 'Unmute' : 'Mute'} aria-pressed={isMuted}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="volume-bar-container" onClick={handleVolumeChange}>
            <div className="volume-bar">
              <div className="volume-fill" style={{ width: `${isMuted ? 0 : volume}%` }} />
              <div className="volume-thumb" style={{ left: `${isMuted ? 0 : volume}%` }} />
            </div>
          </div>
        </div>

        {usesHtmlAudio && audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={playNext}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
          />
        )}

        {currentSong && !usesHtmlAudio && (
          <div className="hidden-player">
            <YouTube
              videoId={currentSong.videoId}
              opts={{ height: '1', width: '1', playerVars: { autoplay: 1, controls: 0 } }}
              onReady={onReady}
              onStateChange={onStateChange}
            />
          </div>
        )}
      </footer>
    </>
  );
}
