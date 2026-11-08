import * as XLSX from 'xlsx';
import { formatCurrency, toRupees } from '../domain/money';
import { PeriodSummary, Transaction, Account, Category, PersonSummary } from '../domain/types';

/**
 * Exports transaction list to an Excel (.xlsx) file with Marathi and English headers.
 */
export function exportTransactionsToExcel(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  fileName = 'Hishob_Khata_Transactions.xlsx'
) {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const catMap = new Map(categories.map((c) => [c.id, `${c.name_mr} (${c.name_en})`]));

  const typeLabelsMr: Record<string, string> = {
    expense: 'खर्च (Expense)',
    income: 'जमा (Income)',
    lend: 'उधारी दिली (Lend)',
    repayment: 'परत मिळाले (Repayment)',
    transfer: 'हस्तांतर (Transfer)',
    writeoff: 'माफ (Write-off)',
  };

  const rows = transactions.map((tx) => ({
    'तारीख (Date)': tx.local_date,
    'प्रकार (Type)': typeLabelsMr[tx.type] || tx.type,
    'रक्कम ₹ (Amount)': toRupees(tx.amount_paise),
    'खाते (Account)': tx.account_id ? accMap.get(tx.account_id) || 'Unknown' : '-',
    'दुसरे खाते (To Account)': tx.to_account_id ? accMap.get(tx.to_account_id) || '-' : '-',
    'वर्गवारी (Category)': tx.category_id ? catMap.get(tx.category_id) || '-' : '-',
    'तपशील / कारण (Reason)': tx.reason || tx.counterparty_text || '-',
    'टीप (Note)': tx.note || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'व्यवहार नोंदी');

  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports transaction list to CSV with UTF-8 BOM so Excel opens Devanagari properly.
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  fileName = 'Hishob_Khata_Transactions.csv'
) {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const catMap = new Map(categories.map((c) => [c.id, `${c.name_mr} (${c.name_en})`]));

  const typeLabelsMr: Record<string, string> = {
    expense: 'खर्च',
    income: 'जमा',
    lend: 'उधारी दिली',
    repayment: 'परत मिळाले',
    transfer: 'हस्तांतर',
    writeoff: 'माफ',
  };

  const headers = ['तारीख', 'प्रकार', 'रक्कम (₹)', 'खाते', 'वर्गवारी', 'तपशील', 'टीप'];
  const csvRows = [headers.join(',')];

  for (const tx of transactions) {
    const row = [
      tx.local_date,
      typeLabelsMr[tx.type] || tx.type,
      toRupees(tx.amount_paise).toString(),
      `"${tx.account_id ? accMap.get(tx.account_id) || '' : ''}"`,
      `"${tx.category_id ? catMap.get(tx.category_id) || '' : ''}"`,
      `"${(tx.reason || tx.counterparty_text || '').replace(/"/g, '""')}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
    ];
    csvRows.push(row.join(','));
  }

  // UTF-8 BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates an elegant printable report for period summary and transactions.
 * Opens an isolated print preview with perfect Devanagari rendering.
 */
export function printReportPDF(
  title: string,
  periodLabel: string,
  summary: PeriodSummary,
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download or print PDF');
    return;
  }

  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const catMap = new Map(categories.map((c) => [c.id, c.name_mr]));

  const typeLabelsMr: Record<string, { label: string; color: string }> = {
    expense: { label: 'खर्च', color: '#B42318' },
    income: { label: 'जमा', color: '#15803D' },
    lend: { label: 'उधारी दिली', color: '#B45309' },
    repayment: { label: 'परत मिळाले', color: '#1D4ED8' },
    transfer: { label: 'हस्तांतर', color: '#6D5BD0' },
    writeoff: { label: 'माफ', color: '#5B6372' },
  };

  const html = `
<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${periodLabel}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Tiro+Devanagari+Marathi:ital@0;1&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: 'Tiro Devanagari Marathi', 'Noto Sans Devanagari', Inter, sans-serif;
      color: #1F2430;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #0F766E;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #0F766E;
      margin: 0;
    }
    .subtitle {
      font-size: 14px;
      color: #5B6372;
      margin-top: 4px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .card {
      border: 1px solid #E7E1D3;
      border-radius: 8px;
      padding: 10px 14px;
      background: #FBF8F1;
    }
    .card-label {
      font-size: 11px;
      color: #5B6372;
      font-weight: 600;
    }
    .card-value {
      font-size: 18px;
      font-weight: 700;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th {
      background: #F1EFE9;
      color: #1F2430;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid #E7E1D3;
      font-size: 12px;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #EAE5D9;
      font-size: 12px;
    }
    .text-right { text-align: right; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #FFF;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #E7E1D3;
      padding-top: 10px;
      font-size: 11px;
      color: #8C94A0;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">डिजिटल हिशोब वही</div>
      <div class="subtitle">${title} — ${periodLabel}</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #5B6372;">
      तयार केले: ${new Date().toLocaleDateString('mr-IN')}
    </div>
  </div>

  <div class="summary-grid">
    <div class="card">
      <div class="card-label">एकूण खर्च</div>
      <div class="card-value" style="color: #B42318;">${formatCurrency(summary.total_expense_paise)}</div>
    </div>
    <div class="card">
      <div class="card-label">एकूण जमा</div>
      <div class="card-value" style="color: #15803D;">${formatCurrency(summary.total_income_paise)}</div>
    </div>
    <div class="card">
      <div class="card-label">दिलेली उधारी</div>
      <div class="card-value" style="color: #B45309;">${formatCurrency(summary.total_lent_paise)}</div>
    </div>
    <div class="card">
      <div class="card-label">परत मिळालेले</div>
      <div class="card-value" style="color: #1D4ED8;">${formatCurrency(summary.total_repayment_paise)}</div>
    </div>
  </div>

  <h3 style="font-size: 14px; margin-bottom: 6px; color: #0F766E;">व्यवहार तपशील (${transactions.length} नोंदी)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">तारीख</th>
        <th style="width: 15%;">प्रकार</th>
        <th style="width: 20%;">तपशील / कारण</th>
        <th style="width: 20%;">खाते / वर्गवारी</th>
        <th style="width: 15%;" class="text-right">रक्कम</th>
      </tr>
    </thead>
    <tbody>
      ${transactions
        .map((tx) => {
          const typeMeta = typeLabelsMr[tx.type] || { label: tx.type, color: '#5B6372' };
          const accName = tx.account_id ? accMap.get(tx.account_id) || '' : '';
          const catName = tx.category_id ? catMap.get(tx.category_id) || '' : '';
          return `
          <tr>
            <td>${tx.local_date}</td>
            <td><span class="badge" style="background-color: ${typeMeta.color};">${typeMeta.label}</span></td>
            <td>${tx.reason || tx.counterparty_text || '-'}</td>
            <td>${catName || accName || '-'}</td>
            <td class="text-right" style="font-weight: 600;">${formatCurrency(tx.amount_paise)}</td>
          </tr>
        `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <div>डिजिटल हिशोब वही (Digital Hishob-Khata) — सोपी व विश्वासू कौटुंबिक वही</div>
    <div>पाने १ / १</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Generates person statement PDF for sharing on WhatsApp or printing.
 */
export function printPersonStatementPDF(
  personSummary: PersonSummary,
  transactions: Transaction[]
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download or print PDF');
    return;
  }

  const { person } = personSummary;

  const html = `
<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <title>हिशोब पत्रक - ${person.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Tiro+Devanagari+Marathi:ital@0;1&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: 'Tiro Devanagari Marathi', 'Noto Sans Devanagari', Inter, sans-serif;
      color: #1F2430;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 13px;
    }
    .header {
      border-bottom: 2px solid #0F766E;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .title { font-size: 20px; font-weight: 700; color: #0F766E; }
    .person-card {
      background: #FBF8F1;
      border: 1px solid #E7E1D3;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
    }
    .person-name { font-size: 18px; font-weight: 700; color: #1F2430; }
    .pending-box { text-align: right; }
    .pending-label { font-size: 12px; color: #5B6372; font-weight: 600; }
    .pending-amount { font-size: 24px; font-weight: 700; color: #B45309; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th {
      background: #F1EFE9;
      color: #1F2430;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid #E7E1D3;
      font-size: 12px;
    }
    td { padding: 8px 10px; border-bottom: 1px solid #EAE5D9; font-size: 12px; }
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">उधारी हिशोब पत्रक (Statement)</div>
    <div style="font-size: 12px; color: #5B6372; margin-top: 4px;">डिजिटल हिशोब वही</div>
  </div>

  <div class="person-card">
    <div>
      <div class="person-name">${person.name}</div>
      ${person.phone ? `<div style="font-size: 12px; color: #5B6372; margin-top: 4px;">फोन: ${person.phone}</div>` : ''}
      ${person.note ? `<div style="font-size: 12px; color: #5B6372;">नोंद: ${person.note}</div>` : ''}
    </div>
    <div class="pending-box">
      <div class="pending-label">एकूण येणे बाकी</div>
      <div class="pending-amount">${formatCurrency(personSummary.pending_paise)}</div>
    </div>
  </div>

  <h3 style="font-size: 14px; margin-bottom: 6px; color: #0F766E;">सर्व देवाण-घेवाण तपशील</h3>
  <table>
    <thead>
      <tr>
        <th>तारीख</th>
        <th>प्रकार</th>
        <th>कारण / तपशील</th>
        <th class="text-right">दिलेली उधारी</th>
        <th class="text-right">परत मिळालेले</th>
      </tr>
    </thead>
    <tbody>
      ${transactions
        .map((tx) => {
          const isLend = tx.type === 'lend';
          const isRepayment = tx.type === 'repayment';
          const isWriteOff = tx.type === 'writeoff';
          return `
          <tr>
            <td>${tx.local_date}</td>
            <td style="font-weight: 600; color: ${isLend ? '#B45309' : isRepayment ? '#1D4ED8' : '#5B6372'};">
              ${isLend ? 'उधारी दिली' : isRepayment ? 'परत मिळाले' : 'माफ केले'}
            </td>
            <td>${tx.reason || tx.note || '-'}</td>
            <td class="text-right" style="color: #B45309; font-weight: 600;">
              ${isLend ? formatCurrency(tx.amount_paise) : '-'}
            </td>
            <td class="text-right" style="color: #1D4ED8; font-weight: 600;">
              ${isRepayment || isWriteOff ? formatCurrency(tx.amount_paise) : '-'}
            </td>
          </tr>
        `;
        })
        .join('')}
    </tbody>
  </table>

  <div style="margin-top: 30px; font-size: 11px; color: #8C94A0; text-align: center;">
    डिजिटल हिशोब वही द्वारे तयार केलेले अधिकृत हिशोब पत्रक.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    }
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
