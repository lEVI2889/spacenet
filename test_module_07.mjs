// test_module_07.mjs - Module 07 (Billing & Plans) validation suite
// Same vm + mock DOM approach as test_module_02..06. Group 1 reads the real markup,
// so a missing element or a leftover prototype claim cannot pass silently.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 07 Billing & Plans Validation Suite');
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
      setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k] || null; },
      appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [],
      focus() {}, scrollIntoView() {}
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
global.window = { location: { hash: '' }, scrollTo: () => {}, addEventListener: () => {}, document: global.document };
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
console.log('--- GROUP 1: Static markup integrity (real HTML) ---');
['view-billing', 'billing-stats', 'billing-search', 'billing-status-filter', 'billing-invoice-body', 'billing-requests', 'billing-package-btn',
  'billing-shift-btn', 'invoice-modal', 'invoice-modal-container', 'invoice-modal-id', 'invoice-modal-title', 'invoice-modal-sub', 'invoice-modal-body',
  'billing-request-modal', 'billing-request-container', 'billing-request-title', 'billing-req-customer', 'billing-req-circuit', 'billing-req-package',
  'billing-req-package-wrap', 'billing-req-address', 'billing-req-address-wrap', 'billing-req-preview', 'billing-req-error'].forEach(id => assert(idInMarkup(id), `Static element #${id} exists`));
const m07Start = appScript.indexOf('MODULE 07: BILLING & PLANS');
const m07End = appScript.indexOf('MODULE 09: TECHNICIAN OPERATIONS');
const m07Code = appScript.slice(m07Start, m07End);
const literalIds = [...new Set([...m07Code.matchAll(/getElementById\('([a-z0-9-]+)'\)/g)].map(m => m[1]))];
assert(m07Start > 0 && m07End > m07Start, 'Module 07 code section located');
assert(literalIds.length > 10 && literalIds.every(idInMarkup), `Every literal id looked up by Module 07 exists in markup (${literalIds.length} ids)`);
assert(/data-path="billing"[^>]*>(?:(?!<\/a>)[\s\S])*id="nav-badge-billing"/.test(markup), 'Sidebar link for Billing exists and carries its live badge');
assert((appScript.match(/(validViews|availableViews) = \[[^\]]*'billing'[^\]]*\]/g) || []).length === 2, 'Router accepts #billing in both view lists');
const escBlock = appScript.slice(appScript.indexOf("e.key === 'Escape'"), appScript.indexOf("e.key === 'Escape'") + 450);
assert(/closeBillingDialogs\(\);/.test(escBlock), 'Escape handler closes the billing dialogs');
assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(m07Code), 'Billing code makes no network calls');
// All modules share one script scope: a repeated name silently replaces another module's function or crashes the page.
const dupNames = names => names.filter((n, i) => names.indexOf(n) !== i);
assert(dupNames([...appScript.matchAll(/^ {2}function ([A-Za-z0-9_]+)/gm)].map(m => m[1])).length === 0, 'No duplicate top-level function names in the app script');
assert(dupNames([...appScript.matchAll(/^ {2}(?:const|let) ([A-Za-z0-9_]+)/gm)].map(m => m[1])).length === 0, 'No duplicate top-level const/let names in the app script');
const billingMarkup = markup.slice(markup.indexOf('id="view-billing"'), markup.indexOf('id="invoice-modal"'));
assert(/fictional demo data/i.test(billingMarkup) && /no payment is ever taken/i.test(billingMarkup), 'Billing view states demo data and no payment taken');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 2: Invoices derived from customers and the catalog ---');
const invoices = ctx.invoices;
const customersBefore = JSON.stringify(ctx.SPACE_NET_CUSTOMERS);
const ticketsBefore = snapshot();
assert(invoices.length === 11, '9 current invoices plus 2 October carry-overs');
assert(invoices.every(i => /^INV-\d+$/.test(i.invoiceId) && i.isDemo) && new Set(invoices.map(i => i.invoiceId)).size === 11, 'Unique INV-<NUM> ids, all flagged isDemo');
assert(invoices.every(i => ctx.SPACE_NET_CUSTOMERS.some(c => c.customerId === i.customerId)), 'Every invoice belongs to an existing customer');
const priceOf = key => parseInt(ctx.SPACE_NET_PACKAGES.find(p => p.key === key).price.replace(/\D/g, ''), 10);
assert(invoices.every(i => i.lines.every(l => l.packageKey && l.amount === priceOf(l.packageKey)) && i.total === i.lines.reduce((s, l) => s + l.amount, 0)), 'Every line is billed at its catalog BDT price and totals add up');
const alexInv = ctx.getInvoiceById('INV-11001');
assert(alexInv.lines.length === 2 && alexInv.total === 3500 + 1200, 'Alex: two connections billed (Fiber Pro 500 + Home Lite 100 = 4,700)');
assert(ctx.mapPlanToPackageKey('Dedicated Leased Line 1Gbps') === 'office_1g' && ctx.mapPlanToPackageKey('Home 150M') === 'home_150m' && ctx.mapPlanToPackageKey('Unknown plan') === null, 'Plan-to-package demo mapping');
const nabila = ctx.SPACE_NET_CUSTOMERS.find(c => c.customerId === 'CUST-3340');
assert(ctx.getInvoiceById('INV-11007').dueDate === '2026-11-' + String(parseInt(nabila.billingCycle, 10)).padStart(2, '0'), 'Due date follows the customer billing cycle');
assert(ctx.getInvoiceStatus(ctx.getInvoiceById('INV-10901'), '2026-11-01') === 'overdue' && ctx.getInvoiceStatus(alexInv, '2026-11-01') === 'unpaid' && ctx.getInvoiceStatus(ctx.getInvoiceById('INV-11002'), '2026-11-01') === 'paid', 'Overdue / unpaid / paid derived correctly');
ctx.renderBillingView(); ctx.renderBillingView();
assert((el('billing-invoice-body').innerHTML.match(/openInvoiceModal\('INV-/g) || []).length === 11 && ctx.invoices.length === 11, 'Re-rendering does not duplicate invoices');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 3: Simulated payments ---');
const pay1 = ctx.recordSimulatedPayment('INV-11003', 'bkash');
const pay2 = ctx.recordSimulatedPayment('INV-11005', 'nagad');
const pay3 = ctx.recordSimulatedPayment('INV-11007', 'card');
assert(pay1 && pay2 && pay3 && [pay1, pay2, pay3].map(p => p.method).join() === 'bkash,nagad,card', 'bKash, Nagad and Card payments recorded');
assert([pay1, pay2, pay3].every(p => p.note === 'Simulated — no payment taken' && /^PAY-\d+$/.test(p.paymentId)), 'Every payment is labelled simulated with a PAY id');
assert(new Set(invoices.flatMap(i => i.payments.map(p => p.paymentId))).size === invoices.reduce((n, i) => n + i.payments.length, 0), 'Payment ids are unique');
assert(pay1.amount === ctx.getInvoiceById('INV-11003').total && ctx.getInvoiceById('INV-11003').status === 'paid', 'Payment covers the invoice total and marks it paid');
assert(ctx.recordSimulatedPayment('INV-11003', 'card') === null && ctx.getInvoiceById('INV-11003').payments.length === 1, 'Repeat payment on a paid invoice is refused (no duplicate)');
assert(ctx.recordSimulatedPayment('INV-11004', 'paypal') === null && ctx.recordSimulatedPayment('INV-0000', 'bkash') === null, 'Unknown method or invoice rejected');
ctx.currentInvoiceId = 'INV-10902';
ctx.payInvoiceFromModal();
assert(ctx.getInvoiceById('INV-10902').status === 'paid' && /Simulated — no payment taken/.test(el('toast-msg').textContent), 'Dialog payment shows the simulated notice');
ctx.payInvoiceFromModal();
assert(el('toast-title').textContent === 'Already Paid' && ctx.getInvoiceById('INV-10902').payments.length === 1, 'Second confirm in the dialog does not duplicate');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 4: Payment reminders ---');
const rem = ctx.recordPaymentReminder('INV-10901');
assert(rem && rem.note === 'Simulated — no message sent' && ctx.getInvoiceById('INV-10901').reminders.length === 1, 'Reminder logged with the simulated label');
assert(ctx.recordPaymentReminder('INV-11002') === null, 'No reminder for a paid invoice');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 5: Package change requests ---');
assert(ctx.createPackageChangeRequest('CUST-6210', 'SPN-FBR-6210', 'gamer_300m').error, 'Same package rejected');
assert(ctx.createPackageChangeRequest('CUST-6210', 'SPN-NOPE', 'pro_500m').error && ctx.createPackageChangeRequest('CUST-6210', 'SPN-FBR-6210', 'mega_10g').error, 'Unknown circuit or package rejected');
const up = ctx.createPackageChangeRequest('CUST-6210', 'SPN-FBR-6210', 'pro_500m').request;
assert(up && up.requestId === 'PCR-3001' && up.kind === 'upgrade' && up.priceDiff === 3500 - 2500 && up.status === 'submitted', 'Upgrade request: Gamer 300 → Pro 500, +৳1,000');
assert(ctx.createPackageChangeRequest('CUST-6210', 'SPN-FBR-6210', 'office_1g').error && ctx.packageChangeRequests.length === 1, 'Second pending request for the same connection rejected');
const down = ctx.createPackageChangeRequest('CUST-8832', 'SPN-FBR-0942', 'home_150m').request;
assert(down && down.kind === 'upgrade' && down.priceDiff === 400, 'Request on a secondary connection (Lite 100 → Home 150)');
const down2 = ctx.createPackageChangeRequest('CUST-7721', 'SPN-FBR-7721', 'home_150m').request;
assert(down2 && down2.kind === 'downgrade' && down2.priceDiff === 1600 - 5500, 'Downgrade request computed');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 6: Line shifting requests ---');
const shift = ctx.createLineShiftRequest('CUST-3340', 'SPN-FBR-3340', 'House 5, Road 3, Banani').request;
assert(shift && shift.requestId === 'LSR-4001' && shift.coverageStatus === 'covered' && shift.areaName === 'Banani', 'Shift to Banani is covered');
assert(ctx.createLineShiftRequest('CUST-3340', 'SPN-FBR-3340', 'Gulshan 2').error, 'Second pending shift for the same connection rejected');
const unknown = ctx.createLineShiftRequest('CUST-7719', 'SPN-FBR-7719', 'Purbachal sector 4').request;
assert(unknown && unknown.coverageStatus === 'unverified', 'Unknown destination is Unverified, not Not covered');
assert(ctx.createLineShiftRequest('CUST-4491', 'SPN-FBR-4491', 'Hemayetpur, Savar').request.coverageStatus === 'not_covered', 'Documented unsupported area is Not covered');
assert(ctx.createLineShiftRequest('CUST-1092', 'SPN-VDS-1092', '  ').error, 'Empty address rejected');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 7: Form flow and no side effects ---');
ctx.openPackageChangeModal();
el('billing-req-customer').value = 'CUST-5120';
ctx.onBillingRequestCustomerChange();
el('billing-req-circuit').value = 'SPN-FBR-5120';
el('billing-req-package').value = 'home_150m';
assert(ctx.submitBillingRequestForm({ preventDefault() {} }) === null && /already the current package/.test(el('billing-req-error').textContent), 'Form shows the same-package error');
el('billing-req-package').value = 'streamer_200m';
ctx.updateBillingRequestPreview();
assert(/Home \(150 Mbps\)/.test(el('billing-req-preview').innerHTML) && /\+৳400/.test(el('billing-req-preview').innerHTML), 'Preview shows current package and the price difference');
const viaForm = ctx.submitBillingRequestForm({ preventDefault() {} });
assert(viaForm && viaForm.toPackageKey === 'streamer_200m' && /No account change was made/.test(el('toast-msg').textContent), 'Form creates the request and says nothing changed on the account');
ctx.openLineShiftModal();
assert(!el('billing-req-address-wrap').classList.contains('hidden') && el('billing-req-package-wrap').classList.contains('hidden'), 'Line-shift mode shows the address field only');
assert(JSON.stringify(ctx.SPACE_NET_CUSTOMERS) === customersBefore, 'No customer record (plan, address, status) was changed by billing actions');
assert(snapshot() === ticketsBefore, 'No ticket was changed by billing actions');
ctx.renderBillingView();
assert(/Open requests[\s\S]*?<dd[^>]*>7</.test(el('billing-stats').innerHTML) || /Open requests<\/dt>\s*<dd[^>]*>7</.test(el('billing-stats').innerHTML), 'Stats count the 7 open requests');
assert(/PCR-3001/.test(el('billing-requests').innerHTML) && /LSR-4001/.test(el('billing-requests').innerHTML), 'Requests panel lists package and line-shift requests');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 8: Dialogs and navigation ---');
ctx.openInvoiceModal('INV-11001');
assert(el('invoice-modal-title').textContent === 'Alex Rivera' && /Confirm simulated payment of ৳4,700/.test(el('invoice-modal-body').innerHTML), 'Invoice dialog shows total and payment action');
ctx.closeBillingDialogs();
assert(el('invoice-modal').classList.contains('hidden') && el('billing-request-modal').classList.contains('hidden'), 'closeBillingDialogs closes both dialogs');
ctx.openInvoiceModal('INV-0000');
assert(el('toast-title').textContent === 'Invoice Not Found', 'Unknown invoice shows a not-found message');
el('billing-status-filter').value = 'overdue';
// The filter uses the real clock, so compare against the same derivation instead of a fixed date.
const expectedOverdue = ctx.invoices.filter(i => ctx.getInvoiceStatus(i) === 'overdue').map(i => i.invoiceId).join();
assert(ctx.getFilteredInvoices().map(i => i.invoiceId).join() === expectedOverdue && expectedOverdue.includes('INV-10901') && !expectedOverdue.includes('INV-10902'), 'Overdue filter matches derived status (INV-10901 overdue; INV-10902 was paid above)');
el('billing-status-filter').value = 'ALL';
el('billing-search').value = 'vanguard';
assert(ctx.getFilteredInvoices().every(i => i.customerId === 'CUST-4410') && ctx.getFilteredInvoices().length === 2, 'Search by customer name');
el('billing-search').value = '';
ctx.openBillingCustomer('CUST-4410');
assert(ctx.currentActiveView === 'customer-profiles', 'Customer link opens the Customer 360 view');
ctx.switchView('billing');
assert(!el('view-billing').classList.contains('hidden') && ctx.currentActiveView === 'billing', 'switchView shows the billing view');

console.log('\n=============================================================');
console.log(`Test Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
console.log('=============================================================');
if (passed !== total) process.exit(1);
console.log('SUCCESS: All Module 07 checks PASSED!');
