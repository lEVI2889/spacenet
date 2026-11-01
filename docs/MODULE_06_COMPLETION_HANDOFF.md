# Module 06 — Sales & Leads: Completion Handoff

**Owner:** Adnan · **Branch:** `feature/adnan-module-06-sales-leads` (from `main` at `dd96ec3`) · **Date:** 2026-11-01
**Scope:** Client-demo depth for features #28–37. All leads, names, numbers and actions are fictional, in-memory demo data.

## What works

| Client feature | Demo behaviour |
|---|---|
| #28 Find interested people in messages | A new-connection inquiry in the Inbox simulator auto-creates a lead and adds a system line to the chat. The Copilot "Suggest Sales Lead" button opens (or creates) the conversation's lead. |
| #29 Collect name, phone, location, service; home or office | The lead form collects all of them. AI-captured leads take name and phone from the linked customer and area and package from the message; anything missing is listed on the card and in the detail view. |
| #30 Check coverage | Covered / Not covered / Unverified (an unknown area is never treated as unsupported). |
| #31 Suggest a package | Requested catalog package, otherwise Home 150M (home) or Office Pro 1G (office); none outside coverage. |
| #32 Create the lead automatically | `captureLeadFromInquiry`, one lead per conversation; repeats update it instead of duplicating. |
| #33 Auto-assign to sales; corporate to corporate sales | Office leads go to Corporate Sales, the rest to Residential Sales, each with a fictional rep. |
| #34 One dashboard | Five-stage pipeline with live stage counts, search, and team and coverage filters. |
| #35 Lead stages | New, Contacted, Interested, Connected, Lost, each change written to history. Connected links to an existing customer; it never creates one. |
| #36 Follow-up reminders | Set, complete, and overdue badge (in-app only; nothing is sent). |
| #37 Book a site survey | Records a simulated request on the lead; no technician is dispatched (Module 09 will schedule it). |

## Files

* `index.html`: Sales view markup (replaces the static US-style prototype), lead detail and new-lead dialogs, Module 06 script section, small style block. Shared one-line hooks (below).
* `test_module_06.mjs`: new, 96 checks, including a static-markup group that reads the real HTML.
* `docs/SHARED_DATA_CONTRACT.md`: v1.6.0, Section 15.
* `docs/PROJECT_STATUS.md`, this file.

## Shared code touched (needs Rohan's review)

1. `executeSimulateCustomerMessage`: one line after the AI reply calls `captureLeadFromInquiry`.
2. `handleRoutingAction`, `sales_handoff` branch: the old "recommended" toast now calls `openLeadFromConversation(conv)`.
3. Global Escape handler: adds `closeLeadCreateModal()`.

## Verification

* `npm run build`: passes.
* `test_module_02`–`05`: 576/576. `test_module_06`: 96/96.
* Headless browser (gstack `$B`) at 1440 px and 768 px: pipeline render; new-lead form (validation, routing preview, creation); detail dialog; stage change updating counts; site survey; Escape on both dialogs with focus return; keyboard Enter on a card; simulator auto-capture; no duplicate on repeat; no lead for a package-change message; Copilot button opening the lead.

## Known limitations and deferred items

* **Phones (375 px):** the shared app shell (fixed 256 px sidebar) leaves about 120 px for any view. This is pre-existing and app-wide; it needs a separate shell fix.
* The Module 02 zone regexes end in `\b`, so Bangla area names never match there. Module 06's coverage check also matches the Bangla name directly; the Module 02 regexes are unchanged.
* There is no focus trap inside the dialogs (Escape, focus-on-open and focus return work).
* Leads cannot be edited after creation (only stage, reminder and survey change). Lead-to-customer linking happens only through an existing `customerId`. The thread preview shows the AI's lead system line as the last message.
* Real reminders, notifications, technician dispatch and persistence are out of scope for the demo.

## Reusable design pieces for the theme pass

`.sales-hero` (static CSS starfield and nebula on `inverse-surface`), the slow `.sales-orbit` SVG ring (disabled under `prefers-reduced-motion`), and the orbital stage strip.
