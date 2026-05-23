import { CheckCircle, Download, Play, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { normalizeTracks } from '../utils/tracks';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function SkeletonCard() {
  return (
    <div className="spotify-card skeleton-card">
      <div className="card-img-container skeleton-shimmer" />
      <div className="skeleton-text skeleton-shimmer" style={{ width: '80%', height: 14, marginTop: 12 }} />
      <div className="skeleton-text skeleton-shimmer" style={{ width: '50%', height: 12, marginTop: 8 }} />
    </div>
  );
}

function TrackCard({ track, context, index }) {
  const { addToQueue, downloadedSongs, downloadSong, isOfflineMode, playSong } = usePlayer();
  const isDownloaded = Boolean(downloadedSongs[track.videoId]);
  const isPlayable = !isOfflineMode || isDownloaded;

  return (
    <article
      className={`spotify-card ${!isPlayable ? 'disabled' : ''}`}
      onClick={() => isPlayable && playSong(track, { context })}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-img-container">
        <img src={track.thumbnail} alt={track.title} className="card-img" loading="lazy" />
        {isPlayable && (
          <button className="play-btn" onClick={(event) => { event.stopPropagation(); playSong(track, { context }); }}>
            <Play fill="black" size={22} />
          </button>
        )}
      </div>
      <div className="card-title-row">
        <span className="card-title">{track.title}</span>
        {isDownloaded ? (
          <CheckCircle size={14} className="green-icon" fill="currentColor" />
        ) : (
          <button className="icon-only" onClick={(event) => { event.stopPropagation(); downloadSong(track); }} title="Download">
            <Download size={14} />
          </button>
        )}
      </div>
      <p className="card-subtitle">{track.artistName}</p>
      <button className="queue-btn-card" onClick={(event) => { event.stopPropagation(); addToQueue(track); }} title="Add to queue">
        <Plus size={18} />
      </button>
    </article>
  );
}

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { downloadedSongs, playSong, recentlyPlayed } = usePlayer();

  useEffect(() => {
    let active = true;
    api.home()
      .then((result) => {
        const items = result.data?.trending?.items || [];
        if (active) setTracks(normalizeTracks(items));
      })
      .catch(() => {
        if (active) setTracks([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const quickTracks = useMemo(() => {
    const downloaded = Object.values(downloadedSongs);
    return [...recentlyPlayed, ...downloaded, ...tracks].filter((track, index, all) => (
      all.findIndex((item) => item.videoId === track.videoId) === index
    )).slice(0, 6);
  }, [downloadedSongs, recentlyPlayed, tracks]);

  const madeForYou = tracks.slice(0, 8);
  const trending = tracks.slice(8, 20);

  return (
    <div className="view-page">
      <div className="topbar">
        <div className="nav-rounds">
          <button disabled>&lt;</button>
          <button disabled>&gt;</button>
        </div>
        <button className="profile-pill">Local profile</button>
      </div>

      <section className="home-hero">
        <h1>{getGreeting()}</h1>
        {loading ? (
          <div className="quick-access-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="quick-card skeleton-shimmer" style={{ opacity: 0.4 }}>
                <div style={{width:64,height:64,background:'rgba(255,255,255,0.06)'}} />
                <span>&nbsp;</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="quick-access-grid">
            {quickTracks.map((track) => (
              <button key={track.videoId} className="quick-card" onClick={() => playSong(track, { context: quickTracks })}>
                <img src={track.thumbnail} alt="" />
                <span>{track.title}</span>
                <Play fill="black" size={18} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>Made for you</h2>
          <span>Fresh picks from your current listening</span>
        </div>
        <div className="spotify-grid">
          {loading
            ? [1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)
            : madeForYou.map((track, index) => <TrackCard key={track.videoId} track={track} context={madeForYou} index={index} />)
          }
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>Trending songs</h2>
          <span>Popular tracks available to play now</span>
        </div>
        <div className="spotify-grid">
          {loading
            ? [1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)
            : trending.map((track, index) => <TrackCard key={track.videoId} track={track} context={trending} index={index} />)
          }
        </div>
      </section>
    </div>
  );
}
