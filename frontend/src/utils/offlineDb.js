const DB_NAME = 'spotify-clone-offline';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error('IndexedDB open error:', e);
      reject(e);
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
      }
    };
  });
}

export async function saveOfflineSong(videoId, blob, songMetadata) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        videoId,
        blob,
        title: songMetadata.title,
        artist: songMetadata.artistName || songMetadata.artist || 'Unknown Artist',
        thumbnail: songMetadata.thumbnail || '',
        addedAt: Date.now(),
        quality: songMetadata.quality || 'standard'
      };

      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error('Failed to save offline song:', err);
    return false;
  }
}

export async function getOfflineSong(videoId) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(videoId);

      request.onsuccess = (e) => resolve(e.target.result || null);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error('Failed to get offline song:', err);
    return null;
  }
}

export async function deleteOfflineSong(videoId) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(videoId);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error('Failed to delete offline song:', err);
    return false;
  }
}

export async function getAllOfflineSongs() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (e) => resolve(e.target.result || []);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error('Failed to get all offline songs:', err);
    return [];
  }
}
