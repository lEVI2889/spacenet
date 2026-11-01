// test_module_08.mjs - Module 08 (Network Outages / NOC) validation suite
// Same vm + mock DOM approach as test_module_02..06. Group 1 reads the real markup,
// so a missing element or a leftover prototype claim cannot pass silently.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 08 Network Outages Validation Suite');
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
  querySelectorAll: sel => (sel === '.app-view' ? ['dashboard', 'unified-inbox', 'tickets', 'customer-profiles', 'ai-diagnostics', 'sales-leads', 'network-outages'].map(v => el('view-' + v)) : []),
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
['view-network-outages', 'noc-stats', 'noc-spike-panel', 'noc-outage-list', 'noc-report-btn', 'outage-modal', 'outage-modal-container',
  'outage-modal-id', 'outage-modal-title', 'outage-modal-sub', 'outage-modal-body', 'outage-report-modal', 'outage-report-container',
  'outage-form-zone', 'outage-form-type', 'outage-form-title', 'outage-form-severity', 'outage-form-severity-wrap', 'outage-form-window',
  'outage-form-window-wrap', 'outage-form-cause', 'outage-form-error'].forEach(id => assert(idInMarkup(id), `Static element #${id} exists`));
const m08Start = appScript.indexOf('MODULE 08: NETWORK OUTAGES');
const m08End = appScript.indexOf('// 8. Command Palette');
const m08Code = appScript.slice(m08Start, m08End);
const literalIds = [...new Set([...m08Code.matchAll(/getElementById\('([a-z0-9-]+)'\)/g)].map(m => m[1]))];
assert(m08Start > 0 && m08End > m08Start, 'Module 08 code section located');
assert(literalIds.length > 10 && literalIds.every(idInMarkup), `Every literal id looked up by Module 08 exists in markup (${literalIds.length} ids)`);
assert(!/1,420|notified via SMS|Broadcast Dispatched/i.test(htmlContent), 'Old "1,420 subscribers notified" broadcast claim is gone');
assert(!/maintenance-modal|openMaintenanceModal|executeBroadcastSend|closeMaintenanceModal/.test(htmlContent), 'Removed prototype modal and functions have no references left');
const escBlock = appScript.slice(appScript.indexOf("e.key === 'Escape'"), appScript.indexOf("e.key === 'Escape'") + 400);
assert(/closeOutageDialogs\(\);/.test(escBlock), 'Escape handler closes the outage dialogs');
const nocMarkup = markup.slice(markup.indexOf('id="view-network-outages"'), markup.indexOf('id="outage-report-modal"'));
assert(/fictional demo data/i.test(nocMarkup), 'NOC view labels outages as fictional demo data');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 2: Seed scenarios ---');
const outages = ctx.outages;
assert(Array.isArray(outages) && outages.length === 3, 'Three seed outages');
assert(outages.every(o => /^OUT-[A-Z]{3}-\d{4}$/.test(o.outageId) && o.isDemo === true), 'Ids follow OUT-<ZONE>-<NUM> and are flagged isDemo');
const utt = ctx.getOutageById('OUT-UTT-0107'), gul = ctx.getOutageById('OUT-GUL-0108'), moh = ctx.getOutageById('OUT-MOH-0101');
assert(utt.zone === 'Uttara' && utt.type === 'unplanned' && ctx.isOutageOpen(utt), 'Active unplanned outage in Uttara');
assert(gul.zone === 'Gulshan' && gul.type === 'planned' && gul.status === 'scheduled' && gul.window, 'Planned maintenance in Gulshan with a window');
assert(moh.status === 'resolved' && !ctx.isOutageOpen(moh) && moh.resolvedAt, 'Resolved historical outage in Mohakhali');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 3: Derived customers and complaints (no invented links) ---');
const uttCust = ctx.getOutageAffectedCustomers(utt);
assert(uttCust.length === 1 && uttCust[0].customer.customerId === 'CUST-1092' && uttCust[0].circuits.join() === 'SPN-VDS-1092', 'Uttara affects only Marcus Vance (CUST-1092, SPN-VDS-1092)');
const uttTix = ctx.getOutageRelatedTickets(utt);
assert(uttTix.map(t => t.ticketId).join() === 'TKT-9031' && ctx.isOpenComplaint(uttTix[0]), 'Uttara complaint is the existing open TKT-9031');
assert(ctx.getOutageAffectedCustomers(gul).map(x => x.customer.customerId).join() === 'CUST-4491', 'Gulshan affects only CUST-4491');
assert(ctx.getOutageRelatedTickets(gul).length === 0, 'Gulshan has no connectivity complaints (TKT-9024 is a Wi-Fi ticket)');
assert(ctx.getOutageRelatedTickets(moh).map(t => t.ticketId).join() === 'TKT-9035' && !ctx.isOpenComplaint(ctx.getOutageRelatedTickets(moh)[0]), 'Mohakhali links the resolved TKT-9035, not counted as open');
assert(ctx.getOutageZones().includes('Tejgaon') && ctx.getOutageZones().includes('Uttara'), 'Zone list covers demo zones and existing customer zones');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 4: NOC spike alert ---');
assert(ctx.getNocSpikes().length === 0, 'No spike at baseline (no zone has 2+ open connectivity complaints)');
const before = snapshot();
el('new-ticket-cust-id').value = 'CUST-5120';
el('new-ticket-cust-circuit').value = 'SPN-FBR-5120';
el('new-ticket-type').value = 'NO_INTERNET';
el('new-ticket-prio').value = 'URGENT';
el('new-ticket-subject').value = 'No internet since morning';
const ticketsBefore = ctx.tickets.length;
ctx.submitCreateTicket(true);
assert(ctx.tickets.length === ticketsBefore + 1, 'A second Dhanmondi complaint is created through Module 03');
let spikes = ctx.getNocSpikes();
assert(spikes.length === 1 && spikes[0].zone === 'Dhanmondi' && spikes[0].ticketIds.includes('TKT-9042'), 'Dhanmondi spike: TKT-9042 plus the new complaint');
assert(spikes[0].outage === null, 'Spike reports that no outage is recorded for Dhanmondi yet');
ctx.renderNocView();
assert(/NOC alert · Dhanmondi/.test(el('noc-spike-panel').innerHTML) && /Report outage in Dhanmondi/.test(el('noc-spike-panel').innerHTML), 'Spike panel offers to report a Dhanmondi outage');
const dha = ctx.createOutage({ zone: 'Dhanmondi', type: 'unplanned', title: 'Feeder fault near Road 27', severity: 'major' });
assert(ctx.getNocSpikes()[0].outage === dha, 'Recording the outage links it to the spike');
const newTicket = ctx.tickets.find(t => t.customerId === 'CUST-5120' && t.category === 'NO_INTERNET');
const prevStatus = newTicket.status;
newTicket.status = 'RESOLVED';
assert(ctx.getNocSpikes().length === 0, 'Resolving a complaint drops the zone below the threshold');
newTicket.status = prevStatus;

// -------------------------------------------------------------------------
console.log('\n--- GROUP 5: Reporting outages ---');
assert(dha.outageId === 'OUT-DHA-0109' && dha.status === 'investigating' && outages[0] === dha, 'New outage gets OUT-DHA-0109, starts Investigating, listed first');
assert(ctx.createOutage({ zone: 'Atlantis', type: 'unplanned', title: 'x' }) === null, 'Unknown zone rejected');
assert(ctx.createOutage({ zone: 'Uttara', type: 'unplanned', title: '  ' }) === null, 'Missing title rejected');
assert(ctx.createOutage({ zone: 'Mirpur', type: 'planned', title: 'Splitter swap' }) === null, 'Planned maintenance without a window rejected');
const mir = ctx.createOutage({ zone: 'Mirpur', type: 'planned', title: 'Splitter swap', window: '2026-11-03 01:00' });
assert(mir && mir.status === 'scheduled' && mir.severity === null && mir.window === '2026-11-03 01:00', 'Planned maintenance scheduled with its window');
ctx.openOutageReportModal('Banani');
assert(el('outage-form-zone').value === 'Banani' && !el('outage-report-modal').classList.contains('hidden'), 'Report form opens prefilled with the spike zone');
el('outage-form-title').value = '';
assert(ctx.submitOutageReportForm({ preventDefault() {} }) === null && /title/i.test(el('outage-form-error').textContent), 'Form shows an error for a missing title');
el('outage-form-type').value = 'planned';
ctx.updateOutageFormFields();
assert(!el('outage-form-window-wrap').classList.contains('hidden') && el('outage-form-severity-wrap').classList.contains('hidden'), 'Planned type shows the window field and hides severity');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 6: Lifecycle ---');
['identified', 'monitoring', 'resolved'].forEach(s => { ctx.advanceOutageStatus(dha.outageId); assert(dha.status === s, `Unplanned advances to ${s}`); });
assert(ctx.advanceOutageStatus(dha.outageId) === false && dha.resolvedAt, 'Resolved is final and stamps resolvedAt');
assert(dha.history.some(h => h.note === 'Monitoring → Resolved'), 'Transitions are recorded in history');
ctx.advanceOutageStatus(mir.outageId); ctx.advanceOutageStatus(mir.outageId);
assert(mir.status === 'completed' && ctx.advanceOutageStatus(mir.outageId) === false, 'Planned flow: Scheduled → In progress → Completed');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 7: Simulated notifications ---');
assert(ctx.recordOutageNotification(utt.outageId, 'restored') === null, 'Restoration cannot be announced while the outage is open');
const n1 = ctx.recordOutageNotification(utt.outageId, 'start');
assert(n1 && n1.recipients === 1 && n1.note === 'Simulated — no messages sent', 'Outage notice records 1 recipient and the simulated label');
assert(/Simulated — no messages sent/.test(utt.history.slice(-1)[0].note), 'History states nothing was sent');
const n2 = ctx.recordOutageNotification(gul.outageId, 'maintenance_notice');
assert(n2 && n2.recipients === 1, 'Maintenance notice for Gulshan recorded');
assert(ctx.recordOutageNotification(dha.outageId, 'restored') !== null, 'Restoration announced after resolution');
assert(ctx.recordOutageNotification(utt.outageId, 'sms_blast') === null, 'Unknown notification kind rejected');
ctx.currentOutageId = utt.outageId;
ctx.notifyOutageFromModal('start');
assert(/Simulated — no messages sent/.test(el('toast-msg').textContent), 'Toast says Simulated — no messages sent');
const after = snapshot();
const beforeObj = JSON.parse(before), afterObj = JSON.parse(after);
afterObj.t = afterObj.t.filter(t => beforeObj.t.some(b => b.id === t.id));
assert(JSON.stringify(beforeObj) === JSON.stringify(afterObj), 'Outage actions changed no existing customer or ticket record');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 8: Rendering and navigation ---');
ctx.renderNocView();
const stats = el('noc-stats').innerHTML;
const tile = label => (stats.match(new RegExp(`${label}</dt>\\s*<dd[^>]*>(\\d+)<`)) || [])[1];
assert(tile('Active outages') === '1' && tile('NOC spike alerts') === '1' && tile('Planned maintenance') === '1', 'Stats show 1 active outage, 1 spike alert, 1 open planned (Gulshan)');
assert(/Uttara · OUT-UTT-0107/.test(el('dash-outage-row').innerHTML) && /Identified/.test(el('dash-outage-row').innerHTML), 'Dashboard NOC row mirrors the newest open outage');
assert(!/North Sector Substation|Severe Fiber Sever/.test(htmlContent), 'Static "North Sector Substation" prototype row is gone');
assert(['OUT-UTT-0107', 'OUT-GUL-0108', 'OUT-MOH-0101', 'OUT-DHA-0109'].every(id => el('noc-outage-list').innerHTML.includes(id)), 'Outage list renders every outage');
assert(/Planned maintenance/.test(el('noc-outage-list').innerHTML) && /Critical outage/.test(el('noc-outage-list').innerHTML), 'Planned and unplanned are visibly distinguished');
ctx.openOutageModal('OUT-UTT-0107');
const body = el('outage-modal-body').innerHTML;
assert(/openOutageCustomer\('CUST-1092'\)/.test(body) && /openOutageTicket\('TKT-9031'\)/.test(body), 'Detail dialog links the affected customer and the complaint');
assert(/Move to Monitoring/.test(body) && /disabled aria-disabled="true"/.test(body), 'Next-step button shown; restoration disabled while open');
ctx.closeOutageDialogs();
assert(el('outage-modal').classList.contains('hidden') && el('outage-report-modal').classList.contains('hidden'), 'closeOutageDialogs closes both dialogs');
ctx.openOutageModal('OUT-NOPE-0000');
assert(el('toast-title').textContent === 'Outage Not Found', 'Unknown outage id shows a not-found message');
ctx.openOutageTicket('TKT-9031');
assert(ctx.currentActiveView === 'tickets', 'Complaint link opens the Tickets view');
ctx.openOutageCustomer('CUST-1092');
assert(ctx.currentActiveView === 'customer-profiles', 'Customer link opens the Customer 360 view');

console.log('\n=============================================================');
console.log(`Test Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
console.log('=============================================================');
if (passed !== total) process.exit(1);
console.log('SUCCESS: All Module 08 checks PASSED!');
