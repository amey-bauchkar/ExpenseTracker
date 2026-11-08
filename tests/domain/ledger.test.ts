import { describe, it, expect } from 'vitest';
import {
  calculateAllAccountBalances,
  calculateLoanSummaries,
  calculatePersonSummaries,
  calculatePeriodSummary,
  validateRepayment,
  allocateOldestFirstRepayment,
  reconcileLedger,
} from '../../src/domain/ledger';
import { Account, Category, Person, Transaction } from '../../src/domain/types';

describe('Financial Domain Logic — Golden Test (Blueprint Section 7.3)', () => {
  const userId = 'user-baba-1';

  // Accounts
  const cashAccount: Account = {
    id: 'acc-cash',
    user_id: userId,
    name: 'रोख (Cash)',
    kind: 'cash',
    opening_balance_paise: 2000000, // ₹20,000
    opening_date: '2026-11-01',
    sort_order: 1,
    archived_at: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    deleted_at: null,
  };

  const bankAccount: Account = {
    id: 'acc-bank',
    user_id: userId,
    name: 'बँक (SBI Bank)',
    kind: 'bank',
    opening_balance_paise: 5000000, // ₹50,000
    opening_date: '2026-11-01',
    sort_order: 2,
    archived_at: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    deleted_at: null,
  };

  const accounts = [cashAccount, bankAccount];

  // Person
  const ramesh: Person = {
    id: 'person-ramesh',
    user_id: userId,
    name: 'रमेश (Ramesh)',
    phone: '9876543210',
    note: 'शेजारी (Neighbor)',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    deleted_at: null,
  };

  const vegCategory: Category = {
    id: 'cat-veg',
    user_id: userId,
    name_mr: 'भाजीपाला',
    name_en: 'Vegetables',
    icon: 'Carrot',
    color: '#15803D',
    sort_order: 1,
    is_default: true,
    archived_at: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    deleted_at: null,
  };

  // Section 7.3 Chronological Transactions
  const loanId = 'tx-lend-1';
  const transactions: Transaction[] = [
    // Nov 2: Expense ₹250 vegetables (cash)
    {
      id: 'tx-exp-1',
      user_id: userId,
      type: 'expense',
      amount_paise: 25000,
      occurred_at: '2026-11-02T10:00:00Z',
      local_date: '2026-11-02',
      account_id: 'acc-cash',
      to_account_id: null,
      category_id: 'cat-veg',
      person_id: null,
      counterparty_text: 'भाजी मंडई',
      loan_id: null,
      reason: 'भाजीपाला',
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-02T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
      deleted_at: null,
      device_id: 'dev-1',
    },
    // Nov 2: Lend ₹10,000 to Ramesh (bank)
    {
      id: loanId,
      user_id: userId,
      type: 'lend',
      amount_paise: 1000000,
      occurred_at: '2026-11-02T14:00:00Z',
      local_date: '2026-11-02',
      account_id: 'acc-bank',
      to_account_id: null,
      category_id: null,
      person_id: 'person-ramesh',
      counterparty_text: null,
      loan_id: null,
      reason: 'घर दुरुस्ती (House repair)',
      note: null,
      expected_return_date: '2026-12-01',
      receipt_path: null,
      created_at: '2026-11-02T14:00:00Z',
      updated_at: '2026-11-02T14:00:00Z',
      deleted_at: null,
      device_id: 'dev-1',
    },
    // Nov 3: Income ₹30,000 (bank)
    {
      id: 'tx-inc-1',
      user_id: userId,
      type: 'income',
      amount_paise: 3000000,
      occurred_at: '2026-11-03T11:00:00Z',
      local_date: '2026-11-03',
      account_id: 'acc-bank',
      to_account_id: null,
      category_id: null,
      person_id: null,
      counterparty_text: 'भाडे (Rent)',
      loan_id: null,
      reason: 'मासिक भाडे',
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-03T11:00:00Z',
      updated_at: '2026-11-03T11:00:00Z',
      deleted_at: null,
      device_id: 'dev-1',
    },
    // Nov 4: Transfer ₹5,000 bank to cash
    {
      id: 'tx-trf-1',
      user_id: userId,
      type: 'transfer',
      amount_paise: 500000,
      occurred_at: '2026-11-04T16:00:00Z',
      local_date: '2026-11-04',
      account_id: 'acc-bank',
      to_account_id: 'acc-cash',
      category_id: null,
      person_id: null,
      counterparty_text: null,
      loan_id: null,
      reason: 'ATM Withdrawal',
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-04T16:00:00Z',
      updated_at: '2026-11-04T16:00:00Z',
      deleted_at: null,
      device_id: 'dev-1',
    },
    // Nov 10: Repayment ₹2,000 (cash)
    {
      id: 'tx-rep-1',
      user_id: userId,
      type: 'repayment',
      amount_paise: 200000,
      occurred_at: '2026-11-10T12:00:00Z',
      local_date: '2026-11-10',
      account_id: 'acc-cash',
      to_account_id: null,
      category_id: null,
      person_id: 'person-ramesh',
      counterparty_text: null,
      loan_id: loanId,
      reason: 'पहिला हप्ता (1st installment)',
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-10T12:00:00Z',
      updated_at: '2026-11-10T12:00:00Z',
      deleted_at: null,
      device_id: 'dev-1',
    },
    // Nov 15: Repayment ₹3,000 (bank)
    {
      id: 'tx-rep-2',
      user_id: userId,
      type: 'repayment',
      amount_paise: 300000,
      occurred_at: '2026-11-15T15:00:00Z',
      local_date: '2026-11-15',
      account_id: 'acc-bank',
      to_account_id: null,
      category_id: null,
      person_id: 'person-ramesh',
      counterparty_text: null,
      loan_id: loanId,
      reason: 'दुसरा हप्ता (2nd installment via UPI/Bank)',
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-15T15:00:00Z',
      updated_at: '2026-11-15T15:00:00Z',
      deleted_at: null,
      device_id: 'dev-1',
    },
    // Nov 20: Repayment ₹1,000 (cash)
    {
      id: 'tx-rep-3',
      user_id: userId,
      type: 'repayment',
      amount_paise: 100000,
      occurred_at: '2026-11-20T18:00:00Z',
      local_date: '2026-11-20',
      account_id: 'acc-cash',
      to_account_id: null,
      category_id: null,
      person_id: 'person-ramesh',
      counterparty_text: null,
      loan_id: loanId,
      reason: 'तिसरा हप्ता (3rd installment)',
      note: null,
      expected_return_date: null,
      receipt_path: null,
      created_at: '2026-11-20T18:00:00Z',
      updated_at: '2026-11-20T18:00:00Z',
      deleted_at: null,
      device_id: 'dev-1',
    },
  ];

  it('matches all intermediate daily balances in the table exactly', () => {
    // Nov 1
    const balNov1 = calculateAllAccountBalances(accounts, transactions, '2026-11-01');
    expect(balNov1.balances.find((b) => b.account.id === 'acc-cash')?.current_balance_paise).toBe(2000000); // 20,000
    expect(balNov1.balances.find((b) => b.account.id === 'acc-bank')?.current_balance_paise).toBe(5000000); // 50,000
    expect(balNov1.totalAvailablePaise).toBe(7000000); // 70,000

    // Nov 2: After expense ₹250 and lend ₹10,000
    const balNov2 = calculateAllAccountBalances(accounts, transactions, '2026-11-02');
    expect(balNov2.balances.find((b) => b.account.id === 'acc-cash')?.current_balance_paise).toBe(1975000); // 19,750
    expect(balNov2.balances.find((b) => b.account.id === 'acc-bank')?.current_balance_paise).toBe(4000000); // 40,000
    expect(balNov2.totalAvailablePaise).toBe(5975000); // 59,750

    // Nov 3: After income ₹30,000
    const balNov3 = calculateAllAccountBalances(accounts, transactions, '2026-11-03');
    expect(balNov3.balances.find((b) => b.account.id === 'acc-cash')?.current_balance_paise).toBe(1975000); // 19,750
    expect(balNov3.balances.find((b) => b.account.id === 'acc-bank')?.current_balance_paise).toBe(7000000); // 70,000
    expect(balNov3.totalAvailablePaise).toBe(8975000); // 89,750

    // Nov 4: After transfer ₹5,000 bank -> cash
    const balNov4 = calculateAllAccountBalances(accounts, transactions, '2026-11-04');
    expect(balNov4.balances.find((b) => b.account.id === 'acc-cash')?.current_balance_paise).toBe(2475000); // 24,750
    expect(balNov4.balances.find((b) => b.account.id === 'acc-bank')?.current_balance_paise).toBe(6500000); // 65,000
    expect(balNov4.totalAvailablePaise).toBe(8975000); // 89,750 (Net zero effect)

    // Nov 10: After repayment ₹2,000 cash
    const balNov10 = calculateAllAccountBalances(accounts, transactions, '2026-11-10');
    expect(balNov10.balances.find((b) => b.account.id === 'acc-cash')?.current_balance_paise).toBe(2675000); // 26,750
    expect(balNov10.balances.find((b) => b.account.id === 'acc-bank')?.current_balance_paise).toBe(6500000); // 65,000
    expect(balNov10.totalAvailablePaise).toBe(9175000); // 91,750

    // Nov 15: After repayment ₹3,000 bank
    const balNov15 = calculateAllAccountBalances(accounts, transactions, '2026-11-15');
    expect(balNov15.balances.find((b) => b.account.id === 'acc-cash')?.current_balance_paise).toBe(2675000); // 26,750
    expect(balNov15.balances.find((b) => b.account.id === 'acc-bank')?.current_balance_paise).toBe(6800000); // 68,000
    expect(balNov15.totalAvailablePaise).toBe(9475000); // 94,750

    // Nov 20: After repayment ₹1,000 cash
    const balNov20 = calculateAllAccountBalances(accounts, transactions, '2026-11-20');
    expect(balNov20.balances.find((b) => b.account.id === 'acc-cash')?.current_balance_paise).toBe(2775000); // 27,750
    expect(balNov20.balances.find((b) => b.account.id === 'acc-bank')?.current_balance_paise).toBe(6800000); // 68,000
    expect(balNov20.totalAvailablePaise).toBe(9575000); // 95,750
  });

  it('matches month results exactly (Section 7.3 specifications)', () => {
    const period = calculatePeriodSummary(
      transactions,
      [vegCategory],
      '2026-11-01',
      '2026-11-30'
    );

    // Total expenses: ₹250
    expect(period.total_expense_paise).toBe(25000);

    // Total income: ₹30,000
    expect(period.total_income_paise).toBe(3000000);

    // Total lent: ₹10,000
    expect(period.total_lent_paise).toBe(1000000);

    // Total repayments: ₹6,000
    expect(period.total_repayment_paise).toBe(600000);

    // Net cash flow = +₹25,750
    expect(period.net_cash_flow_paise).toBe(2575000);

    // Closing balance = ₹95,750
    const finalBalance = calculateAllAccountBalances(accounts, transactions);
    expect(finalBalance.totalAvailablePaise).toBe(9575000);

    // Ramesh loan summary
    const loans = calculateLoanSummaries(transactions);
    const rameshLoan = loans.get(loanId)!;
    expect(rameshLoan.amount_paise).toBe(1000000); // Original: ₹10,000
    expect(rameshLoan.returned_paise).toBe(600000); // Returned: ₹6,000
    expect(rameshLoan.remaining_paise).toBe(400000); // Remaining: ₹4,000
    expect(rameshLoan.status).toBe('partially_returned');

    // Person summary
    const peopleSummaries = calculatePersonSummaries([ramesh], transactions);
    const rameshSummary = peopleSummaries[0];
    expect(rameshSummary.pending_paise).toBe(400000); // ₹4,000
    expect(rameshSummary.total_lent_paise).toBe(1000000);
    expect(rameshSummary.total_returned_paise).toBe(600000);

    // Mathematical invariant verification: Opening (70,000) + Net Cash Flow (25,750) = Closing (95,750)
    expect(7000000 + period.net_cash_flow_paise).toBe(finalBalance.totalAvailablePaise);
  });

  it('passes the reconciliation self-check without any discrepancy', () => {
    const check = reconcileLedger(accounts, transactions);
    expect(check.isBalanced).toBe(true);
    expect(check.discrepancies).toEqual([]);
    expect(check.accountsSum).toBe(9575000);
    expect(check.loansRemainingSum).toBe(400000);
  });

  it('prevents over-repayment exceeding remaining balance', () => {
    const loans = calculateLoanSummaries(transactions);
    const rameshLoan = loans.get(loanId)!; // Remaining is ₹4,000

    // Repaying ₹4,001 (400,100 paise) should be rejected
    const invalidValidation = validateRepayment(rameshLoan, 400100, '2026-11-21');
    expect(invalidValidation.isValid).toBe(false);
    expect(invalidValidation.errorMessageMr).toContain('शिल्लक बाकीपेक्षा');

    // Repaying exact remaining ₹4,000 should be valid
    const validValidation = validateRepayment(rameshLoan, 400000, '2026-11-21');
    expect(validValidation.isValid).toBe(true);
  });

  it('correctly allocates repayment across multiple loans with oldest-first rule', () => {
    const loans: any[] = [
      {
        loan_id: 'loan-1',
        amount_paise: 500000,
        remaining_paise: 500000,
        occurred_at: '2026-10-01T10:00:00Z',
      },
      {
        loan_id: 'loan-2',
        amount_paise: 300000,
        remaining_paise: 300000,
        occurred_at: '2026-11-01T10:00:00Z',
      },
    ];

    // Total repayment of ₹6,000 (600,000 paise): should pay off loan-1 (5,000) and 1,000 to loan-2
    const result = allocateOldestFirstRepayment(loans, 600000);
    expect(result.success).toBe(true);
    expect(result.allocations).toEqual([
      { loan_id: 'loan-1', amount_paise: 500000 },
      { loan_id: 'loan-2', amount_paise: 100000 },
    ]);
  });
});
