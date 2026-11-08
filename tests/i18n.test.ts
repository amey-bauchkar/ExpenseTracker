import { describe, it, expect } from 'vitest';
import { mr } from '../src/i18n/mr';
import { en } from '../src/i18n/en';

function getDeepKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys = keys.concat(getDeepKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n Key Coverage', () => {
  it('has identical keys in Marathi and English translations', () => {
    const mrKeys = getDeepKeys(mr).sort();
    const enKeys = getDeepKeys(en).sort();

    expect(mrKeys).toEqual(enKeys);
  });
});
