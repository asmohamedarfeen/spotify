import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import Home from './components/Home';
import Search from './components/Search';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Playlists from './components/Playlists';
import QueueSidebar from './components/QueueSidebar';
import NowPlaying from './components/NowPlaying';

function AppContent() {
  const { showNowPlaying } = usePlayer();

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-view">
          {showNowPlaying ? (
            <NowPlaying />
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/playlists" element={<Playlists />} />
            </Routes>
          )}
        </div>
        <QueueSidebar />
      </div>
      <Player />
    </Router>
  );
}

function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}


export default App;
