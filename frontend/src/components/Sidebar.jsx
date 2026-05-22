import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Plus, Music } from 'lucide-react';

export default function Sidebar() {
  const [playlists, setPlaylists] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPlaylists = () => {
      const saved = localStorage.getItem('spotify-clone-playlists');
      if (saved) {
        setPlaylists(JSON.parse(saved));
      }
    };
    loadPlaylists();
    
    // Poll to keep library playlists in sidebar synced in real-time
    const interval = setInterval(loadPlaylists, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCreatePlaylistClick = () => {
    navigate('/playlists');
  };

  return (
    <div className="sidebar">
      {/* Top Box: Navigation */}
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

      {/* Bottom Box: Your Library */}
      <div className="sidebar-library">
        <div className="library-header">
          <div className="library-title" onClick={() => navigate('/playlists')}>
            <Library size={22} />
            <span>Your Library</span>
          </div>
          <button className="library-add-btn" onClick={handleCreatePlaylistClick} title="Create Playlist">
            <Plus size={18} />
          </button>
        </div>

        <div className="library-scroll">
          {playlists.length > 0 ? (
            playlists.map((pl) => (
              <NavLink 
                key={pl.id} 
                to="/playlists" 
                className="library-item"
              >
                <div className="library-item-art">
                  <Music size={18} />
                </div>
                <div className="library-item-info">
                  <span className="library-item-name">{pl.name}</span>
                  <span className="library-item-subtitle">Playlist • {pl.songs?.length || 0} songs</span>
                </div>
              </NavLink>
            ))
          ) : (
            <div style={{ padding: '16px 8px', fontSize: '12px', color: 'var(--text-subdued)', lineHeight: '1.6' }}>
              <p style={{ fontWeight: '600', color: 'white', marginBottom: '4px' }}>Create your first playlist</p>
              <p>It's easy, we'll help you</p>
              <button 
                onClick={handleCreatePlaylistClick}
                style={{
                  marginTop: '12px', background: 'white', border: 'none', color: 'black',
                  fontWeight: '700', fontSize: '12px', padding: '6px 16px', borderRadius: '500px', cursor: 'pointer'
                }}
              >
                Create Playlist
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
