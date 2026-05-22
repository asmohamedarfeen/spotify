import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Plus, Download, CheckCircle, Loader2 } from 'lucide-react';

export default function Home() {
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const { 
    playSong, 
    addToQueue, 
    downloadedSongs, 
    downloadingSongs, 
    downloadSong, 
    isOfflineMode 
  } = usePlayer();

  useEffect(() => {
    fetch('http://localhost:8000/api/home')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setCharts(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get random gradient theme based on current hours for high visual fidelity
  const getGradientClass = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { background: 'linear-gradient(to bottom, #4c2882 0%, #121212 100%)' }; // Purple morning
    if (hour < 17) return { background: 'linear-gradient(to bottom, #1e3264 0%, #121212 100%)' }; // Royal blue afternoon
    return { background: 'linear-gradient(to bottom, #0f4633 0%, #121212 100%)' }; // Emerald evening
  };

  const trendingItems = charts?.trending?.items || [];
  const quickAccessItems = trendingItems.slice(0, 6);
  const standardGridItems = trendingItems.slice(6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {loading ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-subdued)', gap: '12px' }}>
          <p>Loading your music universe...</p>
        </div>
      ) : (
        <>
          {/* Top Banner Fluid Gradient */}
          <div className="home-banner-gradient" style={getGradientClass()}>
            <h1 className="banner-title">{getGreeting()}</h1>
            
            {/* Quick Access Rectangular Card Grid */}
            <div className="quick-access-grid">
              {quickAccessItems.map((item, index) => {
                const isDownloaded = !!downloadedSongs[item.videoId];
                const isPlayable = !isOfflineMode || isDownloaded;

                return (
                  <div 
                    key={`quick-${index}`} 
                    className="quick-card" 
                    onClick={() => isPlayable && handlePlay(item)}
                    style={{
                      opacity: isPlayable ? 1 : 0.4,
                      cursor: isPlayable ? 'pointer' : 'not-allowed',
                      position: 'relative'
                    }}
                  >
                    <img 
                      src={item.thumbnails?.[0]?.url || ''} 
                      alt={item.title} 
                      className="quick-card-img" 
                    />
                    <div className="quick-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.title}</span>
                      {isDownloaded && (
                        <span title="Downloaded" style={{ color: '#1db954', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                          <CheckCircle size={12} fill="currentColor" color="black" />
                        </span>
                      )}
                    </div>
                    {isPlayable && (
                      <button 
                        className="quick-play-btn" 
                        onClick={(e) => { e.stopPropagation(); handlePlay(item); }}
                        title={`Play ${item.title}`}
                      >
                        <Play fill="black" size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Standard Grid Area */}
          <div className="view-content" style={{ marginTop: '16px' }}>
            <h2 className="section-title">Trending songs for you</h2>
            
            <div className="grid-container">
              {standardGridItems.map((item, index) => {
                const normalizedSong = {
                  videoId: item.videoId,
                  title: item.title,
                  artist: item.artists?.[0]?.name || 'Unknown Artist',
                  thumbnail: item.thumbnails?.[0]?.url || ''
                };
                const isDownloaded = !!downloadedSongs[item.videoId];
                const isDownloading = downloadingSongs[item.videoId] === 'downloading';
                const isPlayable = !isOfflineMode || isDownloaded;

                return (
                  <div 
                    key={`grid-${index}`} 
                    className="card" 
                    onClick={() => isPlayable && handlePlay(item)}
                    style={{
                      opacity: isPlayable ? 1 : 0.4,
                      cursor: isPlayable ? 'pointer' : 'not-allowed',
                      position: 'relative'
                    }}
                  >
                    <div className="card-img-container">
                      <img 
                        src={item.thumbnails?.[item.thumbnails.length - 1]?.url || ''} 
                        alt={item.title} 
                        className="card-img" 
                      />
                      {isPlayable && (
                        <>
                          <button className="play-btn" onClick={(e) => { e.stopPropagation(); handlePlay(item); }}>
                            <Play fill="black" size={24} />
                          </button>
                          <button className="queue-btn-card" onClick={(e) => { e.stopPropagation(); handleAddToQueue(item); }} title="Add to Queue">
                            <Plus size={20} />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.title}</span>
                      
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
                    <div className="card-subtitle">{item.artists?.[0]?.name || 'Unknown Artist'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
