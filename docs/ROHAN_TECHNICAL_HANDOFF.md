# SpaceNet AI CRM — Technical Handoff (for Rohan)

## 1. What this is

SpaceNet AI CRM is an **interactive, frontend-only demo** of an ISP customer-relationship and network-operations console, presented in an immersive "galaxy" mission-control style. It has ten connected modules. **Everything is simulated with fictional data**: no backend, no database, no real messages, payments, AI calls, technician dispatch or network actions. Reloading the page resets the demo.

* **Repository:** https://github.com/lEVI2889/spacenet
* **Signed-off commit (`main`):** `a8c4d2ac4d57b042b7933d630ff63c5c76ff6337`
* **QA sign-off:** `docs/FINAL_QA_SIGNOFF.md` · defect evidence: `docs/QA_FINAL_REPORT.md`
* **Data/integration contract:** `docs/SHARED_DATA_CONTRACT.md` (v1.11.2) · status: `docs/PROJECT_STATUS.md`
* **Documentation-consistency issue (open):** `README.md` is outdated: it lists Node 18+ (Vite 8.3.5 needs 20.19+ or 22.12+) and describes earlier prototype features. Use this document; a README correction is pending separate approval and should be resolved before the final repository handoff.

## 2. Development environment (from the repository)

| Item | Value |
|---|---|
| Package manager | npm, `package-lock.json` (lockfile v3) |
| Dependencies | one dev dependency: `vite` (locked **8.3.5**) |
| Node.js | not pinned by the project; Vite 8.3.5 requires **`^20.19.0` or `>=22.12.0`**. Verified with Node 24.22.1 / npm 11.7.0. |
| Vite config | none (defaults) — root `index.html`, output **`dist/`** (a single file, `dist/index.html`) |
| Environment variables | none used |
| App structure | one file, `index.html` (markup, styles, one inline script); hash routes such as `#dashboard`, `#billing` |

**Commands**

```bash
npm ci                 # install exactly the locked dependency
npm run dev            # Vite dev server (default http://localhost:5173)
npm run build          # production build -> dist/index.html (single file)
npm run preview        # serve the built dist/ locally (default http://localhost:4173)

# tests: there is no npm test script; each suite runs with Node (15 suites, 1,090 assertions)
for f in test_*.mjs; do node "$f" || exit 1; done
```

## 3. The ten modules

| # | Module | What the demo shows |
|---|---|---|
| 01 | Dashboard | "Mission Control": 8 live KPI tiles and navigation badges computed from the demo records. |
| 02 | Unified Inbox | Simulated WhatsApp/Facebook/Instagram/Telegram/web chats; AI auto-replies, staff replies, human takeover, multilingual replies. |
| 03 | Tickets | Ticket table, creation (with customer prefill), detail dialog, escalation, resolution, SLA flags. |
| 04 | Customer Profiles | Subscriber directory, connections, history; jumps to chat, tickets, diagnostics. |
| 05 | AI Diagnostics | Guided troubleshooting, simulated remote tools (ONT reboot, sweep), speed test. |
| 06 | Sales / Leads | Pipeline with coverage check, package suggestion, stages, follow-ups, AI lead capture from chats. |
| 07 | Billing & Plans | Invoices in BDT, simulated payments (bKash etc.), reminders, package-change and line-shift requests. |
| 08 | Network Outages | Report outages, unplanned and planned lifecycles, affected customers, simulated notices. |
| 09 | Technician Ops | Field jobs from tickets/leads, scheduling, eligible-technician assignment, status flow, survey-before-installation. |
| 10 | Admin & Analytics | Live analytics, AI on/off per channel, working hours (configuration only), illustrative roles, future-only price changes. |

## 4. Suggested client demo journeys

1. **Dashboard reacts to work:** note the Active leads tile → Sales → *New lead* (e.g. location "Road 3, Gulshan") → back to Dashboard: tile and Sales badge increase.
2. **Simulated messaging:** Inbox → pick a chat → *Demo Simulator* → *Simulate Inbound*: customer message plus one AI reply ("Simulated — no message sent"). Type in the composer and *Send*: shown as **Human Agent**, no AI reply.
3. **AI channel switch:** Admin & Analytics → turn WhatsApp AI off → simulate a WhatsApp message: no AI reply, but a new-connection enquiry still creates a lead. Turn it back on afterwards.
4. **Takeover:** in a chat, switch *Override* on → simulate a message: AI stays silent; switch off → AI resumes.
5. **Billing:** Billing → *View* an overdue invoice → *Pay* (simulated, "no payment taken"); paying again is refused; Billing badge drops.
6. **Outage lifecycle:** Network Outages → *Report outage* → open it → move through Identified → Monitoring → Resolved; Dashboard outage tile updates.
7. **Technicians:** open a field job → *Schedule visit* → assign one of the eligible technicians → advance to completed.
8. **Diagnostics:** AI Diagnostics → answer a guided question, run *ONT Reboot*; header *Quick ONT Sweep* returns a labelled simulated result.
9. **Analytics:** Admin & Analytics → cards with honest "not available in demo data" notes; change a package price and note issued invoices are unchanged.

## 5. Deployment notes (decisions are yours)

* **Static site.** Build command `npm run build`, output directory `dist`. No server code, API routes or environment variables. Hash routing (`#view`) needs no rewrite rules.
* **Single file, not offline.** The build is one `dist/index.html`, but at runtime the page still loads Tailwind (styles) and Google Fonts (fonts and icons) from external CDNs. It is not self-contained or offline-capable: without those hosts the app runs but appears largely unstyled and without icons.
* **Node version on the host:** set it to a Vite-8-compatible version (20.19+ or 22.12+); the repo does not pin one.
* **Tailwind via CDN (`cdn.tailwindcss.com`):** styles are generated in the browser at load time. Implications: needs internet access to that CDN; the browser console logs Tailwind's "should not be used in production" warning; a brief unstyled flash is possible on slow connections; a strict Content-Security-Policy would have to allow it. Migrating to a build-time Tailwind setup is a separate change and was out of scope.
* **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`): fonts and icons fail to load if blocked; consider privacy notices if relevant.
* **Public access:** the demo has no authentication and no real access control (the role matrix is illustrative). A public URL exposes the whole demo, including its fictional customer data, to anyone who has it. A `noindex` directive only discourages search engines; it is not access control. Access protection and search indexing are your deployment decisions (the repository sets neither).
* **State:** in-memory only; every visitor and every reload starts from the same demo data.
* **No real integrations:** the simulated workflows need no production services, API keys or credentials (payments, messaging, AI, network systems). Do not add any.
* The repository also tracks `Demo_Videos/` (about 26 MB of screen recordings) and `SpaceNet_AI_CRM_Demo_Features.pdf` (12 KB). Neither is needed at runtime or included in the build output; they only add to clone size.

## 6. Known limitations

* D12 — exact duplicate leads can be entered manually (AI capture deduplicates).
* D13 — the Inbox header shows the 360° Profile action twice.
* Ticket table rows open ticket detail by mouse only; keyboard users can open tickets from customer profiles and other entry points.
* A second customer message within 0.8 s replaces the first message's queued AI reply.
* Frustration-banner takeover leaves a timer that is blocked at delivery (no visible effect).
* No persistence.
* Not tested: physical devices, screen readers, animation smoothness on real hardware, any deployed environment.

## 7. Post-deployment checklist

- [ ] Site loads over HTTPS; the Dashboard shows 8 KPI tiles with numbers.
- [ ] Galaxy background, styling (no unstyled page) and fonts/icons load; check the network panel for failed requests to the Tailwind CDN or Google Fonts.
- [ ] All ten sidebar entries open their screens; badges show counts.
- [ ] Phone width: the menu button opens the drawer, a module opens, the drawer closes; no sideways scrolling.
- [ ] Run journeys 1, 2 and 5 above; confirm numbers update.
- [ ] Simulated notices still say "Simulated" / "no message sent" / "no payment taken".
- [ ] Browser console: no errors other than Tailwind's production-use warning.
- [ ] Reload resets the data (expected).
- [ ] Hosting has no environment variables, functions or integrations added beyond static file serving.
