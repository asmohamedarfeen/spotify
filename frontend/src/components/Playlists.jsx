import { ArrowDownCircle, CheckCircle, Clock3, Download, Heart, Loader2, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration, normalizeTracks } from '../utils/tracks';

function TrackTable({ title, tracks, onRemove }) {
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

  return (
    <section className="content-section no-padding-top">
      <div className="playlist-actions">
        <button className="big-play" disabled={tracks.length === 0} onClick={() => tracks[0] && playSong(tracks[0], { context: tracks })}>
          <Play fill="black" size={26} />
        </button>
        <button className="ghost-action"><ArrowDownCircle size={30} /></button>
      </div>
      <div className="track-table playlist-table">
        <div className="track-row table-head">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <span>Date added</span>
          <Clock3 size={16} />
        </div>
        {tracks.map((track, index) => {
          const isDownloaded = Boolean(downloadedSongs[track.videoId]);
          const isDownloading = downloadingSongs[track.videoId] === 'downloading';
          const isPlayable = !isOfflineMode || isDownloaded;
          return (
            <div key={`${title}-${track.videoId}-${index}`} className={`track-row ${!isPlayable ? 'disabled' : ''}`}>
              <button className="row-index" onClick={() => isPlayable && playSong(track, { context: tracks })}>
                <span>{index + 1}</span>
                <Play fill="currentColor" size={14} />
              </button>
              <img src={track.thumbnail} alt="" />
              <div className="track-meta">
                <strong>{track.title}</strong>
                <span>{track.artistName}</span>
              </div>
              <span className="album-cell">{track.album || 'Single'}</span>
              <span className="date-cell">Local</span>
              <button className={`icon-only ${likedSongs[track.videoId] ? 'active' : ''}`} onClick={() => toggleLikedSong(track)} title="Save">
                <Heart size={16} fill={likedSongs[track.videoId] ? 'currentColor' : 'none'} />
              </button>
              {isDownloaded ? (
                <CheckCircle size={16} className="green-icon" />
              ) : (
                <button className="icon-only" onClick={() => downloadSong(track)} title="Download">
                  {isDownloading ? <Loader2 className="spin" size={16} /> : <Download size={16} />}
                </button>
              )}
              <button className="icon-only" onClick={() => addToQueue(track)} title="Add to queue">
                <Plus size={16} />
              </button>
              {onRemove ? (
                <button className="icon-only danger" onClick={() => onRemove(track.videoId)} title="Remove">
                  <Trash2 size={16} />
                </button>
              ) : (
                <span className="duration">{formatDuration(track.duration)}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Playlists({ mode }) {
  const { createPlaylist, deletePlaylist, likedSongs, playlists, removeTrackFromPlaylist } = usePlayer();
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [playlistName, setPlaylistName] = useState('');
  const [songListInput, setSongListInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

  const likedTracks = useMemo(() => Object.values(likedSongs), [likedSongs]);
  const activePlaylist = playlists.find((playlist) => playlist.id === activePlaylistId);
  const visiblePlaylists = playlists.filter((playlist) => playlist.name.toLowerCase().includes(librarySearch.toLowerCase()));

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!songListInput.trim() || !playlistName.trim()) return;
    setLoading(true);
    try {
      const queries = songListInput.split('\n').map((query) => query.trim()).filter(Boolean);
      const data = await api.bulkSearch(queries);
      const playlist = createPlaylist(playlistName, normalizeTracks(data.data));
      setActivePlaylistId(playlist.id);
      setPlaylistName('');
      setSongListInput('');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'liked') {
    return (
      <div className="view-page">
        <header className="playlist-header liked-header">
          <div className="playlist-cover liked-cover"><Heart fill="currentColor" size={72} /></div>
          <div>
            <span>Playlist</span>
            <h1>Liked Songs</h1>
            <p>Local Library - {likedTracks.length} songs</p>
          </div>
        </header>
        <TrackTable title="Liked Songs" tracks={likedTracks} />
      </div>
    );
  }

  if (activePlaylist) {
    return (
      <div className="view-page">
        <header className="playlist-header">
          <div className="playlist-cover"><span>{activePlaylist.name.slice(0, 1).toUpperCase()}</span></div>
          <div>
            <button className="text-button" onClick={() => setActivePlaylistId(null)}>Back to library</button>
            <span>Playlist</span>
            <h1>{activePlaylist.name}</h1>
            <p>Local Library - {activePlaylist.songs?.length || 0} songs</p>
          </div>
        </header>
        <TrackTable
          title={activePlaylist.name}
          tracks={activePlaylist.songs || []}
          onRemove={(videoId) => removeTrackFromPlaylist(activePlaylist.id, videoId)}
        />
      </div>
    );
  }

  return (
    <div className="view-page">
      <div className="topbar">
        <h1 className="page-title">Your Library</h1>
      </div>
      <div className="library-page-grid">
        <section className="create-playlist-panel">
          <h2>Create playlist</h2>
          <form onSubmit={handleGenerate}>
            <label>
              Playlist name
              <input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="My playlist" />
            </label>
            <label>
              Songs, one per line
              <textarea value={songListInput} onChange={(event) => setSongListInput(event.target.value)} rows={8} placeholder="Blinding Lights - The Weeknd&#10;Shape of You - Ed Sheeran" />
            </label>
            <button className="primary-pill" disabled={loading || !playlistName.trim() || !songListInput.trim()}>
              {loading ? 'Creating...' : 'Create Playlist'}
            </button>
          </form>
        </section>

        <section className="library-list-panel">
          <div className="library-list-header">
            <h2>Playlists</h2>
            <div className="compact-search">
              <Search size={16} />
              <input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search in Your Library" />
            </div>
          </div>
          <div className="playlist-list">
            {visiblePlaylists.map((playlist) => (
              <button key={playlist.id} className="playlist-list-row" onClick={() => setActivePlaylistId(playlist.id)}>
                <div className="playlist-list-cover">{playlist.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <strong>{playlist.name}</strong>
                  <span>Playlist - {playlist.songs?.length || 0} songs</span>
                </div>
                <button className="icon-only danger" onClick={(event) => { event.stopPropagation(); deletePlaylist(playlist.id); }} title="Delete">
                  <Trash2 size={16} />
                </button>
              </button>
            ))}
            {visiblePlaylists.length === 0 && <p className="muted">No playlists yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
