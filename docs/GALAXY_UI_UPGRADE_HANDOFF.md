# Galaxy UI/UX Upgrade — Handoff

**Owner:** Adnan · **Branch:** `feature/spacenet-galaxy-immersion-polish` (from `main` at `26bdbc9`) · **Date:** 2026-11-01
**Scope:** Visual, navigation and accessibility layer for all ten modules. No CRM business rules changed. Contract v1.11.0 (Section 20).

## What changed

| Area | Change |
|---|---|
| Navigation | The 10-tab top strip (sticky, duplicated the sidebar, covered content on phones) is removed. The sidebar and phone drawer are the full navigation; their links carry the live badges (same ids, Module 10 owns the counts) and `aria-current`. Quick ONT Sweep moved to the header (icon-only on narrow screens). |
| Galaxy | Deeper base, four-colour nebula (violet, blue, cyan, magenta), a Milky Way band with a dust lane, denser star layers with a few slowly twinkling bright stars, a ringed planet in the lower right. Each view sits in its own region; switching views glides the sky (1.1 s). Work screens use a quieter sky than the Dashboard. |
| Scroll | Eased parallax: layers follow the scroll over several frames and stop when settled. Page height is measured on resize/view change only. Transform and opacity only. A second nebula fades in with scroll progress. |
| Dashboard | "Mission Control" heading over open sky; KPI tiles are deep-space instruments with a tone per area. Tiles turn to the alert tone only when there is something to act on (overdue tickets or invoices, active outage; the outage tile also pulses). Values are unchanged Module 10 metrics. |
| Consistency | One deep-space hero for Modules 06–10; page titles on the sky for Inbox, Tickets and Customers; every view has one `h1`; "Module NN ·" labels removed; content cards lift off the sky with an offset shadow; themed focus rings, selection and tabular numbers. |
| Accessibility | Dialog focus returns to the opener, or its re-rendered replacement, or the view heading (never a removed node). Focus rings: light blue on dark chrome, primary blue on light cards. Reduced motion: no parallax, drift, twinkle, pulse or tile lift. |
| Responsive | Tablet header keeps search, sweep and avatar; phones drop the Milky Way band and twinkle layer and get an opaque drawer; collapsed (icon) sidebar hides all labels. No page-level sideways scroll at 375, 390, 768, 1440 px. |

## Files

`index.html`, `test_module_07.mjs`, `test_module_09.mjs`, `test_module_10.mjs` (tab-id assertions replaced by "sidebar link carries its badge"; outage badge text "1"), new `test_galaxy_ui.mjs` (23 tests), `docs/SHARED_DATA_CONTRACT.md` (v1.11.0), `docs/PROJECT_STATUS.md`, this file.

## Verification

* `npm run build` passes; tests 1022/1022 (999 existing + 23 new).
* New tests run the real parallax and focus-return functions: no page-height reads during scroll frames, easing settles and stops, caps hold, reduced motion adds no listener; focus goes to the opener, its replacement, or the heading. Deliberate breaks of both are caught.
* Headless browser (gstack): all 10 views at 375/390/768/1440 px with no sideways scroll; collapsed sidebar; phone drawer (open, navigate, Escape, focus return, opaque at 744 px after a desktop collapse); lead dialog focus after a list re-render; keyboard focus rings.
* Before/after screenshots: `D:\spaceNet\demo-screenshots\galaxy-before` and `galaxy-after`.

## Known limitations

* Visual and motion checks were headless only. Headless frame timing: median equal to `main` (33 ms in software rendering); occasional slower frames; needs a look in a normal browser on real hardware.
* Inbox on phones: the conversation header row clips inside its card (existing Module 04 layout; no page overflow).
* AI-channel queued-reply edge (Module 10) stays for the final QA defect pass.
* Simulated operations and no persistence, as before.
