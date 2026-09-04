const DATABASE_NAME = "exdox-workspace-cache";
const STORE_NAME = "snapshots";
const CACHE_VERSION = 1;

type CachedWorkspace<T> = {
  version: number;
  scope: string;
  savedAt: string;
  value: T;
};

function databaseAvailable() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, CACHE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "scope" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local workspace cache."));
  });
}

export function workspaceCacheScope(input: { user: { id: number; role: string }; activeOrganisationId: number }) {
  return `v${CACHE_VERSION}:user-${input.user.id}:organisation-${input.activeOrganisationId}:role-${input.user.role}`;
}

export async function readWorkspaceCache<T>(scope: string) {
  if (!databaseAvailable()) {
    return null;
  }
  const database = await openDatabase();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(scope);
      request.onsuccess = () => {
        const cached = request.result as CachedWorkspace<T> | undefined;
        resolve(cached?.version === CACHE_VERSION && cached.scope === scope ? cached.value : null);
      };
      request.onerror = () => reject(request.error ?? new Error("Could not read the local workspace cache."));
    });
  } finally {
    database.close();
  }
}

export async function writeWorkspaceCache<T>(scope: string, value: T) {
  if (!databaseAvailable()) {
    return;
  }
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put({
        version: CACHE_VERSION,
        scope,
        savedAt: new Date().toISOString(),
        value,
      } satisfies CachedWorkspace<T>);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not save the local workspace cache."));
    });
  } finally {
    database.close();
  }
}

export async function clearWorkspaceCache(scope: string) {
  if (!databaseAvailable()) {
    return;
  }
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(scope);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not clear the local workspace cache."));
    });
  } finally {
    database.close();
  }
}

export async function clearWorkspaceCachesForUser(userId: number) {
  if (!databaseAvailable()) {
    return;
  }
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const store = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }
        if (typeof cursor.key === "string" && cursor.key.includes(`:user-${userId}:`)) {
          cursor.delete();
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error ?? new Error("Could not clear local workspace caches."));
    });
  } finally {
    database.close();
  }
}
