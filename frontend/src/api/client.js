const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed with ${response.status}`);
  }
  if (data?.status === 'error') {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const api = {
  search(query, options = {}) {
    return request(`/api/search?q=${encodeURIComponent(query)}`, options);
  },
  home() {
    return request('/api/home');
  },
  bulkSearch(queries) {
    return request('/api/bulk-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries }),
    });
  },
  extractSpotifyPlaylist(url) {
    return request('/api/extract-spotify-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  },
  recommendations(track) {
    const params = new URLSearchParams({
      videoId: track.videoId,
      title: track.title,
      artist: track.artistName || '',
    });
    return request(`/api/recommendations?${params.toString()}`);
  },
  download(videoId, quality) {
    return request(`/api/download/${videoId}?quality=${quality}`, { method: 'POST' });
  },
  streamUrl(videoId, quality) {
    return `${API_BASE_URL}/api/stream/${videoId}?quality=${quality}`;
  },
  lyrics(track) {
    const params = new URLSearchParams({
      title: track.title,
      artist: track.artistName || '',
    });
    return request(`/api/lyrics?${params.toString()}`);
  },
};
