// test_calm_ui.mjs - Calm Precision redesign: phone Inbox list/chat model, phone ticket cards, moved
// controls, sidebar collapse, motion tokens and reduced motion. Same vm harness as the other suites.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Calm Precision UI Suite');
console.log('=============================================================\n');

const html = readFileSync(resolve('./index.html'), 'utf-8');
const appScript = [...html.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)].find(m => m[1].includes('SPACE_NET_CUSTOMERS'))[1];
const css = (html.match(/<style id="spacenet-theme">([\s\S]*?)<\/style>/) || [])[1] || '';
const markup = html.replace(/<script[\s\S]*?<\/script>/g, '');

let total = 0, passed = 0;
function assert(cond, msg) { total++; if (cond) { passed++; console.log(`  [PASS] Test ${total}: ${msg}`); } else console.error(`  [FAIL] Test ${total}: ${msg}`); }

const mockElements = new Map();
function el(id) {
  if (!mockElements.has(id)) {
    const classes = new Set(id.startsWith('view-') && id !== 'view-dashboard' ? ['hidden'] : []);
    mockElements.set(id, { id, textContent: '', innerHTML: '', value: '', className: '', style: {}, attributes: {}, children: [], focused: false, dataset: {},
      classList: { add: (...a) => a.forEach(c => classes.add(c)), remove: (...a) => a.forEach(c => classes.delete(c)), contains: c => classes.has(c), toggle: (c, on) => (on === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : on ? classes.add(c) : classes.delete(c)) },
      setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k] ?? null; }, removeAttribute(k) { delete this.attributes[k]; },
      appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [], focus() { this.focused = true; }, scrollIntoView() {} });
  }
  return mockElements.get(id);
}
const threadItem = { focused: false, focus() { this.focused = true; } };
global.document = { getElementById: el, querySelector: sel => (sel.startsWith('#') ? el(sel.slice(1)) : (sel.includes('chat-thread-item') && sel.includes(`"${ctx.currentConversationId}"`) ? threadItem : null)), querySelectorAll: () => [],
  createElement: tag => ({ tagName: tag.toUpperCase(), className: '', innerHTML: '', textContent: '', style: {}, children: [], attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [] }),
  contains: () => false, activeElement: null };
global.window = { location: { hash: '' }, scrollTo: () => {}, addEventListener: () => {}, document: global.document };
global.setTimeout = () => 0; global.clearTimeout = () => {};
const ctx = vm.createContext(global);
try { vm.runInContext(appScript.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var '), ctx); } catch (err) { console.error('FATAL:', err); process.exit(1); }

console.log('--- Inbox on phones and tablets: one pane at a time ---');
const ws = el('inbox-workspace');
assert(/id="inbox-workspace" data-mobile-pane="list"/.test(markup), 'The Inbox starts on the conversation list');
ctx.currentActiveView = 'unified-inbox';
ctx.selectConversation('CONV-FB-4491');
assert(ws.getAttribute('data-mobile-pane') === 'chat', 'Opening a conversation brings the chat forward');
assert(ctx.getConversation('CONV-FB-4491').unread === false, 'Opening it still marks it read (PR #23 rule unchanged)');
threadItem.focused = false;
ctx.showInboxList();
assert(ws.getAttribute('data-mobile-pane') === 'list' && threadItem.focused, 'Back returns to the list and puts focus on the conversation that was open');
ctx.selectConversation('CONV-WA-8832'); ctx.openInboxQueue('awaiting');
assert(ws.getAttribute('data-mobile-pane') === 'list' && ctx.currentQueueFilter === 'awaiting', 'The Admin deep link lands on the awaiting queue list, not a stale chat');
assert(/<button type="button" id="inbox-back-btn" onclick="showInboxList\(\)" aria-label="Back to conversations"/.test(markup), 'The Back control is a labelled button in the chat header');
assert(/@media \(max-width: 1023\.98px\) \{\s*#inbox-back-btn \{ display: inline-flex; \}\s*#inbox-workspace\[data-mobile-pane="list"\] > :nth-child\(2\) \{ display: none; \}\s*#inbox-workspace\[data-mobile-pane="chat"\] > :first-child \{ display: none; \}/.test(css),
  'Below 1024px exactly one pane shows; wide screens keep both panes and hide Back');

const dock = (markup.match(/<div id="chat-composer-dock">[\s\S]*?id="chat-send-btn"/) || [''])[0];
assert(/id="composer-mode-msg-btn"/.test(dock) && /id="composer-mode-note-btn"/.test(dock) && /id="chat-input"/.test(dock),
  'Mode tabs, message field and Send sit together in one composer dock');
assert(/@media \(max-width: 1023\.98px\) \{\s*\/\*[^*]*\*\/\s*#inbox-workspace > :nth-child\(2\) \{ overflow: clip; \}\s*#chat-composer-dock \{ position: sticky; bottom: 0;/.test(css),
  'Below 1024px the composer dock sticks to the bottom of the screen (pane clipped, not a scroll container), so Send is always in reach');

console.log('\n--- Tickets on phones and tablets: cards, nothing clipped ---');
const phone = (css.match(/@media \(max-width: 1023\.98px\) \{\s*#view-tickets table[\s\S]*?\n\}/) || [''])[0];
assert(/#view-tickets thead \{ display: none; \}/.test(phone) && /#ticket-table-body tr \{ display: grid;/.test(phone), 'Below 1024px each ticket row becomes a card (no header row, no sideways table)');
const hidden = (phone.match(/#ticket-table-body td:nth-child\(1\), #ticket-table-body td:nth-child\(4\) \{ display: none; \}/) || []).length;
assert(hidden === 1 && !/td:nth-child\((2|3|5|6|7|8|9)\)[^{]*\{ display: none/.test(phone), 'Only the bulk-select checkbox and connection type are dropped; ID, customer, issue, priority, agent, status and actions stay');
assert(['id', 'cust', 'issue', 'prio', 'agent', 'status', 'actions'].every(a => new RegExp(`grid-area: ${a};`).test(phone)), 'Every kept cell has its place in the card');
ctx.renderTicketTable();
const row = el('ticket-table-body').children.findLast(r => r.innerHTML.includes('#TKT-9042<')) || { innerHTML: '' };
assert(/<button[^>]*openTicketDetail\('TKT-9042'\)/.test(row.innerHTML) && /title="Quick Resolve"/.test(row.innerHTML), 'Card cells still carry the keyboard-operable ticket ID and the Quick Resolve action');
const laptop = (css.match(/@media \(min-width: 1024px\) and \(max-width: 1279\.98px\) \{([\s\S]*?)\n\}/) || [])[1] || '';
assert(/#view-tickets thead th:nth-child\(4\), #ticket-table-body td:nth-child\(4\) \{ display: none; \}/.test(laptop) && !/nth-child\((2|3|5|6|7|8|9)\)[^{]*\{ display: none/.test(laptop),
  'Small laptops (1024-1279px): only the connection-type column is dropped so the table fits with its actions visible');

console.log('\n--- Layouts that used to leave empty space ---');
assert(/id="dash-kpis" class="grid grid-cols-2 xl:grid-cols-4/.test(markup), 'Dashboard: eight KPIs in two columns on phones (four on wide screens)');
assert(/id="tech-job-list"[^>]*md:grid-cols-2 2xl:grid-cols-3/.test(markup) && /id="tech-roster" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4/.test(markup) && markup.indexOf('id="tech-job-list"') < markup.indexOf('id="tech-roster"'),
  'Technicians: jobs first, then a full-width roster grid (no long side column)');
assert(/id="noc-outage-list" class="grid grid-cols-1 gap-space-sm"/.test(markup), 'Outages: one compact list (no half-empty two-column grid)');
const salesCss = (css.match(/@media \(max-width: 1359\.98px\) \{\s*#sales-pipeline > section \{ display: none; width: 100%; \}([\s\S]*?)\n\}/) || [''])[0];
assert(/#sales-pipeline > section\.sales-col-active \{ display: grid;/.test(salesCss) && /@media \(min-width: 1360px\) \{ #sales-pipeline > section \{ flex: 1 1 0; \} \}/.test(css) && !/lg:min-w-\[240px\]/.test(appScript),
  'Sales: below 1360px one complete stage shows at a time; from 1360px all five columns share the width (no stage scrolled out of view)');
ctx.renderSalesPipeline();
const board = el('sales-pipeline'), strip = el('sales-stage-strip');
assert(/id="sales-col-new" class="sales-col-active /.test(board.innerHTML) && /data-stage="new" aria-pressed="true"/.test(strip.innerHTML) && (board.innerHTML.match(/sales-col-active/g) || []).length === 1,
  'Sales: the first stage is selected by default, in the board and in the stage strip');
const leadStatuses = JSON.stringify(ctx.leads.map(l => l.status));
ctx.scrollToLeadStage('lost'); ctx.renderSalesPipeline();
assert(/id="sales-col-lost" class="sales-col-active /.test(board.innerHTML) && /data-stage="lost" aria-pressed="true"/.test(strip.innerHTML) && /data-stage="new" aria-pressed="false"/.test(strip.innerHTML) && (board.innerHTML.match(/<section /g) || []).length === 5,
  'Sales: choosing a stage in the strip selects it and survives a re-render; all five stages are still rendered');
assert(JSON.stringify(ctx.leads.map(l => l.status)) === leadStatuses, 'Sales: selecting a stage is view state only; no lead changes stage');
const billCss = (css.match(/@media \(max-width: 1023\.98px\) \{\s*#view-billing table[\s\S]*?\n\}/) || [''])[0];
assert(/#view-billing thead \{ display: none; \}/.test(billCss) && !/#billing-invoice-body td[^{]*\{ display: none/.test(billCss) && ['id', 'cust', 'pkg', 'amount', 'due', 'status', 'view'].every(a => new RegExp(`grid-area: ${a};`).test(billCss)),
  'Billing below 1024px: each invoice is a card and every column (ID, customer, packages, amount, due, status, View) keeps a place');
ctx.renderBillingView();
const invRow = el('billing-invoice-body').innerHTML;
assert(/<span class="billing-card-label">Due <\/span>/.test(invRow) && /<button type="button" onclick="openInvoiceModal\('INV-/.test(invRow), 'Billing cards label the due date and keep the View button wired to the existing invoice dialog');
assert(/hardwareCard\.open = false/.test(appScript) && /max-width: 1023\.98px/.test(appScript), 'Diagnostics: on narrow screens the equipment inspector starts collapsed (current step first)');

console.log('\n--- Shell ---');
const sidebar = el('app-sidebar');
const before = ctx.isSidebarCollapsed;
ctx.toggleSidebarCollapse();
const after = ctx.isSidebarCollapsed;
ctx.toggleSidebarCollapse();
assert(after === !before && ctx.isSidebarCollapsed === before, 'Sidebar collapse and expand toggle state both ways');
assert(/#app-sidebar nav a\.bg-primary-container \{ background-color: rgb\(var\(--c-primary\) \/ \.1\); color: rgb\(var\(--c-primary\)\);/.test(css), 'The active navigation item is tinted, not a solid colour block');
assert(/#app-header \{ background-color: var\(--chrome\); -webkit-backdrop-filter: none; backdrop-filter: none;/.test(css) && /\.backdrop-blur-xs, \.backdrop-blur-sm \{ -webkit-backdrop-filter: none; backdrop-filter: none; \}/.test(css),
  'No large backdrop blurs (header, sidebar, dialog overlays): measured frame cost removed');
assert(/--chrome: rgb\(27 27 30\);/.test(css) && /--chrome: rgb\(246 246 244\);/.test(css), 'Header and sidebar surfaces are opaque in both themes (no page text ghosting through the header)');
const toastTitle = () => el('toast-title').textContent;
el('toast-title').textContent = 'none';
ctx.isSidebarCollapsed = false;
global.window.matchMedia = q => ({ matches: q === '(min-width: 1024px) and (max-width: 1279.98px)' });
ctx.syncSidebarRail();
const railed = ctx.isSidebarCollapsed;
ctx.syncSidebarRail();
const stable = ctx.isSidebarCollapsed;
global.window.matchMedia = () => ({ matches: false });
ctx.syncSidebarRail();
assert(railed && stable && !ctx.isSidebarCollapsed && toastTitle() === 'none', 'Small laptops (1024-1279px) get the icon rail silently; other widths get the full sidebar back');
delete global.window.matchMedia;
const toggleSrc = (appScript.match(/function toggleSidebarCollapse\([\s\S]*?\n  \}/) || [''])[0];
assert(toggleSrc && !/classList\.(add|remove)\('hidden'\)/.test(toggleSrc) && /#app-sidebar\.w-20 nav a > span:not\(\.material-symbols-outlined\):not\(\.side-badge\) \{ position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect\(0 0 0 0\);/.test(css),
  'Collapsed rail hides every link label visually only (never display:none), so all ten links keep their text as the accessible name');

console.log('\n--- Motion ---');
assert(/--ease: cubic-bezier\(\.4, 0, \.2, 1\); --dur-1: 120ms; --dur-2: 200ms; --dur-3: 280ms;/.test(css), 'One motion curve and three durations are defined');
assert(/\.app-view:not\(\.hidden\) \{ animation: space-view-in 220ms cubic-bezier\(\.4, 0, \.2, 1\); \}/.test(css), 'Module transitions are short (220ms) on the shared curve');
assert(/details\[open\] > :not\(summary\) \{ animation: calm-disclose var\(--dur-2\) var\(--ease\); \}/.test(css), 'Disclosures reveal their content with a short fade');
assert(/#space-backdrop \.space-nebula-glow, #space-backdrop \.space-stars-near::before \{ animation: none; \}/.test(css) && /#space-backdrop \.space-nebula \{ display: none; \}/.test(css),
  'No constantly animated background (nebula drift and twinkle removed)');
const reduced = (css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/) || [])[1] || '';
assert(/details\[open\] > :not\(summary\) \{ animation: none; \}/.test(reduced) && /\.disclosure-chevron, #app-sidebar nav a \{ transition: none; \}/.test(reduced) && /\.app-view:not\(\.hidden\) \{ animation: space-view-fade/.test(reduced),
  'Reduced motion turns off the new disclosure, chevron and navigation motion (view change becomes a fade)');

console.log(`\nRESULT: ${passed}/${total} passed`);
if (passed !== total) process.exit(1);
