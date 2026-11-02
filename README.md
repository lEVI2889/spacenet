# SpaceNet AI CRM — Frontend-Only Interactive ISP CRM Demo

SpaceNet AI CRM is an interactive demo of an internet-service-provider CRM and network-operations console, presented in an immersive "galaxy" mission-control interface. It runs entirely in the browser with fictional data.

**It is a demo, not a production system:**

* no backend and no database: demo state resets when the page is reloaded;
* no real messaging, payments, AI services, technician dispatch or network operations: every such action is simulated and labelled as such;
* no authentication, and the role matrix is illustrative: nothing is access-controlled.

## Modules

| # | Module | What it shows |
|---|---|---|
| 01 | Dashboard | "Mission Control" with live KPI tiles and navigation badges computed from the demo records |
| 02 | Unified Inbox | Simulated WhatsApp, Facebook, Instagram, Telegram and web chats; AI auto-replies, staff replies, human takeover |
| 03 | Tickets | Ticket creation, detail, escalation and resolution |
| 04 | Customer Profiles | Subscribers, connections and history, linked to chats, tickets and diagnostics |
| 05 | AI Diagnostics | Guided troubleshooting and simulated remote tools |
| 06 | Sales / Leads | Lead pipeline with coverage check, package suggestion, follow-ups and AI lead capture |
| 07 | Billing & Plans | Invoices, simulated payments, reminders, package-change and line-shift requests |
| 08 | Network Outages | Unplanned and planned outage lifecycles, affected customers, simulated notices |
| 09 | Technician Ops | Field jobs, scheduling, eligible-technician assignment, status flow |
| 10 | Admin & Analytics | Live analytics, AI on/off per channel, working hours, illustrative roles, future-only price changes |

## Getting started

**Requirements:** npm, and a Node.js version supported by the locked Vite 8.3.5: `^20.19.0 || >=22.12.0`. The project itself does not pin a Node.js version.

```bash
git clone https://github.com/lEVI2889/spacenet.git
cd spacenet
npm ci                 # install the locked dependency (Vite is the only dependency)
npm run dev            # development server, default http://localhost:5173
npm run build          # production build: a single file, dist/index.html
npm run preview        # serve the build locally, default http://localhost:4173
```

**Tests:** there is no `npm test` script. Run the 15 Node test suites (1,090 assertions) with:

```bash
for f in test_*.mjs; do node "$f" || exit 1; done
```

## Deployment notes

* Vite builds one file, `dist/index.html`. There is no Vite config, no server code and no environment variables; navigation uses hash routes (`#dashboard`, `#billing`, …).
* The page is **not** offline or self-contained: Tailwind CSS (`cdn.tailwindcss.com`) and Google Fonts load from external hosts at runtime.
* There is no login or access protection. Whether to protect a deployment, and whether it may be indexed by search engines, are decisions for the deployer.
* There is no persistent storage.

Deployment is owned by Rohan; see the technical handoff below for details and a post-deployment checklist.

## QA status and documentation

* **Final QA: PASS for the frontend client demo** (no production certification; physical-device and screen-reader testing were not performed).
* Signed-off application: `a8c4d2ac4d57b042b7933d630ff63c5c76ff6337`. All 1,090 tests passed on this commit.
* The later documentation-only merge `eae302a609e242db564c124665177b1d55dc8fbd` (and this README update) did not change application code, configuration or tests.

| Document | Purpose |
|---|---|
| [docs/FINAL_QA_SIGNOFF.md](docs/FINAL_QA_SIGNOFF.md) | What was verified, what was not, accepted limitations |
| [docs/ROHAN_TECHNICAL_HANDOFF.md](docs/ROHAN_TECHNICAL_HANDOFF.md) | Environment, demo journeys, deployment notes, post-deployment checklist |
| [docs/QA_FINAL_REPORT.md](docs/QA_FINAL_REPORT.md) | QA defect evidence and fix status (D12, D13 deferred) |
| [docs/SHARED_DATA_CONTRACT.md](docs/SHARED_DATA_CONTRACT.md) | Data model and module integration contract (v1.12.0) |
