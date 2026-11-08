import { v4 as uuidv4 } from 'uuid';
import { db } from './database';
import { Account, Category, UserSettings } from '../domain/types';

export const DEFAULT_USER_ID = 'local-default-user';

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived_at'>[] = [
  { name_mr: 'भाजीपाला', name_en: 'Vegetables', icon: 'Carrot', color: '#15803D', sort_order: 1, is_default: true },
  { name_mr: 'किराणा व धान्य', name_en: 'Grocery & Grains', icon: 'ShoppingBag', color: '#B45309', sort_order: 2, is_default: true },
  { name_mr: 'दूध व दुग्धजन्य', name_en: 'Milk & Dairy', icon: 'CupSoda', color: '#0284C7', sort_order: 3, is_default: true },
  { name_mr: 'फळे', name_en: 'Fruits', icon: 'Apple', color: '#E11D48', sort_order: 4, is_default: true },
  { name_mr: 'घरगुती खर्च', name_en: 'Household Expenses', icon: 'Home', color: '#0D9488', sort_order: 5, is_default: true },
  { name_mr: 'वीज बिल', name_en: 'Electricity Bill', icon: 'Zap', color: '#CA8A04', sort_order: 6, is_default: true },
  { name_mr: 'गॅस सिलिंडर', name_en: 'Gas Cylinder', icon: 'Flame', color: '#EA580C', sort_order: 7, is_default: true },
  { name_mr: 'औषधे व दवाखाना', name_en: 'Medical & Hospital', icon: 'HeartPulse', color: '#DC2626', sort_order: 8, is_default: true },
  { name_mr: 'प्रवास व पेट्रोल', name_en: 'Travel & Fuel', icon: 'Fuel', color: '#4F46E5', sort_order: 9, is_default: true },
  { name_mr: 'शिक्षण व फी', name_en: 'Education & Fees', icon: 'GraduationCap', color: '#7C3AED', sort_order: 10, is_default: true },
  { name_mr: 'कपडे व खरेदी', name_en: 'Clothes & Shopping', icon: 'Shirt', color: '#DB2777', sort_order: 11, is_default: true },
  { name_mr: 'दुरुस्ती व देखभाल', name_en: 'Repairs & Maintenance', icon: 'Wrench', color: '#64748B', sort_order: 12, is_default: true },
  { name_mr: 'धार्मिक व सण', name_en: 'Festivals & Religious', icon: 'Sparkles', color: '#D97706', sort_order: 13, is_default: true },
  { name_mr: 'इतर किरकोळ', name_en: 'Other Miscellaneous', icon: 'MoreHorizontal', color: '#5B6372', sort_order: 14, is_default: true },
];

export const DEFAULT_ACCOUNTS: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived_at'>[] = [
  { name: 'रोख (Cash)', kind: 'cash', opening_balance_paise: 0, opening_date: new Date().toISOString().split('T')[0], sort_order: 1 },
  { name: 'बँक खाते (Bank)', kind: 'bank', opening_balance_paise: 0, opening_date: new Date().toISOString().split('T')[0], sort_order: 2 },
  { name: 'UPI / PhonePe', kind: 'upi', opening_balance_paise: 0, opening_date: new Date().toISOString().split('T')[0], sort_order: 3 },
];

/**
 * Initializes database with default seed data if empty.
 */
export async function initializeDatabase(userId = DEFAULT_USER_ID): Promise<void> {
  const now = new Date().toISOString();

  // Settings
  const existingSettings = await db.settings.get(userId);
  if (!existingSettings) {
    const settings: UserSettings = {
      user_id: userId,
      language: 'mr',
      currency: 'INR',
      theme: 'light',
      text_scale: 100,
      digits: 'latin',
      fy_start_month: 4,
      pin_hash: null,
      pin_salt: null,
      is_pin_enabled: false,
      updated_at: now,
    };
    await db.settings.put(settings);
  }

  // Categories
  const catCount = await db.categories.where('user_id').equals(userId).count();
  if (catCount === 0) {
    const categoriesToInsert: Category[] = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      id: uuidv4(),
      user_id: userId,
      archived_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }));
    await db.categories.bulkAdd(categoriesToInsert);
  }

  // Accounts
  const accCount = await db.accounts.where('user_id').equals(userId).count();
  if (accCount === 0) {
    const accountsToInsert: Account[] = DEFAULT_ACCOUNTS.map((acc) => ({
      ...acc,
      id: uuidv4(),
      user_id: userId,
      archived_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }));
    await db.accounts.bulkAdd(accountsToInsert);
  }
}
