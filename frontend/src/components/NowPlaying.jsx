import { CheckCircle, Download, Heart, ListMusic, Mic2, MoreHorizontal, X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function NowPlaying() {
  const {
    currentSong,
    downloadedSongs,
    downloadingSongs,
    downloadSong,
    isLyricsOpen,
    likedSongs,
    lyrics,
    lyricsLoading,
    queue,
    setNowPlayingOpen,
    toggleLikedSong,
    toggleLyrics,
  } = usePlayer();

  if (!currentSong) {
    return (
      <aside className="side-panel">
        <div className="panel-header">
          <h3>Now Playing</h3>
          <button className="icon-only" onClick={() => setNowPlayingOpen(false)}><ListMusic size={18} /></button>
        </div>
        <div className="empty-panel">Play a song to see details here.</div>
      </aside>
    );
  }

  const isDownloaded = Boolean(downloadedSongs[currentSong.videoId]);
  const isDownloading = downloadingSongs[currentSong.videoId] === 'downloading';

  return (
    <aside className="side-panel now-panel">
      <div className="panel-header">
        <h3>{currentSong.title}</h3>
        <div className="panel-actions">
          <button className="icon-only" title="More"><MoreHorizontal size={18} /></button>
          <button className="icon-only" onClick={() => setNowPlayingOpen(false)} title="Show Queue"><ListMusic size={18} /></button>
        </div>
      </div>

      <div className="panel-content">
        <img className="now-art-large" src={currentSong.thumbnail} alt={currentSong.title} />
        <div className="now-detail-title">
          <div>
            <h2>{currentSong.title}</h2>
            <p>{currentSong.artistName}</p>
          </div>
          <button className={`icon-only ${likedSongs[currentSong.videoId] ? 'active' : ''}`} onClick={() => toggleLikedSong(currentSong)} title="Save">
            <Heart size={20} fill={likedSongs[currentSong.videoId] ? 'currentColor' : 'none'} />
          </button>
        </div>

        <section className="info-card">
          <h4>About the track</h4>
          <p>Source: {currentSong.source}</p>
          <p>Album: {currentSong.album || 'Single'}</p>
          <div className="info-actions">
            {isDownloaded ? (
              <span className="green-pill"><CheckCircle size={14} /> Downloaded</span>
            ) : (
              <button className="secondary-pill" onClick={() => downloadSong(currentSong)}>
                <Download size={15} />
                {isDownloading ? 'Downloading' : 'Download'}
              </button>
            )}
            <button className={`secondary-pill ${isLyricsOpen ? 'active' : ''}`} onClick={toggleLyrics}>
              <Mic2 size={15} />
              Lyrics
            </button>
          </div>
        </section>

        {isLyricsOpen && (
          <section className="info-card lyrics-card">
            <div className="section-line">
              <h4>Lyrics</h4>
              <button className="icon-only" onClick={toggleLyrics}><X size={15} /></button>
            </div>
            {lyricsLoading && <p className="muted">Loading lyrics...</p>}
            {!lyricsLoading && lyrics?.available && (
              <div className="lyrics-lines">
                {lyrics.lines?.slice(0, 16).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
              </div>
            )}
            {!lyricsLoading && !lyrics?.available && (
              <p className="muted">{lyrics?.error || 'Lyrics are not available for this track.'}</p>
            )}
          </section>
        )}

        <section className="info-card">
          <h4>Next in queue</h4>
          {queue[0] ? (
            <div className="mini-track">
              <img src={queue[0].thumbnail} alt="" />
              <div>
                <strong>{queue[0].title}</strong>
                <span>{queue[0].artistName}</span>
              </div>
            </div>
          ) : <p className="muted">Recommendations will play after this song.</p>}
        </section>
      </div>
    </aside>
  );
}
