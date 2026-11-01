// test_galaxy_ui.mjs - Galaxy UI/UX upgrade regression suite (navigation, backdrop motion, dialog focus)
// Group 1 reads the real markup. Groups 2-3 run the real functions extracted from the app script
// against small fakes, so the behaviour (not just the source text) is checked.
import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Galaxy UI/UX Validation Suite');
console.log('=============================================================\n');

const htmlContent = readFileSync(resolve('./index.html'), 'utf-8').replace(/\r\n/g, '\n');
const appScript = [...htmlContent.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)].find(m => m[1].includes('SPACE_NET_CUSTOMERS'))[1];
const markup = htmlContent.replace(appScript, '');
const css = (htmlContent.match(/<style id="spacenet-theme">([\s\S]*?)<\/style>/) || [])[1] || '';

let passed = 0, total = 0;
function assert(cond, msg) {
  total++;
  if (cond) { passed++; console.log(`  [PASS] Test ${total}: ${msg}`); } else console.log(`  [FAIL] Test ${total}: ${msg}`);
}
const fnSource = (name, end = '\n  }\n') => { const i = appScript.indexOf(`function ${name}(`); return i < 0 ? '' : appScript.slice(i, appScript.indexOf(end, i) + end.length); };

// -------------------------------------------------------------------------
console.log('--- GROUP 1: Navigation and markup ---');
const views = ['dashboard', 'unified-inbox', 'tickets', 'customer-profiles', 'ai-diagnostics', 'sales-leads', 'billing', 'technicians', 'analytics', 'network-outages'];
assert(!/view-switch-btn|id="nav-btn-/.test(htmlContent), 'The duplicate top tab strip is gone (markup and script)');
assert(!/sticky top-16/.test(markup), 'No sticky sub-header can cover content');
assert(views.every(v => new RegExp(`<a [^>]*data-path="${v}"`).test(markup)), 'The sidebar links every one of the 10 views');
assert(/id="quick-sweep-btn"[^>]*onclick="triggerGlobalDiagnostics\(\)"[^>]*aria-label="Quick ONT Sweep"|id="quick-sweep-btn"[^>]*aria-label="Quick ONT Sweep"/.test(markup) && /id="quick-sweep-btn"[^>]*triggerGlobalDiagnostics/.test(markup), 'Quick ONT Sweep stays reachable from the header with an accessible name');
assert(/setAttribute\('aria-current', 'page'\)/.test(fnSource('switchView')), 'switchView marks the active sidebar link with aria-current');
assert(!/Module (0[6-9]|10) &middot;/.test(markup) && !/SpaceNet &middot; Mission Control/.test(markup), 'No small module labels stacked above page headings');
assert(views.every(v => { const i = markup.indexOf(`id="view-${v}"`); const j = markup.indexOf('<section class="app-view', i + 1); return /<h1[\s>]/.test(markup.slice(i, j < 0 ? undefined : j)); }), 'Every view has a page heading (h1)');
assert(/Overview figures on this screen are fictional demo data\./.test(markup), 'Dashboard keeps its demo-data disclaimer');
const scrims = [...css.matchAll(/\.(space-mission-band|space-view-title)::before \{[^}]*inset: -\d+px -(\d+)px/g)];
assert(scrims.length === 2 && scrims.every(m => Number(m[2]) <= 12), 'Heading scrims reach at most 12px sideways (inside the 12px phone gutter, so no page overflow)');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 2: Galaxy backdrop and motion ---');
assert(['space-nebula', 'space-galaxy', 'space-stars-far', 'space-stars-mid', 'space-stars-near', 'space-planet'].every(c => new RegExp(`class="space-layer[^"]*${c}[^"]*" data-depth="`).test(markup)), 'Backdrop has nebula, galaxy band, three star layers and a planet, each with a parallax depth');
const reduced = (css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/) || [])[1] || '';
assert(/space-nebula-glow/.test(reduced) && /space-stars-near::before/.test(reduced) && /kpi-tile-pulse/.test(reduced) && /animation: none/.test(reduced), 'Reduced motion stops nebula drift, star twinkle and the status pulse');
assert(/\.kpi-tile:hover \{ transform: none; \}/.test(reduced) && /\.app-view:not\(\.hidden\) \{ animation: space-view-fade/.test(reduced), 'Reduced motion removes tile lift and view slide (fade only)');

// Run the real initSpaceBackdrop against a fake window/document.
function runBackdrop({ reduce }) {
  const reads = { scrollHeight: 0 };
  const listeners = {};
  const frames = [];
  const layerEls = [['0.03', '', ''], ['0.06', '320', ''], ['0.2', '900', ''], ['0.3', '', '260']].map(([d, tile, max]) => ({
    style: {}, getAttribute: k => ({ 'data-depth': d, 'data-tile': tile || null, 'data-max': max || null }[k])
  }));
  const shift = { style: {} };
  const backdrop = { setAttribute() {}, querySelectorAll: () => layerEls };
  const fakeDoc = {
    getElementById: id => (id === 'space-backdrop' ? backdrop : id === 'space-nebula-shift' ? shift : null),
    documentElement: { get scrollHeight() { reads.scrollHeight++; return 5000; } },
    body: {}
  };
  const fakeWin = {
    scrollY: 0, innerHeight: 1000, location: { hash: '' },
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    matchMedia: () => ({ matches: reduce }),
    requestAnimationFrame: fn => { frames.push(fn); return frames.length; }
  };
  new Function('window', 'document', 'ResizeObserver', fnSource('initSpaceBackdrop') + '\ninitSpaceBackdrop();')(fakeWin, fakeDoc, undefined);
  return { reads, listeners, frames, layerEls, shift, fakeWin };
}
const still = runBackdrop({ reduce: true });
assert(!still.listeners.scroll && still.layerEls.every(l => !l.style.transform), 'Reduced motion: no scroll listener and no layer movement');
const live = runBackdrop({ reduce: false });
assert(live.listeners.scroll && live.listeners.scroll.length === 1, 'Normal motion: exactly one scroll listener');
const readsBefore = live.reads.scrollHeight;
live.fakeWin.scrollY = 1200;
live.listeners.scroll[0]();
let n = 0;
while (live.frames.length && n++ < 200) live.frames.shift()();
assert(live.reads.scrollHeight === readsBefore, 'Scroll frames never read page height (measured on resize/view change only)');
assert(n > 3 && n < 200, `Movement eases over several frames and then stops (${n} frames)`);
const y = l => parseFloat((l.style.transform.match(/translate3d\(0, (-?[\d.]+)px/) || [])[1]);
assert(Math.abs(y(live.layerEls[0]) + 36) < 0.5 && Math.abs(y(live.layerEls[1]) + 72) < 0.5, 'Settles at depth × scroll (nebula 36px, far stars 72px)');
assert(Math.abs(y(live.layerEls[2]) + 240) < 0.5 && Math.abs(y(live.layerEls[3]) + 260) < 0.5, 'Tiled stars wrap; untiled planet stops at its own cap (260px)');
assert(live.shift.style.opacity === '0.300', 'Second nebula fades in with scroll progress (opacity only)');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 3: Dialog focus return after a list re-render ---');
function runRestore({ openerAttached, twinVisible, hasTwin }) {
  const focused = [];
  const mk = (name, extra = {}) => ({ name, focus() { focused.push(name); }, getAttribute: k => (k === 'onclick' ? extra.onclick || null : null), hasAttribute: () => false, setAttribute() {}, addEventListener() {}, offsetParent: extra.offsetParent, ...extra });
  const opener = mk('old-card', { onclick: "openLeadModal('LEAD-3001')" });
  const twin = mk('new-card', { onclick: "openLeadModal('LEAD-3001')", offsetParent: twinVisible ? {} : null });
  const heading = mk('view-heading');
  const fakeDoc = {
    contains: node => node === opener && openerAttached,
    querySelectorAll: () => (hasTwin ? [mk('other', { onclick: "openLeadModal('LEAD-3002')", offsetParent: {} }), twin] : []),
    querySelector: () => heading
  };
  new Function('document', fnSource('restoreLeadDialogFocus') + '\nrestoreLeadDialogFocus(arguments[1], arguments[2]);')(fakeDoc, opener, opener.getAttribute('onclick'));
  return focused;
}
assert(runRestore({ openerAttached: true, hasTwin: true, twinVisible: true }).join() === 'old-card', 'Opener still on the page: focus returns to it');
assert(runRestore({ openerAttached: false, hasTwin: true, twinVisible: true }).join() === 'new-card', 'Opener re-rendered: focus goes to its replacement (same action)');
assert(runRestore({ openerAttached: false, hasTwin: false }).join() === 'view-heading', 'No replacement: focus goes to the current view heading, never a removed node');
assert(runRestore({ openerAttached: false, hasTwin: true, twinVisible: false }).join() === 'view-heading', 'A hidden replacement is skipped');

console.log(`\nTest Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
if (passed !== total) process.exit(1);
