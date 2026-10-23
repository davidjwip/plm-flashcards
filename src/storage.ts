const STORAGE_KEY = 'plm.selectedPatterns';
const WORD_SIZE_KEY = 'plm.wordSize';
const VOLUME_KEY = 'plm.volume';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined; // private mode / blocked storage
  }
}

/** Saved pattern ids, filtered to strings; never throws. */
export function loadSelection(store: KeyValueStore | undefined = defaultStore()): string[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Best effort: a full or blocked store must not break a practice run. */
export function saveSelection(
  ids: string[],
  store: KeyValueStore | undefined = defaultStore(),
): boolean {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(ids));
    return Boolean(store);
  } catch {
    return false;
  }
}

/** True when the device has a selection at all, even an explicitly empty one. */
export function hasStoredSelection(store: KeyValueStore | undefined = defaultStore()): boolean {
  try {
    return store?.getItem(STORAGE_KEY) !== null && store?.getItem(STORAGE_KEY) !== undefined;
  } catch {
    return false;
  }
}

export { STORAGE_KEY };

/** Word-size step, or null when nothing usable is stored. */
export function loadWordSize(store: KeyValueStore | undefined = defaultStore()): number | null {
  try {
    const raw = store?.getItem(WORD_SIZE_KEY);
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWordSize(
  index: number,
  store: KeyValueStore | undefined = defaultStore(),
): boolean {
  try {
    store?.setItem(WORD_SIZE_KEY, String(index));
    return Boolean(store);
  } catch {
    return false;
  }
}

export { WORD_SIZE_KEY };

export function loadVolume(store: KeyValueStore | undefined = defaultStore()): number | null {
  try {
    const raw = store?.getItem(VOLUME_KEY);
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveVolume(
  index: number,
  store: KeyValueStore | undefined = defaultStore(),
): boolean {
  try {
    store?.setItem(VOLUME_KEY, String(index));
    return Boolean(store);
  } catch {
    return false;
  }
}

export { VOLUME_KEY };
