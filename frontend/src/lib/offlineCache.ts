/**
 * Offline caching utilities for bookmarked notes.
 * Uses IndexedDB to store note data and Cache API to store note files
 * so users can read their bookmarked notes without a network connection.
 */

const DB_NAME = 'notehub-offline';
const DB_VERSION = 1;
const STORE_NOTES = 'offline-notes';
const CACHE_NAME = 'offline-note-files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'slug' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface OfflineNote {
  slug: string;
  title: string;
  description: string;
  subject_name: string;
  faculty_name: string;
  author_name: string;
  file_type: string;
  file_url: string;
  thumbnail: string | null;
  created_at: string;
  cached_at: string;
}

/**
 * Save a note's metadata to IndexedDB for offline access.
 */
export async function saveNoteOffline(note: OfflineNote): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    tx.objectStore(STORE_NOTES).put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Cache the note's file (PDF, image, etc.) for offline reading.
 */
export async function cacheNoteFile(fileUrl: string): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(fileUrl);
    if (response.ok) {
      await cache.put(fileUrl, response);
    }
  } catch {
    // Network error — can't cache the file right now
  }
}

/**
 * Cache a note and its file for offline reading.
 */
export async function cacheNoteForOffline(note: {
  slug: string;
  title: string;
  description: string;
  subject_name: string;
  faculty_name: string;
  author_name: string;
  author_username?: string;
  file_type: string;
  file?: string;
  thumbnail: string | null;
  created_at: string;
}): Promise<void> {
  const offlineNote: OfflineNote = {
    slug: note.slug,
    title: note.title,
    description: note.description,
    subject_name: note.subject_name,
    faculty_name: note.faculty_name,
    author_name: note.author_name,
    file_type: note.file_type,
    file_url: note.file || '',
    thumbnail: note.thumbnail,
    created_at: note.created_at,
    cached_at: new Date().toISOString(),
  };

  await saveNoteOffline(offlineNote);

  // Cache the actual file and thumbnail for offline access
  if (note.file) await cacheNoteFile(note.file);
  if (note.thumbnail) await cacheNoteFile(note.thumbnail);
}

/**
 * Remove a note from offline cache.
 */
export async function removeNoteOffline(slug: string): Promise<void> {
  const db = await openDB();
  const note = await getOfflineNote(slug);

  // Remove from IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    tx.objectStore(STORE_NOTES).delete(slug);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Remove cached file
  if (note) {
    try {
      const cache = await caches.open(CACHE_NAME);
      if (note.file_url) await cache.delete(note.file_url);
      if (note.thumbnail) await cache.delete(note.thumbnail);
    } catch {
      // ignore
    }
  }
}

/**
 * Get a single offline note by slug.
 */
export async function getOfflineNote(slug: string): Promise<OfflineNote | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readonly');
    const request = tx.objectStore(STORE_NOTES).get(slug);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all offline-cached notes.
 */
export async function getAllOfflineNotes(): Promise<OfflineNote[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readonly');
    const request = tx.objectStore(STORE_NOTES).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if a note is cached offline.
 */
export async function isNoteCachedOffline(slug: string): Promise<boolean> {
  const note = await getOfflineNote(slug);
  return !!note;
}

/**
 * Get total size of offline cache (approximate).
 */
export async function getOfflineCacheSize(): Promise<number> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
  } catch {
    // ignore
  }
  return 0;
}

/**
 * Check if the user is currently online.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
