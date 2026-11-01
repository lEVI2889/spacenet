// test_mobile_shell.mjs - responsive shell (phone navigation drawer) regression suite
// Same vm + mock DOM approach as test_module_02..06. Group 1 reads the real markup,
// so a missing element or a leftover prototype claim cannot pass silently.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Mobile Shell Validation Suite');
console.log('=============================================================\n');

const htmlContent = readFileSync(resolve('./index.html'), 'utf-8');
const appScriptMatch = [...htmlContent.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)].find(m => m[1].includes('conversations') && m[1].includes('SPACE_NET_CUSTOMERS'));
if (!appScriptMatch) {
  console.error('FATAL: Could not locate main application <script> block in index.html');
  process.exit(1);
}
const appScript = appScriptMatch[1];
const markup = htmlContent.replace(appScript, '');
const scriptCode = appScript.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var ');

const mockElements = new Map();
function el(id) {
  if (!mockElements.has(id)) {
    const classes = new Set(id.startsWith('view-') && id !== 'view-dashboard' ? ['hidden'] : []);
    if (/modal$/.test(id)) classes.add('hidden');
    mockElements.set(id, {
      id, textContent: '', innerHTML: '', value: '', className: '', style: {}, attributes: {}, children: [],
      classList: {
        add: (...a) => a.forEach(c => classes.add(c)), remove: (...a) => a.forEach(c => classes.delete(c)), contains: c => classes.has(c),
        toggle: (c, force) => { const on = force === undefined ? !classes.has(c) : force; on ? classes.add(c) : classes.delete(c); return on; }
      },
      setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k] || null; }, removeAttribute(k) { delete this.attributes[k]; },
      appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [],
      focus() { global.document.activeElement = this; }, scrollIntoView() {}, addEventListener(type, fn) { (this.listeners = this.listeners || {})[type] = fn; }
    });
  }
  return mockElements.get(id);
}
global.document = {
  getElementById: el,
  querySelector: sel => (sel.startsWith('#') ? el(sel.slice(1)) : null),
  querySelectorAll: sel => (sel === '.app-view' ? ['dashboard', 'unified-inbox', 'tickets', 'customer-profiles', 'ai-diagnostics', 'sales-leads', 'billing', 'network-outages'].map(v => el('view-' + v)) : []),
  createElement: tag => ({ tagName: tag.toUpperCase(), className: '', innerHTML: '', textContent: '', style: {}, children: [], attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; },
    appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [] }),
  contains: () => false,
  activeElement: null
};
const bodyClasses = new Set();
global.document.body = { classList: { add: c => bodyClasses.add(c), remove: c => bodyClasses.delete(c), contains: c => bodyClasses.has(c), toggle: (c, on) => { (on === undefined ? !bodyClasses.has(c) : on) ? bodyClasses.add(c) : bodyClasses.delete(c); } } };
global.document.contains = () => true;
const winListeners = {};
let phone = true;
const mqListeners = [];
global.window = { location: { hash: '' }, scrollTo: () => {}, document: global.document,
  addEventListener: (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn); },
  matchMedia: q => ({ get matches() { return q.includes('max-width: 767.98px') ? phone : false; }, addEventListener: (t, fn) => mqListeners.push(fn) }) };
global.setTimeout = fn => fn();
global.clearTimeout = () => {};

const ctx = vm.createContext(global);
try {
  vm.runInContext(scriptCode, ctx);
  console.log('✓ index.html script evaluated into Node runtime.\n');
} catch (err) {
  console.error('FATAL: Script evaluation error in index.html:', err);
  process.exit(1);
}

let total = 0, passed = 0;
function assert(condition, description) {
  total++;
  if (condition) { passed++; console.log(`  [PASS] Test ${total}: ${description}`); }
  else console.error(`  [FAIL] Test ${total}: ${description}`);
}
const idInMarkup = id => new RegExp(`id="${id}"`).test(markup);
const snapshot = () => JSON.stringify({ c: ctx.SPACE_NET_CUSTOMERS, t: ctx.tickets.map(t => ({ id: t.ticketId, s: t.status, a: t.assignedStaff, h: t.history.length })) });

// -------------------------------------------------------------------------
console.log('--- GROUP 1: Markup and CSS (real HTML) ---');
const btnTag = (htmlContent.match(/<button[^>]*id="mobile-nav-btn"[^>]*>/) || [''])[0];
assert(/aria-label="Open navigation"/.test(btnTag) && /aria-controls="app-sidebar"/.test(btnTag) && /aria-expanded="false"/.test(btnTag) && /md:hidden/.test(btnTag), 'Menu button: label, controls, expanded state, phone-only');
assert(/<button[^>]*id="mobile-nav-close"[^>]*aria-label="Close navigation"/.test(htmlContent), 'Drawer has a labelled close button');
assert(idInMarkup('mobile-nav-backdrop'), 'Backdrop element exists');
assert(/<aside id="app-sidebar" class="fixed left-0 top-0 h-full w-64 /.test(htmlContent) && /<div id="main-content-wrapper" class="pl-64 /.test(htmlContent) && /<header id="app-header" class="fixed top-0 left-64 /.test(htmlContent), 'Desktop sidebar/offset classes unchanged (collapse JS still matches them)');
const phoneCss = (htmlContent.match(/@media \(max-width: 767\.98px\) \{([\s\S]*?)\n\}/) || ['', ''])[1];
assert(/#main-content-wrapper \{ padding-left: 0 !important; \}/.test(phoneCss) && /#app-header \{ left: 0 !important;/.test(phoneCss), 'Phone CSS removes the fixed left offsets');
assert(/#app-sidebar \{[^}]*transform: translateX\(-100%\)/.test(phoneCss) && /body\.mobile-nav-open #app-sidebar \{ transform: none;/.test(phoneCss), 'Phone CSS turns the sidebar into an off-canvas drawer');
assert(/#main-content-wrapper input, #main-content-wrapper select, #main-content-wrapper textarea \{ font-size: 16px !important; \}/.test(phoneCss), 'Phone inputs forced to 16px over Tailwind size classes (no iOS focus zoom)');
assert(/prefers-reduced-motion: reduce\) \{\s*#app-sidebar, body\.mobile-nav-open #app-sidebar \{ transition: none; \}/.test(htmlContent), 'Drawer slide is disabled under reduced motion');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 2: Drawer behaviour (phone viewport) ---');
const sidebar = el('app-sidebar'), wrapper = el('main-content-wrapper'), btn = el('mobile-nav-btn'), backdrop = el('mobile-nav-backdrop');
backdrop.classList.add('hidden');
ctx.openMobileNav();
assert(ctx.isMobileNavOpen() && btn.getAttribute('aria-expanded') === 'true', 'Open: drawer open and aria-expanded=true');
assert(sidebar.getAttribute('role') === 'dialog' && sidebar.getAttribute('aria-modal') === 'true' && sidebar.getAttribute('aria-label') === 'Main navigation', 'Open: drawer exposed as a modal dialog');
assert(wrapper.inert === true && ctx.document.body.classList.contains('overflow-hidden') && !backdrop.classList.contains('hidden'), 'Open: page inert, scroll locked, backdrop shown');
assert(ctx.document.activeElement === el('mobile-nav-close'), 'Open: focus moves to the close button');
const esc = { key: 'Escape', stopped: false, stopImmediatePropagation() { this.stopped = true; } };
winListeners.keydown.forEach(fn => fn(esc));
assert(!ctx.isMobileNavOpen() && esc.stopped, 'Escape closes the drawer and stops the app Escape handler');
ctx.document.activeElement = ctx.document.body;
ctx.openMobileNav();
const ctrlK = { key: 'k', ctrlKey: true, stopped: false, prevented: false, stopImmediatePropagation() { this.stopped = true; }, preventDefault() { this.prevented = true; } };
winListeners.keydown.forEach(fn => fn(ctrlK));
assert(ctrlK.stopped && ctrlK.prevented && ctx.isMobileNavOpen(), 'Ctrl+K is blocked while the drawer is open (palette would sit behind the inert page)');
ctx.closeMobileNav();
assert(ctx.document.activeElement === btn, 'Opener was <body> (iOS tap): focus falls back to the menu button');
assert(btn.getAttribute('aria-expanded') === 'false' && sidebar.getAttribute('role') === null && wrapper.inert === false && !ctx.document.body.classList.contains('overflow-hidden') && backdrop.classList.contains('hidden'), 'Close: every open-state change is undone');
assert(ctx.document.activeElement === btn, 'Close: focus returns to the menu button');
const esc2 = { key: 'Escape', stopped: false, stopImmediatePropagation() { this.stopped = true; } };
winListeners.keydown.forEach(fn => fn(esc2));
assert(esc2.stopped === false, 'Escape with the drawer closed is left to the app (modals still close)');
ctx.openMobileNav();
sidebar.listeners.click({ target: { closest: sel => (sel === 'nav a' ? {} : null) } });
assert(!ctx.isMobileNavOpen(), 'Choosing a navigation link closes the drawer');
ctx.openMobileNav();
assert(ctx.closeMobileNav() === true && ctx.closeMobileNav() === false, 'closeMobileNav reports whether it closed anything');
ctx.openMobileNav();
phone = false;
mqListeners.forEach(fn => fn());
assert(!ctx.isMobileNavOpen() && wrapper.inert === false && !ctx.document.body.classList.contains('overflow-hidden'), 'Growing to desktop width cleans up an open drawer');
ctx.openMobileNav();
assert(!ctx.isMobileNavOpen(), 'openMobileNav does nothing at desktop width');

console.log('\n=============================================================');
console.log(`Test Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
console.log('=============================================================');
if (passed !== total) process.exit(1);
console.log('SUCCESS: All mobile shell checks PASSED!');
