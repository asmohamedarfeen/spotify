import { Home, Library, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function MobileNav() {
  return (
    <nav className="mobile-nav" id="mobile-bottom-nav">
      <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} end>
        <Home size={24} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <Search size={24} />
        <span>Search</span>
      </NavLink>
      <NavLink to="/playlists" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <Library size={24} />
        <span>Your Library</span>
      </NavLink>
    </nav>
  );
}
