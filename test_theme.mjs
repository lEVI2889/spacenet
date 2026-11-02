// test_theme.mjs - Minimal Galaxy theme: initial theme choice, toggle, saved preference, storage failures,
// no CRM state reset, palette contrast in both themes, reduced motion. Same vm harness as the other suites.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Theme Suite (Celestial Pearl / Obsidian Galaxy)');
console.log('=============================================================\n');

const html = readFileSync(resolve('./index.html'), 'utf-8');
const headScript = (html.match(/<script id="theme-init">([\s\S]*?)<\/script>/) || [])[1] || '';
const appScript = [...html.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)].find(m => m[1].includes('SPACE_NET_CUSTOMERS'))[1];
const css = (html.match(/<style id="spacenet-theme">([\s\S]*?)<\/style>/) || [])[1] || '';
const tailwindConfig = (html.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/) || [])[1] || '';

let total = 0, passed = 0;
function assert(cond, msg) { total++; if (cond) { passed++; console.log(`  [PASS] Test ${total}: ${msg}`); } else console.error(`  [FAIL] Test ${total}: ${msg}`); }

function rootMock() {
  const classes = new Set();
  return { attrs: {}, style: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    classList: { toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); }, contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c) } };
}
function storageMock(initial, { throwOnGet = false, throwOnSet = false } = {}) {
  const data = { ...initial };
  return { data, getItem(k) { if (throwOnGet) throw new Error('blocked'); return k in data ? data[k] : null; }, setItem(k, v) { if (throwOnSet) throw new Error('blocked'); data[k] = String(v); } };
}
function runHead({ saved, prefersLight, storageThrows = false, noMatchMedia = false }) {
  const root = rootMock();
  const ctx = vm.createContext({
    document: { documentElement: root },
    localStorage: storageMock(saved === undefined ? {} : { 'spacenet-theme': saved }, { throwOnGet: storageThrows }),
    window: noMatchMedia ? {} : { matchMedia: q => ({ matches: q === '(prefers-color-scheme: light)' ? !!prefersLight : false }) }
  });
  vm.runInContext(headScript, ctx);
  return root;
}

console.log('--- Initial theme (head script, before first paint) ---');
assert(headScript.length > 0 && html.indexOf('id="theme-init"') < html.indexOf('cdn.tailwindcss.com') && html.indexOf('id="theme-init"') < html.indexOf('<body'), 'The theme script runs in <head>, before Tailwind and before the body renders');
let r = runHead({ saved: 'light', prefersLight: false });
assert(r.getAttribute('data-theme') === 'light' && !r.classList.contains('dark') && r.style.colorScheme === 'light', 'A saved "light" choice wins over a dark system preference');
r = runHead({ saved: 'dark', prefersLight: true });
assert(r.getAttribute('data-theme') === 'dark' && r.classList.contains('dark'), 'A saved "dark" choice wins over a light system preference');
r = runHead({ prefersLight: true });
assert(r.getAttribute('data-theme') === 'light', 'No saved choice: a light system preference gives Celestial Pearl');
r = runHead({ prefersLight: false });
assert(r.getAttribute('data-theme') === 'dark' && r.classList.contains('dark'), 'No saved choice and no light preference: Obsidian Galaxy (dark default)');
r = runHead({ noMatchMedia: true });
assert(r.getAttribute('data-theme') === 'dark', 'System preference unavailable: falls back to dark');
r = runHead({ saved: 'purple', prefersLight: true });
assert(r.getAttribute('data-theme') === 'light', 'An invalid saved value is ignored');
r = runHead({ storageThrows: true, prefersLight: true });
assert(r.getAttribute('data-theme') === 'light', 'Blocked storage: the head script still follows the system preference without throwing');

console.log('\n--- Toggle (app script) ---');
const scriptCode = appScript.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var ');
const mockElements = new Map();
function el(id) {
  if (!mockElements.has(id)) {
    const classes = new Set(id.startsWith('view-') && id !== 'view-dashboard' ? ['hidden'] : []);
    mockElements.set(id, { id, textContent: '', innerHTML: '', value: '', className: '', style: {}, attributes: {}, children: [],
      classList: { add: (...a) => a.forEach(c => classes.add(c)), remove: (...a) => a.forEach(c => classes.delete(c)), contains: c => classes.has(c), toggle: () => {} },
      setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k] || null; }, removeAttribute(k) { delete this.attributes[k]; },
      appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [], focus() {}, scrollIntoView() {} });
  }
  return mockElements.get(id);
}
const root = rootMock(); root.setAttribute('data-theme', 'dark'); root.classList.toggle('dark', true);
let transitions = 0, reduceMotion = false;
const storage = storageMock({});
global.document = { documentElement: root, getElementById: el, querySelector: sel => (sel.startsWith('#') ? el(sel.slice(1)) : null), querySelectorAll: () => [],
  createElement: tag => ({ tagName: tag.toUpperCase(), className: '', innerHTML: '', textContent: '', style: {}, children: [], attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [] }),
  contains: () => false, activeElement: null, startViewTransition: fn => { transitions++; fn(); } };
global.window = { location: { hash: '' }, scrollTo: () => {}, addEventListener: () => {}, document: global.document, matchMedia: q => ({ matches: q.includes('reduced-motion') ? reduceMotion : false }) };
global.localStorage = storage;
global.setTimeout = () => 0; global.clearTimeout = () => {};
const ctx = vm.createContext(global);
try { vm.runInContext(scriptCode, ctx); } catch (err) { console.error('FATAL:', err); process.exit(1); }
const btn = el('theme-toggle-btn'), icon = el('theme-toggle-icon');
assert(btn.getAttribute('aria-pressed') === 'true' && icon.textContent === 'dark_mode', 'On load the toggle reflects the head script’s theme (dark: pressed)');
const snapshot = () => JSON.stringify({ tickets: ctx.tickets.map(t => t.ticketId + t.status), unread: ctx.conversations.map(c => c.unread), queue: ctx.currentQueueFilter, conv: ctx.currentConversationId,
  view: ctx.currentActiveView, jobs: ctx.techJobs.map(j => j.jobId + j.status + j.technicianId), diag: ctx.diagnosticSessions.length, leads: ctx.leads.length, invoices: ctx.invoices.map(i => i.status) });
ctx.filterQueue('unread');
const before = snapshot();
ctx.toggleTheme();
assert(root.getAttribute('data-theme') === 'light' && !root.classList.contains('dark') && root.style.colorScheme === 'light', 'Toggle switches to Celestial Pearl (data-theme, dark class and color-scheme)');
assert(btn.getAttribute('aria-pressed') === 'false' && icon.textContent === 'light_mode', 'Toggle state is announced: aria-pressed false, light icon');
assert(storage.data['spacenet-theme'] === 'light', 'The explicit choice is saved under spacenet-theme');
assert(transitions === 0, 'The theme switches instantly (no View Transition): the measured snapshot cost dropped frames to ~30 fps');
ctx.toggleTheme();
assert(root.getAttribute('data-theme') === 'dark' && btn.getAttribute('aria-pressed') === 'true' && storage.data['spacenet-theme'] === 'dark', 'Toggling again returns to Obsidian Galaxy and saves it');
assert(snapshot() === before, 'Switching themes changes no CRM state: tickets, chats, queue filter, view, jobs, diagnostics, leads, invoices');
assert(Object.keys(storage.data).length === 1, 'Only the theme preference is written to storage; no CRM data is stored');
reduceMotion = true;
ctx.toggleTheme();
assert(transitions === 0 && root.getAttribute('data-theme') === 'light', 'Reduced motion: the theme changes immediately, without a transition');
global.localStorage = storageMock({}, { throwOnSet: true }); ctx.localStorage = global.localStorage;
let threw = false;
try { ctx.toggleTheme(); } catch (e) { threw = true; }
assert(!threw && root.getAttribute('data-theme') === 'dark', 'Blocked storage: toggling still works for this visit and does not throw');
const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');
assert(/<header id="app-header"[\s\S]*?<button type="button" id="theme-toggle-btn" onclick="toggleTheme\(\)" aria-pressed="[a-z]+" aria-label="Dark theme"/.test(markup), 'The toggle is a real button in the header with a fixed accessible name and aria-pressed state');
assert(/#app-header #theme-toggle-btn \{ display: inline-flex; \}/.test(css), 'The toggle stays visible in the phone header');

console.log('\n--- Tokens and contrast in both themes ---');
const hexOf = (t, name) => {
  const block = (html.match(t === 'dark' ? /:root, :root\[data-theme="dark"\] \{([^}]*)\}/ : /:root\[data-theme="light"\] \{([^}]*)\}/) || [])[1] || '';
  const m = block.match(new RegExp(`--c-${name}: (\\d+) (\\d+) (\\d+);`));
  return m ? '#' + m.slice(1).map(v => (+v).toString(16).padStart(2, '0')).join('') : undefined;
};
const configTokens = [...tailwindConfig.matchAll(/"([a-z-]+)": "rgb\(var\(--c-\1\) \/ <alpha-value>\)"/g)].map(m => m[1]);
assert(configTokens.length === 47 && !/"#[0-9a-fA-F]{6}"/.test(tailwindConfig), 'All 47 Tailwind colour tokens resolve through theme variables (no fixed hex left)');
assert(['light', 'dark'].every(t => configTokens.every(n => hexOf(t, n))), 'Every token has a value in both palettes');
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const SURFACES = ['surface-container-lowest', 'surface', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest', 'background'];
const TEXT = ['on-surface', 'on-surface-variant', 'outline', 'primary', 'secondary', 'tertiary', 'error'];
const PAIRS = [['on-primary', 'primary'], ['on-secondary', 'secondary'], ['on-tertiary', 'tertiary'], ['on-error', 'error'],
  ['on-primary-container', 'primary-container'], ['on-secondary-container', 'secondary-container'], ['on-tertiary-container', 'tertiary-container'], ['on-error-container', 'error-container'],
  ['on-primary-fixed', 'primary-fixed'], ['on-secondary-fixed', 'secondary-fixed'], ['on-tertiary-fixed', 'tertiary-fixed'],
  ['on-primary-fixed-variant', 'primary-fixed'], ['on-secondary-fixed-variant', 'secondary-fixed'], ['on-tertiary-fixed-variant', 'tertiary-fixed'],
  ['inverse-on-surface', 'inverse-surface'], ['inverse-primary', 'inverse-surface'], ['inverse-on-surface', 'background']];
for (const t of ['light', 'dark']) {
  const fails = [];
  TEXT.forEach(x => SURFACES.forEach(s => { if (ratio(hexOf(t, x), hexOf(t, s)) < 4.5) fails.push(`${x}/${s}`); }));
  PAIRS.forEach(([f, b]) => { if (ratio(hexOf(t, f), hexOf(t, b)) < 4.5) fails.push(`${f}/${b}`); });
  assert(fails.length === 0, `${t === 'light' ? 'Celestial Pearl' : 'Obsidian Galaxy'}: every text token and on-colour pair is >= 4.5:1 (${TEXT.length * SURFACES.length + PAIRS.length} pairs)${fails.length ? ' — ' + fails.join(', ') : ''}`);
}
assert(/\.dark \.text-on-primary\.hover\\:bg-primary-container:hover \{/.test(css) && /\.dark \.text-on-tertiary\.hover\\:bg-tertiary-container:hover \{/.test(css), 'Dark theme: primary/tertiary button hover keeps a light fill under dark label text');

console.log('\n--- Motion ---');
const reduced = (css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/) || [])[1] || '';
assert(/space-nebula-glow/.test(reduced) && /animation: none/.test(reduced) && /button:not\(:disabled\):active \{ transform: none; \}/.test(reduced), 'Reduced motion: nebula drift, twinkle, pulses and the button press effect are off');
assert(/:root\[data-theme="light"\] #space-backdrop \.space-galaxy, :root\[data-theme="light"\] #space-backdrop \.space-stars-near::before \{ display: none; \}/.test(css), 'Celestial Pearl keeps the sky sparse: no Milky Way band, no twinkle layer');
assert(/window\.addEventListener\('scroll'/.test(appScript) && !/chat-message-stream'\)\.addEventListener\('scroll'/.test(appScript), 'Background parallax follows the page scroll only, never the Inbox transcript scroll');

console.log('\n--- Decluttered layout keeps critical controls visible ---');
// Element ranges by matching tags (markup only), to check what sits inside which container.
const span = (tag, idAttr) => {
  const start = markup.indexOf(`id="${idAttr}"`); if (start < 0) return [-1, -1];
  const open = markup.lastIndexOf(`<${tag}`, start);
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g'); re.lastIndex = open; let depth = 0, m;
  while ((m = re.exec(markup))) { depth += m[0].startsWith('</') ? -1 : 1; if (depth === 0) return [open, m.index]; }
  return [open, -1];
};
const inside = (idAttr, [a, b]) => { const i = markup.indexOf(`id="${idAttr}"`); return i > a && i < b; };
const moreFilters = span('details', 'inbox-more-filters'), tools = span('details', 'chat-copilot-tools');
assert(inside('inbox-type-filter-strip', moreFilters) && inside('inbox-filter-strip', moreFilters) && !inside('inbox-queue-strip', moreFilters) && !inside('inbox-search-input', moreFilters),
  'Inbox: channel/type filters sit behind one disclosure; search and the All/Unread/Read/Awaiting queue stay visible');
assert(['chat-ai-routing-banner', 'demo-customer-simulator-strip', 'chat-suggestions-container', 'sim-custom-input'].every(id => inside(id, tools)) && /setAiLanguage\('BN'/.test(markup.slice(...tools)),
  'Inbox: AI routing, simulator, suggested replies and reply language are grouped in Copilot tools');
assert(['copilot-toggle', 'chat-frustration-alert', 'chat-read-toggle-btn', 'chat-customer-profile-btn', 'chat-message-stream', 'chat-input', 'chat-send-btn', 'composer-mode-note-btn'].every(id => markup.includes(`id="${id}"`) && !inside(id, tools) && !inside(id, moreFilters)),
  'Inbox: takeover, frustration escalation, read state, profile, transcript, composer and notes stay outside the disclosures');
assert(/onclick="escalateToHumanFromFrustration\(\)"/.test(markup.slice(...span('div', 'chat-frustration-alert'))), 'Inbox: the frustration alert keeps its one-click escalation');
assert(!/goToProfileFromChat\(\)" title="Open Customer 360° Profile"/.test(markup) && !/Plan: \$\{escapeHtml\(cust\.plan\)\} &bull; <button/.test(appScript), 'Inbox: the duplicate inline 360° Profile link is gone from markup and template (D13)');
const workflow = span('div', 'diag-workflow-panel');
assert(/lg:col-span-7/.test(markup.slice(workflow[0], workflow[0] + 200)) && ['diag-answers-container', 'diag-btn-escalate', 'diag-btn-resolve', 'diag-btn-sync', 'diag-assessment-card'].every(id => inside(id, workflow)),
  'Diagnostics: the guided workflow, assessment and escalate/resolve/sync actions form the primary column');
const inspector = [markup.indexOf('aria-label="Technical inspector"'), markup.indexOf('</aside>', markup.indexOf('aria-label="Technical inspector"'))];
assert(['diag-target-card', 'diag-hardware-card'].every(id => inside(id, inspector)) && markup.indexOf('id="diag-target-card"') < markup.indexOf('id="diag-hardware-card"'),
  'Diagnostics: session target (with its warning) leads the technical inspector, followed by equipment & tools');
const lowerRow = span('div', 'diag-secondary-row');
assert(['diag-speed-card', 'diag-history-panel'].every(id => inside(id, lowerRow) && !inside(id, inspector)) && /lg:col-span-12/.test(markup.slice(lowerRow[0], lowerRow[0] + 200)) && markup.indexOf('</aside>') < lowerRow[0],
  'Diagnostics: speed test and session history sit in a full-width row below both columns (no empty half-page when expanded)');
assert(/class="[^"]*max-h-\[360px\][^"]*" id="diag-history-list"/.test(markup), 'Diagnostics: the session history list stays compact (scrolls inside its panel)');
const handling = span('div', 'chat-handling-control');
assert(inside('agent-mode-badge', handling) && inside('copilot-toggle', handling) && /id="chat-handling-control"[\s\S]*?id="chat-read-toggle-btn"/.test(markup),
  'Inbox header: AI/human state and the Override switch form one handling control, placed before the secondary actions');
assert(/<details class="[^"]*" id="diag-hardware-card" open>/.test(markup) && /<details class="[^"]*" id="diag-speed-card">/.test(markup) && /<details class="[^"]*" id="diag-history-panel">/.test(markup),
  'Diagnostics: equipment & tools open by default; speed test and history collapsed');
ctx.filterInbox('facebook'); ctx.filterType('dm');
const summaryText = el('inbox-filter-summary').textContent;
ctx.filterInbox('all'); ctx.filterType('all');
assert(summaryText === 'Facebook · DMs' && el('inbox-filter-summary').textContent === 'All', 'Inbox: the closed filter disclosure names the active channel/type filters');
ctx.filterInbox('whatsapp'); const waLabel = el('inbox-filter-summary').textContent; ctx.filterInbox('all');
assert(waLabel === 'WhatsApp', 'Inbox: channel names in the filter summary use their proper labels (WhatsApp)');
assert(!/id="frustration-alert-text"[^>]*\btruncate\b/.test(markup) && !/class="[^"]*\btruncate\b[^"]*" id="frustration-alert-text"/.test(markup), 'Inbox: the frustration reason wraps rather than being cut off');
assert(/id="diag-history-list"/.test(markup) && /class="[^"]*max-h-\[[^"]*" id="diag-history-list"/.test(markup), 'Diagnostics: the session history list keeps a height cap so it scrolls inside the inspector');
// Legacy amber overrides apply only where the element has no Tailwind dark: variant (deterministic, no source-order tie).
assert(/\.dark \.text-amber-900:not\(\[class\*="dark:text-"\]\)/.test(css) && /\.dark \.bg-amber-100:not\(\[class\*="dark:bg-"\]\)/.test(css), 'Dark theme: legacy amber overrides skip elements that carry their own dark: variant');
const amberText = (css.match(/\.dark \.text-amber-700:not\(\[class\*="dark:text-"\]\) \{ color: (#[0-9a-f]{6}); \}/) || [])[1];
const amberBg = (css.match(/\.dark \.bg-amber-50:not\(\[class\*="dark:bg-"\]\) \{ background-color: rgb\((\d+) (\d+) (\d+) \/ (\.\d+)\); \}/) || []).slice(1).map(Number);
const comp = (base, [r, g, b, a]) => '#' + [r, g, b].map((v, i) => Math.round(v * a + parseInt(base.slice(1 + 2 * i, 3 + 2 * i), 16) * (1 - a)).toString(16).padStart(2, '0')).join('');
assert(amberText && amberBg.length === 4 && SURFACES.every(sn => ratio(amberText, comp(hexOf('dark', sn), amberBg)) >= 4.5), 'Dark theme: amber warning text on its translucent amber panel is >= 4.5:1 over every dark surface');

console.log(`\nRESULT: ${passed}/${total} passed`);
if (passed !== total) process.exit(1);
