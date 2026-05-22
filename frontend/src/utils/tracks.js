export function getBestThumbnail(raw) {
  if (!raw) return '';
  if (raw.thumbnail) return raw.thumbnail;
  const thumbnails = raw.thumbnails || raw.thumbnailUrl;
  if (Array.isArray(thumbnails) && thumbnails.length > 0) {
    return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';
  }
  if (typeof thumbnails === 'string') return thumbnails;
  return '';
}

export function getPrimaryArtist(raw) {
  if (!raw) return 'Unknown Artist';
  if (raw.artistName) return raw.artistName;
  if (raw.artist) return raw.artist;
  if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    return raw.artists.map((artist) => artist.name || artist).filter(Boolean).join(', ');
  }
  if (raw.artists_names) return raw.artists_names;
  return 'Unknown Artist';
}

export function normalizeTrack(raw) {
  if (!raw) return null;
  const videoId = raw.videoId || raw.id;
  return {
    id: videoId,
    videoId,
    title: raw.title || raw.name || 'Unknown Title',
    artistName: getPrimaryArtist(raw),
    artists: Array.isArray(raw.artists) ? raw.artists : [{ name: getPrimaryArtist(raw) }],
    album: raw.album?.name || raw.album || 'Single',
    thumbnail: getBestThumbnail(raw),
    duration: raw.duration_seconds || raw.duration || null,
    source: raw.source || 'YouTube Music',
    isExplicit: Boolean(raw.isExplicit || raw.explicit),
    matchPercentage: raw.matchPercentage,
    raw,
  };
}

export function normalizeTracks(items = []) {
  return items.map(normalizeTrack).filter((track) => track?.videoId);
}

export function formatDuration(value) {
  if (!value) return '--:--';
  const seconds = value > 1000 ? Math.round(value / 1000) : Math.round(value);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
