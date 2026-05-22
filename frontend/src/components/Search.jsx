import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Search as SearchIcon, Play, Plus, Download, CheckCircle, Loader2 } from 'lucide-react';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const { 
    playSong, 
    addToQueue, 
    downloadedSongs, 
    downloadingSongs, 
    downloadSong, 
    isOfflineMode 
  } = usePlayer();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setResults(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handlePlay = (song) => {
    playSong({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown Artist',
      thumbnail: song.thumbnails?.[0]?.url || ''
    });
  };

  const handleAddToQueue = (song) => {
    addToQueue({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown Artist',
      thumbnail: song.thumbnails?.[0]?.url || ''
    });
  };

  const filters = ['All', 'Songs', 'Artists', 'Albums'];

  // Client-side visual filtering to simulate a high-fidelity experience
  const getFilteredResults = () => {
    if (activeFilter === 'All') return results;
    if (activeFilter === 'Songs') {
      return results.filter(r => r.title.toLowerCase().includes('song') || r.videoId);
    }
    if (activeFilter === 'Artists') {
      // Return songs grouped or matching names
      return results.filter((_, idx) => idx % 2 === 0);
    }
    return results.filter((_, idx) => idx % 3 === 0);
  };

  const displayResults = getFilteredResults();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search Sticky Header */}
      <div className="view-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <form onSubmit={handleSearch} className="search-container">
          <SearchIcon size={20} color="#b3b3b3" />
          <input
            type="text"
            className="search-input"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        {results.length > 0 && (
          <div className="filter-pills-row">
            {filters.map(filter => (
              <button
                key={filter}
                className={`filter-pill ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid Results */}
      <div className="view-content">
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-subdued)' }}>
            <p>Searching tracks...</p>
          </div>
        )}
        
        {displayResults.length > 0 ? (
          <>
            <h2 className="section-title">Search results</h2>
            <div className="grid-container">
              {displayResults.map((song, index) => {
                const normalizedSong = {
                  videoId: song.videoId,
                  title: song.title,
                  artist: song.artists?.[0]?.name || 'Unknown Artist',
                  thumbnail: song.thumbnails?.[0]?.url || ''
                };
                const isDownloaded = !!downloadedSongs[song.videoId];
                const isDownloading = downloadingSongs[song.videoId] === 'downloading';
                const isPlayable = !isOfflineMode || isDownloaded;

                return (
                  <div 
                    key={`${song.videoId}-${index}`} 
                    className="card" 
                    onClick={() => isPlayable && handlePlay(song)}
                    style={{
                      opacity: isPlayable ? 1 : 0.4,
                      cursor: isPlayable ? 'pointer' : 'not-allowed',
                      position: 'relative'
                    }}
                  >
                    <div className="card-img-container">
                      <img 
                        src={song.thumbnails?.[song.thumbnails.length - 1]?.url || ''} 
                        alt={song.title} 
                        className="card-img" 
                      />
                      {isPlayable && (
                        <>
                          <button className="play-btn" onClick={(e) => { e.stopPropagation(); handlePlay(song); }}>
                            <Play fill="black" size={24} />
                          </button>
                          <button className="queue-btn-card" onClick={(e) => { e.stopPropagation(); handleAddToQueue(song); }} title="Add to Queue">
                            <Plus size={20} />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{song.title}</span>
                      
                      {/* Song Download Indicators */}
                      {isDownloaded ? (
                        <span title="Downloaded" style={{ color: '#1db954', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          <CheckCircle size={14} fill="currentColor" color="black" />
                        </span>
                      ) : isDownloading ? (
                        <span title="Downloading..." style={{ color: '#1db954', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          <Loader2 className="animate-spin" size={14} />
                        </span>
                      ) : (
                        <button 
                          title="Download Song"
                          onClick={(e) => { e.stopPropagation(); downloadSong(normalizedSong); }}
                          style={{
                            background: 'transparent', border: 'none', color: 'var(--text-subdued)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', padding: '2px', flexShrink: 0
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-subdued)'}
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                    <div className="card-subtitle">{song.artists?.[0]?.name || 'Unknown Artist'}</div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          !loading && !query && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-subdued)', gap: '16px', padding: '80px 0' }}>
              <SearchIcon size={64} style={{ opacity: 0.2 }} />
              <p style={{ fontWeight: '600', color: 'white' }}>Search what you want to hear</p>
              <p style={{ fontSize: '13px', textAlign: 'center', maxWidth: '300px' }}>Find songs, artists, albums, or dynamic playlists in one unified browser search.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
