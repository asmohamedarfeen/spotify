import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Play, Plus, Trash2, Radio } from 'lucide-react';

export default function QueueSidebar() {
  const {
    currentSong,
    queue,
    recommendations,
    isSidebarOpen,
    isAutoplayEnabled,
    playSong,
    removeFromQueue,
    clearQueue,
    addToQueue,
    toggleSidebar
  } = usePlayer();

  if (!isSidebarOpen) return null;

  const handlePlayRecommendation = (recSong) => {
    playSong({
      videoId: recSong.videoId,
      title: recSong.title,
      artist: recSong.artist,
      thumbnail: recSong.thumbnail
    });
  };

  const handleAddToQueue = (recSong) => {
    addToQueue({
      videoId: recSong.videoId,
      title: recSong.title,
      artist: recSong.artist,
      thumbnail: recSong.thumbnail
    });
  };

  return (
    <div className="queue-sidebar">
      <div className="queue-header">
        <h3>Play Queue</h3>
        <button className="close-btn" onClick={toggleSidebar}>
          <X size={20} />
        </button>
      </div>

      <div className="queue-content">
        {/* Now Playing Section */}
        <div className="queue-section">
          <h4 className="queue-section-title">Now playing</h4>
          {currentSong ? (
            <div className="now-playing-item-card">
              <img src={currentSong.thumbnail} alt={currentSong.title} className="queue-img" />
              <div className="queue-item-info">
                <span className="queue-item-title">{currentSong.title}</span>
                <span className="queue-item-artist">{currentSong.artist}</span>
              </div>
              <span className="playing-pulse-badge">Playing</span>
            </div>
          ) : (
            <p className="empty-text">No song playing currently</p>
          )}
        </div>

        {/* Manual Queue Section */}
        <div className="queue-section">
          <div className="queue-section-header">
            <h4 className="queue-section-title">Next up</h4>
            {queue.length > 0 && (
              <button className="clear-queue-btn" onClick={clearQueue}>
                Clear all
              </button>
            )}
          </div>
          
          {queue.length > 0 ? (
            <div className="queue-list">
              {queue.map((song, index) => (
                <div key={`${song.videoId}-${index}`} className="queue-item-card">
                  <span className="queue-index">{index + 1}</span>
                  <img src={song.thumbnail} alt={song.title} className="queue-img-small" />
                  <div className="queue-item-info">
                    <span className="queue-item-title-small">{song.title}</span>
                    <span className="queue-item-artist-small">{song.artist}</span>
                  </div>
                  <button className="action-btn remove-btn" onClick={() => removeFromQueue(index)} title="Remove from queue">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">Queue is empty</p>
          )}
        </div>

        {/* Autoplay Recommendations Section */}
        {isAutoplayEnabled && currentSong && (
          <div className="queue-section">
            <div className="queue-section-header">
              <h4 className="queue-section-title autoplay-header">
                <Radio size={16} className="radio-icon animate-pulse" />
                Autoplay Similar Songs
              </h4>
              <span className="autoplay-badge">Active</span>
            </div>
            
            {recommendations.length > 0 ? (
              <div className="queue-list">
                {recommendations.map((song, index) => (
                  <div key={song.videoId} className="queue-item-card recommendation-card">
                    <img src={song.thumbnail} alt={song.title} className="queue-img-small" />
                    
                    <div className="queue-item-info">
                      <span className="queue-item-title-small">{song.title}</span>
                      <span className="queue-item-artist-small">{song.artist}</span>
                      <div className="match-container">
                        <span className="similarity-badge" style={{
                          background: `rgba(29, 185, 84, ${song.matchPercentage / 100 * 0.15 + 0.05})`,
                          color: song.matchPercentage > 85 ? '#1db954' : '#a7a7a7'
                        }}>
                          {song.matchPercentage}% Match
                        </span>
                      </div>
                    </div>

                    <div className="rec-actions">
                      <button className="action-btn play-now-btn" onClick={() => handlePlayRecommendation(song)} title="Play similar now">
                        <Play fill="currentColor" size={14} />
                      </button>
                      <button className="action-btn add-queue-btn" onClick={() => handleAddToQueue(song)} title="Queue similar">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">Analyzing vibe and fetching recommendations...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
