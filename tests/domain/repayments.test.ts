import { describe, it, expect } from 'vitest';
import {
  calculateLoanSummaries,
  validateRepayment,
} from '../../src/domain/ledger';
import { Transaction } from '../../src/domain/types';

describe('Repayment Consistency & Edge Case Tests (Section 11.5)', () => {
  const userId = 'user-test';

  it('transitions loan status to fully_returned on exact full settlement', () => {
    const loanTx: Transaction = {
      id: 'loan-1',
      user_id: userId,
      type: 'lend',
      amount_paise: 500000, // ₹5,000
      occurred_at: '2026-11-01T10:00:00Z',
      local_date: '2026-11-01',
      account_id: 'acc-cash',
      to_account_id: null,
      category_id: null,
      person_id: 'person-1',
      counterparty_text: null,
      loan_id: null,
      reason: 'Loan',
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-01T10:00:00Z',
      deleted_at: null,
      device_id: null,
    };

    const repTx: Transaction = {
      id: 'rep-1',
      user_id: userId,
      type: 'repayment',
      amount_paise: 500000, // Exact ₹5,000
      occurred_at: '2026-11-05T10:00:00Z',
      local_date: '2026-11-05',
      account_id: 'acc-cash',
      to_account_id: null,
      category_id: null,
      person_id: 'person-1',
      counterparty_text: null,
      loan_id: 'loan-1',
      reason: 'Full Repayment',
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-05T10:00:00Z',
      updated_at: '2026-11-05T10:00:00Z',
      deleted_at: null,
      device_id: null,
    };

    const loans = calculateLoanSummaries([loanTx, repTx]);
    const summary = loans.get('loan-1')!;

    expect(summary.remaining_paise).toBe(0);
    expect(summary.returned_paise).toBe(500000);
    expect(summary.status).toBe('fully_returned');
  });

  it('rejects repayment dated before loan date', () => {
    const loanSummary = {
      loan_id: 'loan-1',
      person_id: 'person-1',
      occurred_at: '2026-11-05T10:00:00Z',
      local_date: '2026-11-05',
      amount_paise: 500000,
      returned_paise: 0,
      written_off_paise: 0,
      remaining_paise: 500000,
      status: 'pending' as const,
      reason: null,
      expected_return_date: null,
      account_id: 'acc-cash',
      repayments: [],
    };

    // Attempt repayment dated 2026-11-04 (before loan date 2026-11-05)
    const val = validateRepayment(loanSummary, 200000, '2026-11-04');
    expect(val.isValid).toBe(false);
    expect(val.errorMessageMr).toContain('तारखेच्या आधीची');
  });

  it('reopens remaining balance when a middle repayment is deleted', () => {
    const loanTx: Transaction = {
      id: 'loan-1',
      user_id: userId,
      type: 'lend',
      amount_paise: 1000000, // ₹10,000
      occurred_at: '2026-11-01T10:00:00Z',
      local_date: '2026-11-01',
      account_id: 'acc-cash',
      to_account_id: null,
      category_id: null,
      person_id: 'person-1',
      counterparty_text: null,
      loan_id: null,
      reason: null,
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-01T10:00:00Z',
      deleted_at: null,
      device_id: null,
    };

    const rep1: Transaction = {
      id: 'rep-1',
      user_id: userId,
      type: 'repayment',
      amount_paise: 300000, // ₹3,000
      occurred_at: '2026-11-05T10:00:00Z',
      local_date: '2026-11-05',
      account_id: 'acc-cash',
      to_account_id: null,
      category_id: null,
      person_id: 'person-1',
      counterparty_text: null,
      loan_id: 'loan-1',
      reason: null,
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-05T10:00:00Z',
      updated_at: '2026-11-05T10:00:00Z',
      deleted_at: null,
      device_id: null,
    };

    const rep2: Transaction = {
      id: 'rep-2',
      user_id: userId,
      type: 'repayment',
      amount_paise: 200000, // ₹2,000
      occurred_at: '2026-11-10T10:00:00Z',
      local_date: '2026-11-10',
      account_id: 'acc-cash',
      to_account_id: null,
      category_id: null,
      person_id: 'person-1',
      counterparty_text: null,
      loan_id: 'loan-1',
      reason: null,
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-10T10:00:00Z',
      updated_at: '2026-11-10T10:00:00Z',
      deleted_at: null,
      device_id: null,
    };

    // Both active: returned = ₹5,000, remaining = ₹5,000
    const loansBefore = calculateLoanSummaries([loanTx, rep1, rep2]);
    expect(loansBefore.get('loan-1')?.remaining_paise).toBe(500000);

    // rep1 soft-deleted: remaining should automatically reopen to ₹8,000
    const rep1Deleted = { ...rep1, deleted_at: '2026-11-11T00:00:00Z' };
    const loansAfter = calculateLoanSummaries([loanTx, rep1Deleted, rep2]);
    expect(loansAfter.get('loan-1')?.remaining_paise).toBe(800000);
    expect(loansAfter.get('loan-1')?.returned_paise).toBe(200000);
  });
});
