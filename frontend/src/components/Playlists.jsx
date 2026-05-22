import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Plus, ArrowLeft, Music, Disc, Download, ArrowDownCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [songListInput, setSongListInput] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);
  const { 
    playSong, 
    addToQueue, 
    downloadedSongs, 
    downloadingSongs, 
    downloadSong, 
    deleteDownloadedSong, 
    isOfflineMode 
  } = usePlayer();

  useEffect(() => {
    const saved = localStorage.getItem('spotify-clone-playlists');
    if (saved) {
      setPlaylists(JSON.parse(saved));
    }
  }, []);

  const savePlaylists = (newPlaylists) => {
    setPlaylists(newPlaylists);
    localStorage.setItem('spotify-clone-playlists', JSON.stringify(newPlaylists));
  };

  const isPlaylistDownloaded = (pl) => {
    if (!pl || !pl.songs || pl.songs.length === 0) return false;
    return pl.songs.every(song => !!downloadedSongs[song.videoId]);
  };

  const isPlaylistDownloading = (pl) => {
    if (!pl || !pl.songs) return false;
    return pl.songs.some(song => downloadingSongs[song.videoId] === 'downloading');
  };

  const handleDownloadPlaylist = async (pl) => {
    if (!pl || !pl.songs) return;
    for (const song of pl.songs) {
      await downloadSong(song);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!songListInput.trim() || !playlistName.trim()) return;

    setLoading(true);
    const queries = songListInput.split('\n').filter(q => q.trim() !== '');

    try {
      const response = await fetch('http://localhost:8000/api/bulk-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries })
      });
      const data = await response.json();

      if (data.status === 'success') {
        const newPlaylist = {
          id: Date.now().toString(),
          name: playlistName,
          songs: data.data
        };
        const updatedPlaylists = [...playlists, newPlaylist];
        savePlaylists(updatedPlaylists);
        setActivePlaylist(newPlaylist);
        setSongListInput('');
        setPlaylistName('');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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

  const handleDeletePlaylist = (id, e) => {
    e.stopPropagation();
    const confirmed = window.confirm("Are you sure you want to delete this playlist?");
    if (!confirmed) return;
    const updated = playlists.filter(pl => pl.id !== id);
    savePlaylists(updated);
    if (activePlaylist && activePlaylist.id === id) {
      setActivePlaylist(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {activePlaylist ? (
        /* Playlist Details View with Spotify Header Cover Banner */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="home-banner-gradient" style={{ background: 'linear-gradient(to bottom, #2b2b2b 0%, #121212 100%)', display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '24px', paddingBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <button className="playlist-back-btn" onClick={() => setActivePlaylist(null)}>
                <ArrowLeft size={16} />
                <span>Back to library</span>
              </button>
              
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', marginTop: '8px' }}>
                <div style={{ width: '192px', height: '192px', borderRadius: '8px', background: 'linear-gradient(135deg, #1db954, #191414)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                  <Disc size={96} color="black" className="animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'white' }}>Playlist</span>
                  <h1 style={{ fontSize: '48px', fontWeight: '800', letterSpacing: '-0.04em', margin: 0, color: 'white', lineHeight: 1 }}>{activePlaylist.name}</h1>
                  <span style={{ fontSize: '13px', color: 'var(--text-subdued)', fontWeight: '600' }}>Spotify Clone • {activePlaylist.songs?.length || 0} songs</span>
                </div>
              </div>
            </div>
          </div>

          <div className="view-content" style={{ marginTop: '24px' }}>
            {/* Playlist control row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <button 
                onClick={() => activePlaylist.songs.length > 0 && handlePlay(activePlaylist.songs[0])}
                style={{
                  width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#1db954',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
                  transform: 'scale(1)', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Play fill="black" size={24} style={{ marginLeft: '4px' }} />
              </button>

              {/* Download Playlist Button */}
              {isPlaylistDownloaded(activePlaylist) ? (
                <button 
                  title="Remove offline downloads"
                  onClick={() => {
                    if (window.confirm("Remove offline files for this playlist?")) {
                      activePlaylist.songs.forEach(s => deleteDownloadedSong(s.videoId));
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#1db954', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ArrowDownCircle size={32} fill="currentColor" color="black" />
                </button>
              ) : isPlaylistDownloading(activePlaylist) ? (
                <button 
                  title="Downloading..."
                  style={{ background: 'transparent', border: 'none', color: '#1db954', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  disabled
                >
                  <Loader2 className="animate-spin" size={32} />
                </button>
              ) : (
                <button 
                  title="Download Playlist to listen offline"
                  onClick={() => handleDownloadPlaylist(activePlaylist)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-subdued)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-subdued)'}
                >
                  <ArrowDownCircle size={32} />
                </button>
              )}
            </div>

            <div className="grid-container">
              {activePlaylist.songs.map((song, index) => {
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
                      
                      {/* Individual Song Download Indicators */}
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
                          onClick={(e) => { e.stopPropagation(); downloadSong(song); }}
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
          </div>
        </div>
      ) : (
        /* Playlist Library Overview / Creation view split */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="view-header">
            <h1 className="section-title">Your Playlists</h1>
          </div>

          <div className="view-content" style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            
            {/* Playlist Creation Panel (Left) */}
            <div style={{ flex: '1 1 300px', backgroundColor: '#181818', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid #282828', height: 'fit-content' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Create a playlist</h2>
              <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-subdued)', textTransform: 'uppercase' }}>Playlist Name</label>
                  <input 
                    type="text" 
                    placeholder="My Awesome Playlist"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="playlist-input-field"
                    required
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-subdued)', textTransform: 'uppercase' }}>Song list (One per line)</label>
                  <textarea 
                    placeholder="Enter song titles, e.g.:&#10;Shape of You - Ed Sheeran&#10;Blinding Lights - The Weeknd&#10;Flowers - Miley Cyrus"
                    value={songListInput}
                    onChange={(e) => setSongListInput(e.target.value)}
                    rows={6}
                    className="playlist-input-field"
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !playlistName.trim() || !songListInput.trim()}
                  className="playlist-submit-btn"
                >
                  {loading ? 'Creating...' : 'Create Playlist'}
                </button>
              </form>
            </div>

            {/* Scrolling Playlists List (Right) */}
            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Library</h2>
              {playlists.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#181818', border: '1px dashed #333', padding: '48px 24px', borderRadius: '8px', gap: '12px', textAlign: 'center' }}>
                  <Music size={40} style={{ opacity: 0.3 }} />
                  <p style={{ fontWeight: '600', fontSize: '14px' }}>No playlists yet</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-subdued)', maxWidth: '280px' }}>Fill in the form on the left with playlist names and songs to build your custom Spotify-clone list!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {playlists.map(pl => (
                    <div 
                      key={pl.id} 
                      onClick={() => setActivePlaylist(pl)}
                      className="playlist-list-row"
                    >
                      <div className="playlist-list-cover">
                        <Music size={20} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</span>
                        <span style={{ color: 'var(--text-subdued)', fontSize: '12px', marginTop: '3px' }}>Playlist • {pl.songs?.length || 0} songs</span>
                      </div>
                      <button 
                        onClick={(e) => handleDeletePlaylist(pl.id, e)}
                        style={{
                          background: 'transparent', border: 'none', color: 'var(--text-subdued)', cursor: 'pointer',
                          padding: '8px', fontSize: '12px', fontWeight: '700', transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#ff4444'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text-subdued)'}
                        title="Delete Playlist"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
