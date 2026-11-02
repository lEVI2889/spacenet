// test_workflow_corrections.mjs - cross-module workflow corrections (R1-R6):
// awaiting-human-reply counter, Inbox read/unread, technician/ticket links and assignment,
// ticket resolution, diagnostics-to-resolution. Same vm harness and fake clock as test_ai_channel.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Workflow Corrections Suite (R1-R6)');
console.log('=============================================================\n');

const html = readFileSync(resolve('./index.html'), 'utf-8');
const appScript = [...html.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)].find(m => m[1].includes('SPACE_NET_CUSTOMERS'))[1];
const scriptCode = appScript.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var ');

const mockElements = new Map();
function el(id) {
  if (!mockElements.has(id)) {
    const classes = new Set(id.startsWith('view-') && id !== 'view-dashboard' ? ['hidden'] : []);
    mockElements.set(id, {
      id, textContent: '', innerHTML: '', value: '', className: '', style: {}, attributes: {}, children: [],
      classList: { add: (...a) => a.forEach(c => classes.add(c)), remove: (...a) => a.forEach(c => classes.delete(c)), contains: c => classes.has(c), toggle: () => {} },
      setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k] || null; }, removeAttribute(k) { delete this.attributes[k]; },
      appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [], focus() {}, scrollIntoView() {}
    });
  }
  return mockElements.get(id);
}
global.document = {
  getElementById: el, querySelector: sel => (sel.startsWith('#') ? el(sel.slice(1)) : null), querySelectorAll: () => [],
  createElement: tag => ({ tagName: tag.toUpperCase(), className: '', innerHTML: '', textContent: '', style: {}, children: [], attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; },
    appendChild(c) { this.children.push(c); }, querySelector: () => null, querySelectorAll: () => [] }),
  contains: () => false, activeElement: null
};
global.window = { location: { hash: '' }, scrollTo: () => {}, addEventListener: () => {}, document: global.document };

let now = 0, nextId = 1;
const timers = new Map();
global.setTimeout = (fn, ms = 0) => { const id = nextId++; timers.set(id, { fn, at: now + ms }); return id; };
global.clearTimeout = id => { timers.delete(id); };
function tick(ms) {
  const end = now + ms;
  for (;;) {
    const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break;
    timers.delete(due[0]); now = due[1].at; due[1].fn();
  }
  now = end;
}

const ctx = vm.createContext(global);
try { vm.runInContext(scriptCode, ctx); tick(10000); console.log('✓ index.html script evaluated with a fake clock.\n'); }
catch (err) { console.error('FATAL: Script evaluation error in index.html:', err); process.exit(1); }

let total = 0, passed = 0;
function assert(cond, msg) { total++; if (cond) { passed++; console.log(`  [PASS] Test ${total}: ${msg}`); } else console.error(`  [FAIL] Test ${total}: ${msg}`); }
function has(name) { return typeof ctx[name] === 'function'; }

const conv = id => ctx.getConversation(id);
const counts = () => ctx.getInboxQueueCounts();
const openChat = id => { ctx.currentActiveView = 'unified-inbox'; ctx.selectConversation(id); };
const takeover = id => { ctx.currentConversationId = id; ctx.toggleAgentOverride({ checked: true }); };
const handback = id => { ctx.currentConversationId = id; ctx.toggleAgentOverride({ checked: false }); };
const staffSend = (id, text) => { ctx.currentConversationId = id; ctx.currentComposerMode = 'message'; el('chat-input').value = text; ctx.sendChatMessage(); };
const listed = () => [...el('inbox-thread-list').innerHTML.matchAll(/data-conversation-id="([^"]+)"/g)].map(m => m[1]);

// ---------------------------------------------------------------------------
console.log('--- R2: Inbox read / unread ---');
let c0 = counts();
assert(c0.all === 7 && c0.unread === 5 && c0.read === 2 && c0.awaiting === 0, 'Seed: 7 chats, 5 unread (last message from the customer), 2 read, none awaiting a human reply');
ctx.currentActiveView = 'unified-inbox';
ctx.currentConversationId = 'CONV-FB-5120'; // a read chat is on screen
ctx.filterQueue('unread');
assert(listed().length === 5 && listed().every(id => conv(id).unread), 'Unread filter lists exactly the unread chats');
assert(conv(ctx.currentConversationId).unread === true, 'A filter change that auto-shows the first chat does not mark it read');
openChat('CONV-FB-4491');
assert(conv('CONV-FB-4491').unread === false && counts().unread === 4, 'Opening a chat marks it read and the unread count drops by one');
assert(listed().includes('CONV-FB-4491'), 'The chat just read stays listed in the Unread queue until the filter changes');
ctx.filterQueue('read');
assert(listed().includes('CONV-FB-4491') && listed().every(id => !conv(id).unread), 'Read filter lists only read chats');
ctx.toggleConversationReadState();
assert(conv('CONV-FB-4491').unread === true && counts().unread === 5, 'Mark as unread sets the chat unread and updates the count');
ctx.toggleConversationReadState();
assert(conv('CONV-FB-4491').unread === false, 'Mark as read clears it again');
ctx.filterQueue('all');
ctx.currentActiveView = 'unified-inbox'; ctx.currentConversationId = 'CONV-FB-4491';
ctx.executeSimulateCustomerMessage('What are your support working hours?'); tick(800);
assert(conv('CONV-FB-4491').unread === false, 'A customer message in the chat open on screen does not mark it unread');
ctx.currentActiveView = 'dashboard';
ctx.executeSimulateCustomerMessage('Hello again'); tick(800);
assert(conv('CONV-FB-4491').unread === true, 'A customer message while the chat is not on screen marks it unread');
const aiBefore = conv('CONV-FB-4491').messages.filter(m => m.sender === 'ai').length;
assert(aiBefore >= 1, 'Precondition: the AI replied to those customer messages');
openChat('CONV-FB-4491');

// ---------------------------------------------------------------------------
console.log('\n--- R1: Awaiting human reply ---');
const WA = 'CONV-WA-8832';
assert(ctx.isAwaitingHumanReply(conv(WA)) === false, 'An AI-handled chat is not awaiting a human reply');
takeover(WA);
assert(ctx.isAwaitingHumanReply(conv(WA)) && counts().awaiting === 1, 'Takeover: chat is awaiting its first staff reply (count 1)');
openChat(WA);
assert(conv(WA).unread === false && counts().awaiting === 1, 'Opening (reading) the handed-off chat does not clear awaiting');
ctx.toggleConversationReadState(); ctx.toggleConversationReadState();
assert(counts().awaiting === 1 && conv(WA).status === 'human_takeover', 'Mark unread / read leaves awaiting and takeover unchanged');
conv(WA).messages.push({ id: 'ai-test', sender: 'ai', text: 'AI text', time: 'now' });
ctx.currentComposerMode = 'note'; el('chat-input').value = 'internal note'; ctx.sendChatMessage(); ctx.currentComposerMode = 'message';
assert(ctx.isAwaitingHumanReply(conv(WA)), 'An AI message or an internal note does not count as a staff reply');
staffSend('CONV-FB-4491', 'Reply in another chat');
assert(ctx.isAwaitingHumanReply(conv(WA)), 'A staff reply in a different chat does not clear this one');
ctx.currentActiveView = 'unified-inbox';
staffSend(WA, 'Rohan here, checking your line now.');
assert(!ctx.isAwaitingHumanReply(conv(WA)) && counts().awaiting === 0, 'A staff reply in this chat clears awaiting (count 0)');
assert(conv(WA).status === 'human_takeover', 'Staff reply keeps human takeover on');
ctx.currentActiveView = 'dashboard';
tick(1200); // simulated customer acknowledgement arrives
assert(!ctx.isAwaitingHumanReply(conv(WA)) && conv(WA).unread === true, 'A later customer message makes the chat unread but not awaiting again');
handback(WA); takeover(WA);
assert(ctx.isAwaitingHumanReply(conv(WA)) && counts().awaiting === 1, 'Hand back to AI and take over again: a new handoff awaits a new staff reply');
ctx.currentActiveView = 'unified-inbox';
ctx.filterQueue('awaiting');
assert(listed().length === 1 && listed()[0] === WA, 'Awaiting filter lists exactly the awaiting chats');

// ---------------------------------------------------------------------------
console.log('\n--- R1: Admin counter shares the Inbox source and deep-links to the queue ---');
const m = ctx.getCrmMetrics();
assert(m.awaitingHumanReply === counts().awaiting && m.unreadConversations === counts().unread, 'Admin metrics use the same counts as the Inbox filters');
ctx.renderAnalyticsView();
assert(/openInboxQueue\('awaiting'\)/.test(el('analytics-queue').innerHTML) && new RegExp(`>${counts().awaiting}<`).test(el('analytics-queue').innerHTML), 'Analytics shows the Awaiting Human Reply counter as a button that opens the queue');
ctx.filterQueue('all'); ctx.filterType('dm'); ctx.filterInbox('facebook'); ctx.currentSearchQuery = 'zzz';
ctx.switchView('analytics');
ctx.openInboxQueue('awaiting');
assert(ctx.currentActiveView === 'unified-inbox' && ctx.window.location.hash === '#unified-inbox', 'Clicking the counter switches to the Unified Inbox through the hash router');
assert(ctx.currentQueueFilter === 'awaiting' && ctx.currentTypeFilter === 'all' && ctx.currentChannelFilter === 'all' && ctx.currentSearchQuery === '', 'The awaiting queue is active and other filters are cleared');
assert(listed().length === counts().awaiting && listed().every(id => ctx.isAwaitingHumanReply(conv(id))), 'The listed chats are exactly the chats the counter counted');
const realToast = ctx.showToast;
let toastCalls = 0;
ctx.showToast = (...a) => { toastCalls++; return realToast(...a); };
ctx.filterType('dm'); ctx.filterInbox('facebook'); ctx.filterQueue('unread');
assert(toastCalls === 3, 'Filter buttons the agent clicks still confirm with a toast');
toastCalls = 0;
ctx.openInboxQueue('awaiting');
assert(toastCalls === 0 && ctx.currentQueueFilter === 'awaiting' && ctx.currentTypeFilter === 'all' && ctx.currentChannelFilter === 'all', 'The Admin counter link navigates without filter toasts (L3) and still clears the other filters');
ctx.showToast = realToast;

// ---------------------------------------------------------------------------
console.log('\n--- R3/R4: Technician, field job and ticket links ---');
const ticket = id => ctx.tickets.find(t => t.ticketId === id);
const jobFor = id => (has('getTicketFieldJob') ? ctx.getTicketFieldJob(id) : null);
const seededJob = jobFor('TKT-9031');
assert(!!seededJob && seededJob.ticketId === 'TKT-9031' && seededJob.technicianId === 'TECH-01', 'The escalated ticket TKT-9031 resolves to its repair job, assigned by technician ID (TECH-01)');
ctx.currentModalTicket = ticket('TKT-9031'); ctx.populateTicketModalUI(ticket('TKT-9031'));
let assignHtml = el('td-modal-assignment').innerHTML;
assert(/Rakib Hasan/.test(assignHtml) && assignHtml.includes(`openTicketFieldJob('${seededJob && seededJob.jobId}')`), 'Ticket shows the assigned technician by name and links to the field job');
assert(/Rohan \(Tier III NOC\)|Tier III NOC Engineering/.test(assignHtml), 'Ticket keeps the support owner separate from the field technician');
ctx.currentModalTicket = ticket('TKT-9042'); ctx.populateTicketModalUI(ticket('TKT-9042'));
assignHtml = el('td-modal-assignment').innerHTML;
assert(/Unassigned/.test(assignHtml) && /No field job/.test(assignHtml) && !jobFor('TKT-9042'), 'A ticket without a field job shows a clear unassigned state');
ctx.renderTicketTable();
const rowFor = id => el('ticket-table-body').children.findLast(r => r.innerHTML.includes(`#${id}<`)) || { innerHTML: '' };
assert(/Rakib Hasan/.test(rowFor('TKT-9031').innerHTML), 'Ticket table shows the field technician name on the linked ticket');
assert(/<button[^>]*openTicketDetail\('TKT-9042'\)/.test(rowFor('TKT-9042').innerHTML), 'Ticket ID in the table is a keyboard-operable button that opens the ticket');

console.log('\n--- R5: Assign from the ticket, using the shared eligibility rules ---');
const job31 = seededJob;
const jahid = ctx.TECH_ROSTER.find(t => t.techId === 'TECH-04');
const ineligible = jahid; // on leave in the seed roster, so not eligible
ctx.renderTicketAssignment(ticket('TKT-9031'));
assert(!/TECH-04/.test(el('td-modal-assignment').innerHTML), 'The assign list offers only eligible technicians (Jahid Karim is on leave)');
ctx.currentModalTicket = ticket('TKT-9031');
el('td-modal-tech-select').value = ineligible ? ineligible.techId : '';
if (has('assignTechFromTicket')) ctx.assignTechFromTicket();
assert(job31 && job31.technicianId === 'TECH-01' && /not available|Choose/.test(el('td-modal-assign-error').textContent), 'Assigning an ineligible technician is refused with a visible reason; assignment unchanged');
const workload = techId => ctx.techJobs.filter(j => j.technicianId === techId && j.status !== 'completed').length;
jahid.available = true; // demo state change: Jahid returns from leave, so Uttara has a second repair technician
const eligible = ctx.getEligibleTechs(job31).filter(t => t.techId !== job31.technicianId);
if (eligible.length) {
  const before = workload('TECH-01'), target = eligible[0];
  el('td-modal-tech-select').value = target.techId;
  ctx.assignTechFromTicket();
  assert(job31.technicianId === target.techId && workload('TECH-01') === before - 1 && workload(target.techId) >= 1, 'Reassigning from the ticket updates the job and both technicians’ workloads');
  assert(new RegExp(target.name).test(el('td-modal-assignment').innerHTML) && ticket('TKT-9031').history.some(h => h.action === 'TECH_ASSIGNED' && h.notes.includes(target.techId)), 'Ticket shows the new name and records the reassignment (by ID) in its history');
  assert(ctx.techJobs.filter(j => j.ticketId === 'TKT-9031').length === 1, 'Reassignment never creates a duplicate job');
} else {
  assert(false, 'Precondition failed: TKT-9031 needs a second eligible technician to test reassignment');
}
jahid.available = false;
ctx.currentModalTicket = ticket('TKT-9042');
const jobsBefore = ctx.techJobs.length;
ctx.escalateCurrentTicket();
const job42 = jobFor('TKT-9042');
assert(!!job42 && job42.status === 'unassigned' && ctx.techJobs.length === jobsBefore + 1, 'Escalating a connectivity ticket creates its repair job straight away (not only when Technicians is opened)');
ctx.syncTechJobs(); ctx.escalateCurrentTicket();
assert(ctx.techJobs.filter(j => j.ticketId === 'TKT-9042').length === 1, 'Repeated escalation or sync never duplicates the job');
el('td-modal-tech-select').value = 'TECH-02';
ctx.assignTechFromTicket();
assert(job42.technicianId === null && /Schedule the visit/.test(el('td-modal-assign-error').textContent), 'An unscheduled job cannot be assigned from the ticket; the scheduling rule is explained');

console.log('\n--- R3: Workload → jobs → ticket navigation ---');
ctx.renderTechView();
assert(/filterTechJobsByTech\('TECH-01'\)|filterTechJobsByTech\('TECH-0\d'\)/.test(el('tech-roster').innerHTML), 'Roster workload is a control that shows that technician’s jobs');
const busy = ctx.TECH_ROSTER.find(t => workload(t.techId) > 0);
ctx.filterTechJobsByTech(busy.techId);
const shown = ctx.getFilteredTechJobs();
assert(shown.length === workload(busy.techId) && shown.every(j => j.technicianId === busy.techId), 'Filtering by technician lists exactly the jobs counted in the workload');
ctx.filterTechJobsByTech(null);
assert(ctx.getFilteredTechJobs().length === ctx.techJobs.length, 'Clearing the technician filter lists all jobs again');
ctx.currentModalTicket = ticket('TKT-9031');
ctx.openTicketFieldJob(job31.jobId);
assert(ctx.currentActiveView === 'technicians' && ctx.currentTechJobId === job31.jobId, 'Ticket → field job link opens that job in Technician Ops');
ctx.openTechSource(job31.jobId);
assert(ctx.currentActiveView === 'tickets' && ctx.currentModalTicket.ticketId === 'TKT-9031', 'Field job → ticket link opens the same ticket');

// ---------------------------------------------------------------------------
console.log('\n--- R5: Mark Resolved ---');
const toastTitle = () => el('toast-title').textContent;
const toastMsg = () => el('toast-msg').textContent;
ctx.closeTicketModal();
ctx.switchView('tickets');
const t19 = ticket('TKT-9019'); // REOPENED slow-internet ticket, no field job
const openBefore = ctx.getCrmMetrics().openTickets;
ctx.currentModalTicket = t19; ctx.populateTicketModalUI(t19);
el('td-modal-resolution-summary').value = '';
t19.guidedSteps.forEach(s => { s.completed = false; s.completedAt = null; });
ctx.resolveCurrentTicketModal();
assert(t19.status === 'RESOLVED' && !!t19.resolvedAt, 'Mark Resolved sets RESOLVED and the resolved time');
assert(!/nominal|verified resolved/i.test(t19.resolutionSummary) && /no resolution notes/i.test(t19.resolutionSummary), 'With no notes, the summary says so instead of inventing a technical result');
assert(ctx.getCrmMetrics().openTickets === openBefore - 1, 'Open-ticket count (Dashboard / nav badge source) drops by one');
const histLen = t19.history.length;
ctx.resolveTicketRow(null, 'TKT-9019');
assert(toastTitle() !== 'Ticket Resolved' && /already/i.test(toastMsg()) && t19.history.length === histLen, 'Quick Resolve on an already-resolved ticket reports the refusal, not success');
const t38 = ticket('TKT-9038');
ctx.resolveTicketRow(null, 'TKT-9038');
assert(t38.status === 'RESOLVED' && toastTitle() === 'Ticket Resolved', 'Quick Resolve on an open ticket resolves only that ticket');
assert(ticket('TKT-9042').status === 'ESCALATED', 'Other tickets are untouched');
const t31 = ticket('TKT-9031');
const jobStatus = job31.status;
ctx.currentModalTicket = t31; ctx.populateTicketModalUI(t31);
el('td-modal-resolution-summary').value = 'Replaced damaged drop cable at the FDB (agent note).';
ctx.resolveCurrentTicketModal();
assert(t31.status === 'RESOLVED' && t31.resolutionSummary.includes('Replaced damaged drop cable') && el('td-modal-resolution-summary').value === t31.resolutionSummary, 'Agent resolution notes are preserved in the record and still shown in the notes box');
assert(job31.status === jobStatus && job31.status !== 'completed', 'Resolving the ticket does not complete its field job');
assert(new RegExp(job31.jobId).test(toastMsg()), 'Resolution feedback points out the field job is still open');

console.log('\n--- R6: Guided troubleshooting and Sync to Resolution ---');
const t42 = ticket('TKT-9042');
ctx.currentModalTicket = t42; ctx.populateTicketModalUI(t42);
const pending = t42.guidedSteps.findIndex(s => !s.completed);
ctx.toggleGuidedStep(pending, true);
assert(t42.guidedSteps[pending].completed && !!t42.guidedSteps[pending].completedAt, 'Checking a step records its completion time');
ctx.toggleGuidedStep(pending, false);
assert(!t42.guidedSteps[pending].completed && t42.guidedSteps[pending].completedAt === null, 'Unchecking a manual step keeps it editable and clears the time');
t42.guidedSteps.forEach((s, i) => ctx.toggleGuidedStep(i, true));
assert(t42.status === 'ESCALATED', 'Completing the whole checklist does not resolve the ticket');
const sessionsBefore = ctx.diagnosticSessions.length;
ctx.runSimulatedDiagnostic('reboot');
assert(/simulated/i.test(toastTitle()) && /simulated/i.test(t42.history[t42.history.length - 1].notes), 'Simulated tool feedback is labelled simulated in the toast and the ticket history');
assert(ctx.diagnosticSessions.length === sessionsBefore + 1 && ctx.diagnosticSessions[0].ticketId === 'TKT-9042', 'The simulated check is recorded once, linked to this ticket');
ctx.toggleGuidedStep(0, false);
el('td-modal-resolution-summary').value = 'Customer confirmed lights are green.';
ctx.syncGuidedStepsToResolution();
let notes = el('td-modal-resolution-summary').value;
assert(notes.startsWith('Customer confirmed lights are green.'), 'Sync keeps the notes the agent already typed');
assert(/Completed steps/.test(notes) && /Pending steps/.test(notes) && notes.includes(ctx.diagnosticSessions[0].sessionId), 'Synced notes list completed and pending steps and the simulated checks on this ticket');
assert(!/verified resolved|confirmed nominal/i.test(notes) && t42.status === 'ESCALATED', 'Sync makes no resolution claim and does not change the status');
assert(t42.resolutionSummary === notes && t42.history.filter(h => h.action === 'RESOLUTION_NOTES_SYNCED').length === 1, 'Synced notes are saved on the ticket and recorded once in its history');
ctx.syncGuidedStepsToResolution();
notes = el('td-modal-resolution-summary').value;
assert((notes.match(/Troubleshooting record/g) || []).length === 1 && t42.history.filter(h => h.action === 'RESOLUTION_NOTES_SYNCED').length === 1, 'Syncing again with nothing new replaces the block: no duplicate text or history');
el('td-modal-resolution-summary').value = notes + '\nCustomer called back: lights green.';
ctx.syncGuidedStepsToResolution();
notes = el('td-modal-resolution-summary').value;
assert(notes.includes('Customer called back: lights green.') && notes.startsWith('Customer confirmed lights are green.') && (notes.match(/Troubleshooting record/g) || []).length === 1, 'Text the agent adds after the synced block is kept when syncing again');

console.log('\n--- R6: Full AI Diagnostics keeps the ticket context ---');
ctx.currentModalTicket = t42;
ctx.openDiagnosticsFromTicket('TKT-9042');
assert(ctx.currentActiveView === 'ai-diagnostics' && ctx.currentDiagOrigin.ticketId === 'TKT-9042' && ctx.currentDiagCustomerId === t42.customerId, 'Full AI Diagnostics opens on the ticket’s subscriber and circuit');
ctx.handleDiagAnswer(ctx.getDiagnosticWorkflow(ctx.currentDiagWorkflowKey).stages[0].id, ctx.getDiagnosticWorkflow(ctx.currentDiagWorkflowKey).stages[0].options[0].key);
const diagSession = ctx.diagnosticSessions[0];
assert(diagSession.ticketId === 'TKT-9042', 'A guided answer is recorded as a session linked to the ticket');
const h0 = t42.history.length;
ctx.syncDiagnosticToLinkedTicket();
assert(t42.history.length === h0 + 1 && t42.history[h0].sessionId === diagSession.sessionId && /simulated/i.test(t42.history[h0].notes), 'Sync to Ticket records that session (simulated assessment) in the ticket history');
ctx.syncDiagnosticToLinkedTicket();
assert(t42.history.length === h0 + 1 && /already/i.test(toastMsg()), 'Syncing the same session again adds no duplicate');
assert(!/Resolved via/.test(t42.resolutionSummary || ''), 'Diagnostics never write a resolution claim into the ticket');
const other = ctx.SPACE_NET_CUSTOMERS.find(c => c.customerId !== t42.customerId);
ctx.selectDiagCustomer(other.customerId);
assert(el('diag-btn-sync').classList.contains('hidden'), 'After switching to another subscriber, Sync to Ticket is hidden');
ctx.simulateOntStatusCheck(other.customerId, ctx.currentDiagCircuitId);
assert(ctx.diagnosticSessions[0].customerId === other.customerId && ctx.diagnosticSessions[0].ticketId === null, 'Another subscriber’s check is not tagged with the original ticket');
const h1 = t42.history.length;
ctx.syncDiagnosticToLinkedTicket();
assert(t42.history.length === h1, 'Sync refuses to write another subscriber’s results into the ticket');
ctx.selectDiagCustomer(t42.customerId, t42.circuitId);
assert(!el('diag-btn-sync').classList.contains('hidden'), 'Back on the ticket’s subscriber, Sync to Ticket is available again');
ctx.markDiagnosticResolved();
assert(!/verified|nominal/i.test(ctx.diagnosticSessions[0].recommendations.join(' ')) && t42.status === 'ESCALATED', 'Diagnostic “Mark Resolved” records the agent’s judgement only; the ticket stays open');
ctx.returnFromDiagnostics();
assert(ctx.currentActiveView === 'tickets' && ctx.currentModalTicket.ticketId === 'TKT-9042', 'Back to Ticket returns to the same ticket');

console.log(`\nRESULT: ${passed}/${total} passed`);
if (passed !== total) process.exit(1);
