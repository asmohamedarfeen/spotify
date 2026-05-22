/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { deleteOfflineSong, getAllOfflineSongs, saveOfflineSong } from '../utils/offlineDb';
import { normalizeTrack, normalizeTracks } from '../utils/tracks';

const PlayerContext = createContext(null);

const STORAGE = {
  playlists: 'spotify-clone-playlists',
  liked: 'spotify-clone-liked-songs',
  recent: 'spotify-clone-recently-played',
  offlineMode: 'spotify-clone-offline-mode',
  quality: 'spotify-clone-audio-quality',
};

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function shuffleTracks(tracks) {
  const copy = [...tracks];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(true);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [lyrics, setLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [isShuffleActive, setIsShuffleActive] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const audioRef = useRef(null);

  const [playlists, setPlaylists] = useState(() => readJson(STORAGE.playlists, []));
  const [likedSongs, setLikedSongs] = useState(() => readJson(STORAGE.liked, {}));
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => readJson(STORAGE.recent, []));
  const [isOfflineMode, setIsOfflineMode] = useState(() => localStorage.getItem(STORAGE.offlineMode) === 'true');
  const [downloadedSongs, setDownloadedSongs] = useState({});
  const [downloadingSongs, setDownloadingSongs] = useState({});
  const [audioQuality, setAudioQualityState] = useState(() => localStorage.getItem(STORAGE.quality) || 'standard');

  const persistPlaylists = useCallback((nextPlaylists) => {
    setPlaylists(nextPlaylists);
    writeJson(STORAGE.playlists, nextPlaylists);
  }, []);

  const persistLiked = useCallback((nextLiked) => {
    setLikedSongs(nextLiked);
    writeJson(STORAGE.liked, nextLiked);
  }, []);

  const persistRecent = useCallback((nextRecent) => {
    setRecentlyPlayed(nextRecent);
    writeJson(STORAGE.recent, nextRecent);
  }, []);

  const setAudioQuality = useCallback((quality) => {
    setAudioQualityState(quality);
    localStorage.setItem(STORAGE.quality, quality);
  }, []);

  useEffect(() => {
    async function loadOffline() {
      const songs = await getAllOfflineSongs();
      const mapped = {};
      songs.forEach((song) => {
        mapped[song.videoId] = {
          ...normalizeTrack(song),
          addedAt: song.addedAt,
          quality: song.quality || 'standard',
        };
      });
      setDownloadedSongs(mapped);
    }
    loadOffline();
  }, []);

  useEffect(() => {
    if (!currentSong?.videoId) return;
    let active = true;
    api.recommendations(currentSong)
      .then((result) => {
        if (active) setRecommendations(normalizeTracks(result.data));
      })
      .catch(() => {
        if (active) setRecommendations([]);
      });
    return () => {
      active = false;
    };
  }, [currentSong]);

  useEffect(() => {
    if (!isLyricsOpen || !currentSong?.videoId) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLyricsLoading(true);
    api.lyrics(currentSong)
      .then((result) => {
        if (active) setLyrics(result.data);
      })
      .catch((error) => {
        if (active) setLyrics({ available: false, lines: [], error: error.message });
      })
      .finally(() => {
        if (active) setLyricsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentSong, isLyricsOpen]);

  const addRecent = useCallback((track) => {
    const normalized = normalizeTrack(track);
    if (!normalized) return;
    const nextRecent = [normalized, ...recentlyPlayed.filter((song) => song.videoId !== normalized.videoId)].slice(0, 24);
    persistRecent(nextRecent);
  }, [persistRecent, recentlyPlayed]);

  const playSong = useCallback((song, options = {}) => {
    const normalized = normalizeTrack(song);
    if (!normalized?.videoId) return;
    setCurrentSong((previous) => {
      if (previous && previous.videoId !== normalized.videoId) {
        setHistory((items) => [...items, previous]);
      }
      return normalized;
    });
    if (options.context) {
      const contextTracks = normalizeTracks(options.context).filter((track) => track.videoId !== normalized.videoId);
      setQueue(isShuffleActive ? shuffleTracks(contextTracks) : contextTracks);
    }
    addRecent(normalized);
    setIsPlaying(true);
  }, [addRecent, isShuffleActive]);

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    setIsPlaying((value) => !value);
  }, [currentSong]);

  const addToQueue = useCallback((song) => {
    const normalized = normalizeTrack(song);
    if (!normalized?.videoId) return;
    setQueue((items) => [...items, normalized]);
  }, []);

  const removeFromQueue = useCallback((indexToRemove) => {
    setQueue((items) => items.filter((_, index) => index !== indexToRemove));
  }, []);

  const moveQueueItem = useCallback((fromIndex, toIndex) => {
    setQueue((items) => {
      const copy = [...items];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  const playNext = useCallback(() => {
    if (repeatMode === 'one' && currentSong) {
      setIsPlaying(true);
      return;
    }
    if (queue.length > 0) {
      const [nextSong, ...rest] = queue;
      setQueue(rest);
      if (currentSong) setHistory((items) => [...items, currentSong]);
      setCurrentSong(nextSong);
      addRecent(nextSong);
      setIsPlaying(true);
      return;
    }
    if (isAutoplayEnabled && recommendations.length > 0) {
      const [nextSong] = recommendations;
      if (currentSong) setHistory((items) => [...items, currentSong]);
      setCurrentSong(nextSong);
      addRecent(nextSong);
      setIsPlaying(true);
      return;
    }
    if (repeatMode === 'all' && history.length > 0) {
      const [firstSong] = history;
      setCurrentSong(firstSong);
      setHistory([]);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(false);
  }, [addRecent, currentSong, history, isAutoplayEnabled, queue, recommendations, repeatMode]);

  const playPrevious = useCallback(() => {
    if (history.length === 0) return;
    const prevSong = history[history.length - 1];
    setHistory((items) => items.slice(0, -1));
    if (currentSong) setQueue((items) => [currentSong, ...items]);
    setCurrentSong(prevSong);
    setIsPlaying(true);
  }, [currentSong, history]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'));
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffleActive((enabled) => {
      if (!enabled) setQueue((items) => shuffleTracks(items));
      return !enabled;
    });
  }, []);

  const toggleOfflineMode = useCallback(() => {
    setIsOfflineMode((value) => {
      const next = !value;
      localStorage.setItem(STORAGE.offlineMode, String(next));
      return next;
    });
  }, []);

  const toggleLikedSong = useCallback((song) => {
    const normalized = normalizeTrack(song);
    if (!normalized?.videoId) return;
    const nextLiked = { ...likedSongs };
    if (nextLiked[normalized.videoId]) {
      delete nextLiked[normalized.videoId];
    } else {
      nextLiked[normalized.videoId] = { ...normalized, addedAt: Date.now() };
    }
    persistLiked(nextLiked);
  }, [likedSongs, persistLiked]);

  const createPlaylist = useCallback((name, songs) => {
    const playlist = {
      id: Date.now().toString(),
      name,
      songs: normalizeTracks(songs),
      createdAt: Date.now(),
    };
    const nextPlaylists = [...playlists, playlist];
    persistPlaylists(nextPlaylists);
    return playlist;
  }, [persistPlaylists, playlists]);

  const deletePlaylist = useCallback((playlistId) => {
    persistPlaylists(playlists.filter((playlist) => playlist.id !== playlistId));
  }, [persistPlaylists, playlists]);

  const removeTrackFromPlaylist = useCallback((playlistId, videoId) => {
    persistPlaylists(playlists.map((playlist) => (
      playlist.id === playlistId
        ? { ...playlist, songs: playlist.songs.filter((song) => song.videoId !== videoId) }
        : playlist
    )));
  }, [persistPlaylists, playlists]);

  const downloadSong = useCallback(async (song) => {
    const normalized = normalizeTrack(song);
    if (!normalized?.videoId || downloadingSongs[normalized.videoId]) return;
    const currentDownload = downloadedSongs[normalized.videoId];
    if (currentDownload && !(currentDownload.quality === 'standard' && audioQuality === 'lossless')) return;

    setDownloadingSongs((items) => ({ ...items, [normalized.videoId]: 'downloading' }));
    try {
      const downloadData = await api.download(normalized.videoId, audioQuality);
      const actualQuality = downloadData.qualityActual || audioQuality;
      const streamRes = await fetch(api.streamUrl(normalized.videoId, actualQuality));
      if (!streamRes.ok) throw new Error('Streaming audio response from backend failed');
      const blob = await streamRes.blob();
      const success = await saveOfflineSong(normalized.videoId, blob, { ...normalized, quality: actualQuality });
      if (!success) throw new Error('IndexedDB save failed');
      setDownloadedSongs((items) => ({
        ...items,
        [normalized.videoId]: { ...normalized, addedAt: Date.now(), quality: actualQuality },
      }));
    } finally {
      setDownloadingSongs((items) => {
        const next = { ...items };
        delete next[normalized.videoId];
        return next;
      });
    }
  }, [audioQuality, downloadedSongs, downloadingSongs]);

  const deleteDownloadedSong = useCallback(async (videoId) => {
    const success = await deleteOfflineSong(videoId);
    if (success) {
      setDownloadedSongs((items) => {
        const next = { ...items };
        delete next[videoId];
        return next;
      });
    }
  }, []);

  const value = useMemo(() => ({
    currentSong,
    isPlaying,
    queue,
    history,
    recommendations,
    isAutoplayEnabled,
    isSidebarOpen,
    isNowPlayingOpen,
    isLyricsOpen,
    lyrics,
    lyricsLoading,
    audioRef,
    isOfflineMode,
    downloadedSongs,
    downloadingSongs,
    audioQuality,
    playlists,
    likedSongs,
    recentlyPlayed,
    isShuffleActive,
    repeatMode,
    setAudioQuality,
    playSong,
    togglePlay,
    addToQueue,
    removeFromQueue,
    moveQueueItem,
    clearQueue,
    playNext,
    playPrevious,
    toggleAutoplay: () => setIsAutoplayEnabled((value) => !value),
    toggleSidebar: () => setIsSidebarOpen((value) => !value),
    toggleNowPlaying: () => setIsNowPlayingOpen((value) => !value),
    setNowPlayingOpen: setIsNowPlayingOpen,
    toggleLyrics: () => setIsLyricsOpen((value) => !value),
    setLyricsOpen: setIsLyricsOpen,
    toggleOfflineMode,
    toggleLikedSong,
    createPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    downloadSong,
    deleteDownloadedSong,
    toggleShuffle,
    cycleRepeatMode,
  }), [
    addToQueue, audioQuality, clearQueue, createPlaylist, currentSong, cycleRepeatMode, deleteDownloadedSong,
    deletePlaylist, downloadedSongs, downloadingSongs, downloadSong, history, isAutoplayEnabled,
    isLyricsOpen, isNowPlayingOpen, isOfflineMode, isPlaying, isShuffleActive, isSidebarOpen,
    likedSongs, lyrics, lyricsLoading, moveQueueItem, playNext, playPrevious, playSong, playlists,
    queue, recommendations, recentlyPlayed, removeFromQueue, removeTrackFromPlaylist, repeatMode,
    setAudioQuality, toggleLikedSong, toggleOfflineMode, togglePlay, toggleShuffle,
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider');
  return context;
}
