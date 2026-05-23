export const SHUFFLE_MODES = {
  off: 'off',
  shuffle: 'shuffle',
  smart: 'smart',
};

export function nextShuffleMode(currentMode) {
  if (currentMode === SHUFFLE_MODES.off) return SHUFFLE_MODES.shuffle;
  if (currentMode === SHUFFLE_MODES.shuffle) return SHUFFLE_MODES.smart;
  return SHUFFLE_MODES.off;
}

export function uniqueTracks(tracks = []) {
  const seen = new Set();
  return tracks.filter((track) => {
    if (!track?.videoId || seen.has(track.videoId)) return false;
    seen.add(track.videoId);
    return true;
  });
}

export function shuffleTracks(tracks = []) {
  const copy = [...tracks];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildContextQueue({ tracks = [], currentVideoId, mode = SHUFFLE_MODES.off }) {
  const baseQueue = uniqueTracks(tracks).filter((track) => track.videoId !== currentVideoId);
  return mode === SHUFFLE_MODES.off ? baseQueue : shuffleTracks(baseQueue);
}

export function mergeSmartRecommendations(queue = [], recommendations = [], currentVideoId) {
  const existingIds = new Set(queue.map((track) => track.videoId).filter(Boolean));
  if (currentVideoId) existingIds.add(currentVideoId);

  const smartPicks = uniqueTracks(recommendations)
    .filter((track) => !existingIds.has(track.videoId))
    .slice(0, Math.max(3, Math.ceil(queue.length / 3)))
    .map((track) => ({ ...track, isSmartRecommendation: true }));

  if (smartPicks.length === 0) return queue;
  if (queue.length === 0) return smartPicks;

  const merged = [];
  let smartIndex = 0;
  queue.forEach((track, index) => {
    merged.push(track);
    if ((index + 1) % 3 === 0 && smartIndex < smartPicks.length) {
      merged.push(smartPicks[smartIndex]);
      smartIndex += 1;
    }
  });

  return [...merged, ...smartPicks.slice(smartIndex)];
}

export function findPlaylistById(playlists = [], playlistId) {
  if (!playlistId) return null;
  return playlists.find((playlist) => String(playlist.id) === String(playlistId)) || null;
}
