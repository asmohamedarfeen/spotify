import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SHUFFLE_MODES,
  buildContextQueue,
  findPlaylistById,
  mergeSmartRecommendations,
  nextShuffleMode,
  searchResultPlaybackOptions,
  uniqueTracks,
} from './playerLogic.js';

test('findPlaylistById returns the selected playlist by route id', () => {
  const playlists = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  assert.equal(findPlaylistById(playlists, 'b')?.name, 'B');
  assert.equal(findPlaylistById(playlists, 'missing'), null);
});

test('nextShuffleMode cycles off to shuffle to smart', () => {
  assert.equal(nextShuffleMode(SHUFFLE_MODES.off), SHUFFLE_MODES.shuffle);
  assert.equal(nextShuffleMode(SHUFFLE_MODES.shuffle), SHUFFLE_MODES.smart);
  assert.equal(nextShuffleMode(SHUFFLE_MODES.smart), SHUFFLE_MODES.off);
});

test('buildContextQueue excludes the current track and dedupes context', () => {
  const tracks = [
    { videoId: '1', title: 'One' },
    { videoId: '2', title: 'Two' },
    { videoId: '2', title: 'Two duplicate' },
    { videoId: '3', title: 'Three' },
  ];
  assert.deepEqual(buildContextQueue({ tracks, currentVideoId: '1' }).map((track) => track.videoId), ['2', '3']);
});

test('mergeSmartRecommendations injects unique recommendation tracks', () => {
  const queue = [
    { videoId: '2', title: 'Two' },
    { videoId: '3', title: 'Three' },
    { videoId: '4', title: 'Four' },
  ];
  const recommendations = [
    { videoId: '3', title: 'Three duplicate' },
    { videoId: '5', title: 'Five' },
    { videoId: '6', title: 'Six' },
  ];
  const merged = mergeSmartRecommendations(queue, recommendations, '1');
  assert.deepEqual(uniqueTracks(merged).map((track) => track.videoId), merged.map((track) => track.videoId));
  assert(merged.some((track) => track.videoId === '5' && track.isSmartRecommendation));
});

test('searchResultPlaybackOptions clears search result queue context', () => {
  assert.deepEqual(searchResultPlaybackOptions(), { context: [] });
});
