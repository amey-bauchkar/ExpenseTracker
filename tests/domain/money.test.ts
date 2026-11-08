import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  toPaise,
  toRupees,
  amountInWordsMarathi,
  amountInWordsEnglish,
  toDevanagariDigits,
} from '../../src/domain/money';

describe('Money Utilities', () => {
  it('converts Rupees to Paise accurately without float drift', () => {
    expect(toPaise(250)).toBe(25000);
    expect(toPaise('250')).toBe(25000);
    expect(toPaise('10,000')).toBe(1000000);
    expect(toPaise('95,750.50')).toBe(9575050);
    expect(toPaise(0)).toBe(0);
  });

  it('converts Paise to Rupees accurately', () => {
    expect(toRupees(25000)).toBe(250);
    expect(toRupees(1000000)).toBe(10000);
    expect(toRupees(9575050)).toBe(95750.5);
  });

  it('formats Indian currency with proper grouping', () => {
    expect(formatCurrency(25000)).toBe('₹250');
    expect(formatCurrency(1000000)).toBe('₹10,000');
    expect(formatCurrency(10000000)).toBe('₹1,00,000');
    expect(formatCurrency(1000000000)).toBe('₹1,00,00,000');
    expect(formatCurrency(-500000)).toBe('−₹5,000');
    expect(formatCurrency(25000, { forceSign: true })).toBe('+₹250');
  });

  it('formats in Devanagari digits when requested', () => {
    expect(formatCurrency(25000, { digits: 'devanagari' })).toBe('₹२५०');
    expect(formatCurrency(1000000, { digits: 'devanagari' })).toBe('₹१०,०००');
    expect(formatCurrency(10000000, { digits: 'devanagari' })).toBe('₹१,००,०००');
  });

  it('converts digits to Devanagari accurately', () => {
    expect(toDevanagariDigits('1234567890')).toBe('१२३४५६७८९०');
  });

  it('converts amounts to Marathi words correctly', () => {
    expect(amountInWordsMarathi(250)).toBe('दोनशे पन्नास रुपये');
    expect(amountInWordsMarathi(10000)).toBe('दहा हजार रुपये');
    expect(amountInWordsMarathi(30000)).toBe('तीस हजार रुपये');
    expect(amountInWordsMarathi(100000)).toBe('एक लाख रुपये');
  });

  it('converts amounts to English words correctly', () => {
    expect(amountInWordsEnglish(250)).toBe('Two Hundred Fifty Rupees');
    expect(amountInWordsEnglish(10000)).toBe('Ten Thousand Rupees');
    expect(amountInWordsEnglish(30000)).toBe('Thirty Thousand Rupees');
    expect(amountInWordsEnglish(100000)).toBe('One Lakh Rupees');
  });
});
