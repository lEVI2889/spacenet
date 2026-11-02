// test_qa_a11y.mjs - QA D5-D11 + staff label: demo honesty, dialog semantics/containment, search on focus,
// rendered labels, accessible names, contrast and reduced motion. Runs the real script in the vm harness
// and checks what it produces (toasts, rendered HTML, the live Tab handler) rather than source text where possible.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — QA Honesty & Accessibility Suite (D5-D11)');
console.log('=============================================================\n');

const html = readFileSync(resolve('./index.html'), 'utf-8').replace(/\r\n/g, '\n');
const appScript = [...html.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)].find(m => m[1].includes('SPACE_NET_CUSTOMERS'))[1];
const markup = html.replace(appScript, '');
const css = (html.match(/<style id="spacenet-theme">([\s\S]*?)<\/style>/) || [])[1] || '';
const tailwindConfig = (html.match(/<script id="tailwind-config">([\s\S]*?)<\/script>/) || [])[1] || '';

const mockElements = new Map();
const created = [];
function makeEl(id) {
  const classes = new Set(id && id.startsWith('view-') && id !== 'view-dashboard' ? ['hidden'] : []);
  return {
    id, textContent: '', innerHTML: '', value: '', className: '', style: {}, attributes: {}, children: [], dataset: {},
    classList: { add: (...a) => a.forEach(c => classes.add(c)), remove: (...a) => a.forEach(c => classes.delete(c)), contains: c => classes.has(c), toggle: () => {} },
    setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }, removeAttribute(k) { delete this.attributes[k]; },
    appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [], focus() {}, scrollIntoView() {}, addEventListener() {}
  };
}
function el(id) { if (!mockElements.has(id)) mockElements.set(id, makeEl(id)); return mockElements.get(id); }
const winListeners = {};
global.document = {
  getElementById: el, querySelector: sel => (sel.startsWith('#') ? el(sel.slice(1)) : null), querySelectorAll: () => [],
  createElement: tag => { const e = makeEl(''); e.tagName = tag.toUpperCase(); created.push(e); return e; },
  contains: () => false, activeElement: null
};
global.window = { location: { hash: '' }, scrollTo: () => {}, document: global.document, addEventListener: (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); } };
global.setTimeout = fn => { fn(); return 0; };
global.clearTimeout = () => {};

const ctx = vm.createContext(global);
try { vm.runInContext(appScript.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var '), ctx); console.log('✓ index.html script evaluated.\n'); }
catch (err) { console.error('FATAL: Script evaluation error in index.html:', err); process.exit(1); }

let total = 0, passed = 0;
function assert(cond, msg) { total++; if (cond) { passed++; console.log(`  [PASS] Test ${total}: ${msg}`); } else console.error(`  [FAIL] Test ${total}: ${msg}`); }
const toast = () => el('toast-title').textContent + ' | ' + el('toast-msg').textContent;

console.log('--- D5: simulated actions say so ---');
assert(!/Delivered to \$\{|survey SMS dispatched|8,400 active|AI Response Dispatched/.test(appScript), 'The misleading phrases are gone from the app script');
ctx.currentConversationId = 'CONV-WA-8832';
el('chat-input').value = 'Checking your line now.';
ctx.sendChatMessage();
assert(/Simulated/.test(toast()) && /no message sent/.test(toast()) && !/Delivered/.test(toast()), `Staff send toast is labelled simulated [${toast()}]`);
ctx.tickets.find(t => t.ticketId) && ctx.resolveTicketRow(null, ctx.tickets.find(t => !['RESOLVED', 'CLOSED'].includes(t.status)).ticketId);
assert(/no SMS sent/.test(toast()) && !/dispatched/i.test(toast()), `Ticket resolve toast says no SMS was sent [${toast()}]`);
ctx.triggerGlobalDiagnostics();
assert(/Simulated/.test(toast()) && !/8,400/.test(toast()), `Quick ONT Sweep result is labelled simulated [${toast().slice(0, 60)}]`);
ctx.executeSimulateCustomerMessage('What are your support working hours?');
assert(/AI Reply Simulated/.test(toast()) && /No message sent/.test(toast()), 'Automatic AI reply toast is labelled simulated');

console.log('\n--- D6: dialog semantics and keyboard containment ---');
const dialogs = { 'create-ticket-container': 'create-ticket-title', 'ticket-modal-container': 'td-modal-id' };
assert(/aria-labelledby="td-modal-id td-modal-subject"/.test(markup), 'Ticket detail is named by its ID and subject');
for (const [cid, label] of Object.entries(dialogs)) {
  const tag = (markup.match(new RegExp(`<div[^>]*id="${cid}"[^>]*>`)) || [''])[0];
  const ids = ((tag.match(/aria-labelledby="([^"]+)"/) || [])[1] || '').split(' ');
  assert(/role="dialog"/.test(tag) && /aria-modal="true"/.test(tag) && ids[0] === label && ids.every(id => new RegExp(`id="${id}"`).test(markup)), `Module 03 dialog #${cid} has role, aria-modal and a resolvable name`);
}
const m03 = ['openCreateTicketModal', 'openTicketDetail', 'closeCreateTicketModal', 'closeTicketModal'].map(n => ctx[n].toString());
assert(/showLeadDialog\('create-ticket-modal'/.test(m03[0]) && /showLeadDialog\('ticket-detail-modal'/.test(m03[1]) && /hideLeadDialog\(/.test(m03[2]) && /hideLeadDialog\(/.test(m03[3]), 'Module 03 dialogs use the shared helper (focus in, focus return)');
const trap = (winListeners.keydown || []).find(fn => /aria-modal/.test(fn.toString()));
assert(!!trap, 'A keyboard handler for open modal dialogs is registered');
function runTrap({ shift, activeIdx, inside = true, fading = false }) {
  const items = [0, 1, 2].map(i => ({ i, disabled: false, offsetParent: {}, focus() { focused = i; } }));
  let focused = null;
  const dialog = { id: 'x', offsetParent: {}, closest: sel => (fading && sel === '.opacity-0' ? {} : null), contains: n => inside && items.includes(n), querySelectorAll: () => items };
  const saved = ctx.document.querySelectorAll;
  ctx.document.querySelectorAll = sel => (/aria-modal/.test(sel) ? [dialog] : []);
  ctx.document.activeElement = inside ? items[activeIdx] : {};
  let prevented = false;
  trap({ key: 'Tab', shiftKey: shift, preventDefault() { prevented = true; } });
  ctx.document.querySelectorAll = saved;
  return { focused, prevented };
}
let r = runTrap({ shift: false, activeIdx: 2 });
assert(r.prevented && r.focused === 0, 'Tab on the last control wraps to the first');
r = runTrap({ shift: true, activeIdx: 0 });
assert(r.prevented && r.focused === 2, 'Shift+Tab on the first control wraps to the last');
r = runTrap({ shift: false, activeIdx: 1 });
assert(!r.prevented && r.focused === null, 'Tab inside the dialog moves normally');
r = runTrap({ shift: false, inside: false });
assert(r.prevented && r.focused === 0, 'Focus outside an open dialog is pulled back into it');
assert(/d\.id !== 'app-sidebar'/.test(trap.toString()), 'The phone drawer keeps its own trap (excluded here)');
r = runTrap({ shift: false, inside: false, fading: true });
assert(!r.prevented && r.focused === null, 'A dialog that is fading out (closing) never takes focus back');

console.log('\n--- D7: search does not activate on focus ---');
const search = (markup.match(/<input[^>]*id="global-search-input"[^>]*>/) || [''])[0];
assert(!/onfocus=/.test(search) && /onclick="openCmdPalette\(\)"/.test(search) && /onkeydown="[^"]*Enter[^"]*openCmdPalette/.test(search) && /aria-label="/.test(search), 'Search opens on click / Enter / Space only, and has a name');

console.log('\n--- D8 + staff label: rendered text ---');
created.length = 0;
ctx.renderCustomerConversation('CONV-WA-8832');
const lang = el('ai-suggestions-lang-tag').textContent;
assert(/•/.test(lang) && !/&bull;/.test(lang), `Language tag renders a bullet, not "&bull;" [${lang}]`);
const staffHtml = created.map(e => e.innerHTML).find(h => /Human Agent/.test(h)) || '';
assert(/Human Agent &bull; Rohan \(Tier III NOC\)/.test(staffHtml) && !/\(Rohan \(/.test(staffHtml), 'Staff label has one pair of brackets ("Human Agent • Rohan (Tier III NOC)")');
const staffMsg = ctx.getConversation('CONV-WA-8832').messages.find(m => m.text === 'Checking your line now.');
assert(staffMsg.sender === 'staff' && staffMsg.author === 'Rohan (Tier III NOC)', 'Sender metadata is unchanged (staff / Rohan (Tier III NOC))');

console.log('\n--- D9: accessible names ---');
for (const id of ['inbox-search-input', 'sim-custom-input', 'chat-input', 'ticket-search-input', 'customer-search-input']) {
  assert(new RegExp(`<input[^>]*id="${id}"[^>]*aria-label="[^"]+"`).test(markup), `#${id} has an accessible name`);
}
assert(/type="checkbox" aria-label="Select all tickets"/.test(markup), 'Ticket select-all checkbox is named');
created.length = 0;
ctx.renderTicketTable(ctx.tickets);
assert(created.filter(e => e.tagName === 'TR').every(tr => /aria-label="Select ticket #?TKT-/.test(tr.innerHTML)) && created.some(e => e.tagName === 'TR'), 'Every rendered ticket row checkbox is named');
assert(/aria-label="Attach file \(not available in this demo\)"/.test(markup), 'Icon-only composer button is named honestly');

console.log('\n--- D10: contrast ---');
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
// Colour tokens are theme variables since the Minimal Galaxy theme: read each palette from the theme stylesheet.
const themeBlock = t => (html.match(t === 'dark' ? /:root, :root\[data-theme="dark"\] \{([^}]*)\}/ : /:root\[data-theme="light"\] \{([^}]*)\}/) || [])[1] || '';
const token = (t, name) => { const m = themeBlock(t).match(new RegExp(`--c-${name}: (\\d+) (\\d+) (\\d+);`)); return m ? '#' + m.slice(1).map(v => (+v).toString(16).padStart(2, '0')).join('') : undefined; };
const SURFACE_TOKENS = ['surface-container-lowest', 'surface', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest'];
assert(/"outline": "rgb\(var\(--c-outline\) \/ <alpha-value>\)"/.test(tailwindConfig), 'Tailwind colour tokens resolve through the theme variables');
const surfaces = SURFACE_TOKENS.map(n => token('light', n));
for (const t of ['light', 'dark']) {
  const ts = SURFACE_TOKENS.map(n => token(t, n));
  const outline = token(t, 'outline');
  assert(ts.every(Boolean) && ts.every(s => ratio(outline, s) >= 4.5), `Caption colour ${outline} is >= 4.5:1 on every ${t} surface (min ${Math.min(...ts.map(s => ratio(outline, s))).toFixed(2)})`);
}
assert(/'text-amber-800'/.test(appScript) && !/Degraded'\) \? 'text-amber-600'/.test(appScript) && !/opticalEl\.className = '[^']*text-amber-600/.test(appScript), 'Telemetry warning values use amber-800');
assert(surfaces.every(s => ratio('#92400e', s) >= 4.5), 'amber-800 is >= 4.5:1 on every light surface');
const darkAmber = (css.match(/\.dark \.text-amber-800:not\(\[class\*="dark:text-"\]\), \.dark \.text-amber-700:not\(\[class\*="dark:text-"\]\) \{ color: (#[0-9a-f]{6}); \}/) || [])[1];
assert(darkAmber && SURFACE_TOKENS.map(n => token('dark', n)).every(s => ratio(darkAmber, s) >= 4.5), 'amber-800 warning text maps to a dark-theme tint that is >= 4.5:1 on every dark surface');

console.log('\n--- D11: reduced motion ---');
const reduced = (css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/) || [])[1] || '';
assert(/\.animate-ping/.test(reduced) && /\.animate-pulse/.test(reduced) && /animation: none/.test(reduced), 'Status ping/pulse dots stop under reduced motion');
assert(/space-nebula-glow/.test(reduced) && /kpi-tile-pulse/.test(reduced), 'Galaxy drift, twinkle and the Dashboard pulse stay off under reduced motion');

console.log(`\nTest Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
if (passed !== total) process.exit(1);
