# Module 09 — Technician Operations: Completion Handoff

**Owner:** Adnan · **Branch:** `feature/adnan-module-09-technician-ops` (from `main` at `021fd3d`) · **Date:** 2026-11-01
**Scope:** Client-demo depth for features #57–59 plus the site-survey handoff from #37. All jobs, technicians, schedules and notifications are fictional, in-memory demo data. Nobody is dispatched and no message is sent.

## What works

| Client feature | Demo behaviour |
|---|---|
| #57 Technicians see installation and repair tasks in one list | A new Technician Ops view (sidebar and top tab) with job cards showing ID, type, source, technician, zone, visit and priority. Stats, a status filter and a fictional roster with availability. |
| #58 Schedule visits; customers get the visit time | Schedule or reschedule a visit (prefilled with the customer's preferred slot). "Send visit time to customer" logs "Simulated — no message sent". |
| #59 Job status updates | Unassigned → Scheduled → Assigned → On the way → Working → Completed. Invalid jumps are rejected and every step goes into history. |
| #37 handoff | Each Module 06 site-survey request becomes a Site Survey job. An installation job can be created only after that survey is completed. |

Repair jobs come from genuine escalated connectivity tickets: at load that is `TKT-9031` (Uttara, urgent), seeded as scheduled for 2026-11-01 15:00 and assigned to Rakib Hasan. Jobs are re-synced when the view opens, so new survey requests and escalations appear without duplicates.

## Files

* `index.html`: Technician Ops view, job dialog, Module 09 script section, sidebar link and top tab, `'technicians'` in both router lists, its own sky region, `closeTechJobModal()` in Escape.
* `test_module_09.mjs`: new, 72 checks, including real-markup and duplicate-name checks.
* `test_module_07.mjs` and `test_module_08.mjs`: section-end markers repointed (Module 09 code now sits between), and the Module 07 router check made order-independent. No assertion weakened.
* `docs/SHARED_DATA_CONTRACT.md` (v1.9.0, Section 18), `docs/PROJECT_STATUS.md`, this file.

## Verification

* `npm run build` passes.
* Tests 924/924: modules 02–08 830, Module 09 72, mobile shell 22.
* A deliberate break (ignoring technician availability) at first still passed all 70 checks: the on-leave technician was only being rejected for lacking the skill. A new assertion now fails on that break; the code was restored afterwards.
* Headless browser (gstack): sidebar, top tab and phone-drawer navigation; board and roster; schedule, assign, notify, lifecycle to Completed, then installation; ticket and lead links (source records unchanged); Escape; Sales and Billing still work; no page-level sideways scroll on any of the 9 views at 375, 390, 768 and 1440 px; the job dialog fits at 375 px.

## Known limitations

* Focus does not return to the job card after closing the dialog when the list was re-rendered. The same behaviour exists in the shared Module 06 dialog helper.
* The top tab bar now holds 10 tabs and scrolls inside its container at desktop widths; left for the Galaxy UI pass.
* No real dispatch, GPS, routing, payroll or persistence.
