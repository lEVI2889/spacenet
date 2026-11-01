// test_module_06.mjs - Module 06 (Sales & Leads) validation suite
// Same approach as test_module_02..05 (index.html script in a Node vm with a mock DOM),
// plus Group 1, which reads the real markup so a missing element cannot pass silently.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 06 Sales & Leads Validation Suite');
console.log('=============================================================\n');

const htmlContent = readFileSync(resolve('./index.html'), 'utf-8');
const scriptMatches = [...htmlContent.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)];
const appScriptMatch = scriptMatches.find(m => m[1].includes('conversations') && m[1].includes('SPACE_NET_CUSTOMERS'));
if (!appScriptMatch) {
  console.error('FATAL: Could not locate main application <script> block in index.html');
  process.exit(1);
}
const appScript = appScriptMatch[1];
const markup = htmlContent.replace(appScript, '');
const scriptCode = appScript.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var ');

// Minimal mock DOM: any id resolves to a stub element (this is why Group 1 checks real markup).
const mockElements = new Map();
function el(id) {
  if (!mockElements.has(id)) {
    const classes = new Set(id.startsWith('view-') && id !== 'view-dashboard' ? ['hidden'] : []);
    if (/modal$/.test(id)) classes.add('hidden');
    mockElements.set(id, {
      id, textContent: '', innerHTML: '', value: '', className: '', style: {}, attributes: {}, children: [],
      classList: { add: (...a) => a.forEach(c => classes.add(c)), remove: (...a) => a.forEach(c => classes.delete(c)), contains: c => classes.has(c) },
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

// -------------------------------------------------------------------------
console.log('--- GROUP 1: Static markup integrity (real HTML, not the mock) ---');
const requiredIds = ['view-sales-leads', 'sales-pipeline', 'sales-stage-strip', 'sales-search', 'sales-team-filter', 'sales-coverage-filter',
  'sales-new-lead-btn', 'lead-modal', 'lead-modal-container', 'lead-modal-id', 'lead-modal-title', 'lead-modal-sub', 'lead-modal-body',
  'lead-create-modal', 'lead-create-container', 'lead-form-name', 'lead-form-phone', 'lead-form-location', 'lead-form-type',
  'lead-form-package', 'lead-form-preview', 'lead-form-error'];
requiredIds.forEach(id => assert(idInMarkup(id), `Static element #${id} exists in index.html`));
const m06Start = appScript.indexOf('MODULE 06: SALES & LEADS');
const m06End = appScript.indexOf('// 7. Network Outage');
const m06Code = appScript.slice(m06Start, m06End);
const dynamicIds = ['lead-followup-date', 'lead-followup-note', 'lead-survey-slot'];
const literalIds = [...new Set([...m06Code.matchAll(/getElementById\('([a-z0-9-]+)'\)/g)].map(m => m[1]))].filter(id => !dynamicIds.includes(id));
assert(m06Start > 0 && m06End > m06Start, 'Module 06 code section located');
assert(literalIds.every(idInMarkup), `Every literal id looked up by Module 06 exists in markup (${literalIds.length} ids)`);
assert(dynamicIds.every(id => m06Code.includes(`id="${id}"`)), 'Dynamically rendered ids are produced by renderLeadModal');
const salesMarkup = markup.slice(markup.indexOf('id="view-sales-leads"'), markup.indexOf('VIEW 5: NETWORK OUTAGES'));
assert(!/\$\d|\+1-555/.test(salesMarkup), 'No USD prices or US phone numbers remain in the Sales view');
assert(/fictional demo data/i.test(salesMarkup) && /simulated/i.test(salesMarkup), 'Sales view labels its data as fictional / simulated');
assert(!/openLeadModal\(this\)/.test(htmlContent), 'Legacy static lead cards (openLeadModal(this)) removed');
assert(/closeLeadCreateModal\(\);/.test(appScript.slice(appScript.indexOf("e.key === 'Escape'"), appScript.indexOf("e.key === 'Escape'") + 400)), 'Escape handler closes the new lead form');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 2: Seed pipeline fixtures ---');
const leads = ctx.leads;
assert(Array.isArray(leads) && leads.length === 6, 'Six seed leads exist');
assert(ctx.LEAD_STAGES.map(s => s.key).join() === 'new,contacted,interested,connected,lost', 'Five stages in client order (#35)');
assert(ctx.LEAD_STAGES.every(s => leads.some(l => l.status === s.key)), 'Every stage has at least one seed lead');
assert(leads.every(l => /^LEAD-\d+$/.test(l.leadId) && l.isDemo === true), 'All leads use LEAD-<NUM> ids and are flagged isDemo');
assert(leads.filter(l => !l.customerId).every(l => l.phone.startsWith('+880 1000-')), 'Prospect phones use the fictional +880 1000- range');
const tanvirLead = ctx.getLeadById('LEAD-3005');
assert(tanvirLead.customerId === 'CUST-5120' && tanvirLead.phone === ctx.SPACE_NET_CUSTOMERS.find(c => c.customerId === 'CUST-5120').phone, 'Existing-customer lead links to CUST-5120 and reuses its registry phone');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 3: Coverage classification ---');
assert(ctx.resolveLeadCoverage('Road 12, Banani').status === 'covered' && ctx.resolveLeadCoverage('Road 12, Banani').zoneKey === 'banani', 'Known zone → covered with zoneKey');
assert(ctx.resolveLeadCoverage('Hemayetpur, Savar').status === 'not_covered', 'Documented unsupported area → not_covered');
assert(ctx.resolveLeadCoverage('Tejgaon Industrial Area').status === 'unverified', 'Unknown area (Tejgaon) → unverified, not not_covered');
assert(ctx.resolveLeadCoverage('').status === 'unverified', 'Missing location → unverified');
assert(ctx.resolveLeadCoverage('ধানমন্ডি').status === 'covered', 'Bangla zone name → covered');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 4: Team routing and package recommendation ---');
const office = ctx.buildLead({ leadId: 'LEAD-T1', name: 'X', phone: '0', locationText: 'Gulshan', connectionType: 'office' });
assert(office.assignedTeam === 'CORPORATE_SALES' && office.segment === 'corporate', 'Office inquiry → Corporate Sales (#33 sub-feature)');
assert(office.recommendedPackageKey === 'office_1g', 'Corporate default package is Office Pro 1G');
const home = ctx.buildLead({ leadId: 'LEAD-T2', name: 'Y', phone: '0', locationText: 'Mirpur', connectionType: 'home' });
assert(home.assignedTeam === 'RESIDENTIAL_SALES' && home.recommendedPackageKey === 'home_150m', 'Home inquiry → Residential Sales, Home 150M default');
const requested = ctx.buildLead({ leadId: 'LEAD-T3', name: 'Z', phone: '0', locationText: 'Uttara', requestedPackageKey: 'gamer_300m' });
assert(requested.recommendedPackageKey === 'gamer_300m', 'Requested catalog package is kept as the recommendation');
const outside = ctx.buildLead({ leadId: 'LEAD-T4', name: 'W', phone: '0', locationText: 'Savar', requestedPackageKey: 'gamer_300m' });
assert(outside.recommendedPackageKey === null, 'No package recommended outside simulated coverage');
assert(ctx.leads.length === 6, 'buildLead alone does not add to the pipeline');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 5: Lead creation ---');
const customersBefore = ctx.SPACE_NET_CUSTOMERS.length;
const created = ctx.createLead({ name: 'Arif Hasan', phone: '+880 1000-000399', locationText: 'Bashundhara R/A', connectionType: 'home' });
assert(created && created.leadId === 'LEAD-3007', 'createLead assigns the next LEAD id (LEAD-3007)');
assert(ctx.leads.length === 7 && created.status === 'new', 'Created lead is added in stage New');
assert(created.history[0].action === 'CREATED', 'Creation is recorded in history');
assert(ctx.createLead({ name: '', phone: '123' }) === null && ctx.leads.length === 7, 'Missing name is rejected');
el('lead-form-name').value = 'Short Phone';
el('lead-form-phone').value = '12345';
assert(ctx.submitLeadCreateForm({ preventDefault() {} }) === null && ctx.leads.length === 7, 'Form rejects a phone with fewer than 10 digits');
assert(!el('lead-form-error').classList.contains('hidden') && /phone/i.test(el('lead-form-error').textContent), 'Form shows a phone validation error');
el('lead-form-phone').value = '+880 1000-000398';
el('lead-form-location').value = 'Gulshan 1';
el('lead-form-type').value = 'office';
const viaForm = ctx.submitLeadCreateForm({ preventDefault() {} });
assert(viaForm && viaForm.assignedTeam === 'CORPORATE_SALES' && ctx.leads.length === 8, 'Valid form submission creates a routed lead');
assert(/LEAD-3007/.test(el('sales-pipeline').innerHTML) && /LEAD-3008/.test(el('sales-pipeline').innerHTML), 'Pipeline re-renders with the new leads');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 6: Status transitions and counts ---');
const countIn = s => ctx.leads.filter(l => l.status === s).length;
const newBefore = countIn('new');
assert(ctx.updateLeadStatus('LEAD-3007', 'contacted') === true && countIn('new') === newBefore - 1, 'Moving a lead updates stage counts');
['interested', 'lost', 'connected'].forEach(s => assert(ctx.updateLeadStatus('LEAD-3007', s), `Transition to ${s} succeeds`));
assert(ctx.updateLeadStatus('LEAD-3007', 'connected') === false, 'Same-stage update is a no-op');
assert(ctx.updateLeadStatus('LEAD-3007', 'won') === false, 'Unknown stage is rejected');
assert(/no customer profile created/.test(created.history[created.history.length - 1].note), 'Connected prospect records a simulated conversion without a customer');
assert(ctx.SPACE_NET_CUSTOMERS.length === customersBefore, 'No canonical customer was created');
ctx.renderSalesPipeline();
assert(/aria-label="Connected: \d+ leads"/.test(el('sales-stage-strip').innerHTML), 'Stage strip renders accessible counts');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 7: Automatic capture from AI inquiries ---');
const conv = ctx.getConversation('CONV-WEB-1092');
const salesText = 'Dhanmondi-te notun line nite chai setup fee koto?';
const cls = ctx.classifyCustomerIntent(salesText, 'EN');
assert(ctx.isNewConnectionInquiry(cls), 'Banglish new-line inquiry is a new-connection intent');
const before = ctx.leads.length;
const r1 = ctx.captureLeadFromInquiry(conv, cls, salesText);
assert(r1 && r1.created && ctx.leads.length === before + 1, 'Qualified inquiry auto-creates a lead');
assert(r1.lead.source.conversationId === 'CONV-WEB-1092' && r1.lead.customerId === conv.customerId, 'Lead keeps conversation and customer links');
assert(r1.lead.coverageStatus === 'covered' && r1.lead.zoneKey === 'dhanmondi', 'Extracted zone drives coverage');
assert(conv.messages[conv.messages.length - 1].sender === 'system' && /LEAD-/.test(conv.messages[conv.messages.length - 1].text), 'Chat gets a system line naming the lead');
const r2 = ctx.captureLeadFromInquiry(conv, cls, salesText);
assert(r2 && r2.created === false && ctx.leads.length === before + 1, 'Repeat processing does not duplicate the lead');
assert(r2.lead.history.some(h => h.action === 'AI_UPDATED'), 'Repeat processing is logged as an update');
const upgrade = ctx.classifyCustomerIntent('I want to upgrade my package to a faster plan', 'EN');
assert(upgrade.intent === 'package_changes' && ctx.captureLeadFromInquiry(conv, upgrade, 'upgrade') === null, 'Package-change inquiry does not create a lead');
const billing = ctx.classifyCustomerIntent('How can I pay my monthly bill via bKash Merchant?', 'EN');
assert((billing.intents || [billing.intent]).includes('billing_guidance') && ctx.captureLeadFromInquiry(conv, billing, 'bill') === null, 'Billing inquiry does not create a lead');
const tech = ctx.classifyCustomerIntent('My connection is dropping and PON light is flashing red!', 'EN');
assert((tech.intents || [tech.intent]).includes('technical_problem') && ctx.captureLeadFromInquiry(conv, tech, 'down') === null, 'Support/technical inquiry does not create a lead');
const techArea = ctx.classifyCustomerIntent('Internet keeps dropping in my Gulshan area', 'EN');
assert((techArea.intents || []).includes('coverage_availability') && ctx.captureLeadFromInquiry(conv, techArea, 'x') === null, 'Support complaint that names an area does not create a lead');
const vanguardConv = { conversationId: 'CONV-TEST-4410', customerId: 'CUST-4410', customerName: 'Vanguard Logistics', channel: 'web', type: 'dm', messages: [] };
const vgText = 'Is SpaceNet available in Banani for our new warehouse?';
const vg = ctx.captureLeadFromInquiry(vanguardConv, ctx.classifyCustomerIntent(vgText, 'EN'), vgText);
assert(vg && vg.lead.assignedTeam === 'CORPORATE_SALES', 'Enterprise customer inquiry routes to Corporate Sales');

const simConv = ctx.conversations.find(c => c.status === 'ai_handling' && !ctx.leads.some(l => l.source.conversationId === c.conversationId));
ctx.currentConversationId = simConv.conversationId;
const beforeSim = ctx.leads.length;
ctx.executeSimulateCustomerMessage('Is SpaceNet available in Banani? Do you guarantee 99.9% uptime?');
const simLead = ctx.leads.find(l => l.source.conversationId === simConv.conversationId);
assert(ctx.leads.length === beforeSim + 1 && simLead && simLead.coverageStatus === 'covered', 'Simulator inquiry auto-creates a covered lead');
ctx.executeSimulateCustomerMessage('Is SpaceNet available in Banani? Do you guarantee 99.9% uptime?');
assert(ctx.leads.length === beforeSim + 1, 'Simulating the same conversation again does not duplicate');
// No fixture starts in takeover, so put one there explicitly (and restore it).
const takeoverConv = ctx.conversations.find(c => !ctx.leads.some(l => l.source.conversationId === c.conversationId));
const prevStatus = takeoverConv.status;
takeoverConv.status = 'human_takeover';
ctx.currentConversationId = takeoverConv.conversationId;
const nTakeover = ctx.leads.length;
ctx.executeSimulateCustomerMessage('Is SpaceNet available in Gulshan?');
assert(ctx.leads.length === nTakeover, 'No AI lead capture while a human has taken over the chat');
takeoverConv.status = prevStatus;

// -------------------------------------------------------------------------
console.log('\n--- GROUP 8: Copilot routing action ---');
const routeConv = ctx.conversations.find(c => !ctx.leads.some(l => l.source.conversationId === c.conversationId));
routeConv.messages.push({ id: 't-route', sender: 'customer', text: 'Is SpaceNet available in Uttara?' });
ctx.currentConversationId = routeConv.conversationId;
el('chat-ai-routing-banner').setAttribute('data-active-route', 'sales_handoff');
const nRoute = ctx.leads.length;
ctx.handleRoutingAction();
assert(ctx.leads.length === nRoute + 1 && ctx.currentActiveView === 'sales-leads', '"Suggest Sales Lead" creates the lead and opens the Sales view');
assert(ctx.currentLeadId === ctx.leads[ctx.leads.length - 1].leadId && !el('lead-modal').classList.contains('hidden'), 'Lead detail dialog opens on the new lead');
ctx.handleRoutingAction();
assert(ctx.leads.length === nRoute + 1, 'Clicking again reopens the same lead');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 9: Follow-up reminders and site survey ---');
assert(ctx.isLeadFollowUpOverdue(ctx.getLeadById('LEAD-3002'), '2026-11-01') === true, 'Past-due reminder is overdue');
assert(ctx.isLeadFollowUpOverdue(ctx.getLeadById('LEAD-3002'), '2026-10-30') === false, 'Future reminder is not overdue');
assert(ctx.setLeadFollowUp('LEAD-3001', 'tomorrow', 'x') === false, 'Invalid reminder date rejected');
assert(ctx.setLeadFollowUp('LEAD-3001', '2026-11-05', 'Send brochure') && ctx.getLeadById('LEAD-3001').followUp.dueAt === '2026-11-05', 'Reminder set');
assert(ctx.completeLeadFollowUp('LEAD-3001') && ctx.getLeadById('LEAD-3001').followUp.done, 'Reminder completed');
assert(ctx.requestLeadSiteSurvey('LEAD-3004', '2026-11-04 11:00') === false, 'Survey refused outside coverage');
assert(ctx.requestLeadSiteSurvey('LEAD-3001', '2026-11-04 11:00') && ctx.getLeadById('LEAD-3001').surveyRequest.status === 'requested', 'Survey request recorded');
assert(/simulated; no technician dispatched/.test(ctx.getLeadById('LEAD-3001').history.slice(-1)[0].note), 'Survey history states nothing was dispatched');

// -------------------------------------------------------------------------
console.log('\n--- GROUP 10: Filters, detail dialog and links ---');
el('sales-team-filter').value = 'CORPORATE_SALES';
assert(ctx.getFilteredLeads().every(l => l.assignedTeam === 'CORPORATE_SALES'), 'Team filter');
el('sales-team-filter').value = 'ALL';
el('sales-coverage-filter').value = 'not_covered';
assert(ctx.getFilteredLeads().length >= 1 && ctx.getFilteredLeads().every(l => l.coverageStatus === 'not_covered'), 'Coverage filter');
el('sales-coverage-filter').value = 'ALL';
el('sales-search').value = 'savar';
assert(ctx.getFilteredLeads().length === 1 && ctx.getFilteredLeads()[0].leadId === 'LEAD-3004', 'Search by area');
el('sales-search').value = '';
ctx.openLeadModal('LEAD-3005');
assert(el('lead-modal-title').textContent === 'Tanvir Hossain' && /openLeadCustomerProfile\('LEAD-3005'\)/.test(el('lead-modal-body').innerHTML), 'Detail dialog renders with a customer-profile link');
ctx.closeLeadModal();
assert(el('lead-modal').classList.contains('hidden'), 'Detail dialog closes');
ctx.openLeadModal('LEAD-9999');
assert(el('toast-title').textContent === 'Lead Not Found', 'Unknown lead id shows a not-found message');
ctx.openLeadCustomerProfile('LEAD-3005');
assert(ctx.currentActiveView === 'customer-profiles', 'Customer link opens the Customer 360 view');

console.log('\n=============================================================');
console.log(`Test Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
console.log('=============================================================');
if (passed !== total) process.exit(1);
console.log('SUCCESS: All Module 06 checks PASSED!');
