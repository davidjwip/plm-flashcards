import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadSelection, saveSelection, type KeyValueStore } from './storage';

function fakeStore(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe('storage', () => {
  it('returns nothing when the store is empty', () => {
    expect(loadSelection(fakeStore())).toEqual([]);
  });

  it('round-trips a selection', () => {
    const store = fakeStore();
    expect(saveSelection(['ai', 'igh'], store)).toBe(true);
    expect(store.data[STORAGE_KEY]).toBe('["ai","igh"]');
    expect(loadSelection(store)).toEqual(['ai', 'igh']);
  });

  it('survives corrupt json rather than throwing', () => {
    expect(loadSelection(fakeStore({ [STORAGE_KEY]: '{not json' }))).toEqual([]);
  });

  it('rejects a non-array and filters non-strings', () => {
    expect(loadSelection(fakeStore({ [STORAGE_KEY]: '{"a":1}' }))).toEqual([]);
    expect(loadSelection(fakeStore({ [STORAGE_KEY]: '["ai",7,null]' }))).toEqual(['ai']);
  });

  it('reports failure when the store throws (quota, private mode)', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadSelection(throwing)).toEqual([]);
    expect(saveSelection(['ai'], throwing)).toBe(false);
    expect(saveSelection(['ai'], undefined)).toBe(false);
    expect(loadSelection(undefined)).toEqual([]);
  });
});
