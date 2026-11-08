import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/database';
import {
  createAccount,
  createCategory,
  createPerson,
  createTransaction,
  getTrashTransactions,
  permanentDeleteTransaction,
  restoreTransaction,
  softDeleteTransaction,
  updateTransaction,
} from '../../src/db/repository';

describe('Dexie Repository & Offline Outbox Integration Tests', () => {
  const testUserId = 'test-user-integration';

  beforeEach(async () => {
    await db.transactions.clear();
    await db.people.clear();
    await db.accounts.clear();
    await db.categories.clear();
    await db.outbox.clear();
  });

  it('creates an account, records outbox entry, and retrieves from DB', async () => {
    const acc = await createAccount({
      user_id: testUserId,
      name: 'रोख (Cash)',
      kind: 'cash',
      opening_balance_paise: 2000000,
      opening_date: '2026-11-01',
      sort_order: 1,
    });

    expect(acc.id).toBeDefined();
    expect(acc.opening_balance_paise).toBe(2000000);

    const fromDb = await db.accounts.get(acc.id);
    expect(fromDb?.name).toBe('रोख (Cash)');

    const outbox = await db.outbox.toArray();
    expect(outbox.length).toBe(1);
    expect(outbox[0].table_name).toBe('accounts');
    expect(outbox[0].action).toBe('insert');
  });

  it('creates a transaction, soft-deletes it to Trash, and restores it', async () => {
    const tx = await createTransaction({
      user_id: testUserId,
      type: 'expense',
      amount_paise: 25000, // ₹250
      occurred_at: '2026-11-02T10:00:00Z',
      local_date: '2026-11-02',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: 'cat-1',
      person_id: null,
      counterparty_text: null,
      loan_id: null,
      reason: 'भाजीपाला',
      note: null,
      expected_return_date: null,
      receipt_path: null,
    });

    expect(tx.deleted_at).toBeNull();

    // Soft delete
    await softDeleteTransaction(tx.id);
    const deletedTx = await db.transactions.get(tx.id);
    expect(deletedTx?.deleted_at).not.toBeNull();

    // Check Trash list
    const trash = await getTrashTransactions(testUserId);
    expect(trash.length).toBe(1);
    expect(trash[0].id).toBe(tx.id);

    // Restore from Trash
    await restoreTransaction(tx.id);
    const restoredTx = await db.transactions.get(tx.id);
    expect(restoredTx?.deleted_at).toBeNull();

    const trashAfterRestore = await getTrashTransactions(testUserId);
    expect(trashAfterRestore.length).toBe(0);

    // Test permanent delete
    await softDeleteTransaction(tx.id);
    await permanentDeleteTransaction(tx.id);
    const permanentlyDeleted = await db.transactions.get(tx.id);
    expect(permanentlyDeleted).toBeUndefined();
  });

  it('creates category and person successfully', async () => {
    const person = await createPerson({
      user_id: testUserId,
      name: 'रमेश',
      phone: '9876543210',
      note: 'मित्र',
    });
    expect(person.id).toBeDefined();
    const fetchedPerson = await db.people.get(person.id);
    expect(fetchedPerson?.name).toBe('रमेश');

    const cat = await createCategory({
      user_id: testUserId,
      name_mr: 'भाजीपाला',
      name_en: 'Vegetables',
      icon: 'Carrot',
      color: '#15803D',
      sort_order: 1,
      is_default: true,
    });
    expect(cat.id).toBeDefined();
    const fetchedCat = await db.categories.get(cat.id);
    expect(fetchedCat?.name_mr).toBe('भाजीपाला');
  });

  it('updates a transaction and generates an outbox update item', async () => {
    const tx = await createTransaction({
      user_id: testUserId,
      type: 'expense',
      amount_paise: 25000,
      occurred_at: '2026-11-02T10:00:00Z',
      local_date: '2026-11-02',
      account_id: 'acc-1',
      to_account_id: null,
      category_id: 'cat-1',
      person_id: null,
      counterparty_text: null,
      loan_id: null,
      reason: 'भाजीपाला',
      note: null,
      expected_return_date: null,
      receipt_path: null,
    });

    await updateTransaction(tx.id, {
      amount_paise: 35000,
      reason: 'भाजीपाला व फळे',
    });

    const updatedTx = await db.transactions.get(tx.id);
    expect(updatedTx?.amount_paise).toBe(35000);
    expect(updatedTx?.reason).toBe('भाजीपाला व फळे');

    const outbox = await db.outbox.where('action').equals('update').toArray();
    expect(outbox.length).toBe(1);
    expect(outbox[0].payload.amount_paise).toBe(35000);
  });
});
