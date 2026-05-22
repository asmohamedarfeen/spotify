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

function TrackCard({ track, context }) {
  const { addToQueue, downloadedSongs, downloadSong, isOfflineMode, playSong } = usePlayer();
  const isDownloaded = Boolean(downloadedSongs[track.videoId]);
  const isPlayable = !isOfflineMode || isDownloaded;

  return (
    <article className={`spotify-card ${!isPlayable ? 'disabled' : ''}`} onClick={() => isPlayable && playSong(track, { context })}>
      <div className="card-img-container">
        <img src={track.thumbnail} alt={track.title} className="card-img" />
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
          <p className="muted">Loading your music...</p>
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
          {madeForYou.map((track) => <TrackCard key={track.videoId} track={track} context={madeForYou} />)}
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>Trending songs</h2>
          <span>Popular tracks available to play now</span>
        </div>
        <div className="spotify-grid">
          {trending.map((track) => <TrackCard key={track.videoId} track={track} context={trending} />)}
        </div>
      </section>
    </div>
  );
}
