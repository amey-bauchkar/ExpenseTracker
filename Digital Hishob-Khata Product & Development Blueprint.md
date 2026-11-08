# Digital Hishob-Khata: Product & Development Blueprint

*Planning document. No code. Part 1 covers sections 1 to 6, Part 2 covers 7 to 14.*

---

## 1. Product Understanding

**What it is:** a digital हिसाब वही. One person, one notebook, every rupee that moves in daily life, with the app doing the arithmetic the notebook never could: balances, who owes what, monthly totals.

**Core purpose:** answer three questions in under five seconds each:

1. *Today, what did I spend, receive and give?*
2. *How much money do I have right now, and where (cash, bank, UPI)?*
3. *Who owes me money, and how much is still pending?*

**The one idea the whole app rests on:** there are **five kinds of money movement**, and only two of them are "real" income/expense.

| Kind | Marathi label | Moves balance? | Counts as expense/income? |
| --- | --- | --- | --- |
| Expense | खर्च | Decreases | Expense |
| Income (received) | जमा | Increases | Income |
| Lend (money given) | उधारी दिली | Decreases | **Neither**: creates a receivable |
| Repayment | परत मिळाले | Increases | **Neither**: reduces a receivable |
| Transfer | हस्तांतर | Net zero (moves between own accounts) | **Neither** |

Getting this table right is what separates a trustworthy ledger from a toy.

### Assumptions I am making (change any of these before we build)

1. **Single household, single main user** (father). Data belongs to one account. Family sharing is a later feature.
2. **Phone is Android** (most likely for this user). The app is a PWA installed to the home screen. iPhone works too, with minor limits noted in section 8.
3. **All amounts are INR**, stored as integer paise, displayed in Indian grouping (₹1,00,000).
4. **Money borrowed by father** (someone lends *him* money) is **out of scope for MVP**. The spec only covers money he lends. Section 2 flags this as a gap and V2 adds it as a mirror feature.
5. **No interest calculation** on loans. Udhaari is principal only. (Interest is a common real-world need, so it is a V2 candidate.)
6. **Overpayment on a loan is blocked** with a clear message. If someone returns more than owed, the excess is recorded separately as normal "received".
7. **Deleting is soft.** Nothing is truly erased for 30 days (a Trash screen).
8. **Marathi is the default UI language**, with English one tap away, and bilingual labels on primary buttons.
9. **Financial year** defaults to the calendar month for monthly views; yearly reports offer Jan to Dec or Apr to Mar (Indian FY) as a setting.

---

## 2. Complete Functional Requirements

### 2.1 Modules

**M1. Onboarding & Setup**

- Language pick (Marathi / English), first screen.
- Create accounts (defaults: Cash, Bank, UPI) with opening balances and an "as of" date.
- PIN setup (optional, skippable).

**M2. Quick Add (the heart of the app)**

- One large **+** button available everywhere, opening a 4-tile chooser: खर्च / जमा / उधारी / हस्तांतर.
- Amount-first entry with a big custom numeric keypad (no phone keyboard needed for the main path).
- Category chips with recent/most-used first; person chips with recent first; account chip defaulting to the last used (or Cash).
- Date/time default to now; one tap on "Today / Yesterday / Pick date".
- Save returns to the previous screen with an **Undo** toast.

**M3. Expenses**: amount, category, date, time, note, account (payment method), optional person/shop, optional receipt.

**M4. Money Received**: amount, from whom, date/time, reason, account, notes. A toggle at the top: **"नवीन जमा" (new income)** or **"उधारी परत (repayment)"**. If repayment, pick the person, then pick *which loan* (or auto-apply to oldest, see 2.3).

**M5. Money Given (Udhaari)**: person, amount, date, reason, account, notes. Auto-computed: returned total, remaining, status (Pending / Partially returned / Fully returned).

**M6. People & Udhaari**: person list sorted by amount pending; person detail with every loan, every repayment, and a running statement; "Total to receive" banner.

**M7. Accounts & Transfers**: account list with balances, transfers between accounts, account-wise statement.

**M8. Dashboard** (date selector, today's totals, balance, month summary, pending to receive).

**M9. History**: date-grouped list, search, filters (date range, type, category, person, account), detail sheet, edit, delete.

**M10. Reports**: daily, weekly, monthly, yearly, person statement. PDF and Excel/CSV export.

**M11. Categories**: add, rename, recolor, choose icon, archive/delete.

**M12. Settings**: language, currency, opening balances, accounts, categories, backup/restore, export, theme, app lock, trash, data management.

**M13. Data Safety**: offline-first storage, sync, backup, restore, trash, audit trail.

### 2.2 Gaps in the original requirements (and what I recommend)

| Gap | Why it matters | Recommendation |
| --- | --- | --- |
| **Borrowing** (father takes money from someone) | Real life is two-sided; "received" can mean income, repayment or borrowed money. | MVP: not included. V2: add "Money Taken (घेतले)" with its own payable tracking, mirror of lending. |
| **Write-off / forgiven loan** | A friend will never repay ₹500. Leaving it pending forever pollutes "pending" totals. | Add "Write off" action on a loan: a non-cash record that closes the remaining balance. Not counted as expense by default (shown separately as "written off"). V1.1, small effort. |
| **Editing a loan that already has repayments** | Reducing the loan below what was returned breaks balances. | Validate: new amount must be ≥ total returned. |
| **Deleting a loan that has repayments** | Orphans repayments. | Block, and offer "delete loan *and* its repayments" with a strong confirmation listing what disappears. |
| **Deleting a repayment** | Reopens the loan. | Allowed; loan status recomputes automatically. |
| **Edit/delete of past dates** | Balances for those days change. | Fine, because balances are *always computed from the ledger*, never stored. |
| **Back-dated entries** | Father may enter yesterday's notebook entries. | Date picker with Yesterday shortcut; no restriction. |
| **Same-name people** | Two "Ramesh"s. | Optional phone/note field to tell apart; duplicate-name warning; merge people (V2). |
| **Partial/"split" payment methods** | Rare. | Not supported. One transaction = one account. |
| **Loan given in kind or due dates** | "Return by Diwali". | Optional **expected return date** on a loan (MVP field, reminder in V2). |
| **Opening balance date** | Balances must start somewhere. | Per-account opening balance with an "as of" date. |
| **Large-number readability** | ₹125000 is easy to misread. | Always Indian grouping, and echo the amount in words (Marathi/English) on the confirm step for amounts ≥ ₹10,000. |
| **Wrong amount typed** | A 0 too many is the top real-world error. | Amount echo in words, Undo toast, easy edit. |
| **Data entered on two devices** | Father + you both entering. | Supported via sync (section 9), last-write-wins per record. |
| **Marathi numerals (१२३)** | Some users prefer them. | Setting: Latin digits (default) or Devanagari digits. |
| **Privacy** | Financial data. | App lock (PIN), encrypted transport, per-user row security. |

### 2.3 Repayment application rule

When a person has **multiple open loans** and returns money, the user chooses one of:

- **Apply to a specific loan** (default if they open the repayment from that loan's page), or
- **Apply to oldest first** (default when starting from "Received → Repayment"; the app shows the split before saving).

Under the hood each repayment row links to **exactly one loan**. An "oldest first" payment that spans two loans simply creates two linked repayment rows inside one save. This keeps every loan's math independent and simple.

---

## 3. User Personas & Journeys

### Persona: Baba (primary user)

- Age 55+, comfortable with WhatsApp and UPI apps, not comfortable with menus, settings, or English finance terms.
- Mental model: *the notebook*. Date at the top, lines of entries, a total at the bottom.
- Fears: losing data, pressing something wrong, "it changed my numbers".
- Wants: speed (entries made standing at the vegetable seller), certainty ("is the total right?").

### Persona: You (admin / helper)

- Sets up the app, accounts and opening balances, installs on the phone, handles backups, occasionally reviews data from your own phone.

### Journey A: Expense at the vegetable seller (target: 4 taps, under 10 seconds)

1. Open app (PIN if enabled). Dashboard shows.
2. Tap **खर्च**. Keypad appears, cursor in amount.
3. Type **250**. Below it: the echo "दोनशे पन्नास रुपये".
4. Tap chip **भाजीपाला** (it is first because he uses it most).
5. Tap **जतन करा / Save**. Toast: "₹250 भाजीपाला जतन झाले. \[रद्द करा\]". Back on dashboard, today's expense has updated.

### Journey B: Receiving money

1. Tap **जमा** then type **₹30,000**.
2. Choose type: **नवीन जमा** (new income), pick source chip "भाडे / Rent" or type a name.
3. Account chip: Bank. Save.

### Journey C: Lending money

1. Tap **उधारी**. Type **10,000**.
2. Tap person chip **रमेश** (or "+ नवीन व्यक्ती", typing a name once).
3. Optional reason: "घर दुरुस्ती". Account: Bank. Save.
4. In People & Udhaari, Ramesh now shows **₹10,000 बाकी**.

### Journey D: Recording a repayment (Ramesh returns ₹2,000 on Nov 10)

- **Fast path:** People & Udhaari, tap Ramesh, tap the big green **परत मिळाले** button, type 2,000, account Cash, Save. Loan shows: Returned ₹2,000, Pending ₹8,000, status *Partially returned*.
- **Alternate path:** Tap **जमा**, switch to **उधारी परत**, choose Ramesh. The app auto-selects his open loan.
- After Nov 15 (₹3,000) and Nov 20 (₹1,000): Returned ₹6,000, Pending ₹4,000.

### Journey E: "What happened on 12th?"

History tab, date jumps via the calendar strip, entries grouped under that date with a day total at the bottom, exactly like a notebook page.

### Journey F: Month end

Reports tab, Monthly, tap **PDF** then share to WhatsApp.

---

## 4. Screen-by-Screen Plan

### 4.1 Navigation (bottom bar, 4 tabs + central button)

**मुख्य (Home) · इतिहास (History) · \[ + \] · व्यक्ती / उधारी (People) · अहवाल (Reports)**

Settings sits behind a gear icon on Home (top right). Four tabs is the maximum for this audience, and the **+** is a large floating action button in the middle of the bar, always reachable by thumb.

### 4.2 Screens

**S1. Language & Welcome** (first run). Two huge buttons: मराठी / English.

**S2. Setup wizard** (3 steps). Accounts and opening balances; optional PIN; optional first categories review. Each step skippable.

**S3. Home / Dashboard**

- Top: date selector ("आज, ८ नोव्हेंबर" with ◀ ▶ arrows and tap-to-open calendar).
- **Balance card:** "आता उपलब्ध रक्कम" large number, with a tap to expand account-wise (Cash / Bank / UPI).
- **Today row (4 compact tiles):** खर्च, जमा, उधारी दिली, परत मिळाले.
- **Net for the day** one line (green/red).
- **Pending to receive** card: total with tap leading to People.
- **This month** card: total expense plus a mini bar by category (top 3).
- Last 5 entries of the selected day, with "सर्व पहा" link.

**S4. Quick Add (bottom sheet, full height)** Four-tile chooser, then the entry form (see 5.6).

**S5. History**

- Sticky search bar and a filter button (badge shows active filters).
- Date section headers with day net total.
- Row: icon, category/person, note preview, amount (colored by type, with +/− and type tag).
- Pull-to-refresh sync status; empty state with friendly text.

**S6. Filter sheet**: date range presets (Today, This week, This month, Custom), type multi-select, category, person, account, amount range (V2).

**S7. Transaction detail (bottom sheet)**: all fields, linked loan (tap to open), receipt thumbnail, created/edited timestamps, **Edit** and **Delete** buttons.

**S8. People & Udhaari (list)**

- Header: "एकूण येणे बाकी ₹X".
- Segmented: **बाकी (Pending)** · **सर्व (All)** · **पूर्ण (Settled)**.
- Person rows: name, pending amount, status chip, last activity date.
- Search and **+ व्यक्ती**.

**S9. Person detail**

- Summary: Total given, Total returned, **Pending**.
- Two big buttons: **उधारी दिली** and **परत मिळाले**.
- List of loans (each: date, reason, amount, returned, remaining, status chip), expandable to show its repayments.
- **Statement** view (chronological ledger with running balance), and "Share statement (PDF)".

**S10. Loan detail**: original amount, repayments list with dates, remaining, progress bar, expected return date, **Write off** (V1.1), edit, delete.

**S11. Accounts**: balance per account, "Transfer" button, account statement, add/rename/archive.

**S12. Transfer form**: from, to, amount, date, note.

**S13. Reports hub**: tabs Daily / Weekly / Monthly / Yearly, a date or period selector, summary cards, charts, category table, Export (PDF / Excel / CSV) button.

**S14. Categories manager**: list with icon and color, drag order, add/edit sheet (name Marathi + English, icon grid, color), archive/delete (if used, offer "archive" or "move entries to…").

**S15. Settings**: Language, Theme (Light / Dark / Auto), Text size (Normal / Large / Extra large), Digits (123 / १२३), Currency, Financial year start, App lock, Accounts, Categories, Backup & Restore, Export, Trash, About/Version, Logout.

**S16. Backup & Restore**: last cloud sync time, "Download backup file" (JSON), "Restore from file" (with a preview of what will change and a confirmation).

**S17. Trash**: deleted items for 30 days, restore button each.

**S18. Lock screen**: PIN pad (4 to 6 digits), "forgot PIN" resets via re-login.

**S19. Login** (rarely seen, since sessions persist): email and password or magic link.

### 4.3 Reusable components

AmountInput (custom keypad, Indian grouping, words echo) · ChipPicker (categories, people, accounts) · TransactionRow · DayHeader · StatusChip · SummaryTile · ConfirmDialog (type-aware, shows consequences) · UndoToast · EmptyState · SyncBadge (✓ synced, ⟳ syncing, ⚠ pending offline) · DateStrip.

---

## 5. UI/UX Design Direction

### 5.1 Visual direction

**"Warm ledger":** a paper-and-ink feel rather than cold banking-blue. Off-white page, dark ink text, generous whitespace, soft cards with thin borders (not heavy shadows), rounded corners. Subtle ruled-line motif on History day headers as a nod to the physical वही. Trustworthy and calm; no gradients or neon.

### 5.2 Color palette (light)

| Role | Color | Hex |
| --- | --- | --- |
| Background (paper) | Warm off-white | `#FBF8F1` |
| Surface (cards) | White | `#FFFFFF` |
| Ink (text) | Deep charcoal | `#1F2430` |
| Muted text | Slate | `#5B6372` |
| Primary | Deep teal | `#0F766E` |
| Expense | Brick red | `#B42318` |
| Received | Green | `#15803D` |
| Lent (udhaari) | Amber/ochre | `#B45309` |
| Repayment | Blue | `#1D4ED8` |
| Transfer | Grey-violet | `#6D5BD0` |
| Border | Warm grey | `#E7E1D3` |

**Rule:** every transaction type has one fixed color *and* a distinct icon and text tag, so color is never the only signal (accessibility). Dark theme inverts surfaces (`#14171C` background, `#1D2128` cards) and lightens the type colors.

### 5.3 Typography

- **Devanagari:** Noto Sans Devanagari. **Latin and numbers:** Inter (tabular numerals for alignment).
- Base size **18px** (large), amounts **28 to 36px bold**, section titles 20px semibold. A text-size setting scales everything (Normal 100%, Large 115%, Extra 130%).
- Marathi labels first, English smaller beneath on primary buttons (bilingual mode).

### 5.4 Component styles

- Minimum tap target **56px** high; primary buttons **64px** and full width.
- Radius 16px on cards, 12px on inputs/chips, full pill on chips.
- One primary action per screen. Destructive actions are red, outlined, and never adjacent to the primary action.
- Icons always with labels. Line-style icons (Lucide), 24px.
- Haptic tick on save (where supported) and a visible success state.

### 5.5 Mobile layout and dashboard structure

Single column, 16px side padding, bottom navigation 64px high, content scrolls under a sticky top date bar. Dashboard order is strictly: **Balance → Today's four tiles → Pending → Month → Recent**. Nothing else.

### 5.6 Transaction form design (same skeleton for all types)

1. Type tab strip at top (tinted with that type's color).
2. **Giant amount display** (₹ 0), words echo beneath.
3. Chip row: **Category** (or **Person** for lend and repayment, **From whom** for income). Recent first, "सर्व / More" opens a grid.
4. Chip row: **Account** (last used preselected).
5. Collapsed line: **Date: आज · Note · Receipt** (tap to expand; most entries never open it).
6. Custom numeric keypad (bottom third) with a green **जतन करा / Save** key.

Result: the common expense is amount, one chip, Save.

---

## 6. Database Schema

**Engine:** PostgreSQL (server, via Supabase) mirrored by IndexedDB (client, via Dexie) with the same table shapes.

### 6.1 Design principles

1. **Money is integer paise** (`bigint`), never float.
2. **Balances are never stored.** They are derived from the ledger. This single rule eliminates most accounting bugs.
3. **Client-generated UUIDs** (v7 or v4) as primary keys, so offline entry and idempotent sync are trivial.
4. **Soft delete** (`deleted_at`) plus `updated_at` on every table, which makes sync and Trash simple.
5. **One ledger table** for all money movement, with a `type` enum. Loan linkage is a self-reference.

### 6.2 Tables

**`profiles`** (one per auth user; Supabase `auth.users` holds credentials)

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid PK | = auth.users.id |
| display\_name | text |  |
| created\_at | timestamptz |  |

**`settings`** (one row per user)

| Field | Type | Notes |
| --- | --- | --- |
| user\_id | uuid PK, FK profiles |  |
| language | text | `mr` or `en`, default `mr` |
| currency | text | default `INR` |
| theme | text | `light`/`dark`/`auto` |
| text\_scale | smallint | 100/115/130 |
| digits | text | `latin`/`devanagari` |
| fy\_start\_month | smallint | 1 or 4 |
| updated\_at | timestamptz |  |

(App-lock PIN is **never** stored on the server; it lives hashed on the device only.)

**`accounts`**

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid PK |  |
| user\_id | uuid FK |  |
| name | text | "Cash", "SBI Bank", "PhonePe" |
| kind | text | `cash`/`bank`/`upi`/`other` |
| opening\_balance\_paise | bigint | default 0, may be 0 but not null |
| opening\_date | date | balance counts from this date |
| sort\_order | int |  |
| archived\_at | timestamptz null | hide, don't delete |
| created\_at, updated\_at, deleted\_at | timestamptz |  |

**`categories`**

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid PK |  |
| user\_id | uuid FK |  |
| name\_mr, name\_en | text | one may be empty; display falls back |
| icon | text | icon key |
| color | text | hex |
| sort\_order | int |  |
| is\_default | bool | seeded rows (editable, still deletable) |
| archived\_at, created\_at, updated\_at, deleted\_at |  |  |

Only **expense** categories exist in MVP. Income uses a separate small list (`income_source` free text plus suggestions) to keep things simple.

**`people`**

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid PK |  |
| user\_id | uuid FK |  |
| name | text | required |
| phone | text null | for telling apart / calling |
| note | text null | "cousin, Pune" |
| created\_at, updated\_at, deleted\_at |  |  |

Index: `(user_id, lower(name))`. Duplicate names allowed with a warning.

**`transactions`** (the ledger)

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid PK | client generated |
| user\_id | uuid FK |  |
| type | enum | `expense`, `income`, `lend`, `repayment`, `transfer`, `writeoff` |
| amount\_paise | bigint | **> 0 always**, direction comes from `type` |
| occurred\_at | timestamptz | when it happened (user-editable) |
| local\_date | date | the calendar day in the user's timezone (for grouping, indexed) |
| account\_id | uuid FK null | the account money leaves/enters; null only for `writeoff` |
| to\_account\_id | uuid FK null | only for `transfer` |
| category\_id | uuid FK null | `expense` only |
| person\_id | uuid FK null | required for `lend`, `repayment`, `writeoff`; optional for expense (shop) |
| counterparty\_text | text null | free-text source for `income`, shop name |
| loan\_id | uuid FK null | self-reference to a `lend` transaction; required for `repayment`, `writeoff` |
| reason | text null |  |
| note | text null |  |
| expected\_return\_date | date null | `lend` only |
| receipt\_path | text null | storage object key (V2) |
| created\_at, updated\_at, deleted\_at | timestamptz |  |
| device\_id | text null | for diagnostics |

**Constraints (CHECK / triggers):**

- `amount_paise > 0`.
- `type='expense'` requires `account_id`, `category_id` not required (uncategorised allowed, shows as "इतर").
- `type in ('lend','repayment')` requires `person_id` and `account_id`.
- `type='repayment'` or `'writeoff'` requires `loan_id` pointing to a row with `type='lend'` **and the same person\_id**.
- `type='transfer'` requires `account_id <> to_account_id`, both non-null.
- `type='income'` and `'expense'` forbid `loan_id`.
- **Over-repayment guard:** a trigger (server) and a validator (client) reject a repayment/writeoff if `sum(repayments + writeoffs) + new > lend.amount_paise`.
- Lend rows cannot be hard-deleted while active repayments exist (soft delete cascades only through the explicit "delete loan and repayments" action).

**Indexes:**

- `(user_id, local_date desc)`: History and daily views.
- `(user_id, type, local_date)`: reports.
- `(user_id, person_id, occurred_at)`: statements.
- `(user_id, loan_id)` partial where `loan_id is not null`: loan math.
- `(user_id, category_id, local_date)`: category reports.
- `(user_id, account_id)`: account balances.
- `(user_id, updated_at)`: sync pull cursor.
- Optional `pg_trgm` GIN on `(reason, note, counterparty_text)` for search (client search can simply scan IndexedDB, which is fine at household scale).

**`loans` is intentionally not a separate table.** A loan *is* a `lend` transaction. Returned, remaining and status are **derived** (view/function), so they cannot drift out of sync with repayments.

**`loan_summary` (SQL view; mirrored as a client-side function)**

```
loan_id, person_id, amount_paise,
returned_paise  = sum(repayment.amount) not deleted,
writtenoff_paise= sum(writeoff.amount) not deleted,
remaining_paise = amount - returned - writtenoff,
status = case when remaining = 0 then 'fully_returned'
              when returned + writtenoff > 0 then 'partially_returned'
              else 'pending' end
```

**`audit_log`** (append-only, V1.1): `id, user_id, entity, entity_id, action, before jsonb, after jsonb, at`. Powers "who changed what" and recovery from mistaken edits.

### 6.3 Relationships

```
auth.users 1—1 profiles 1—1 settings
profiles 1—* accounts, categories, people, transactions
transactions *—1 accounts (account_id, to_account_id)
transactions *—1 categories
transactions *—1 people
transactions(repayment|writeoff) *—1 transactions(lend)   -- loan_id
```

### 6.4 Security (row level)

Supabase RLS on every table: `user_id = auth.uid()` for select/insert/update/delete. Deletes from the app are updates to `deleted_at`.

### 6.5 Seed data

On first run, insert default categories (the 14 listed in your brief with Marathi and English names and icons), default accounts (Cash, Bank, UPI), and default settings.

---

# Part 2

## 7. Financial Calculation Architecture

### 7.1 Sign rules (per account, all amounts stored positive)

| Type | Effect on `account_id` | Effect on `to_account_id` | Receivable (udhaari) |
| --- | --- | --- | --- |
| expense | − amount | none | none |
| income | + amount | none | none |
| lend | − amount | none | + amount (on that loan) |
| repayment | + amount | none | − amount (on `loan_id`) |
| transfer | − amount | + amount | none |
| writeoff | none (no cash) | none | − amount (on `loan_id`) |

All formulas exclude rows where `deleted_at` is not null.

### 7.2 Formulas

**Account balance as of end of day D**

```
balance(acc, D) = acc.opening_balance
  + Σ income        (account_id = acc, date ≤ D)
  + Σ repayment     (account_id = acc, date ≤ D)
  + Σ transfer in   (to_account_id = acc, date ≤ D)
  − Σ expense       (account_id = acc, date ≤ D)
  − Σ lend          (account_id = acc, date ≤ D)
  − Σ transfer out  (account_id = acc, date ≤ D)
```

Only rows with `date ≥ acc.opening_date` count. Transactions dated before the opening date are rejected at entry (or the app offers to move the opening date).

**Available balance** = Σ balance over all non-archived accounts. Transfers cancel out exactly, which is a built-in self-check.

**Daily balance**: *Opening of day D* = available balance at end of D−1. *Closing of day D* = available balance at end of D. Closing − Opening = the day's net cash flow.

**Total expenses (period)** = Σ `expense` only. **Total income (period)** = Σ `income` only. Repayments and lends are never in either number.

**Total amount lent (period)** = Σ `lend` dated in the period. **Total repayments (period)** = Σ `repayment` dated in the period.

**Per loan:** `returned = Σ repayment(loan_id)`, `written_off = Σ writeoff(loan_id)`, `remaining = amount − returned − written_off`.

**Outstanding (as of date D)** = Σ over loans with `lend.date ≤ D` of (amount − repayments dated ≤ D − writeoffs dated ≤ D). The dashboard uses "as of today", but a past-date dashboard uses that date, so history stays accurate.

**Net cash flow (period)** = income + repayments − expenses − lends (transfers net to zero). Shown as one line so the user can see why the balance moved, even though income and expense totals stay "pure".

**Net position (optional card, V2)** = available balance + outstanding, meaning "what I have plus what I'm owed".

**Monthly cash flow** = the same net cash flow formula over the month, plus a bar view of its four components.

### 7.3 Worked example (November)

Opening (as of Nov 1): Cash ₹20,000, Bank ₹50,000. Total **₹70,000**.

| Date | Event | Cash | Bank | Total | Ramesh owes |
| --- | --- | --- | --- | --- | --- |
| Nov 1 | Opening | 20,000 | 50,000 | 70,000 | 0 |
| Nov 2 | Expense ₹250 vegetables (cash) | 19,750 | 50,000 | 69,750 | 0 |
| Nov 2 | Lend ₹10,000 to Ramesh (bank) | 19,750 | 40,000 | 59,750 | 10,000 |
| Nov 3 | Income ₹30,000 (bank) | 19,750 | 70,000 | 89,750 | 10,000 |
| Nov 4 | Transfer ₹5,000 bank to cash | 24,750 | 65,000 | 89,750 | 10,000 |
| Nov 10 | Repayment ₹2,000 (cash) | 26,750 | 65,000 | 91,750 | 8,000 |
| Nov 15 | Repayment ₹3,000 (bank) | 26,750 | 68,000 | 94,750 | 5,000 |
| Nov 20 | Repayment ₹1,000 (cash) | 27,750 | 68,000 | 95,750 | 4,000 |

**Month results**

- Total expenses: **₹250**. Total income: **₹30,000**.
- Total lent: **₹10,000**. Total repayments: **₹6,000**.
- Ramesh: original ₹10,000, returned ₹6,000, remaining **₹4,000**, status **Partially returned**.
- Net cash flow = 30,000 + 6,000 − 250 − 10,000 = **+₹25,750**.
- Check: 70,000 + 25,750 = **95,750**, which equals the closing available balance. ✓
- Net position = 95,750 + 4,000 = ₹99,750.
- Mistakes avoided: treating the ₹10,000 lend as an expense would show expenses of ₹10,250, and treating the ₹6,000 as income would show income of ₹36,000. Both are wrong.

### 7.4 Validation rules

1. `amount_paise` is a positive integer; the entry UI caps at ₹9,99,99,999.
2. A repayment cannot exceed the loan's remaining amount (clear Marathi/English message).
3. A repayment's date cannot be before its loan's date.
4. Editing a lend amount: the new amount must be ≥ returned + written off.
5. Editing a lend's person: blocked if repayments exist.
6. Transfer accounts must differ.
7. A repayment's person must equal its loan's person (enforced by a DB trigger and, in the UI, by construction).
8. An account balance may go negative (real life happens): show a gentle warning on save, don't block.
9. **Reconciliation self-check** (runs in tests and on a hidden diagnostics screen): Σ account balances = Σ opening + income + repayments − expenses − lends, and Σ loan remaining = Σ lends − Σ repayments − Σ writeoffs. Any difference signals a bug.

### 7.5 Where calculation runs

On the **client**, from IndexedDB, so everything works offline and instantly. SQL views on the server exist for export, backups and cross-checking, and **tests assert that client and server agree** on the same dataset.

---

## 8. Recommended Technology Stack

### 8.1 Options compared

| Option | Offline | Consistency | Security | Cost | Effort | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **A. React PWA + IndexedDB (Dexie) + Supabase (Postgres, Auth, RLS)** | Excellent | Strong (SQL, constraints) | Strong (RLS) | Free to about $25/mo | Low to medium | **Chosen** |
| B. React PWA + Node/Express + MongoDB | Needs custom sync | Weaker (no FK/constraints) | You build auth | Server + DB hosting | Highest | Rejected: more code to own for no benefit; ledger data is relational |
| C. React Native / Flutter + SQLite | Excellent | Strong | Medium | Dev account + store fees | Highest | Overkill; app-store friction for a family app |
| D. Local-only PWA, no backend | Excellent | Strong | Device-only | Free | Lowest | Rejected: one lost phone means total loss |
| E. Firebase | Good | Weak for relational/aggregates | Good | Pay-as-you-go | Medium | Rejected: a ledger needs relational integrity |

Express and MongoDB are deliberately **not** chosen. Money relationships (loan to repayments, transfers between accounts) need foreign keys and check constraints, which Postgres gives for free. Supabase replaces the custom Node/Express backend, which removes a whole server to deploy and secure.

### 8.2 The stack (decisions, not menus)

| Layer | Choice | Why |
| --- | --- | --- |
| UI | **React 18 + TypeScript + Vite** | You know it; strict types protect money logic. |
| Styling | **Tailwind CSS** plus a small custom component set (shadcn/ui primitives where useful) | Fast, consistent, easy large-touch theming. |
| PWA | **vite-plugin-pwa (Workbox)** | Installable, offline shell, update prompt. |
| Routing | **React Router** | Standard, simple. |
| Local DB | **Dexie (IndexedDB)** | Reliable offline store, indexed queries, simple API. |
| State | Dexie `useLiveQuery` plus a small Zustand store for UI state | The local DB is the source of truth; screens update live. No server-state cache needed. |
| i18n | **react-i18next** (mr, en) | Mature; bilingual labels are easy. |
| Forms/validation | **React Hook Form + Zod** (schemas shared with the sync layer) | Same validation at entry and when applying server data. |
| Charts | **Recharts** | Simple bar/line/donut, responsive. |
| Dates | **date-fns** | Small, tree-shakable. |
| IDs | **uuid v7** | Time-ordered, client-generated. |
| Money | Integer paise plus a small helper module (no floats, ever) | Prevents rounding errors. |
| Backend | **Supabase**: Postgres, Auth, Row Level Security, Storage (receipts, V2), a couple of SQL RPC functions for sync | No custom server. |
| PDF | **pdf-lib or jsPDF** with embedded **Noto Sans Devanagari** | Marathi text in PDFs breaks without an embedded font; test this early. |
| Excel/CSV | **SheetJS (xlsx)** | Client-side export, works offline. |
| Hosting | **Vercel or Cloudflare Pages** (static PWA) | Free tier, HTTPS, easy deploys. |
| Testing | **Vitest** (unit, calculations), **React Testing Library**, **Playwright** (E2E, offline, mobile viewport), **fake-indexeddb**, **fast-check** | See section 11. |
| Monitoring | **Sentry** free tier | Catches silent failures on father's phone. |

### 8.3 Cost

Free tiers cover this app comfortably at household scale. Two real caveats: (1) Supabase free projects **pause after about a week of inactivity** and have **no automatic backups**; (2) Pro (about $25/month) adds daily backups. **Recommendation:** start free, add the independent backup job in 9.6 from day one, and move to Pro once the family relies on it heavily.

### 8.4 PWA vs native

PWA wins: no store review, instant updates, one codebase, installs from a link. Android Chrome gives full install, offline support and (later) the Web Speech API in Marathi. **iPhone limits:** no reliable background sync (we sync on open and on reconnect), and storage can be evicted if the app goes unused for a long time (mitigated by cloud sync and by requesting persistent storage). If store distribution is ever needed, **Capacitor** can wrap the same code later.

---

## 9. System Architecture

### 9.1 Overview

```
+--------------------------- Phone (PWA) ---------------------------+
|  React UI (Marathi/English)                                       |
|     |                                                             |
|  Domain layer (TS): money utils, ledger rules, loan math, reports |
|     |                                                             |
|  Dexie / IndexedDB  <-- source of truth for the UI                |
|     |        ^                                                    |
|  Outbox (pending changes)   Pull cursor                           |
|     |        ^                                                    |
|  Sync engine (online / app open / foreground triggers)            |
+-----|--------|----------------------------------------------------+
      | HTTPS  |
+-----v--------+----------------------------------------------------+
|  Supabase                                                         |
|   Auth (email)   RLS policies   Postgres (ledger tables + views)  |
|   RPC: push_changes(batch), pull_changes(cursor)                  |
|   Storage (receipts, V2)       Daily backups (Pro)                |
+-----------------------------------------------------------------+
      |
      v   Independent weekly backup job (GitHub Actions pg_dump to private storage)
```

### 9.2 Local-first principle

Every screen reads from Dexie and every save writes to Dexie **first**, then enqueues an outbox item. The app never waits for the network. Online and offline look identical to the user, apart from a small sync badge.

### 9.3 Sync design (simple and safe)

- **Records:** each row has `id` (client uuid), `updated_at`, `deleted_at`, and a server-assigned `server_seq` (monotonically increasing bigint).
- **Push:** the outbox holds changed rows (whole-row upserts). The client calls `push_changes(rows[])`, a Postgres RPC that, in a single transaction, upserts each row **by id** (this is what prevents duplicates on retries) after running the same constraint checks, and returns the accepted `server_seq` values. Rejected rows return an error code and stay in the outbox with a visible "needs attention" state.
- **Pull:** the client asks `pull_changes(since_server_seq)`, applies the rows to Dexie in one transaction, and stores the new cursor.
- **Conflicts:** last-writer-wins per row using `updated_at` (`server_seq` breaks ties). With one primary user, true conflicts are rare. Soft-delete tombstones propagate deletions. When a transaction is edited on two devices offline, the later edit wins and an `audit_log` entry preserves the earlier version.
- **Ordering:** push order is people/accounts/categories, then lends, then repayments, so foreign keys resolve. The server defers FK checks to the end of the transaction.
- **Triggers:** app open, regained connectivity (the `online` event), after each save (debounced), and a manual "Sync now" button. Background Sync is used where available, never relied upon.
- **Idempotency:** retrying the same batch is harmless because of upsert-by-id.

### 9.4 Authentication

Supabase Auth with **email and password**, set up once by you on father's phone (the session persists for months via refresh tokens, so he never sees a login again). Magic link as a fallback. On top of that, an optional **local PIN** (stored as a salted hash in IndexedDB, never sent to the server) locks the UI; V2 adds biometrics through WebAuthn. Forgot PIN: re-enter the account password.

### 9.5 Security

HTTPS only; RLS on every table; anon key only in the client (never the service-role key); strict CSP; no financial data in logs or Sentry (scrub amounts and names); private receipts bucket with signed URLs; local throttling of PIN attempts. Optional later: client-side encryption of notes (not MVP, since it adds recovery risk).

### 9.6 Backup and restore (three independent layers)

1. **Live cloud copy** (Supabase) of everything via sync.
2. **JSON/Excel snapshot** from the app: a monthly prompt ("Save this month's हिसाब") plus a manual "Download backup" in Settings. Restore reads this file, shows a **preview** ("will add 12, update 3, skip 400"), and merges by id, never blindly overwriting.
3. **Server-side scheduled dump:** a weekly GitHub Actions job running `pg_dump` to a private bucket (or Supabase Pro daily backups), plus a keep-alive ping so a free project is never paused.

Plus the in-app **Trash** (30 days) for accidental deletes.

---

## 10. Development Roadmap

Target: one developer, roughly 8 to 10 weeks of focused part-time work.

### Phase 1: Project setup and architecture (3 to 4 days)

- **Deliverables:** Vite + React + TS + Tailwind repo, installable PWA shell, folder structure (`/domain`, `/db`, `/sync`, `/ui`, `/i18n`), CI (lint, typecheck, unit tests), Supabase project and environments, design tokens, Devanagari fonts, i18n scaffold, routing with the 4-tab shell, **a Devanagari PDF spike**.
- **Dependencies:** none.
- **Acceptance:** the app installs on an Android phone, opens offline to an empty shell, switches Marathi/English, a Marathi PDF renders correctly, CI is green.

### Phase 2: Database and core data layer (about 1 week)

- **Deliverables:** Postgres schema, RLS, triggers (over-repayment, linkage), seed data; Dexie schema; money utilities; the **domain module** for balances, loan summary and reports (pure functions); repositories (create/update/soft-delete) with Zod validation.
- **Dependencies:** Phase 1.
- **Acceptance:** the section 7.3 example is reproduced by unit tests to the paisa; constraint violations are rejected; RLS verified with two test users.

### Phase 3: Dashboard and transaction management (about 1.5 weeks)

- **Deliverables:** setup wizard, accounts with opening balances, Quick Add (expense, income, transfer), categories manager, Dashboard with date selector, History with grouping, search, filters, detail sheet, edit, delete with Undo and Trash.
- **Dependencies:** Phase 2.
- **Acceptance:** an expense takes 4 taps or fewer; dashboard totals match the domain tests; edit/delete update balances instantly; first usability session with Baba.

### Phase 4: People and lending management (about 1.5 weeks)

- **Deliverables:** People list/detail, lend flow, repayment flow (from person, from loan, and from "Received"), oldest-first allocation across multiple loans, loan detail, statuses, expected return date, write-off, person statement, edit/delete guards.
- **Dependencies:** Phase 3.
- **Acceptance:** the Ramesh scenario matches exactly; a repayment never appears in income or expense; over-repayment is blocked; edit/delete guards behave as specified.

### Phase 5: Reports and analytics (about 1.5 weeks)

- **Deliverables:** daily/weekly/monthly/yearly reports, charts, month-over-month comparison, person statement, PDF (with Marathi), Excel/CSV export.
- **Dependencies:** Phases 2 to 4.
- **Acceptance:** report totals equal dashboard totals for the same period; the PDF renders Devanagari correctly and opens from WhatsApp; Excel opens with correct columns and numeric cells (not text).

### Phase 6: Offline support and synchronization (about 1.5 weeks)

- **Deliverables:** outbox, push/pull RPCs, cursor handling, sync badge, retry with backoff, "needs attention" screen, auth session handling, backup/restore files, persistent-storage request.
- **Dependencies:** Phases 2 to 5 (needs a stable data model).
- **Acceptance:** 100 entries made in airplane mode sync with no duplicates after reconnect; two devices converge; killing the app mid-sync loses nothing.

### Phase 7: Testing, security, and reliability (about 1 week)

- **Deliverables:** the full test suite (section 11), RLS audit, Sentry, error boundaries, backup job, restore rehearsal, performance pass (10,000 transactions), accessibility pass.
- **Dependencies:** all prior phases.
- **Acceptance:** all tests green; restoring a backup on a fresh device reproduces identical balances; Lighthouse PWA and accessibility scores of 90 or more.

### Phase 8: Deployment and final polish (4 to 5 days)

- **Deliverables:** production deploy, PIN lock, empty states and a Marathi microcopy review (ideally by a native speaker), onboarding with Baba, README and runbook (how to restore, how to rotate keys).
- **Dependencies:** Phase 7.
- **Acceptance:** Baba completes the six journeys unaided; one week of real use shows zero discrepancies against his notebook.

---

## 11. Testing Strategy

### 11.1 Unit tests (Vitest)

Money helpers (parse, Indian-grouping format, amount in words in Marathi and English), date bucketing (`local_date`, week start Monday, month and financial-year boundaries, IST), validators, loan summary, balance calculators, report aggregators, and i18n key coverage (every key has both mr and en).

### 11.2 Financial calculation tests (the most important suite)

- The section 7.3 scenario as a golden test, plus several more hand-computed golden datasets.
- **Property-based tests** (fast-check): generate random sequences of valid operations and assert the invariants: Σ balances = Σ opening + income + repayments − expenses − lends; transfers never change available balance; loan remaining is never negative; remaining + returned + written off = amount.
- Rounding: everything is integer, so assert that no function accepts or returns a non-integer.

### 11.3 Integration tests

Repositories against fake-indexeddb; local Supabase (Docker) for RPCs, RLS and triggers; client vs server calculations compared on identical data.

### 11.4 Transaction editing and deletion tests

Edit amount, date, account, category and type-specific fields; moving a transaction across a month boundary updates both months; editing a repayment's account changes account balances but not loan remaining; delete expense, income and transfer; restore from Trash restores balances; deleting a lend with repayments is blocked, and "delete with repayments" removes both and fixes outstanding; undo within the toast window.

### 11.5 Repayment consistency tests

Multiple installments (the Ramesh case); multiple loans per person with oldest-first allocation across two loans; an exact full repayment gives *Fully returned*; over-payment blocked; deleting a middle repayment reopens the right remaining amount; write-off followed by a repayment attempt; repayment before the loan date rejected; reducing a loan below the returned amount rejected; person mismatch rejected at DB level.

### 11.6 Offline functionality tests (Playwright with the network toggled)

Cold start offline; add, edit and delete offline; reload while offline keeps data; sync after reconnect; flaky network (connection drops mid-push); a long offline period (1,000 queued rows); storage near quota; session expiry while offline, then re-login without data loss.

### 11.7 Synchronization tests

Idempotent retries (the same batch sent twice yields no duplicates); two devices editing the same row; delete on one device while edited on another; repayment delivered before its loan (FK deferral); cursor resume after a crash; device clock skew; large initial pull; RLS prevents reading another user's data.

### 11.8 Mobile and usability tests

Viewports 360x640, 390x844, 412x915; extra-large text with no clipped buttons; 56px tap targets (automated check); dark-mode contrast (WCAG AA); low-end Android performance (throttled CPU); PDF sharing to WhatsApp on a real device; and **hands-on sessions with Baba** after Phase 3 and Phase 8, timing the expense flow and noting where he hesitates.

### 11.9 Edge cases checklist

Zero or negative amount rejected; ₹0.01 and ₹9,99,99,999; two people with identical names; a person with loans being deleted (blocked, archive instead); a category deleted while used (archive or reassign); an account archived with a balance (warn); a backdated entry before the opening date; a transaction at 23:59 and a timezone change (use the stored `local_date`); leap day; month-end boundaries; double-tap on Save (disabled button plus idempotent id); search with Marathi text and mixed scripts; very long notes; deleting all data requires typed confirmation; restoring an older backup merged with newer data.

---

## 12. MVP vs Future Roadmap

### 12.1 Optional features, classified

| Feature | Class | Reason |
| --- | --- | --- |
| Quick-add from recent (recent categories, people, last account) | **Essential MVP** | Core to speed; mostly chip ordering. |
| Search across all transactions | **Essential MVP** | A notebook replacement must be searchable; cheap with local data. |
| Person-wise statement (on screen) | **Essential MVP** | Central to udhaari trust. |
| PDF export of statement and monthly report | **Essential MVP** (basic) | Needed to share the हिसाब; WhatsApp-friendly because it is just a PDF. |
| Downloadable monthly हिसाब | **Essential MVP** | Same engine as the monthly report. |
| Excel/CSV export | **Essential MVP** | Data ownership, requested in your brief. |
| Write-off of a loan | Recommended V1.1 | Keeps pending totals honest. |
| Receipt image attachments | Recommended V2 | Needs Storage, compression and an offline upload queue. |
| Recurring expenses | Recommended V2 | Rent, electricity, milk subscription; generate entries on app open (local). |
| Notifications for pending repayments | Recommended V2 | Web push is unreliable on iPhone; start with an in-app "due soon" list. |
| Daily transaction reminder | Recommended V2 | Gentle nudge at a set time; depends on push support. |
| Monthly expense reminders | Optional | Overlaps with recurring. |
| Expense budget limits | Recommended V2 | Per-category monthly limit with a progress bar. |
| Money borrowed (payables) | Recommended V2 | Mirror of lending. |
| Biometric lock (WebAuthn) | Recommended V2 | PIN suffices for MVP. |
| Voice entry in Marathi | Optional / Future | Web Speech API (mr-IN) is online-only and imperfect; keep it a bonus on the Quick Add screen, never a dependency, and always produce a draft the user confirms. |
| Interest on loans | Optional / Future | Adds real complexity. |
| Family sharing with roles | Optional / Future | Needs permissions and conflict design. |
| Merge duplicate people | Optional / Future |  |
| Capacitor store app | Optional / Future | Only if the PWA proves insufficient. |

### 12.2 MVP scope (v1.0)

Onboarding and accounts with opening balances; Quick Add for expense, income, lend, repayment and transfer; categories CRUD; Dashboard with date selector; History with search and filters, edit, delete, Undo and Trash; People & Udhaari with statements; Reports (daily to yearly) with charts; PDF and Excel/CSV export; Marathi/English; settings; offline-first with sync; backup/restore; PIN lock; dark theme.

---

## 13. Risks & Recommendations

| Category | Risk | Mitigation |
| --- | --- | --- |
| **Accounting** | A lend or repayment leaks into expense/income totals. | A single ledger with typed rows, pure-function totals, golden and property tests, and the reconciliation self-check. |
| Accounting | A repayment is over-applied or linked to the wrong loan or person. | DB trigger plus client validator; linkage by construction in the UI. |
| Accounting | Editing history silently changes past balances. | This is expected (balances are computed), but the audit log records before/after, and Undo and Trash reduce mistakes. |
| **Data loss** | Phone lost, browser data cleared, iOS storage eviction. | Cloud sync, weekly independent dump, downloadable backups, persistent storage request, "last synced" always visible. |
| Data loss | Supabase free tier pauses and has no backups. | Keep-alive job, own dumps, move to Pro when relied upon. |
| Data loss | Accidental delete. | Confirmations that state consequences, Undo toast, 30-day Trash, no hard deletes. |
| **Sync** | Duplicate rows after retries. | Client UUIDs and upsert-by-id. |
| Sync | Conflicting edits on two phones. | LWW per row plus the audit log; low probability. |
| **Usability** | Too many options overwhelm Baba. | Four-tab navigation, amount-first form, defaults everywhere, advanced fields collapsed, early testing with him. |
| Usability | Typing mistakes in amounts (an extra zero). | Words echo, Indian grouping, Undo. |
| Usability | Marathi microcopy sounds unnatural. | Native-speaker review and a fixed glossary for the key terms. |
| **Technical** | Marathi text broken in PDF export. | Embed Noto Sans Devanagari; test in the Phase 1 spike, not at the end. |
| Technical | PWA limits on iPhone (background sync, push). | Sync on open and on reconnect; no dependence on push in MVP. |
| Technical | Over-engineering the sync. | Whole-row LWW, a single RPC pair, no CRDTs. |
| Technical | Time zone and date bugs. | Store `local_date` at entry; IST default; tests at day boundaries. |
| **Security** | Financial data exposure. | RLS, HTTPS, PIN, scrubbed logs, private storage, no service key in the client. |
| **Maintenance** | You become the only support person. | Sentry, a runbook, a simple stack, automated backups, monthly dependency updates. |

**Standing recommendations:** build the domain module and its tests *first* and keep it free of UI and DB imports; and ship the MVP to Baba as a **parallel run**: he keeps the notebook for two weeks while the app runs beside it, then you compare totals before he fully trusts it.

---

## 14. Final Recommendation

### Product scope

Exactly the MVP in 12.2. Resist adding budgets, recurring entries and voice until Baba has used the core flows daily for a month.

### Tech stack

React + TypeScript + Vite + Tailwind as a PWA; Dexie (IndexedDB) locally; Supabase (Postgres, Auth, RLS, RPC) in the cloud; react-i18next, React Hook Form + Zod, Recharts, date-fns, SheetJS, pdf-lib with Noto Sans Devanagari; Vitest, Testing Library, Playwright, fast-check; Vercel or Cloudflare Pages; Sentry. **No Express, no MongoDB, no microservices.**

### Architecture

Local-first. Dexie is the UI's source of truth; an outbox and cursor sync to Postgres through two RPCs; a single typed ledger table with loans as derived data; balances always computed; soft deletes everywhere; three layers of backup.

### Final navigation

**Bottom bar:** मुख्य (Home) · इतिहास (History) · **\[ + Add \]** · व्यक्ती / उधारी (People) · अहवाल (Reports) **Gear on Home:** Settings, Accounts, Categories, Backup, Export, Trash.

### Suggested development order

1. Domain module (money, ledger rules, loan math, reports) with golden and property tests.
2. Schema (Postgres and Dexie) with constraints and seed data.
3. App shell, i18n, design tokens, PWA install, Devanagari PDF spike.
4. Accounts, categories, Quick Add (expense, income, transfer), History, Dashboard.
5. People, lend, repayment, statements, write-off.
6. Reports and PDF/Excel export.
7. Auth, sync, offline hardening, backup/restore.
8. Security review, PIN, polish, parallel run against Baba's notebook, launch.

### Open questions worth answering before we start

1. Is Baba on Android or iPhone? (It affects install steps and what we can promise on reminders.)
2. Should "received" ever cover money he *borrows*, or is that truly never needed?
3. Does he ever charge interest, or give loans with a promised return date?
4. Calendar month or Indian financial year (April to March) for his yearly view?
5. Will anyone else enter data, so we know if multi-device sync matters on day one?

If you confirm or change the assumptions in section 1, hand this document back to me and we'll begin with step 1 of the development order: the domain module and its tests.
