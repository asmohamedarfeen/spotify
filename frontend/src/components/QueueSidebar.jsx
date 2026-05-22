import { GripVertical, Plus, Radio, Trash2, X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function QueueSidebar() {
  const {
    addToQueue,
    clearQueue,
    currentSong,
    isAutoplayEnabled,
    playSong,
    queue,
    recommendations,
    removeFromQueue,
    setNowPlayingOpen,
  } = usePlayer();

  return (
    <aside className="side-panel">
      <div className="panel-header">
        <h3>Queue</h3>
        <button className="icon-only" onClick={() => setNowPlayingOpen(true)} title="Show Now Playing">
          <X size={18} />
        </button>
      </div>

      <div className="panel-content">
        <section className="queue-section">
          <h4>Now playing</h4>
          {currentSong ? (
            <div className="queue-now">
              <img src={currentSong.thumbnail} alt="" />
              <div>
                <strong>{currentSong.title}</strong>
                <span>{currentSong.artistName}</span>
              </div>
            </div>
          ) : <p className="muted">No song playing.</p>}
        </section>

        <section className="queue-section">
          <div className="section-line">
            <h4>Next in queue</h4>
            {queue.length > 0 && <button className="text-button" onClick={clearQueue}>Clear queue</button>}
          </div>
          {queue.length > 0 ? queue.map((track, index) => (
            <div key={`${track.videoId}-${index}`} className="queue-row">
              <GripVertical size={14} />
              <img src={track.thumbnail} alt="" />
              <button className="queue-row-main" onClick={() => playSong(track)}>
                <strong>{track.title}</strong>
                <span>{track.artistName}</span>
              </button>
              <button className="icon-only danger" onClick={() => removeFromQueue(index)} title="Remove">
                <Trash2 size={15} />
              </button>
            </div>
          )) : <p className="muted">Add songs to your queue.</p>}
        </section>

        {isAutoplayEnabled && currentSong && (
          <section className="queue-section">
            <div className="section-line">
              <h4><Radio size={15} /> Next from autoplay</h4>
              <span className="mini-badge">On</span>
            </div>
            {recommendations.map((track) => (
              <div key={track.videoId} className="queue-row">
                <img src={track.thumbnail} alt="" />
                <button className="queue-row-main" onClick={() => playSong(track)}>
                  <strong>{track.title}</strong>
                  <span>{track.artistName}</span>
                </button>
                <button className="icon-only" onClick={() => addToQueue(track)} title="Add to queue">
                  <Plus size={15} />
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </aside>
  );
}
