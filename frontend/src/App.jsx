import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import NowPlaying from './components/NowPlaying';
import Player from './components/Player';
import Playlists from './components/Playlists';
import QueueSidebar from './components/QueueSidebar';
import Search from './components/Search';
import Sidebar from './components/Sidebar';
import { PlayerProvider, usePlayer } from './context/PlayerContext';

function AppContent() {
  const { isNowPlayingOpen } = usePlayer();

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-view">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/liked" element={<Playlists mode="liked" />} />
          </Routes>
        </main>
        {isNowPlayingOpen ? <NowPlaying /> : <QueueSidebar />}
      </div>
      <Player />
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
