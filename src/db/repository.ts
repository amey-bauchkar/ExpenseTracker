import { v4 as uuidv4 } from 'uuid';
import { db } from './database';
import {
  Account,
  Category,
  OutboxItem,
  Person,
  Transaction,
  UserSettings,
} from '../domain/types';
import { DEFAULT_USER_ID } from './seed';

/**
 * Enqueue change into local outbox for cloud synchronization.
 */
async function enqueueOutbox(
  tableName: OutboxItem['table_name'],
  recordId: string,
  action: OutboxItem['action'],
  payload: any
) {
  const item: OutboxItem = {
    id: uuidv4(),
    table_name: tableName,
    record_id: recordId,
    action: action,
    payload: payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
    last_error: null,
  };
  await db.outbox.add(item);
}

// ----------------- TRANSACTIONS REPOSITORY -----------------

export async function createTransaction(
  data: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'device_id'> & {
    id?: string;
  }
): Promise<Transaction> {
  const now = new Date().toISOString();
  const tx: Transaction = {
    id: data.id || uuidv4(),
    ...data,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    device_id: 'local-pwa',
  };

  await db.transactions.add(tx);
  await enqueueOutbox('transactions', tx.id, 'insert', tx);
  return tx;
}

export async function updateTransaction(
  id: string,
  updates: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>
): Promise<Transaction | null> {
  const existing = await db.transactions.get(id);
  if (!existing) return null;

  const updated: Transaction = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await db.transactions.put(updated);
  await enqueueOutbox('transactions', id, 'update', updated);
  return updated;
}

export async function softDeleteTransaction(id: string): Promise<boolean> {
  const existing = await db.transactions.get(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  const updated: Transaction = {
    ...existing,
    deleted_at: now,
    updated_at: now,
  };

  await db.transactions.put(updated);
  await enqueueOutbox('transactions', id, 'delete', updated);
  return true;
}

export async function restoreTransaction(id: string): Promise<boolean> {
  const existing = await db.transactions.get(id);
  if (!existing) return false;

  const updated: Transaction = {
    ...existing,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };

  await db.transactions.put(updated);
  await enqueueOutbox('transactions', id, 'update', updated);
  return true;
}

export async function getTrashTransactions(userId = DEFAULT_USER_ID): Promise<Transaction[]> {
  const all = await db.transactions.where('user_id').equals(userId).toArray();
  return all
    .filter((tx) => tx.deleted_at !== null)
    .sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime());
}

export async function permanentDeleteTransaction(id: string): Promise<boolean> {
  await db.transactions.delete(id);
  return true;
}

// ----------------- PEOPLE REPOSITORY -----------------

export async function createPerson(
  data: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<Person> {
  const now = new Date().toISOString();
  const person: Person = {
    id: uuidv4(),
    ...data,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.people.add(person);
  await enqueueOutbox('people', person.id, 'insert', person);
  return person;
}

export async function updatePerson(
  id: string,
  updates: Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>
): Promise<Person | null> {
  const existing = await db.people.get(id);
  if (!existing) return null;

  const updated: Person = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await db.people.put(updated);
  await enqueueOutbox('people', id, 'update', updated);
  return updated;
}

export async function softDeletePerson(id: string): Promise<boolean> {
  const existing = await db.people.get(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  const updated: Person = {
    ...existing,
    deleted_at: now,
    updated_at: now,
  };

  await db.people.put(updated);
  await enqueueOutbox('people', id, 'delete', updated);
  return true;
}

// ----------------- ACCOUNTS REPOSITORY -----------------

export async function createAccount(
  data: Omit<Account, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived_at'>
): Promise<Account> {
  const now = new Date().toISOString();
  const account: Account = {
    id: uuidv4(),
    ...data,
    archived_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.accounts.add(account);
  await enqueueOutbox('accounts', account.id, 'insert', account);
  return account;
}

export async function updateAccount(
  id: string,
  updates: Partial<Omit<Account, 'id' | 'user_id' | 'created_at'>>
): Promise<Account | null> {
  const existing = await db.accounts.get(id);
  if (!existing) return null;

  const updated: Account = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await db.accounts.put(updated);
  await enqueueOutbox('accounts', id, 'update', updated);
  return updated;
}

export async function archiveAccount(id: string, archive = true): Promise<boolean> {
  const existing = await db.accounts.get(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  const updated: Account = {
    ...existing,
    archived_at: archive ? now : null,
    updated_at: now,
  };

  await db.accounts.put(updated);
  await enqueueOutbox('accounts', id, 'update', updated);
  return true;
}

// ----------------- CATEGORIES REPOSITORY -----------------

export async function createCategory(
  data: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived_at'>
): Promise<Category> {
  const now = new Date().toISOString();
  const category: Category = {
    id: uuidv4(),
    ...data,
    archived_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.categories.add(category);
  await enqueueOutbox('categories', category.id, 'insert', category);
  return category;
}

export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>
): Promise<Category | null> {
  const existing = await db.categories.get(id);
  if (!existing) return null;

  const updated: Category = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await db.categories.put(updated);
  await enqueueOutbox('categories', id, 'update', updated);
  return updated;
}

export async function archiveCategory(id: string, archive = true): Promise<boolean> {
  const existing = await db.categories.get(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  const updated: Category = {
    ...existing,
    archived_at: archive ? now : null,
    updated_at: now,
  };

  await db.categories.put(updated);
  await enqueueOutbox('categories', id, 'update', updated);
  return true;
}

// ----------------- SETTINGS REPOSITORY -----------------

export async function updateUserSettings(
  userId = DEFAULT_USER_ID,
  updates: Partial<Omit<UserSettings, 'user_id'>>
): Promise<UserSettings> {
  let settings = await db.settings.get(userId);
  const now = new Date().toISOString();

  if (!settings) {
    settings = {
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
      ...updates,
    };
  } else {
    settings = {
      ...settings,
      ...updates,
      updated_at: now,
    };
  }

  await db.settings.put(settings);
  await enqueueOutbox('settings', userId, 'update', settings);
  return settings;
}
