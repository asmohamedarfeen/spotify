import { Download, Heart, Home, Library, ListMusic, Plus, Search } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';

export default function Sidebar() {
  const { downloadedSongs, playlists } = usePlayer();
  const navigate = useNavigate();
  const downloadedCount = Object.keys(downloadedSongs).length;

  return (
    <aside className="sidebar">
      <div className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={22} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Search size={22} />
          <span>Search</span>
        </NavLink>
      </div>

      <section className="sidebar-library">
        <div className="library-header">
          <button className="library-title" onClick={() => navigate('/playlists')}>
            <Library size={22} />
            <span>Your Library</span>
          </button>
          <button className="library-add-btn" onClick={() => navigate('/playlists')} title="Create Playlist">
            <Plus size={18} />
          </button>
        </div>

        <div className="library-filter-row">
          <NavLink to="/playlists" className="library-chip">Playlists</NavLink>
          <NavLink to="/liked" className="library-chip">Songs</NavLink>
          <NavLink to="/downloaded" className="library-chip">Downloads</NavLink>
        </div>

        <div className="library-scroll">
          <NavLink to="/liked" className="library-item">
            <div className="library-item-art liked-art">
              <Heart size={18} fill="currentColor" />
            </div>
            <div className="library-item-info">
              <span className="library-item-name">Liked Songs</span>
              <span className="library-item-subtitle">Playlist</span>
            </div>
          </NavLink>

          <NavLink to="/downloaded" className="library-item">
            <div className="library-item-art">
              <Download size={18} />
            </div>
            <div className="library-item-info">
              <span className="library-item-name">Downloaded</span>
              <span className="library-item-subtitle">{downloadedCount} songs</span>
            </div>
          </NavLink>

          {playlists.length > 0 ? playlists.map((playlist) => (
            <NavLink key={playlist.id} to={`/playlists/${playlist.id}`} className="library-item">
              <div className="library-item-art">
                <ListMusic size={18} />
              </div>
              <div className="library-item-info">
                <span className="library-item-name">{playlist.name}</span>
                <span className="library-item-subtitle">Playlist - {playlist.songs?.length || 0} songs</span>
              </div>
            </NavLink>
          )) : (
            <div className="library-empty">
              <p>Create your first playlist</p>
              <span>Paste song names and build a playlist.</span>
              <button onClick={() => navigate('/playlists')}>Create Playlist</button>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
