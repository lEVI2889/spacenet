# SpaceNet AI CRM — Final QA Report (DRAFT)

**Baseline:** `main` at `017b57b` · **Branch:** `chore/spacenet-final-qa` · **Date:** 2026-11-01 · **Status:** draft, not committed
**Scope:** frontend-only demo with fictional data. All payments, messages, notifications, technician dispatch, network actions and AI replies are simulated in the browser.

## Verdict: CONDITIONAL PASS

No blockers. Every module's core demo workflow works through real controls. Two issues must be fixed before handoff: the AI-channel setting can be bypassed (D1, D2), and the phone/tablet Inbox conversation is not readable (D3). The remaining issues are wording, accessibility and polish.

## What was tested

| Area | Method | Result |
|---|---|---|
| Build and regression | `npm run build`; 11 vm suites + new markup suite | build ok; **1026/1026** (1022 baseline + 4 new) |
| Click paths, 10 views | every visible control clicked once in a real (headless) browser; JS errors and observable effect recorded | 0 JS errors; no dead controls (Sales stage chips scroll the pipeline, which only moves on narrow screens) |
| Dialog controls | every button in 7 dialog types clicked on a fresh dialog | 0 errors; disabled actions (Announce Restoration before resolution) correctly disabled |
| User journeys | real buttons and forms per module (below) | all pass |
| Responsive | 375 / 390 / 768 / 1440 px, all views; phone↔desktop resize with drawer open | no page-level sideways scroll; wide tables and the pipeline scroll in their containers; resize resets the drawer |
| Dialogs on phones | fit, internal scroll, Escape, focus | all fit and close on Escape (see D6) |
| Reduced motion | test copy with the media query forced on | galaxy drift, twinkle, pulse, parallax off (see D11) |
| Truthfulness and safety | whole-file scan | no network APIs, storage APIs or secrets; external: Tailwind CDN, Google Fonts only (see D5) |

**Journeys passed:** M02 simulated inbound + AI reply; human takeover pauses AI. M03 ticket from profile button; resolve lowers open tickets. M04 directory selection; Open Active Chat. M05 simulated ONT reboot; guided workflow answer + assessment. M06 lead form (coverage + package); stage change in dialog. M07 simulated payment and duplicate-payment refusal; simulated reminder; package-change request. M08 outage report form; planned lifecycle to completed; simulated notices; restoration only after resolution. M09 survey before installation; invalid schedule refused; ineligible technician refused. M10 KPIs/badges follow actions (checked after PR #15 and #16).

## Confirmed defects

| ID | Sev. | Area | Reproduce | Expected | Actual | Test exists | Minimal fix |
|---|---|---|---|---|---|---|---|
| D1 | MEDIUM | M10 / M02 AI channel | WhatsApp AI on → simulate inbound (reply queued for 800 ms) → switch WhatsApp off in Admin → wait | no AI reply after the switch | AI reply posts | no | in the inbound reply timer, re-check `isAiChannelEnabled(channel)` at delivery; if off, still run lead capture and skip the AI message |
| D2 | MEDIUM | M02/M04 composer + M10 | WhatsApp AI off → open an AI-handled WhatsApp chat → type and Send | no automatic AI reply | an automatic AI reply posts 800 ms later | no | same channel check before scheduling the composer's AI reply |
| D3 | HIGH | M04 Inbox, < 1024 px | open Inbox at 390 or 768 px | conversation readable | message stream gets **32 px** (fixed 704 px grid split between stacked list and pane) | no | make the fixed height desktop-only (`lg:` prefix) and give the stacked list/pane their own heights on small screens |
| D4 | MEDIUM | M04 Inbox, phones | open a conversation at 375–390 px | header and composer fit | badge row (name, ID, channel, type, AI language) is 445 px in a 366 px card and is clipped; Send button extends past the card edge | no | `flex-wrap` on the badge row, `min-w-0` on the info column and on `#chat-input` |
| D5 | MEDIUM | M02–M04 wording | Send a staff message; resolve a ticket; Quick ONT Sweep | simulated actions say so | "Message Dispatched — Delivered to … via WhatsApp"; "survey SMS dispatched"; "AI Response Dispatched"; sweep says "8,400 active customer terminals" and reports a Diagnostics circuit | no | add "Simulated — no message sent" (and similar) to these toasts; drop the 8,400 figure |
| D6 | MEDIUM | Dialog a11y | open a lead/outage/invoice/job dialog, Tab past the last control; open Ticket detail or Create ticket | focus stays in the dialog; dialogs announced | Tab reaches the page behind (M06–M09 dialogs); M03 dialogs have no `role="dialog"`/label and focus stays behind | no | Tab wrap in the shared `showLeadDialog`; role, aria-modal, label and initial focus for the two M03 dialogs |
| D7 | LOW | Header search | Tab through the header, or press Ctrl+K | search usable or clearly unavailable | focus alone pops "Global Search Unavailable" | yes (honest message) | open the message on click/Ctrl+K only, not on focus |
| D8 | LOW | M02 suggestions | look at the AI suggestion strip | "Lang: EN • Contextual" | literal "Lang: EN &bull; Contextual" | no | use the "•" character in the `textContent` string (line ~4630) |
| D9 | LOW | M02–M04 labels | screen reader on Inbox/Tickets/Customers | named controls | 5 inputs named only by placeholder; ticket row checkboxes unnamed; one icon-only Inbox button | no | `aria-label`s |
| D10 | LOW | Contrast, mainly M02–M05 | small grey captions and amber telemetry | ≥ 4.5:1 | `text-outline` captions 4.09:1; amber dBm values 2.89:1 | no | darker colour for small caption text (owner decision: shared token) |
| D11 | LOW | Reduced motion | reduced-motion setting on | no decorative motion | three Tailwind status dots still ping/pulse | no | `.animate-ping, .animate-pulse { animation: none }` under reduced motion |
| D12 | LOW | M06 lead form | submit the same name and phone twice | warning or reuse | second lead created (AI capture dedupe works) | no | optional duplicate-phone warning (not in the approved scope) |
| D13 | LOW | M04 Inbox header | open a conversation | one 360° Profile action | the header shows a "360° Profile" link in the circuit line and a "360° Profile" button (existing; seen during the D3/D4 fix, left unchanged) | no | keep one of the two |

**Observation for Rohan (not counted as a defect):** in an AI-handled conversation, a staff message from the composer is stored as an AI message and the knowledge base then answers it, giving two AI messages per Send.

**Test reliability:** the older suites (02–05) run against a mock DOM that creates any element on demand. Removing `#chat-input`, `#ticket-search-input`, `#new-ticket-subject` or `#customer-search-input` from the real markup left every suite green. New `test_markup_integrity.mjs` checks that all 272 literal id lookups exist in the markup or a rendered template; each removal now fails it.

## Owner decisions (2026-11-01)

* Verdict accepted; final QA sign-off pending until the fixes below are merged and re-verified.
* Fix before handoff: D1–D11. D10: improve the contrast. D1/D2: tell customer messages apart from staff-authored ones; switching AI off must suppress an already queued reply without needing another incoming message; investigate the staff-message attribution (observation above) in the same narrow fix; keep qualified lead capture and human takeover.
* Deferred: D12 (manual duplicate leads), a documented low-severity limitation; no broad duplicate restrictions.

## Recommended fix branches (each needs approval)

1. `fix/mobile-inbox-layout` — D3, D4 (Rohan's Module 04 markup; class changes only).
2. `fix/ai-channel-pending-reply` — D1, D2 and the staff-message attribution, with deterministic regression tests (lead capture and takeover preserved).
3. `fix/qa-honesty-a11y` — D5–D11 (small, mostly Rohan's modules).

Order approved by the owner; each branch needs its own authorization.

## Fix status

* D3, D4 — fixed on `fix/mobile-inbox-layout`: the Inbox height lock applies only from `lg` (1024 px); on narrower screens the thread list has its own height and the message stream gets a minimum height (506 px measured at 375/390/768, was 32 px) and scrolls internally; header rows wrap; the composer input may shrink. Guarded by `test_inbox_layout.mjs`.
* D1, D2 — fixed on `fix/ai-channel-pending-reply`: one rule (`aiAutoReplyBlockReason`) for takeover and channel-off; switching a channel off cancels its queued AI replies immediately (lead capture still runs) and the timer re-checks at delivery, so re-enabling resurrects nothing; composer messages are always staff-authored and never trigger AI replies (this was also the attribution problem in the observation above). Guarded by `test_ai_channel.mjs` (deterministic fake clock). Recorded, unchanged: the staff label reads "Human Agent (Rohan (Tier III NOC))" (candidate for the wording cleanup); a second customer message within 0.8 s replaces the first one's queued reply (existing behaviour); escalating from the frustration banner sets takeover without clearing the timer, but the reply is still blocked at delivery.
* D5–D11 and the staff label — fixed on `fix/qa-honesty-a11y`: simulated wording for staff sends, AI replies, ticket-resolve survey and Quick ONT Sweep (no invented counts); Tab/Shift+Tab containment for all modal dialogs, and the two Module 03 dialogs now have dialog semantics and use the shared focus helper; header search opens on click/Enter/Space, not on focus; "•" instead of literal "&bull;"; accessible names for the 5 inputs, ticket checkboxes and the composer icon button; caption token `outline` #727687→#5f6375 (≥4.61:1 on every light surface) and telemetry warnings amber-600→amber-800; Tailwind ping/pulse dots stop under reduced motion; staff label "Human Agent • Rohan (Tier III NOC)". Guarded by `test_qa_a11y.mjs`. Noted, unchanged: ticket table rows open the detail dialog by mouse only (row not focusable; profile and other entry points are keyboard-reachable).

## Limitations

* Browser checks were headless (gstack); no real devices. Scroll smoothness, touch, iOS Safari and Android Chrome are untested. Headless frame timing is not representative.
* Runtime CDN dependencies: Tailwind CDN (logs a "not for production" warning) and Google Fonts. Deployment is Rohan's.
* No persistence: a reload resets all demo data.
