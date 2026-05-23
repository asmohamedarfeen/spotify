import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Home from './components/Home';
import MobileNav from './components/MobileNav';
import MobileNowPlaying from './components/MobileNowPlaying';
import NowPlaying from './components/NowPlaying';
import Player from './components/Player';
import Playlists from './components/Playlists';
import QueueSidebar from './components/QueueSidebar';
import Search from './components/Search';
import Sidebar from './components/Sidebar';
import { PlayerProvider, usePlayer } from './context/PlayerContext';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div className="page-transition" key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/playlists/:playlistId" element={<Playlists />} />
        <Route path="/liked" element={<Playlists mode="liked" />} />
        <Route path="/downloaded" element={<Playlists mode="downloaded" />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  const { isNowPlayingOpen } = usePlayer();

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-view">
          <AnimatedRoutes />
        </main>
        {isNowPlayingOpen ? <NowPlaying /> : <QueueSidebar />}
      </div>
      <Player />
      <MobileNav />
      <MobileNowPlaying />
    </Router>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}
