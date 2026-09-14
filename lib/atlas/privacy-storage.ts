export const LOCAL_DATA_CHANGED = 'calgary-local-data-changed';

export function isSavedResearchKey(key: string) {
  return key === 'calgary-atlas-saved' || key.startsWith('atlas-checks-');
}

// only clear this app's saves, including the old storage keys
export function clearSavedResearch(
  storage: Pick<Storage, 'length' | 'key' | 'removeItem'>,
) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isSavedResearchKey(key)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
  return keys.length;
}

export function clearBrowserResearch() {
  const removed = clearSavedResearch(window.localStorage);
  window.dispatchEvent(new Event(LOCAL_DATA_CHANGED));
  return removed;
}
