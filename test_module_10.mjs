// test_module_10.mjs - Module 10 (Admin & Analytics) validation suite
// Same vm + mock DOM approach as test_module_02..06. Group 1 reads the real markup,
// so a missing element or a leftover prototype claim cannot pass silently.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 10 Admin & Analytics Validation Suite');
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
  querySelectorAll: sel => (sel === '.app-view' ? ['dashboard', 'unified-inbox', 'tickets', 'customer-profiles', 'ai-diagnostics', 'sales-leads', 'billing', 'technicians', 'analytics', 'network-outages'].map(v => el('view-' + v)) : []),
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
['view-analytics', 'analytics-grid', 'dash-kpis', 'nav-badge-inbox', 'nav-badge-tickets', 'nav-badge-customers', 'nav-badge-sales',
  'nav-badge-billing', 'nav-badge-technicians', 'nav-badge-outages', 'admin-ai-channels', 'admin-hours-form', 'admin-hours-start', 'admin-hours-end',
  'admin-hours-days', 'admin-hours-error', 'admin-hours-summary', 'admin-roles-head', 'admin-roles-body', 'admin-pricing', 'admin-pricing-error'].forEach(id => assert(idInMarkup(id), `Static element #${id} exists`));
const m10Start = appScript.indexOf('MODULE 10: ADMIN & ANALYTICS');
const m10End = appScript.indexOf('// 8. Command Palette');
const m10Code = appScript.slice(m10Start, m10End);
const literalIds = [...new Set([...m10Code.matchAll(/getElementById\('([a-z0-9-]+)'\)/g)].map(m => m[1]))];
assert(m10Start > 0 && m10End > m10Start, 'Module 10 code section located');
assert(literalIds.length >= 12 && literalIds.every(idInMarkup), `Every literal id looked up by Module 10 exists in markup (${literalIds.length} ids)`);
assert([['unified-inbox','nav-badge-inbox'],['tickets','nav-badge-tickets'],['customer-profiles','nav-badge-customers'],['sales-leads','nav-badge-sales'],['billing','nav-badge-billing'],['technicians','nav-badge-technicians'],['network-outages','nav-badge-outages']].every(([p, b]) => new RegExp(`data-path="${p}"[^>]*>(?:(?!</a>)[\\s\\S])*id="${b}"`).test(markup)), 'Every navigation badge sits inside its sidebar link');
assert(/data-path="analytics"/.test(markup) && (appScript.match(/(validViews|availableViews) = \[[^\]]*'analytics'[^\]]*\]/g) || []).length === 2, 'Sidebar link and both router lists include #analytics');
assert(!/>4,829<|>3,912<|>142<|\$38,400|81\.0% Auto|1 Active\s*<\/span>/.test(markup), 'Hardcoded dashboard KPI figures and the static "1 Active" badge are gone');
assert((markup.match(/Illustrative sample/g) || []).length === 2, 'Remaining static dashboard chart and activity feed are labelled illustrative');
assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(m10Code), 'No network calls in Module 10');
assert(/do not restrict access or provide security/.test(markup) && /Configuration only/.test(markup), 'Roles and working hours are honestly labelled');
const dupNames = names => names.filter((n, i) => names.indexOf(n) !== i);
assert(dupNames([...appScript.matchAll(/^ {2}function ([A-Za-z0-9_]+)/gm)].map(m => m[1])).length === 0 && dupNames([...appScript.matchAll(/^ {2}(?:const|let) ([A-Za-z0-9_]+)/gm)].map(m => m[1])).length === 0, 'No duplicate top-level names after adding Module 10');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 2: Every metric matches its source records ---');
const m = ctx.getCrmMetrics();
assert(m.conversations === ctx.conversations.length && m.aiHandled + m.humanHandled === ctx.conversations.length, 'Conversation counts');
assert(m.byChannel.reduce((s, r) => s + r.value, 0) === ctx.conversations.length, 'Channel breakdown sums to all conversations');
assert(m.openTickets === ctx.tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length && m.openTickets === 4 && m.escalatedTickets === 1, 'Open (4) and escalated (1) tickets');
assert(m.ticketsByStatus.reduce((s, r) => s + r.value, 0) === ctx.tickets.length, 'Ticket status breakdown sums to all tickets');
const resolved = ctx.tickets.filter(t => t.resolvedAt && t.createdAt);
const manualHours = resolved.reduce((s, t) => s + (Date.parse(t.resolvedAt) - Date.parse(t.createdAt)), 0) / resolved.length / 3600000;
assert(m.resolutionSample === resolved.length && Math.abs(m.avgResolutionHours - manualHours) < 1e-9, 'Average resolution time computed from ticket timestamps');
const ratings = ctx.tickets.filter(t => t.feedback && typeof t.feedback.rating === 'number').map(t => t.feedback.rating);
assert(m.csatCount === ratings.length && m.csatCount === 2 && m.csatAverage === 5, 'CSAT from the 2 rated tickets');
assert(m.leads === 6 && m.activeLeads === 4 && m.newLeads === 2 && m.connectedLeads === 1 && Math.abs(m.conversionRate - 1 / 6) < 1e-9, 'Lead counts and conversion (1 of 6)');
assert(m.leadsByStage.reduce((s, r) => s + r.value, 0) === ctx.leads.length, 'Lead stage breakdown sums to all leads');
assert(m.complaintsByZone.reduce((s, r) => s + r.value, 0) === ctx.tickets.filter(t => ['NO_INTERNET', 'SLOW_INTERNET'].includes(t.category)).length, 'Zone complaints sum to all connectivity tickets');
assert(m.activeOutages === 1 && m.plannedOutages === 1 && m.closedOutages === 1 && m.nocSpikes === 0, 'Outage counts (1 active, 1 planned, 1 closed, 0 spikes)');
assert(m.openJobs === ctx.techJobs.filter(j => j.status !== 'completed').length && m.unassignedJobs === 1, 'Field job counts');
assert(m.outstanding === ctx.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0) && m.overdueInvoices === ctx.invoices.filter(i => ctx.getInvoiceStatus(i) === 'overdue').length, 'Billing outstanding and overdue');
assert(m.collected === ctx.invoices.reduce((s, i) => s + i.payments.reduce((p, x) => p + x.amount, 0), 0), 'Collected equals recorded simulated payments');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 3: Dashboard tiles and navigation badges ---');
ctx.renderDashboardKpis();
const kpis = el('dash-kpis').innerHTML;
assert((kpis.match(/Live from demo records/g) || []).length === 8, 'Eight live KPI tiles');
assert(/>7<\/span>/.test(kpis) && />4<\/span>/.test(kpis), 'Tiles show the computed counts');
ctx.refreshNavBadges();
const badge = id => el(id).textContent;
assert(badge('nav-badge-inbox') === '7' && badge('nav-badge-tickets') === '4' && badge('nav-badge-customers') === '9' && badge('nav-badge-sales') === '4', 'Inbox, tickets, customers and sales badges');
assert(badge('nav-badge-outages') === '1' && badge('nav-badge-technicians') === '2' && badge('nav-badge-billing') === String(m.overdueInvoices), 'Outage, technician and billing badges');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 4: State stays consistent across modules ---');
const before = { lead: ctx.getCrmMetrics().activeLeads };
ctx.createLead({ name: 'Metric Check', phone: '+880 1000-000777', locationText: 'Banani' });
ctx.showToast('Lead Created', 'x');
assert(ctx.getCrmMetrics().activeLeads === before.lead + 1 && badge('nav-badge-sales') === String(before.lead + 1), 'New lead updates the metric and the badge (via the toast hook)');
const utt = ctx.getOutageById('OUT-UTT-0107');
while (ctx.isOutageOpen(utt)) ctx.advanceOutageStatus(utt.outageId);
ctx.showToast('Outage', 'x');
assert(ctx.getCrmMetrics().activeOutages === 0 && el('nav-badge-outages').classList.contains('hidden'), 'Resolving the outage clears the active metric and hides the badge');
const job = ctx.getTechJobById('TASK-TECH-7002');
['on_the_way', 'working', 'completed'].forEach(() => ctx.advanceTechJob(job.jobId));
assert(ctx.getCrmMetrics().completedJobs === 1 && ctx.getCrmMetrics().openJobs === ctx.techJobs.length - 1, 'Completing a job updates technician metrics');
const repair = ctx.tickets.find(t => ctx.TECH_REPAIR_CATEGORIES.includes(t.category) && !['ESCALATED', 'RESOLVED', 'CLOSED'].includes(t.status));
const jobs0 = ctx.getCrmMetrics().openJobs;
repair.status = 'ESCALATED';
assert(ctx.getCrmMetrics().openJobs === jobs0 + 1, 'An escalated repair ticket counts as an open job before Technicians is opened');
const out0 = ctx.getCrmMetrics().outstanding, paid0 = ctx.getCrmMetrics().paidInvoices;
const inv = ctx.getInvoiceById('INV-11003');
ctx.recordSimulatedPayment('INV-11003', 'bkash');
assert(ctx.getCrmMetrics().outstanding === out0 - inv.total && ctx.getCrmMetrics().paidInvoices === paid0 + 1, 'Simulated payment updates billing metrics');
ctx.window.location.hash = '#analytics';
ctx.refreshAdminViews();
assert(/Mission|Conversations/.test(el('analytics-grid').innerHTML) && /Not available in demo data/.test(el('analytics-grid').innerHTML), 'Opening Analytics renders current figures and honest not-available notes');
ctx.window.location.hash = '#dashboard';
ctx.refreshAdminViews();
assert(/Live from demo records/.test(el('dash-kpis').innerHTML), 'Opening the Dashboard re-renders the tiles');
ctx.window.location.hash = '';

// -------------------------------------------------------------------------
console.log('\n--- GROUP 5: AI auto-reply per channel ---');
const conv = ctx.conversations.find(c => c.channel === 'whatsapp' && c.status === 'ai_handling');
assert(ctx.setAiChannelEnabled('whatsapp', false) && !ctx.isAiChannelEnabled('whatsapp') && ctx.setAiChannelEnabled('sms', false) === false, 'Toggle a known channel; unknown channel rejected');
ctx.currentConversationId = conv.conversationId;
const n0 = conv.messages.length;
ctx.executeSimulateCustomerMessage('What are your support working hours?');
assert(conv.messages.length === n0 + 1 && conv.messages[conv.messages.length - 1].sender === 'customer' && /AI auto-reply is off/.test(el('toast-msg').textContent), 'AI off: inbound message gets no automatic AI reply');
assert(conv.status === 'ai_handling', 'Conversation status is not changed by the setting');
ctx.setAiChannelEnabled('whatsapp', true);
ctx.executeSimulateCustomerMessage('What are your support working hours?');
assert(conv.messages[conv.messages.length - 1].sender === 'ai', 'AI on again: automatic reply resumes');
const tg = ctx.conversations.find(c => c.channel === 'telegram');
ctx.setAiChannelEnabled('whatsapp', false);
ctx.currentConversationId = tg.conversationId;
const t0 = tg.messages.length;
ctx.executeSimulateCustomerMessage('What are your support working hours?');
assert(tg.messages.length >= t0 + 2, 'Other channels are unaffected');
ctx.currentConversationId = conv.conversationId;
const leadsBefore = ctx.leads.filter(l => l.source.conversationId === conv.conversationId).length;
const leadText = 'Dhanmondi-te notun line nite chai setup fee koto?';
assert(ctx.isNewConnectionInquiry(ctx.classifyCustomerIntent(leadText, 'EN')), 'Precondition: the sample text is a new-connection inquiry');
const aiMsgs0 = conv.messages.filter(x => x.sender === 'ai').length;
ctx.executeSimulateCustomerMessage(leadText);
assert(conv.messages.filter(x => x.sender === 'ai').length === aiMsgs0 && ctx.leads.filter(l => l.source.conversationId === conv.conversationId).length === Math.max(1, leadsBefore), 'AI off: a new-connection inquiry is still captured as a lead');
ctx.setAiChannelEnabled('whatsapp', true);

// -------------------------------------------------------------------------
console.log('\n--- GROUP 6: Working hours, roles ---');
assert(ctx.setWorkingHours('18:00', '09:00', ['Mon']).error && ctx.setWorkingHours('25:00', '26:00', ['Mon']).error && ctx.setWorkingHours('09:00', '17:00', []).error, 'Invalid hours, order and empty days rejected');
const saved = ctx.setWorkingHours('08:30', '20:00', ['Sun', 'Mon', 'Bogus']).hours;
assert(saved && saved.start === '08:30' && saved.days.join() === 'Sun,Mon', 'Valid hours saved; unknown day ignored');
el('admin-hours-start').value = '10:00'; el('admin-hours-end').value = '09:00';
assert(ctx.saveWorkingHoursFromForm({ preventDefault() {} }) === null && /after opening/.test(el('admin-hours-error').textContent), 'Form shows the validation error');
assert(ctx.setRolePermission('Sales', 'tickets', true) && ctx.adminSettings.permissions.Sales.tickets === true && ctx.setRolePermission('Root', 'all', true) === false, 'Role matrix updates known cells only');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 7: Package prices never rewrite issued invoices ---');
const invoiceSnapshot = JSON.stringify(ctx.invoices);
const customersBefore = JSON.stringify(ctx.SPACE_NET_CUSTOMERS);
assert(ctx.setPackagePrice('home_150m', 499).error && ctx.setPackagePrice('home_150m', 20001).error && ctx.setPackagePrice('home_150m', 'abc').error && ctx.setPackagePrice('home_150m', 1600).error && ctx.setPackagePrice('nope', 1800).error, 'Out-of-range, non-numeric, unchanged and unknown prices rejected');
const change = ctx.setPackagePrice('home_150m', 1800).change;
const pkg = ctx.getLeadPackage('home_150m');
assert(change && change.from === 1600 && pkg.price === '1,800 BDT/mo' && pkg.banglishPrice === '1,800 BDT/mo' && pkg.bnPrice === '১,৮০০ টাকা/মাস', 'Catalog price updated in English, Banglish and Bangla');
assert(JSON.stringify(ctx.invoices) === invoiceSnapshot, 'Issued invoices and recorded payments keep their original amounts');
assert(ctx.getPackagePrice(pkg) === 1800, 'New quotes use the new price');
assert(JSON.stringify(ctx.SPACE_NET_CUSTOMERS) === customersBefore, 'Price change does not touch customer records');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 8: Rendering and navigation ---');
ctx.renderAnalyticsView();
assert((el('analytics-grid').innerHTML.match(/<section/g) || []).length === 9, 'Nine analytics cards');
assert((el('admin-ai-channels').innerHTML.match(/role="switch"/g) || []).length === 5, 'Five AI channel switches');
assert((el('admin-roles-body').innerHTML.match(/type="checkbox"/g) || []).length === 20, 'Role matrix 4 × 5');
assert((el('admin-pricing').innerHTML.match(/Save<\/button>/g) || []).length === ctx.SPACE_NET_PACKAGES.length, 'One price editor per package');
ctx.switchView('analytics');
assert(!el('view-analytics').classList.contains('hidden') && ctx.currentActiveView === 'analytics', 'switchView shows Analytics');

console.log('\n=============================================================');
console.log(`Test Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
console.log('=============================================================');
if (passed !== total) process.exit(1);
console.log('SUCCESS: All Module 10 checks PASSED!');
