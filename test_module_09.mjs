// test_module_09.mjs - Module 09 (Technician Operations) validation suite
// Same vm + mock DOM approach as test_module_02..06. Group 1 reads the real markup,
// so a missing element or a leftover prototype claim cannot pass silently.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 09 Technician Operations Validation Suite');
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
  querySelectorAll: sel => (sel === '.app-view' ? ['dashboard', 'unified-inbox', 'tickets', 'customer-profiles', 'ai-diagnostics', 'sales-leads', 'billing', 'technicians', 'network-outages'].map(v => el('view-' + v)) : []),
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
['view-technicians', 'tech-stats', 'tech-status-filter', 'tech-job-list', 'tech-roster', 'tech-job-modal', 'tech-job-modal-container',
  'tech-job-modal-id', 'tech-job-modal-title', 'tech-job-modal-sub', 'tech-job-modal-body', 'tech-job-error'].forEach(id => assert(idInMarkup(id), `Static element #${id} exists`));
assert(/data-path="technicians"[^>]*>(?:(?!<\/a>)[\s\S])*id="nav-badge-technicians"/.test(markup), 'Sidebar link for Technicians exists and carries its live badge');
const m09Start = appScript.indexOf('MODULE 09: TECHNICIAN OPERATIONS');
const m09End = appScript.indexOf('MODULE 10: ADMIN & ANALYTICS');
const m09Code = appScript.slice(m09Start, m09End);
const dynamicIds = ['tech-job-when', 'tech-job-tech'];
const literalIds = [...new Set([...m09Code.matchAll(/getElementById\('([a-z0-9-]+)'\)/g)].map(m => m[1]))].filter(id => !dynamicIds.includes(id));
assert(m09Start > 0 && m09End > m09Start, 'Module 09 code section located');
assert(literalIds.length >= 8 && literalIds.every(idInMarkup), `Every literal id looked up by Module 09 exists in markup (${literalIds.length} ids)`);
assert(dynamicIds.every(id => m09Code.includes(`id="${id}"`)), 'Dialog-rendered ids are produced by renderTechJobModal');
assert(/data-path="technicians"/.test(markup), 'Sidebar has a Technician Ops link');
assert((appScript.match(/(validViews|availableViews) = \[[^\]]*'technicians'[^\]]*\]/g) || []).length === 2, 'Router accepts #technicians in both view lists');
const escBlock = appScript.slice(appScript.indexOf("e.key === 'Escape'"), appScript.indexOf("e.key === 'Escape'") + 500);
assert(/closeTechJobModal\(\);/.test(escBlock), 'Escape handler closes the job dialog');
assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.geolocation/.test(m09Code), 'No network calls or geolocation in Module 09');
assert(/nobody is actually dispatched/i.test(markup), 'View states that nobody is actually dispatched');
const dupNames = names => names.filter((n, i) => names.indexOf(n) !== i);
assert(dupNames([...appScript.matchAll(/^ {2}function ([A-Za-z0-9_]+)/gm)].map(m => m[1])).length === 0 && dupNames([...appScript.matchAll(/^ {2}(?:const|let) ([A-Za-z0-9_]+)/gm)].map(m => m[1])).length === 0, 'No duplicate top-level names after adding Module 09');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 2: Jobs derived from real records ---');
const jobs = ctx.techJobs;
assert(jobs.length === 2 && jobs.map(j => j.jobId).join() === 'TASK-TECH-7001,TASK-TECH-7002', 'Two seed jobs with TASK-TECH-<NUM> ids');
const survey = ctx.getTechJobById('TASK-TECH-7001'), repair = ctx.getTechJobById('TASK-TECH-7002');
assert(survey.type === 'site_survey' && survey.leadId === 'LEAD-3003' && ctx.getLeadById('LEAD-3003').surveyRequest.status === 'requested', 'Survey job comes from the real LEAD-3003 survey request');
assert(!jobs.some(j => j.type === 'installation'), 'No installation job is created from a survey request');
const tkt = ctx.tickets.find(t => t.ticketId === repair.ticketId);
assert(repair.type === 'repair' && tkt && tkt.status === 'ESCALATED' && tkt.category === 'NO_INTERNET', 'Repair job references the genuine escalated ticket TKT-9031');
assert(repair.zone === 'Uttara' && repair.priority === 'urgent' && repair.customerId === 'CUST-1092', 'Repair zone, priority and customer come from the ticket');
assert(survey.zone === 'Tejgaon' && survey.priority === 'high' && survey.customerId === null, 'Survey zone from the lead location; corporate → high; prospect has no customer');
assert(repair.status === 'assigned' && repair.technicianId === 'TECH-01' && repair.scheduledAt === '2026-11-01 15:00', 'Repair demo state: scheduled and assigned');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 3: Re-sync never duplicates; new sources appear ---');
assert(ctx.syncTechJobs() === 0 && ctx.techJobs.length === 2, 'Re-running sync creates no duplicates');
ctx.requestLeadSiteSurvey('LEAD-3001', '2026-11-05 10:00');
assert(ctx.syncTechJobs() === 1 && ctx.techJobs[2].sourceId === 'LEAD-3001' && ctx.techJobs[2].zone === 'Mirpur', 'A new survey request becomes one survey job');
assert(ctx.syncTechJobs() === 0, 'Syncing again adds nothing');
const t9042 = ctx.tickets.find(t => t.ticketId === 'TKT-9042'), t9038 = ctx.tickets.find(t => t.ticketId === 'TKT-9038');
const s9042 = t9042.status, s9038 = t9038.status;
t9042.status = 'ESCALATED'; t9038.status = 'ESCALATED';
assert(ctx.syncTechJobs() === 1 && ctx.techJobs.some(j => j.ticketId === 'TKT-9042') && !ctx.techJobs.some(j => j.ticketId === 'TKT-9038'), 'Escalated connectivity ticket becomes a repair job; escalated billing ticket does not');
t9042.status = s9042; t9038.status = s9038;
const recordsBefore = JSON.stringify({ c: ctx.SPACE_NET_CUSTOMERS, l: ctx.leads }) + snapshot();

// -------------------------------------------------------------------------
console.log('\n--- GROUP 4: Scheduling, assignment and lifecycle ---');
assert(/Schedule the visit before assigning/.test(ctx.assignTechJob(survey.jobId, 'TECH-03').error), 'Cannot assign before scheduling');
assert(ctx.scheduleTechJob(survey.jobId, 'tomorrow').error && ctx.scheduleTechJob(survey.jobId, '2026-11-03').error, 'Invalid visit times rejected');
assert(ctx.scheduleTechJob(survey.jobId, '2026-99-99 99:99').error && ctx.scheduleTechJob(survey.jobId, '2026-11-03 24:00').error && survey.status === 'unassigned', 'Out-of-range month/day/hour rejected');
assert(ctx.scheduleTechJob(survey.jobId, '2026-11-03T10:00').job && survey.status === 'scheduled' && survey.scheduledAt === '2026-11-03 10:00', 'Visit scheduled (datetime-local value accepted)');
assert(ctx.getEligibleTechs(survey).map(t => t.techId).join() === 'TECH-02,TECH-03', 'Eligible = available, right zone and skill');
assert(/not available/.test(ctx.assignTechJob(survey.jobId, 'TECH-04').error) && /not available/.test(ctx.assignTechJob(survey.jobId, 'TECH-01').error), 'Unavailable or wrong-zone/skill technician rejected');
// Jahid (TECH-04) has the repair skill and covers Uttara; only being on leave excludes him.
assert(ctx.getEligibleTechs(repair).map(t => t.techId).join() === 'TECH-01' && /not available/.test(ctx.assignTechJob(repair.jobId, 'TECH-04').error), 'Technician on leave is never eligible, even with the right zone and skill');
assert(ctx.assignTechJob(survey.jobId, 'TECH-03').job && survey.status === 'assigned' && survey.technicianId === 'TECH-03', 'Assigned to Farida Yasmin');
assert(survey.history.some(h => h.action === 'ASSIGNED' && /Farida Yasmin/.test(h.note)), 'Assignment recorded in history');
assert(ctx.assignTechJob(survey.jobId, 'TECH-03').error, 'Re-assigning the same technician is rejected');
assert(ctx.assignTechJob(survey.jobId, 'TECH-02').job && survey.history.some(h => h.action === 'REASSIGNED'), 'Reassignment recorded');
assert(ctx.scheduleTechJob(survey.jobId, '2026-11-04 09:30').job && survey.status === 'assigned' && survey.history.some(h => h.action === 'RESCHEDULED'), 'Reschedule keeps the assignment');
assert(ctx.advanceTechJob(survey.jobId).job && survey.status === 'on_the_way', 'Assigned → On the way');
assert(ctx.scheduleTechJob(survey.jobId, '2026-11-05 09:30').error && ctx.assignTechJob(survey.jobId, 'TECH-03').error, 'No rescheduling or reassignment once on the way');
assert(ctx.advanceTechJob(survey.jobId).job && survey.status === 'working', 'On the way → Working');
assert(ctx.advanceTechJob(survey.jobId).job && survey.status === 'completed', 'Working → Completed');
assert(ctx.advanceTechJob(survey.jobId).error && survey.status === 'completed', 'Completed is final');
const fresh = ctx.techJobs.find(j => j.sourceId === 'LEAD-3001');
assert(ctx.advanceTechJob(fresh.jobId).error && fresh.status === 'unassigned', 'Unassigned job cannot skip to On the way');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 5: Installation only after a completed survey ---');
assert(/Complete the site survey/.test(ctx.createInstallationFromSurvey(fresh.jobId).error), 'No installation from an unfinished survey');
assert(/only be created from a site-survey/.test(ctx.createInstallationFromSurvey(repair.jobId).error), 'No installation from a repair job');
const inst = ctx.createInstallationFromSurvey(survey.jobId).job;
assert(inst && inst.type === 'installation' && inst.sourceId === 'LEAD-3003' && inst.status === 'unassigned', 'Completed survey → one unassigned installation job');
assert(/already exists/.test(ctx.createInstallationFromSurvey(survey.jobId).error), 'Second installation for the same lead rejected');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 6: Simulated appointment notification ---');
assert(ctx.notifyTechAppointment(fresh.jobId) === null, 'No notification before schedule and assignment');
const note = ctx.notifyTechAppointment(repair.jobId);
assert(note && note.note === 'Simulated — no message sent' && note.visit === '2026-11-01 15:00' && note.technician === 'Rakib Hasan', 'Visit-time notification recorded as simulated');
assert(ctx.notifyTechAppointment(survey.jobId) === null, 'No notification for a completed job');
ctx.currentTechJobId = repair.jobId;
ctx.notifyTechFromModal();
assert(/Simulated — no message sent/.test(el('toast-msg').textContent), 'Toast says no message was sent');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 7: Source records untouched ---');
assert(JSON.stringify({ c: ctx.SPACE_NET_CUSTOMERS, l: ctx.leads }) + snapshot() === recordsBefore, 'Job actions changed no customer, lead or ticket record');
assert(ctx.tickets.find(t => t.ticketId === 'TKT-9031').status === 'ESCALATED' && ctx.getLeadById('LEAD-3003').status === 'interested', 'Ticket and lead statuses unchanged by job progress');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 8: Rendering, dialog and navigation ---');
ctx.renderTechView();
const tile = label => (el('tech-stats').innerHTML.match(new RegExp(`${label}</dt>\\s*<dd[^>]*>(\\d+)<`)) || [])[1];
assert(tile('Open jobs') === String(ctx.techJobs.filter(j => j.status !== 'completed').length) && tile('Completed') === '1', 'Stats match job state');
assert(ctx.techJobs.every(j => el('tech-job-list').innerHTML.includes(j.jobId)), 'Every job is listed');
assert(/On leave/.test(el('tech-roster').innerHTML) && /Rakib Hasan/.test(el('tech-roster').innerHTML), 'Roster shows availability');
el('tech-status-filter').value = 'unassigned';
assert(ctx.getFilteredTechJobs().every(j => j.status === 'unassigned') && ctx.getFilteredTechJobs().length >= 1, 'Unassigned filter');
el('tech-status-filter').value = 'ALL';
ctx.openTechJobModal(repair.jobId);
assert(/Simulated — no message sent/.test(el('tech-job-modal-body').innerHTML) && /openTechSource\('TASK-TECH-7002'\)/.test(el('tech-job-modal-body').innerHTML), 'Dialog shows the simulated label and source link');
ctx.closeTechJobModal();
assert(el('tech-job-modal').classList.contains('hidden'), 'Dialog closes');
ctx.openTechJobModal('TASK-TECH-0000');
assert(el('toast-title').textContent === 'Job Not Found', 'Unknown job shows a not-found message');
ctx.openTechSource(repair.jobId);
assert(ctx.currentActiveView === 'tickets', 'Repair source link opens the Tickets view');
ctx.openTechSource(survey.jobId);
assert(ctx.currentActiveView === 'sales-leads' && ctx.currentLeadId === 'LEAD-3003', 'Survey source link opens the lead');
ctx.openTechCustomer('CUST-1092');
assert(ctx.currentActiveView === 'customer-profiles', 'Customer link opens Customer 360');
ctx.switchView('technicians');
assert(!el('view-technicians').classList.contains('hidden'), 'switchView shows the technician view');

console.log('\n=============================================================');
console.log(`Test Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
console.log('=============================================================');
if (passed !== total) process.exit(1);
console.log('SUCCESS: All Module 09 checks PASSED!');
