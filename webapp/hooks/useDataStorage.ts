// Inspiration From
// https://gist.github.com/Mon4ik/2636100f5b74ee14e35cf283700616fe

/* `useLocalStorage`
 *
 * Features:
 *  - JSON Serializing
 *  - Also value will be updated everywhere, when value updated (via `storage` event)
 */

import dataStorage from '@/utils/dataStorage';
import logger from '@/utils/logger';
import { useEffect, useState } from 'react';

export default function useDataStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const item = dataStorage().getItem(key);

    if (!item) {
      dataStorage().setItem(key, defaultValue);
    } else {
      setValue(item as T);
    }

    function handler(e: StorageEvent) {
      if (e.key !== key) return;
      const i = dataStorage().getItem(key);
      // logger.info('storage event', e, key, i);
      setValue(i as T);
    }
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener('storage', handler);
    };
  }, [defaultValue, key]);

  const setValueWrap = (v: T) => {
    try {
      setValue(v);
      dataStorage().setItem(key, v);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (e) {
      logger.error(e);
    }
  };

  return [value, setValueWrap];
}
