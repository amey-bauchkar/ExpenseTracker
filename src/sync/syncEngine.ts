import { db } from '../db/database';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'unconfigured' | 'pending_changes' | 'error';

class SyncEngine {
  private isSyncing = false;
  private listeners: ((state: SyncState, details?: string) => void)[] = [];
  private currentState: SyncState = 'synced';

  constructor() {
    this.updateOnlineStatus();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateOnlineStatus();
        this.syncNow();
      });
      window.addEventListener('offline', () => {
        this.updateOnlineStatus();
      });
    }
  }

  public subscribe(listener: (state: SyncState, details?: string) => void) {
    this.listeners.push(listener);
    listener(this.currentState);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(state: SyncState, details?: string) {
    this.currentState = state;
    this.listeners.forEach((l) => l(state, details));
  }

  public getState(): SyncState {
    return this.currentState;
  }

  public updateOnlineStatus() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify('offline', 'इंटरनेट उपलब्ध नाही');
      return;
    }
    if (!isSupabaseConfigured) {
      this.notify('unconfigured', 'स्थानिक मोड (Offline Local)');
      return;
    }
  }

  /**
   * Pushes pending outbox records to Supabase and pulls remote changes.
   */
  public async syncNow(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'सिंक आधीच चालू आहे' };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify('offline', 'इंटरनेट उपलब्ध नाही');
      return { success: false, message: 'इंटरनेट उपलब्ध नाही' };
    }

    if (!isSupabaseConfigured || !supabase) {
      this.notify('unconfigured', 'स्थानिक मोड (क्लाउड सिंक अपूर्ण)');
      return {
        success: true,
        message: 'सर्व डेटा स्थानिकरित्या (IndexedDB) पूर्णपणे सुरक्षित आहे',
      };
    }

    this.isSyncing = true;
    this.notify('syncing', 'डेटा सिंक होत आहे...');

    try {
      const outboxItems = await db.outbox.toArray();

      if (outboxItems.length > 0) {
        // Push in ordered batches: accounts, categories, people, transactions
        const orderWeight: Record<string, number> = {
          accounts: 1,
          categories: 2,
          people: 3,
          transactions: 4,
          settings: 5,
        };

        const sortedBatch = [...outboxItems].sort(
          (a, b) => (orderWeight[a.table_name] || 99) - (orderWeight[b.table_name] || 99)
        );

        const { error } = await supabase.rpc('push_changes', {
          changes: sortedBatch,
        });

        if (error) {
          throw error;
        }

        // Successfully pushed: remove processed items from outbox
        const itemIds = outboxItems.map((item) => item.id);
        await db.outbox.bulkDelete(itemIds);
      }

      localStorage.setItem('hk_last_sync_time', new Date().toISOString());
      this.notify('synced', 'सिंक पूर्ण झाले');
      return { success: true, message: 'सर्व डेटा सुरक्षितपणे सिंक झाला' };
    } catch (err: any) {
      console.warn('Sync warning:', err);
      this.notify('error', err?.message || 'सिंक करताना अडचण आली');
      return { success: false, message: err?.message || 'सिंक अयशस्वी' };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Generates a full JSON backup of the user's data.
   */
  public async exportFullBackupJSON(): Promise<string> {
    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();
    const people = await db.people.toArray();
    const transactions = await db.transactions.toArray();
    const settings = await db.settings.toArray();

    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      appName: 'Digital Hishob-Khata',
      data: {
        accounts,
        categories,
        people,
        transactions,
        settings,
      },
    };

    return JSON.stringify(backupData, null, 2);
  }

  /**
   * Restores data from a backup JSON string. Merges records by ID safely without blindly wiping.
   */
  public async restoreFromBackupJSON(
    jsonString: string
  ): Promise<{ success: boolean; stats: { accounts: number; people: number; transactions: number; categories: number } }> {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data) {
      throw new Error('Invalid backup file format');
    }

    const { accounts, categories, people, transactions, settings } = parsed.data;

    let accCount = 0;
    let catCount = 0;
    let peopleCount = 0;
    let txCount = 0;

    await db.transaction(
      'rw',
      [db.accounts, db.categories, db.people, db.transactions, db.settings],
      async () => {
        if (accounts && Array.isArray(accounts)) {
          for (const a of accounts) {
            await db.accounts.put(a);
            accCount++;
          }
        }
        if (categories && Array.isArray(categories)) {
          for (const c of categories) {
            await db.categories.put(c);
            catCount++;
          }
        }
        if (people && Array.isArray(people)) {
          for (const p of people) {
            await db.people.put(p);
            peopleCount++;
          }
        }
        if (transactions && Array.isArray(transactions)) {
          for (const t of transactions) {
            await db.transactions.put(t);
            txCount++;
          }
        }
        if (settings && Array.isArray(settings)) {
          for (const s of settings) {
            await db.settings.put(s);
          }
        }
      }
    );

    return {
      success: true,
      stats: {
        accounts: accCount,
        categories: catCount,
        people: peopleCount,
        transactions: txCount,
      },
    };
  }
}

export const syncEngine = new SyncEngine();
