# Module 07 — Billing & Plans: Completion Handoff

**Owner:** Adnan · **Branch:** `feature/adnan-module-07-billing-plans` (from `main` at `a159eb6`) · **Date:** 2026-11-01
**Scope:** Client-demo depth for features #52–56. All invoices, payments and requests are fictional, in-memory demo data. No payment is taken and no message is sent.

## What works

| Client feature | Demo behaviour |
|---|---|
| #52 Bill amount, due date, payment status | A new Billing & Plans view with 11 invoices for the existing 9 customers: one line per connection, priced from the BDT catalog, due date from the customer's billing cycle. Paid, Unpaid and Overdue (derived) statuses; search and status filter; invoice dialog. |
| #53 Payment reminders | "Send payment reminder" on unpaid invoices logs "Simulated — no message sent". |
| #54 Online payment link (bKash, Nagad, card) | Pick a method and "Confirm simulated payment". It records a `PAY-` entry labelled "Simulated — no payment taken" and marks the invoice paid. A second payment is refused. |
| #55 Package upgrade or downgrade | Choose customer, connection and catalog package. The preview shows the current and requested price and the BDT difference. Same-package and duplicate pending requests are rejected. The customer's plan is not changed. |
| #56 Line shifting | Choose a connection and enter the new address. Coverage shows Covered, Not covered or Unverified (unknown areas are Unverified). The customer's address is not changed. |

## Files

* `index.html`: Billing view, invoice and request dialogs, Module 07 script section, sidebar link and top-bar tab, its own sky region, `'billing'` in both router lists, `closeBillingDialogs()` in the Escape handler.
* `test_module_07.mjs`: new, 79 checks, including real-markup checks and a duplicate-name guard.
* `docs/SHARED_DATA_CONTRACT.md` (v1.8.0, Section 17), `docs/PROJECT_STATUS.md`, this file.

## Notable finding

All modules share one script scope. A billing helper was first named `getCustomerConnection`, which Module 05 already defines with a primary-circuit fallback. Module 05's definition, being later in the file, silently replaced the billing one, so unknown circuits were accepted. It is renamed `findBillingConnection`. `test_module_07.mjs` now fails on any duplicate top-level function, `const` or `let` name, and a deliberate reintroduction of the collision confirmed the check catches it.

## Verification

* `npm run build` passes.
* Tests 830/830: modules 02–05 576, 06 96, 07 79, 08 79.
* Headless browser (gstack), 1440 and 768 px:
  * sidebar navigation into Billing (active link, galaxy sky region);
  * 11 invoice rows and stats;
  * Nagad, bKash and Card payments, with the paid state removing the confirm button;
  * overdue reminder;
  * package change: same-package error, preview, submit, duplicate rejection;
  * line shift to an unknown area (Unverified);
  * customers unchanged;
  * overdue filter;
  * Escape on both dialogs;
  * Sales lead creation and the outage dialog still work.
* Page-level sideways overflow at 768 px was found and fixed: a screen-reader-only header label escaped the table's scroll box.

## Known limitations

* Pricing uses a demo plan-to-catalog mapping; leased lines are billed as Office Pro 1G.
* No taxes, prorating or ledger; requests stay "submitted" (no approval workflow).
* Phone width (375 px) is still limited by the shared shell.
