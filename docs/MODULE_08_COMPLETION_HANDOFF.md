# Module 08 — Network Outages / NOC: Completion Handoff

**Owner:** Adnan · **Branch:** `feature/adnan-module-08-network-outages` (from `main` at `2e65f68`) · **Date:** 2026-11-01
**Scope:** Client-demo depth for features #45, #46, #48–51. All outages, causes and notifications are fictional, in-memory demo data.

## What works

| Client feature | Demo behaviour |
|---|---|
| #45 Mark an outage for an area | "Report outage" form: zone, unplanned or planned, title, severity or maintenance window, cause. |
| #46 Outage dashboard | Stat strip (active, planned, resolved, customers affected, spike alerts) and outage cards with type, severity, zone, lifecycle bar and counts. |
| #48 Link complaints to one outage | Each outage lists the existing connectivity tickets from its zone, with links to the ticket. |
| #49 Complaint spike alerts the NOC | A zone with 2 or more open no-internet or slow-internet complaints shows a NOC alert, either linked to its outage or with a "Report outage in <zone>" shortcut. |
| #50 Notify at start and restoration | "Notify Affected Customers" and "Announce Restoration" (only once resolved) record demo entries labelled "Simulated — no messages sent". |
| #51 Planned maintenance notices | Planned maintenance has its own flow (Scheduled → In progress → Completed) and a "Send maintenance notice" action, also simulated. |

Seed scenarios follow the real fixtures:

| Outage | Status | Derived from the fixtures |
|---|---|---|
| `OUT-UTT-0107` (Uttara fibre cut) | Identified | Customer `CUST-1092`; complaint `TKT-9031` |
| `OUT-GUL-0108` (Gulshan maintenance) | Scheduled | Customer `CUST-4491`; no connectivity complaints |
| `OUT-MOH-0101` (Mohakhali) | Resolved | Customer `CUST-7719`; resolved `TKT-9035` |

There is no spike at baseline. One appears in Dhanmondi once a second complaint is logged there, joining `TKT-9042`.

## Files

* `index.html`: outage view markup replaces the static prototype and its "1,420 subscribers notified" broadcast modal. Adds the outage detail and report dialogs, and the Module 08 script section.
* `test_module_08.mjs`: new, 79 checks, including a real-markup group.
* `test_module_06.mjs`: section-end marker repointed (the old marker was removed with the prototype code).
* `docs/SHARED_DATA_CONTRACT.md` (v1.7.0, Section 16), `docs/PROJECT_STATUS.md`, this file.

## Shared code touched

* The global Escape handler calls `closeOutageDialogs()` instead of the removed `closeMaintenanceModal()`.
* A `hashchange` listener refreshes the NOC view when it opens.
* The module reuses Module 06's dialog helpers and `leadTimestamp`.

## Verification

* `npm run build` passes.
* Tests: `test_module_02`–`05` 576/576, `test_module_06` 96/96, `test_module_08` 79/79 (751 total).
* A mutation check confirmed the spike tests fail if the threshold changes.
* Headless browser (gstack): seed board and stats; detail dialog (focus, lifecycle to Resolved, notify and restoration labels); a real second Dhanmondi complaint raising the alert; report from the alert; form validation; planned fields; Escape on both dialogs; ticket Escape and Sales lead creation still work; 768 px with no sideways scroll.

## Known limitations and deferred items

* The AI telling customers about a known outage in chat (#47) is deferred (Module 02 hook).
* The shared tab bar's "1 Active" outage badge is static prototype text (left for Module 10). The Dashboard's NOC row now mirrors the newest open outage.
* Phone width (375 px) is still limited by the shared shell.
* No persistence, real alerts or messaging.
