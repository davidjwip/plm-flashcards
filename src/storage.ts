const STORAGE_KEY = 'plm.selectedPatterns';

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

export { STORAGE_KEY };
