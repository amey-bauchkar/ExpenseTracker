/**
 * Money utilities for Digital Hishob-Khata
 * RULE: All internal monetary storage is in integer paise (1 Rupee = 100 Paise).
 * Never use floating point math for balances or calculations.
 */

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Converts a string or number of Latin digits to Devanagari digits.
 */
export function toDevanagariDigits(input: string | number): string {
  const str = input.toString();
  return str.replace(/\d/g, (d) => DEVANAGARI_DIGITS[parseInt(d, 10)]);
}

/**
 * Converts Rupees (number or string like "250", "250.50") to integer Paise.
 */
export function toPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/,/g, '').trim();
    if (!cleaned) return 0;
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer Paise to Rupees (for UI display or calculations).
 */
export function toRupees(paise: number): number {
  return Math.floor(paise) / 100;
}

export interface FormatCurrencyOptions {
  showSymbol?: boolean;
  digits?: 'latin' | 'devanagari';
  forceSign?: boolean;
  showPaise?: boolean;
}

/**
 * Formats integer paise using the Indian numbering system:
 * e.g., 10000000 paise (₹1,00,000) -> "₹1,00,000"
 */
export function formatCurrency(
  paise: number,
  options: FormatCurrencyOptions = {}
): string {
  const {
    showSymbol = true,
    digits = 'latin',
    forceSign = false,
    showPaise = false,
  } = options;

  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupeesPart = Math.floor(absPaise / 100);
  const paisePart = absPaise % 100;

  // Indian number grouping for rupeesPart
  const rupeesStr = rupeesPart.toString();
  let formattedRupees = '';

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.substring(rupeesStr.length - 3);
    const otherNumbers = rupeesStr.substring(0, rupeesStr.length - 3);
    // Insert commas every 2 digits from right to left in otherNumbers
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${withCommas},${lastThree}`;
  }

  let result = formattedRupees;
  if (showPaise || paisePart > 0) {
    const paddedPaise = paisePart.toString().padStart(2, '0');
    result += `.${paddedPaise}`;
  }

  if (digits === 'devanagari') {
    result = toDevanagariDigits(result);
  }

  const symbol = showSymbol ? '₹' : '';
  const sign = isNegative ? '−' : forceSign && paise > 0 ? '+' : '';

  return `${sign}${symbol}${result}`;
}

// Marathi number words mappings
const MARATHI_UNITS: Record<number, string> = {
  0: 'शून्य',
  1: 'एक',
  2: 'दोन',
  3: 'तीन',
  4: 'चार',
  5: 'पाच',
  6: 'सहा',
  7: 'सात',
  8: 'आठ',
  9: 'नऊ',
  10: 'दहा',
  11: 'अकरा',
  12: 'बारा',
  13: 'तेरा',
  14: 'चौदा',
  15: 'पंधरा',
  16: 'सोळा',
  17: 'सतरा',
  18: 'अठरा',
  19: 'एकोणीस',
  20: 'वीस',
  21: 'एकवीस',
  22: 'बावीस',
  23: 'तेवीस',
  24: 'चोवीस',
  25: 'पंचवीस',
  26: 'सव्वीस',
  27: 'सत्तावीस',
  28: 'अठ्ठावीस',
  29: 'एकोणतीस',
  30: 'तीस',
  31: 'एकतीस',
  32: 'बत्तीस',
  33: 'तेहेतीस',
  34: 'चौतीस',
  35: 'पस्तीस',
  36: 'छत्तीस',
  37: 'सदतीस',
  38: 'अडतीस',
  39: 'एकेचाळीस',
  40: 'चाळीस',
  41: 'एक्केचाळीस',
  42: 'बेचाळीस',
  43: 'त्रेचाळीस',
  44: 'चव्वेचाळीस',
  45: 'पंचेचाळीस',
  46: 'शेहेचाळीस',
  47: 'सत्तेचाळीस',
  48: 'अठ्ठेचाळीस',
  49: 'एकोणपन्नास',
  50: 'पन्नास',
  51: 'एक्कावन्न',
  52: 'बावन्न',
  53: 'त्रेपन्न',
  54: 'चौपन्न',
  55: 'पंचावन्न',
  56: 'छप्पन',
  57: 'सत्तावन्न',
  58: 'अठ्ठावन्न',
  59: 'एकोणसाठ',
  60: 'साठ',
  61: 'एकसष्ठ',
  62: 'बासष्ठ',
  63: 'त्रेसष्ठ',
  64: 'चौसष्ठ',
  65: 'पासष्ठ',
  66: 'सहासष्ठ',
  67: 'सदुसष्ठ',
  68: 'अडुसष्ठ',
  69: 'एकोणसत्तर',
  70: 'सत्तर',
  71: 'एकाहत्तर',
  72: 'बाहत्तर',
  73: 'त्र्याहत्तर',
  74: 'चौर्‍याहत्तर',
  75: 'पंच्याहत्तर',
  76: 'शहात्तर',
  77: 'सत्त्याहत्तर',
  78: 'अठ्ठ्याहत्तर',
  79: 'एकोणऐंशी',
  80: 'ऐंशी',
  81: 'एक्याऐंशी',
  82: 'ब्याऐंशी',
  83: 'त्र्याऐंशी',
  84: 'चौऱ्याऐंशी',
  85: 'पंच्याऐंशी',
  86: 'शहाऐंशी',
  87: 'सत्त्याऐंशी',
  88: 'अठ्ठ्याऐंशी',
  89: 'एकोणनव्वद',
  90: 'नव्वद',
  91: 'एक्याण्णव',
  92: 'ब्याण्णव',
  93: 'त्र्याण्णव',
  94: 'चौऱ्याण्णव',
  95: 'पंच्याण्णव',
  96: 'शहाण्णव',
  97: 'सत्त्याण्णव',
  98: 'अठ्ठ्याण्णव',
  99: 'नऊ्याण्णव',
};

const ENGLISH_ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const ENGLISH_TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function englishNumberBelowThousand(n: number): string {
  let res = '';
  if (n >= 100) {
    res += `${ENGLISH_ONES[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n > 0) res += ' ';
  }
  if (n > 0) {
    if (n < 20) {
      res += ENGLISH_ONES[n];
    } else {
      res += ENGLISH_TENS[Math.floor(n / 10)];
      if (n % 10 > 0) {
        res += ` ${ENGLISH_ONES[n % 10]}`;
      }
    }
  }
  return res.trim();
}

/**
 * Converts positive rupees to English words (Indian numbering: crore, lakh, thousand, hundred).
 */
export function amountInWordsEnglish(rupees: number): string {
  if (rupees === 0) return 'Zero Rupees';
  let n = Math.floor(rupees);
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) {
    parts.push(`${englishNumberBelowThousand(crore)} Crore`);
  }

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) {
    parts.push(`${englishNumberBelowThousand(lakh)} Lakh`);
  }

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) {
    parts.push(`${englishNumberBelowThousand(thousand)} Thousand`);
  }

  if (n > 0) {
    parts.push(englishNumberBelowThousand(n));
  }

  return `${parts.join(' ')} Rupees`.trim();
}

/**
 * Converts positive rupees to Marathi words (दोनशे पन्नास रुपये, दहा हजार रुपये, etc.).
 */
export function amountInWordsMarathi(rupees: number): string {
  if (rupees === 0) return 'शून्य रुपये';
  let n = Math.floor(rupees);
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) {
    parts.push(`${MARATHI_UNITS[crore] || crore} कोटी`);
  }

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) {
    parts.push(`${MARATHI_UNITS[lakh] || lakh} लाख`);
  }

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) {
    parts.push(`${MARATHI_UNITS[thousand] || thousand} हजार`);
  }

  const hundred = Math.floor(n / 100);
  n %= 100;
  if (hundred > 0) {
    if (hundred === 1) {
      parts.push('शंभर');
    } else {
      parts.push(`${MARATHI_UNITS[hundred] || hundred}शे`);
    }
  }

  if (n > 0) {
    parts.push(MARATHI_UNITS[n] || n.toString());
  }

  return `${parts.join(' ')} रुपये`.trim();
}

/**
 * Public amountInWords helper taking paise.
 */
export function amountInWords(paise: number, language: 'mr' | 'en' = 'mr'): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  if (language === 'mr') {
    return amountInWordsMarathi(rupees);
  }
  return amountInWordsEnglish(rupees);
}
