import {
  Account,
  AccountBalance,
  Category,
  DashboardSummary,
  LoanStatus,
  LoanSummary,
  Person,
  PersonSummary,
  PeriodSummary,
  Transaction,
} from './types';

/**
 * Filter out soft-deleted items.
 */
export function activeOnly<T extends { deleted_at: string | null }>(items: T[]): T[] {
  return items.filter((item) => item.deleted_at === null);
}

/**
 * Calculates current balance for a single account as of date D (default all).
 *
 * balance(acc, D) = acc.opening_balance
 *   + Σ income        (account_id = acc, date ≤ D)
 *   + Σ repayment     (account_id = acc, date ≤ D)
 *   + Σ transfer in   (to_account_id = acc, date ≤ D)
 *   − Σ expense       (account_id = acc, date ≤ D)
 *   − Σ lend          (account_id = acc, date ≤ D)
 *   − Σ transfer out  (account_id = acc, date ≤ D)
 */
export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[],
  asOfDate?: string
): AccountBalance {
  let inflow = 0;
  let outflow = 0;

  const activeTx = activeOnly(transactions);

  for (const tx of activeTx) {
    if (asOfDate && tx.local_date > asOfDate) continue;
    // Only transactions dated on or after opening_date affect account balance
    if (account.opening_date && tx.local_date < account.opening_date) continue;

    // Inflows to this account
    if (tx.account_id === account.id) {
      if (tx.type === 'income' || tx.type === 'repayment') {
        inflow += tx.amount_paise;
      } else if (tx.type === 'expense' || tx.type === 'lend' || tx.type === 'transfer') {
        outflow += tx.amount_paise;
      }
    }

    // Transfers into this account
    if (tx.type === 'transfer' && tx.to_account_id === account.id) {
      inflow += tx.amount_paise;
    }
  }

  const currentBalance = account.opening_balance_paise + inflow - outflow;

  return {
    account,
    opening_balance_paise: account.opening_balance_paise,
    current_balance_paise: currentBalance,
    total_inflow_paise: inflow,
    total_outflow_paise: outflow,
  };
}

/**
 * Calculates balances for all active accounts, and total available money.
 */
export function calculateAllAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  asOfDate?: string
): {
  balances: AccountBalance[];
  totalAvailablePaise: number;
} {
  const activeAccounts = activeOnly(accounts).filter((a) => !a.archived_at);
  const balances = activeAccounts.map((acc) =>
    calculateAccountBalance(acc, transactions, asOfDate)
  );

  const totalAvailablePaise = balances.reduce(
    (sum, b) => sum + b.current_balance_paise,
    0
  );

  return { balances, totalAvailablePaise };
}

/**
 * Derives loan summaries for all 'lend' transactions.
 */
export function calculateLoanSummaries(
  transactions: Transaction[],
  asOfDate?: string
): Map<string, LoanSummary> {
  const activeTx = activeOnly(transactions);
  const lendTxList = activeTx.filter((tx) => tx.type === 'lend');
  const loanMap = new Map<string, LoanSummary>();

  for (const lend of lendTxList) {
    if (asOfDate && lend.local_date > asOfDate) continue;

    loanMap.set(lend.id, {
      loan_id: lend.id,
      person_id: lend.person_id || '',
      occurred_at: lend.occurred_at,
      local_date: lend.local_date,
      amount_paise: lend.amount_paise,
      returned_paise: 0,
      written_off_paise: 0,
      remaining_paise: lend.amount_paise,
      status: 'pending',
      reason: lend.reason,
      expected_return_date: lend.expected_return_date,
      account_id: lend.account_id,
      repayments: [],
    });
  }

  // Correlate repayments and write-offs
  for (const tx of activeTx) {
    if (asOfDate && tx.local_date > asOfDate) continue;

    if (tx.loan_id && loanMap.has(tx.loan_id)) {
      const loan = loanMap.get(tx.loan_id)!;
      if (tx.type === 'repayment') {
        loan.returned_paise += tx.amount_paise;
        loan.repayments.push(tx);
      } else if (tx.type === 'writeoff') {
        loan.written_off_paise += tx.amount_paise;
      }
    }
  }

  // Calculate remaining and status
  for (const loan of loanMap.values()) {
    const totalReturned = loan.returned_paise + loan.written_off_paise;
    loan.remaining_paise = Math.max(0, loan.amount_paise - totalReturned);

    let status: LoanStatus = 'pending';
    if (loan.remaining_paise === 0) {
      status = 'fully_returned';
    } else if (totalReturned > 0) {
      status = 'partially_returned';
    }
    loan.status = status;
  }

  return loanMap;
}

/**
 * Derives person summaries with total outstanding, returned, and loan lists.
 */
export function calculatePersonSummaries(
  people: Person[],
  transactions: Transaction[],
  asOfDate?: string
): PersonSummary[] {
  const activePeople = activeOnly(people);
  const loanSummaries = calculateLoanSummaries(transactions, asOfDate);

  return activePeople.map((person) => {
    // Find all loans for this person
    const personLoans = Array.from(loanSummaries.values()).filter(
      (l) => l.person_id === person.id
    );

    let totalLent = 0;
    let totalReturned = 0;
    let totalWrittenOff = 0;
    let pending = 0;
    let activeLoansCount = 0;
    let settledLoansCount = 0;
    let lastActivityDate: string | null = null;

    for (const loan of personLoans) {
      totalLent += loan.amount_paise;
      totalReturned += loan.returned_paise;
      totalWrittenOff += loan.written_off_paise;
      pending += loan.remaining_paise;

      if (loan.status === 'fully_returned') {
        settledLoansCount++;
      } else {
        activeLoansCount++;
      }

      if (!lastActivityDate || loan.local_date > lastActivityDate) {
        lastActivityDate = loan.local_date;
      }

      for (const rep of loan.repayments) {
        if (!lastActivityDate || rep.local_date > lastActivityDate) {
          lastActivityDate = rep.local_date;
        }
      }
    }

    return {
      person,
      total_lent_paise: totalLent,
      total_returned_paise: totalReturned,
      total_written_off_paise: totalWrittenOff,
      pending_paise: pending,
      active_loans_count: activeLoansCount,
      settled_loans_count: settledLoansCount,
      last_activity_date: lastActivityDate,
      loans: personLoans.sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      ),
    };
  });
}

/**
 * Calculates total pending receivable (all people) as of date.
 */
export function calculateTotalPendingReceivable(
  transactions: Transaction[],
  asOfDate?: string
): number {
  const loanMap = calculateLoanSummaries(transactions, asOfDate);
  let totalPending = 0;
  for (const loan of loanMap.values()) {
    totalPending += loan.remaining_paise;
  }
  return totalPending;
}

/**
 * Calculates Period Summary (expenses, income, lent, repayments, net flow, category breakdown).
 */
export function calculatePeriodSummary(
  transactions: Transaction[],
  categories: Category[],
  startDate: string,
  endDate: string
): PeriodSummary {
  const activeTx = activeOnly(transactions);
  const activeCats = activeOnly(categories);
  const catMap = new Map<string, Category>(activeCats.map((c) => [c.id, c]));

  let totalExpense = 0;
  let totalIncome = 0;
  let totalLent = 0;
  let totalRepayment = 0;

  const categoryTotals = new Map<string, { amount: number; count: number }>();

  for (const tx of activeTx) {
    if (tx.local_date < startDate || tx.local_date > endDate) continue;

    switch (tx.type) {
      case 'expense': {
        totalExpense += tx.amount_paise;
        const catKey = tx.category_id || 'uncategorized';
        const current = categoryTotals.get(catKey) || { amount: 0, count: 0 };
        current.amount += tx.amount_paise;
        current.count += 1;
        categoryTotals.set(catKey, current);
        break;
      }
      case 'income':
        totalIncome += tx.amount_paise;
        break;
      case 'lend':
        totalLent += tx.amount_paise;
        break;
      case 'repayment':
        totalRepayment += tx.amount_paise;
        break;
      case 'transfer':
      case 'writeoff':
        // Transfers and writeoffs are not period income/expense/lend/repayment
        break;
    }
  }

  // Net cash flow = income + repayment - expense - lend
  const netCashFlow = totalIncome + totalRepayment - totalExpense - totalLent;

  // Build category breakdown
  const categoryBreakdown = Array.from(categoryTotals.entries())
    .map(([catId, data]) => {
      const cat = catId !== 'uncategorized' ? catMap.get(catId) : undefined;
      const percentage = totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0;
      return {
        category_id: catId !== 'uncategorized' ? catId : null,
        category_name_mr: cat ? cat.name_mr : 'इतर खर्च',
        category_name_en: cat ? cat.name_en : 'Other Expenses',
        color: cat ? cat.color : '#5B6372',
        icon: cat ? cat.icon : 'MoreHorizontal',
        amount_paise: data.amount,
        percentage: Math.round(percentage * 10) / 10,
        count: data.count,
      };
    })
    .sort((a, b) => b.amount_paise - a.amount_paise);

  return {
    total_expense_paise: totalExpense,
    total_income_paise: totalIncome,
    total_lent_paise: totalLent,
    total_repayment_paise: totalRepayment,
    net_cash_flow_paise: netCashFlow,
    category_breakdown: categoryBreakdown,
  };
}

/**
 * Calculates Dashboard Summary for a given selected date.
 */
export function calculateDashboardSummary(
  accounts: Account[],
  transactions: Transaction[],
  categories: Category[],
  selectedDate: string // YYYY-MM-DD
): DashboardSummary {
  // Available balances as of end of selected date
  const { balances, totalAvailablePaise } = calculateAllAccountBalances(
    accounts,
    transactions,
    selectedDate
  );

  // Today totals (specifically on selectedDate)
  const activeTx = activeOnly(transactions);
  let todayExpense = 0;
  let todayIncome = 0;
  let todayLent = 0;
  let todayRepayment = 0;

  for (const tx of activeTx) {
    if (tx.local_date === selectedDate) {
      if (tx.type === 'expense') todayExpense += tx.amount_paise;
      else if (tx.type === 'income') todayIncome += tx.amount_paise;
      else if (tx.type === 'lend') todayLent += tx.amount_paise;
      else if (tx.type === 'repayment') todayRepayment += tx.amount_paise;
    }
  }

  const todayNetCashFlow = todayIncome + todayRepayment - todayExpense - todayLent;

  // Month totals (from 1st of month of selectedDate to end of that month)
  const monthStart = `${selectedDate.substring(0, 7)}-01`;
  const monthEnd = `${selectedDate.substring(0, 7)}-31`; // safe lexicographical ceiling

  const monthSummary = calculatePeriodSummary(
    transactions,
    categories,
    monthStart,
    monthEnd
  );

  const totalPendingReceivable = calculateTotalPendingReceivable(
    transactions,
    selectedDate
  );

  return {
    available_balance_paise: totalAvailablePaise,
    account_balances: balances,
    today_expense_paise: todayExpense,
    today_income_paise: todayIncome,
    today_lent_paise: todayLent,
    today_repayment_paise: todayRepayment,
    today_net_cash_flow_paise: todayNetCashFlow,
    total_pending_receivable_paise: totalPendingReceivable,
    month_expense_paise: monthSummary.total_expense_paise,
    month_income_paise: monthSummary.total_income_paise,
    month_lent_paise: monthSummary.total_lent_paise,
    month_repayment_paise: monthSummary.total_repayment_paise,
    month_net_cash_flow_paise: monthSummary.net_cash_flow_paise,
  };
}

/**
 * Validates whether a proposed repayment amount on a specific loan is permissible.
 * Returns error string if invalid, or null if valid.
 */
export function validateRepayment(
  loan: LoanSummary,
  proposedRepaymentPaise: number,
  repaymentDate: string
): { isValid: boolean; errorMessageMr?: string; errorMessageEn?: string } {
  if (proposedRepaymentPaise <= 0) {
    return {
      isValid: false,
      errorMessageMr: 'रक्कम शून्यापेक्षा जास्त असावी',
      errorMessageEn: 'Amount must be greater than zero',
    };
  }

  if (proposedRepaymentPaise > loan.remaining_paise) {
    return {
      isValid: false,
      errorMessageMr: `परत मिळणारी रक्कम शिल्लक बाकीपेक्षा (₹${loan.remaining_paise / 100}) जास्त असू शकत नाही`,
      errorMessageEn: `Repayment amount cannot exceed remaining balance (₹${loan.remaining_paise / 100})`,
    };
  }

  if (repaymentDate < loan.local_date) {
    return {
      isValid: false,
      errorMessageMr: 'परतफेडीची तारीख उधारी दिलेल्या तारखेच्या आधीची असू शकत नाही',
      errorMessageEn: 'Repayment date cannot be earlier than the loan date',
    };
  }

  return { isValid: true };
}

export interface RepaymentAllocation {
  loan_id: string;
  amount_paise: number;
}

/**
 * Allocates a repayment across multiple open loans for a person (Oldest-First rule).
 * Throws or returns error if total amount exceeds total pending for that person.
 */
export function allocateOldestFirstRepayment(
  openLoans: LoanSummary[],
  totalRepaymentPaise: number
): {
  success: boolean;
  allocations: RepaymentAllocation[];
  errorMessageMr?: string;
  errorMessageEn?: string;
} {
  const totalPending = openLoans.reduce((sum, l) => sum + l.remaining_paise, 0);

  if (totalRepaymentPaise > totalPending) {
    return {
      success: false,
      allocations: [],
      errorMessageMr: `परत मिळालेली रक्कम एकूण येणे बाकीपेक्षा (₹${totalPending / 100}) जास्त असू शकत नाही`,
      errorMessageEn: `Repayment amount cannot exceed total pending amount (₹${totalPending / 100})`,
    };
  }

  // Sort loans oldest first by occurred_at / local_date
  const sortedLoans = [...openLoans]
    .filter((l) => l.remaining_paise > 0)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  let remainingToAllocate = totalRepaymentPaise;
  const allocations: RepaymentAllocation[] = [];

  for (const loan of sortedLoans) {
    if (remainingToAllocate <= 0) break;

    const allocatedToThis = Math.min(loan.remaining_paise, remainingToAllocate);
    allocations.push({
      loan_id: loan.loan_id,
      amount_paise: allocatedToThis,
    });
    remainingToAllocate -= allocatedToThis;
  }

  return {
    success: true,
    allocations,
  };
}

/**
 * Reconciliation Check (Section 7.4 rule 9).
 * Tests ledger mathematical invariants across accounts and loans.
 */
export function reconcileLedger(
  accounts: Account[],
  transactions: Transaction[]
): {
  isBalanced: boolean;
  accountsSum: number;
  expectedAccountsSum: number;
  loansRemainingSum: number;
  expectedLoansRemainingSum: number;
  discrepancies: string[];
} {
  const discrepancies: string[] = [];
  const activeTx = activeOnly(transactions);
  const activeAccs = activeOnly(accounts);

  const { totalAvailablePaise } = calculateAllAccountBalances(accounts, transactions);

  // Expected accounts balance = Sum(Opening balances) + Incomes + Repayments - Expenses - Lends
  const totalOpening = activeAccs.reduce((sum, a) => sum + a.opening_balance_paise, 0);

  let totalIncome = 0;
  let totalRepayment = 0;
  let totalExpense = 0;
  let totalLend = 0;
  let transferInSum = 0;
  let transferOutSum = 0;

  for (const tx of activeTx) {
    if (tx.type === 'income') totalIncome += tx.amount_paise;
    else if (tx.type === 'repayment') totalRepayment += tx.amount_paise;
    else if (tx.type === 'expense') totalExpense += tx.amount_paise;
    else if (tx.type === 'lend') totalLend += tx.amount_paise;
    else if (tx.type === 'transfer') {
      transferOutSum += tx.amount_paise;
      transferInSum += tx.amount_paise;
    }
  }

  if (transferInSum !== transferOutSum) {
    discrepancies.push('Transfers internal net mismatch');
  }

  const expectedAccountsSum =
    totalOpening + totalIncome + totalRepayment - totalExpense - totalLend;

  if (totalAvailablePaise !== expectedAccountsSum) {
    discrepancies.push(
      `Account balance mismatch: Actual ${totalAvailablePaise} vs Expected ${expectedAccountsSum}`
    );
  }

  // Loans reconciliation
  const loansMap = calculateLoanSummaries(transactions);
  let actualLoansRemaining = 0;
  for (const l of loansMap.values()) {
    actualLoansRemaining += l.remaining_paise;
  }

  let totalWriteOff = 0;
  for (const tx of activeTx) {
    if (tx.type === 'writeoff') totalWriteOff += tx.amount_paise;
  }

  const expectedLoansRemaining = totalLend - totalRepayment - totalWriteOff;

  if (actualLoansRemaining !== expectedLoansRemaining) {
    discrepancies.push(
      `Loan balance mismatch: Actual ${actualLoansRemaining} vs Expected ${expectedLoansRemaining}`
    );
  }

  return {
    isBalanced: discrepancies.length === 0,
    accountsSum: totalAvailablePaise,
    expectedAccountsSum,
    loansRemainingSum: actualLoansRemaining,
    expectedLoansRemainingSum: expectedLoansRemaining,
    discrepancies,
  };
}
