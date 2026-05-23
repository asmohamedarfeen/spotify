import { CheckCircle, Download, Heart, Loader2, Play, Plus, Search as SearchIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { searchResultPlaybackOptions } from '../utils/playerLogic';
import { canSearch, normalizeSearchTerm } from '../utils/searchLogic';
import { formatDuration, normalizeTracks } from '../utils/tracks';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [searchError, setSearchError] = useState('');
  const [activeFilter, setActiveFilter] = useState('Songs');
  const {
    addToQueue,
    downloadedSongs,
    downloadingSongs,
    downloadSong,
    isOfflineMode,
    likedSongs,
    playSong,
    toggleLikedSong,
  } = usePlayer();

  const runSearch = useCallback(async (rawTerm, options = {}) => {
    const term = normalizeSearchTerm(rawTerm);
    if (!canSearch(term)) {
      setResults([]);
      setSearchedTerm('');
      setSearchError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearchError('');
    try {
      const data = await api.search(term, options);
      setResults(normalizeTracks(data.data));
      setSearchedTerm(term);
    } catch (error) {
      if (error.name === 'AbortError') return;
      setResults([]);
      setSearchedTerm(term);
      setSearchError(error.message || 'Search failed. Check that the backend is running.');
    } finally {
      if (!options.signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const term = normalizeSearchTerm(query);
    if (!canSearch(term)) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      runSearch(term, { signal: controller.signal });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, runSearch]);

  const handleSearch = async (event) => {
    event.preventDefault();
    await runSearch(query);
  };

  const handleQueryChange = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    if (!canSearch(nextQuery)) {
      setResults([]);
      setSearchedTerm('');
      setSearchError('');
      setLoading(false);
    }
  };

  const displayResults = useMemo(() => {
    if (activeFilter === 'Downloaded') return results.filter((track) => downloadedSongs[track.videoId]);
    return results;
  }, [activeFilter, downloadedSongs, results]);

  const topResult = displayResults[0];
  const playSearchResult = useCallback((track) => {
    playSong(track, searchResultPlaybackOptions());
  }, [playSong]);

  return (
    <div className="view-page">
      <div className="topbar sticky">
        <form onSubmit={handleSearch} className="search-container">
          <SearchIcon size={20} />
          <input
            className="search-input"
            onChange={handleQueryChange}
            placeholder="What do you want to play?"
            value={query}
          />
        </form>
      </div>

      <div className="filter-pills-row">
        {['Songs', 'Artists', 'Albums', 'Downloaded'].map((filter) => (
          <button key={filter} className={`filter-pill ${activeFilter === filter ? 'active' : ''}`} onClick={() => setActiveFilter(filter)}>
            {filter}
          </button>
        ))}
      </div>

      {loading && (
        <div className="center-state">
          <Loader2 className="spin" size={22} />
          <span>Searching Spotify-style catalog...</span>
        </div>
      )}

      {!loading && !query && (
        <div className="search-empty">
          <SearchIcon size={56} />
          <h2>Search what you want to hear</h2>
          <p>Find songs, artists, albums, and build your listening queue.</p>
        </div>
      )}

      {!loading && searchError && (
        <div className="center-state search-status">
          <SearchIcon size={42} />
          <h2>Search is unavailable</h2>
          <p>{searchError}</p>
        </div>
      )}

      {!loading && !searchError && searchedTerm && displayResults.length === 0 && (
        <div className="center-state search-status">
          <SearchIcon size={42} />
          <h2>No results found</h2>
          <p>Try another song, artist, or album name.</p>
        </div>
      )}

      {!loading && !searchError && topResult && (
        <div className="search-layout">
          <section>
            <h2 className="section-title">Top result</h2>
            <article className="top-result-card" onClick={() => playSearchResult(topResult)}>
              <img src={topResult.thumbnail} alt={topResult.title} />
              <h3>{topResult.title}</h3>
              <p>{topResult.artistName}</p>
              <button className="play-btn always-visible" onClick={(event) => { event.stopPropagation(); playSearchResult(topResult); }}>
                <Play fill="black" size={22} />
              </button>
            </article>
          </section>

          <section>
            <h2 className="section-title">Songs</h2>
            <div className="track-table">
              {displayResults.map((track, index) => {
                const isDownloaded = Boolean(downloadedSongs[track.videoId]);
                const isDownloading = downloadingSongs[track.videoId] === 'downloading';
                const isPlayable = !isOfflineMode || isDownloaded;
                return (
                  <div
                    key={`${track.videoId}-${index}`}
                    className={`track-row ${!isPlayable ? 'disabled' : ''}`}
                    onClick={() => isPlayable && playSearchResult(track)}
                  >
                    <button className="row-index" onClick={(event) => { event.stopPropagation(); if (isPlayable) playSearchResult(track); }}>
                      <span>{index + 1}</span>
                      <Play fill="currentColor" size={14} />
                    </button>
                    <img src={track.thumbnail} alt="" />
                    <div className="track-meta">
                      <strong>{track.title}</strong>
                      <span>{track.artistName}</span>
                    </div>
                    <button className={`icon-only ${likedSongs[track.videoId] ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); toggleLikedSong(track); }} title="Save to Liked Songs">
                      <Heart size={16} fill={likedSongs[track.videoId] ? 'currentColor' : 'none'} />
                    </button>
                    {isDownloaded ? (
                      <CheckCircle size={16} className="green-icon" />
                    ) : (
                      <button className="icon-only" onClick={(event) => { event.stopPropagation(); downloadSong(track); }} title="Download">
                        {isDownloading ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
                      </button>
                    )}
                    <button className="icon-only" onClick={(event) => { event.stopPropagation(); addToQueue(track); }} title="Add to queue">
                      <Plus size={16} />
                    </button>
                    <span className="duration">{formatDuration(track.duration)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
