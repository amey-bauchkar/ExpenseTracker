import Dexie, { type Table } from 'dexie';
import {
  Account,
  Category,
  Person,
  Transaction,
  UserSettings,
  OutboxItem,
} from '../domain/types';

export class HishobKhataDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  people!: Table<Person, string>;
  transactions!: Table<Transaction, string>;
  settings!: Table<UserSettings, string>;
  outbox!: Table<OutboxItem, string>;

  constructor() {
    super('DigitalHishobKhataDB');
    this.version(1).stores({
      accounts: 'id, user_id, kind, sort_order, deleted_at, archived_at',
      categories: 'id, user_id, sort_order, is_default, deleted_at, archived_at',
      people: 'id, user_id, name, deleted_at',
      transactions: 'id, user_id, type, local_date, occurred_at, account_id, to_account_id, category_id, person_id, loan_id, deleted_at, [user_id+local_date], [user_id+type]',
      settings: 'user_id',
      outbox: 'id, table_name, record_id, action, created_at',
    });
  }
}

export const db = new HishobKhataDatabase();
