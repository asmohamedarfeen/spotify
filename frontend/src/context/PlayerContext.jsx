import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { saveOfflineSong, getOfflineSong, deleteOfflineSong, getAllOfflineSongs } from '../utils/offlineDb';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const audioRef = useRef(null);

  // Offline State variables
  const [isOfflineMode, setIsOfflineMode] = useState(() => {
    return localStorage.getItem('spotify-clone-offline-mode') === 'true';
  });
  const [downloadedSongs, setDownloadedSongs] = useState({});
  const [downloadingSongs, setDownloadingSongs] = useState({});

  // Audio Quality State (standard vs lossless)
  const [audioQuality, setAudioQuality] = useState(() => {
    return localStorage.getItem('spotify-clone-audio-quality') || 'standard';
  });

  // Fetch recommendations from FastAPI similarity API
  const fetchRecommendations = async (song) => {
    if (!song || !song.videoId) return;
    try {
      const url = `http://localhost:8000/api/recommendations?videoId=${song.videoId}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist || '')}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === 'success') {
        setRecommendations(result.data);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  // Run whenever the current song changes to retrieve related songs
  useEffect(() => {
    if (currentSong) {
      fetchRecommendations(currentSong);
    }
  }, [currentSong]);

  const playSong = (song) => {
    if (currentSong && currentSong.videoId !== song.videoId) {
      setHistory(prev => [...prev, currentSong]);
    }
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const addToQueue = (song) => {
    // Avoid duplicate video ids in queue if necessary, or just allow multiple
    setQueue(prev => [...prev, song]);
  };

  const removeFromQueue = (indexToRemove) => {
    setQueue(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const playNext = () => {
    if (queue.length > 0) {
      // Play first song in queue
      const nextSong = queue[0];
      setQueue(prev => prev.slice(1));
      if (currentSong) {
        setHistory(prev => [...prev, currentSong]);
      }
      setCurrentSong(nextSong);
      setIsPlaying(true);
    } else if (isAutoplayEnabled && recommendations.length > 0) {
      // Autoplay: play top recommended song
      const recommendedSong = recommendations[0];
      if (currentSong) {
        setHistory(prev => [...prev, currentSong]);
      }
      setCurrentSong({
        videoId: recommendedSong.videoId,
        title: recommendedSong.title,
        artist: recommendedSong.artist,
        thumbnail: recommendedSong.thumbnail
      });
      setIsPlaying(true);
    } else {
      // Nothing in queue and autoplay off: stop
      setIsPlaying(false);
    }
  };

  const playPrevious = () => {
    if (history.length > 0) {
      const prevSong = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      if (currentSong) {
        setQueue(prev => [currentSong, ...prev]);
      }
      setCurrentSong(prevSong);
      setIsPlaying(true);
    }
  };

  const toggleAutoplay = () => {
    setIsAutoplayEnabled(prev => !prev);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const toggleNowPlaying = () => {
    setShowNowPlaying(prev => !prev);
  };

  // Toggle offline mode simulation
  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => {
      const newVal = !prev;
      localStorage.setItem('spotify-clone-offline-mode', String(newVal));
      return newVal;
    });
  };

  // Load downloaded songs from IndexedDB on mount
  useEffect(() => {
    const loadOffline = async () => {
      const songs = await getAllOfflineSongs();
      const mapped = {};
      songs.forEach(song => {
        mapped[song.videoId] = {
          videoId: song.videoId,
          title: song.title,
          artist: song.artist,
          thumbnail: song.thumbnail,
          addedAt: song.addedAt,
          quality: song.quality || 'standard'
        };
      });
      setDownloadedSongs(mapped);
    };
    loadOffline();
  }, []);

  // Download song handler
  const downloadSong = async (song) => {
    if (!song || !song.videoId) return;

    // Check if it is already downloaded and whether we are trying to upgrade standard to lossless
    const hasStandardAndWantsLossless = downloadedSongs[song.videoId] && 
                                        downloadedSongs[song.videoId].quality === 'standard' && 
                                        audioQuality === 'lossless';
                                        
    if (downloadedSongs[song.videoId] && !hasStandardAndWantsLossless) return;
    if (downloadingSongs[song.videoId]) return;

    setDownloadingSongs(prev => ({ ...prev, [song.videoId]: 'downloading' }));

    try {
      // 1. Tell backend to download the song (specifying quality)
      const downloadRes = await fetch(`http://localhost:8000/api/download/${song.videoId}?quality=${audioQuality}`, {
        method: 'POST'
      });
      const downloadData = await downloadRes.json();
      
      if (downloadData.status !== 'success') {
        throw new Error(downloadData.message || 'Backend download failed');
      }

      // 2. Fetch the stream from backend as a Blob
      const streamRes = await fetch(`http://localhost:8000/api/stream/${song.videoId}?quality=${audioQuality}`);
      if (!streamRes.ok) {
        throw new Error('Streaming audio response from backend failed');
      }
      const blob = await streamRes.blob();

      // 3. Cache inside IndexedDB
      const success = await saveOfflineSong(song.videoId, blob, { ...song, quality: audioQuality });
      if (success) {
        setDownloadedSongs(prev => ({
          ...prev,
          [song.videoId]: {
            videoId: song.videoId,
            title: song.title,
            artist: song.artist || 'Unknown Artist',
            thumbnail: song.thumbnail || '',
            addedAt: Date.now(),
            quality: audioQuality
          }
        }));
      } else {
        throw new Error('IndexedDB save failed');
      }
    } catch (error) {
      console.error("Error downloading song:", error);
      alert(`Failed to download "${song.title}": ${error.message}`);
    } finally {
      setDownloadingSongs(prev => {
        const copy = { ...prev };
        delete copy[song.videoId];
        return copy;
      });
    }
  };

  // Delete downloaded song handler
  const deleteDownloadedSong = async (videoId) => {
    const success = await deleteOfflineSong(videoId);
    if (success) {
      setDownloadedSongs(prev => {
        const copy = { ...prev };
        delete copy[videoId];
        return copy;
      });
    }
  };

  return (
    <PlayerContext.Provider value={{
      currentSong,
      isPlaying,
      queue,
      history,
      recommendations,
      isAutoplayEnabled,
      isSidebarOpen,
      showNowPlaying,
      audioRef,
      isOfflineMode,
      downloadedSongs,
      downloadingSongs,
      audioQuality,
      setAudioQuality,
      playSong,
      togglePlay,
      addToQueue,
      removeFromQueue,
      clearQueue,
      playNext,
      playPrevious,
      toggleAutoplay,
      toggleSidebar,
      toggleNowPlaying,
      toggleOfflineMode,
      downloadSong,
      deleteDownloadedSong
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);

