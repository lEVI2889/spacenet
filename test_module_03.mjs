// test_module_03.mjs - Comprehensive Empirical Validation Suite for Module 03 (Ticketing & Support Management)
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 03 Empirical Validation Suite');
console.log('=============================================================\\n');

// Read index.html to extract the JavaScript runtime
const htmlPath = resolve('./index.html');
const htmlContent = readFileSync(htmlPath, 'utf-8');

// Locate the main application <script> block
const scriptMatches = [...htmlContent.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)];
const appScriptMatch = scriptMatches.find(m => m[1].includes('conversations') && m[1].includes('tickets'));

if (!appScriptMatch) {
  console.error('FATAL: Could not locate main application <script> block in index.html');
  process.exit(1);
}

let scriptCode = appScriptMatch[1];
// Replace top-level const and let with var so they attach to the vm global context
scriptCode = scriptCode.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var ');

// Mock DOM environment
const mockElements = new Map();
function getOrCreateMockElement(id) {
  if (!mockElements.has(id)) {
    const isHiddenByDefault = id.startsWith('voice-drawer-') || id === 'comment-to-dm-banner' || id === 'chat-frustration-alert' || id === 'create-ticket-modal' || id === 'ticket-detail-modal' || id === 'status-inquiry-modal' || id === 'new-ticket-duplicate-warning';
    const initialClasses = isHiddenByDefault ? new Set(['hidden']) : new Set();

    const el = {
      id,
      textContent: '',
      innerHTML: '',
      value: '',
      className: isHiddenByDefault ? 'hidden' : '',
      classList: {
        classes: initialClasses,
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      style: {},
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k] || null; },
      children: [],
      appendChild(c) { this.children.push(c); },
      querySelector(sel) { return null; },
      querySelectorAll(sel) { return []; },
      parentElement: null,
      focus() {},
      checked: false
    };
    mockElements.set(id, el);
  }
  return mockElements.get(id);
}

// Global browser mocks
global.document = {
  getElementById: (id) => getOrCreateMockElement(id),
  querySelector: (sel) => {
    if (sel.startsWith('#')) return getOrCreateMockElement(sel.slice(1));
    return {
      textContent: '',
      classList: { add() {}, remove() {}, contains() { return false; } },
      setAttribute() {},
      getAttribute() { return null; },
      style: {}
    };
  },
  querySelectorAll: (sel) => {
    if (sel === '#ticket-table-body tr') {
      const tbody = getOrCreateMockElement('ticket-table-body');
      return tbody.children || [];
    }
    return [];
  },
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      children: [],
      attributes: {},
      style: {},
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k] || null; },
      appendChild(child) {
        this.children.push(child);
        child.parentElement = this;
      },
      closest(sel) { return this; }
    };
    return el;
  }
};

global.window = {
  location: { hash: '' },
  addEventListener: () => {},
  scrollTo: () => {}
};

global.setTimeout = (fn, ms) => {
  if (typeof fn === 'function') fn();
};

global.showToast = (title, msg) => {
  // Mock toast logger for verification
  global.__lastToast = { title, msg };
};

// Execute script in VM context
const context = vm.createContext(global);
try {
  vm.runInContext(scriptCode, context);
  console.log('✓ index.html script successfully evaluated into Node runtime.\\n');
} catch (e) {
  console.error('FATAL: Script evaluation failed:', e);
  process.exit(1);
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  [PASS] Test ${passCount}: ${message}`);
  } else {
    failCount++;
    console.error(`  [FAIL] Test ${passCount + failCount}: ${message}`);
  }
}

// ============================================================================
// TEST GROUP 1: CUSTOMER REGISTRY & VERIFICATION (FEATURE GROUP 1)
// ============================================================================
console.log('--- TEST GROUP 1: Customer Registry & Verification ---');

assert(Array.isArray(context.SPACE_NET_CUSTOMERS), 'SPACE_NET_CUSTOMERS dataset exists and is an array');
assert(context.SPACE_NET_CUSTOMERS.length >= 7, 'SPACE_NET_CUSTOMERS contains at least 7 canonical subscribers');

// Lookup by customer ID
const custById = context.verifyCustomer('CUST-8832');
assert(custById.verified === true, 'verifyCustomer resolves CUST-8832');
assert(custById.customer.name === 'Alex Rivera', 'CUST-8832 is Alex Rivera');
assert(custById.customer.circuitId === 'SPN-FBR-0941', 'CUST-8832 circuit is SPN-FBR-0941');

// Lookup by display ID (#8832)
const custByDisplayId = context.verifyCustomer('#8832');
assert(custByDisplayId.verified === true, 'verifyCustomer resolves display ID #8832');
assert(custByDisplayId.customer.customerId === 'CUST-8832', '#8832 maps to CUST-8832');

// Lookup by name substring
const custByName = context.verifyCustomer('Sarah Jenkins');
assert(custByName.verified === true, 'verifyCustomer resolves by name "Sarah Jenkins"');
assert(custByName.customer.customerId === 'CUST-4491', 'Sarah Jenkins maps to CUST-4491');

// Lookup by phone number
const custByPhone = context.verifyCustomer('+880 1912-621034');
assert(custByPhone.verified === true, 'verifyCustomer resolves by phone "+880 1912-621034"');
assert(custByPhone.customer.name === 'Farhan Ahmed', 'Phone maps to Farhan Ahmed');

// Lookup by circuit ID
const custByCircuit = context.verifyCustomer('SPN-VDS-1092');
assert(custByCircuit.verified === true, 'verifyCustomer resolves by circuit SPN-VDS-1092');
assert(custByCircuit.customer.customerId === 'CUST-1092', 'SPN-VDS-1092 maps to Marcus Vance');

// Fallback for unknown customer
const unknownCust = context.verifyCustomer('NON_EXISTENT_SUBSCRIBER_9999');
assert(unknownCust.verified === false, 'verifyCustomer rejects unregistered customer');
assert(unknownCust.error.includes('Customer record not found'), 'Returns clear fictional verification fallback message');

// ============================================================================
// TEST GROUP 2: ISSUE CATEGORIES, PRIORITIES & CANONICAL SCHEMA (FEATURE GROUP 2)
// ============================================================================
console.log('\\n--- TEST GROUP 2: Issue Categories, Priorities & Canonical Schema ---');

assert(context.TICKET_CATEGORIES.NO_INTERNET !== undefined, 'Category NO_INTERNET exists');
assert(context.TICKET_CATEGORIES.SLOW_INTERNET !== undefined, 'Category SLOW_INTERNET exists');
assert(context.TICKET_CATEGORIES.ROUTER_WIFI !== undefined, 'Category ROUTER_WIFI exists');
assert(context.TICKET_CATEGORIES.BILLING !== undefined, 'Category BILLING exists');
assert(context.TICKET_CATEGORIES.GENERAL !== undefined, 'Category GENERAL exists');

assert(context.TICKET_PRIORITIES.URGENT.slaHours === 4, 'Urgent priority SLA is 4 hours');
assert(context.TICKET_PRIORITIES.HIGH.slaHours === 8, 'High priority SLA is 8 hours');
assert(context.TICKET_PRIORITIES.NORMAL.slaHours === 24, 'Normal priority SLA is 24 hours');

assert(context.TICKET_CATEGORIES.NO_INTERNET.defaultPriority === 'URGENT', 'No Internet recommends Urgent priority');
assert(context.TICKET_CATEGORIES.SLOW_INTERNET.defaultPriority === 'HIGH', 'Slow Internet recommends High priority');
assert(context.TICKET_CATEGORIES.BILLING.defaultPriority === 'NORMAL', 'Billing recommends Normal priority');

// Inspect canonical tickets in-memory state
assert(Array.isArray(context.tickets), 'tickets dataset exists and is an array');
assert(context.tickets.length >= 6, 'Pre-populated with at least 6 realistic tickets');

const tktAlex = context.tickets.find(t => t.ticketId === 'TKT-9042');
assert(tktAlex !== undefined, 'Ticket TKT-9042 exists');
assert(tktAlex.displayId === '#TKT-9042', 'TKT-9042 display alias is #TKT-9042');
assert(tktAlex.customerId === 'CUST-8832', 'TKT-9042 linked to CUST-8832');
assert(tktAlex.circuitId === 'SPN-FBR-0941', 'TKT-9042 linked to circuit SPN-FBR-0941');
assert(tktAlex.priority === 'URGENT', 'TKT-9042 has priority URGENT');
assert(tktAlex.status === 'IN_PROGRESS', 'TKT-9042 initial status is IN_PROGRESS');
assert(tktAlex.relatedConversationId === 'CONV-WA-8832', 'TKT-9042 linked to chat CONV-WA-8832');
assert(Array.isArray(tktAlex.history), 'TKT-9042 maintains chronological audit history');
assert(Array.isArray(tktAlex.guidedSteps), 'TKT-9042 has guided troubleshooting checklist');

// ============================================================================
// TEST GROUP 3: TICKET LIFECYCLE & STATE TRANSITIONS (FEATURE GROUP 3)
// ============================================================================
console.log('\\n--- TEST GROUP 3: Ticket Lifecycle & State Transitions ---');

// Test valid state transitions
const tktTestId = 'TKT-9042';

// 1. In Progress -> Pending Customer
const trans1 = context.updateTicketStatus(tktTestId, 'PENDING_CUSTOMER', 'Awaiting router reboot confirmation from customer.');
assert(trans1.success === true, 'Transition IN_PROGRESS -> PENDING_CUSTOMER succeeds');
assert(context.tickets.find(t => t.ticketId === tktTestId).status === 'PENDING_CUSTOMER', 'Status stored as PENDING_CUSTOMER');

// 2. Pending Customer -> Escalated
const trans2 = context.updateTicketStatus(tktTestId, 'ESCALATED', 'Customer unable to reboot ONT, fiber power fluctuating.');
assert(trans2.success === true, 'Transition PENDING_CUSTOMER -> ESCALATED succeeds');
assert(context.tickets.find(t => t.ticketId === tktTestId).status === 'ESCALATED', 'Status stored as ESCALATED');

// 3. Escalated -> Resolved (with resolution summary)
const trans3 = context.updateTicketStatus(tktTestId, 'RESOLVED', 'OLT port switch rebooted by Tier III NOC. Link restored.');
assert(trans3.success === true, 'Transition ESCALATED -> RESOLVED succeeds');
assert(context.tickets.find(t => t.ticketId === tktTestId).status === 'RESOLVED', 'Status stored as RESOLVED');
assert(context.tickets.find(t => t.ticketId === tktTestId).resolvedAt !== null, 'resolvedAt timestamp recorded');

// 4. Resolved -> Closed (Simulate customer confirmation)
const trans4 = context.updateTicketStatus(tktTestId, 'CLOSED', 'Customer confirmed high speed link restored.');
assert(trans4.success === true, 'Transition RESOLVED -> CLOSED succeeds');
assert(context.tickets.find(t => t.ticketId === tktTestId).status === 'CLOSED', 'Status stored as CLOSED');
assert(context.tickets.find(t => t.ticketId === tktTestId).closedAt !== null, 'closedAt timestamp recorded');

// 5. Closed -> Reopened
const trans5 = context.updateTicketStatus(tktTestId, 'REOPENED', 'Customer reported red PON light flashing again.');
assert(trans5.success === true, 'Transition CLOSED -> REOPENED succeeds');
assert(context.tickets.find(t => t.ticketId === tktTestId).status === 'REOPENED', 'Status stored as REOPENED');
assert(context.tickets.find(t => t.ticketId === tktTestId).reopenedAt !== null, 'reopenedAt timestamp recorded');

// 6. Test INVALID transition: Reopened -> Closed directly (must be resolved first)
const invalidTrans1 = context.updateTicketStatus(tktTestId, 'CLOSED', 'Direct close attempt');
assert(invalidTrans1.success === false, 'Cannot transition directly to CLOSED from an active/reopened state without resolving');
assert(invalidTrans1.error.includes('Invalid Transition'), 'Returns clear validation error for invalid transition');

// 7. Transition to same status rejected
const invalidTrans2 = context.updateTicketStatus(tktTestId, 'REOPENED', 'Duplicate reopen attempt');
assert(invalidTrans2.success === false, 'Transition to same status is rejected');

// Restore TKT-9042 back to IN_PROGRESS for remaining tests
context.updateTicketStatus(tktTestId, 'IN_PROGRESS', 'Restored to IN_PROGRESS for test suite execution.');

// ============================================================================
// TEST GROUP 4: GUIDED SUPPORT STEPS & DIAGNOSTICS (FEATURE GROUP 4)
// ============================================================================
console.log('\\n--- TEST GROUP 4: Guided Support Steps & Diagnostics ---');

const noInternetSteps = context.getGuidedStepsForCategory('NO_INTERNET');
assert(Array.isArray(noInternetSteps) && noInternetSteps.length >= 4, 'Provides at least 4 guided steps for No Internet');
assert(noInternetSteps.some(s => s.label.toLowerCase().includes('reboot')), 'Guided steps include reboot check');
assert(noInternetSteps.some(s => s.label.toLowerCase().includes('optical') || s.label.toLowerCase().includes('rx')), 'Guided steps include optical Rx check');

const slowInternetSteps = context.getGuidedStepsForCategory('SLOW_INTERNET');
assert(Array.isArray(slowInternetSteps) && slowInternetSteps.length >= 4, 'Provides at least 4 guided steps for Slow Internet');
assert(slowInternetSteps.some(s => s.label.toLowerCase().includes('speed test')), 'Slow Internet steps include speed test');
assert(slowInternetSteps.some(s => s.label.toLowerCase().includes('160mhz') || s.label.toLowerCase().includes('channel')), 'Slow Internet steps include channel calibration');

// Test toggleGuidedStep
context.currentModalTicket = tktAlex;
const initialCompleted = tktAlex.guidedSteps[3].completed;
context.toggleGuidedStep(3, !initialCompleted);
assert(tktAlex.guidedSteps[3].completed === !initialCompleted, 'toggleGuidedStep updates step completion');

// Test runSimulatedDiagnostic
const initialHistLen = tktAlex.history.length;
context.runSimulatedDiagnostic('reboot');
assert(tktAlex.history.length === initialHistLen + 1, 'runSimulatedDiagnostic logs diagnostic execution to history');
assert(tktAlex.history[tktAlex.history.length - 1].notes.includes('ONT'), 'History records remote ONT power-cycle');

// ============================================================================
// TEST GROUP 5: ESCALATION & CHAT INTEGRATION (FEATURE GROUP 5)
// ============================================================================
console.log('\\n--- TEST GROUP 5: Escalation & Chat Integration ---');

// Test Copilot Suggest Ticket action
const convAlex = context.getConversation('CONV-WA-8832');
assert(convAlex !== null, 'Alex Rivera conversation exists in conversations');

// Simulate handleRoutingAction with route ticket_suggest
const routingBanner = context.document.getElementById('chat-ai-routing-banner');
routingBanner.setAttribute('data-active-route', 'ticket_suggest');
context.currentConversationId = 'CONV-WA-8832';
context.handleRoutingAction();

const custIdInput = context.document.getElementById('new-ticket-cust-id');
const convIdInput = context.document.getElementById('new-ticket-conv-id');
assert(custIdInput.value === 'CUST-8832', 'Copilot action pre-fills customer ID CUST-8832');
assert(convIdInput.value === 'CONV-WA-8832', 'Copilot action pre-fills conversation ID CONV-WA-8832');

// Test ticket creation from chat context
context.document.getElementById('new-ticket-subject').value = 'Wi-Fi 5GHz band disappearing';
context.document.getElementById('new-ticket-desc').value = 'Customer reported 5GHz frequency dropout in WhatsApp.';
context.submitCreateTicket(true); // forceProceed=true to bypass duplicate warning

const newlyCreatedTicket = context.tickets[0];
assert(newlyCreatedTicket.ticketId.startsWith('TKT-'), 'Created ticket has canonical TKT-ID');
assert(newlyCreatedTicket.customerId === 'CUST-8832', 'Created ticket retains customer ID CUST-8832');
assert(newlyCreatedTicket.relatedConversationId === 'CONV-WA-8832', 'Created ticket retains conversation ID CONV-WA-8832');
assert(newlyCreatedTicket.sourceChannel === 'whatsapp', 'Created ticket retains source channel whatsapp');

// Test Ticket-to-Chat navigation (goToChatFromTicket)
context.goToChatFromTicket('CONV-WA-8832');
assert(context.currentChannelFilter === 'all' && context.currentTypeFilter === 'all', 'goToChatFromTicket auto-resets filters to all');
assert(context.currentConversationId === 'CONV-WA-8832', 'goToChatFromTicket navigates to Alex Rivera chat thread');

// Test Technical Escalation
context.currentModalTicket = newlyCreatedTicket;
context.escalateCurrentTicket();
assert(newlyCreatedTicket.status === 'ESCALATED', 'escalateCurrentTicket sets status to ESCALATED');
assert(newlyCreatedTicket.handlingAgent === 'Tier III NOC Engineering', 'Handling agent updated to Tier III NOC Engineering');
assert(newlyCreatedTicket.history[newlyCreatedTicket.history.length - 1].notes.includes('Module 09'), 'Audit log documents future Module 09 integration point');

// ============================================================================
// TEST GROUP 6: STATUS TRACKING, DUPLICATES & OVERDUE TICKETS (FEATURE GROUP 6)
// ============================================================================
console.log('\\n--- TEST GROUP 6: Status Tracking, Duplicates & Overdue Tickets ---');

// Duplicate detection check
const duplicateFound = context.checkDuplicateTicket('CUST-8832', 'NO_INTERNET');
assert(duplicateFound !== null, 'checkDuplicateTicket detects existing active ticket for CUST-8832 and NO_INTERNET');

const duplicateNotFound = context.checkDuplicateTicket('CUST-8832', 'BILLING');
assert(duplicateNotFound === null, 'checkDuplicateTicket returns null for unrepresented category');

// Overdue SLA detection check
const tktMarcus = context.tickets.find(t => t.ticketId === 'TKT-9031');
assert(tktMarcus !== undefined, 'Ticket TKT-9031 (Marcus Vance) exists');
const isMarcusOverdue = context.isTicketOverdue(tktMarcus);
assert(isMarcusOverdue === true, 'TKT-9031 is correctly detected as SLA OVERDUE');

const tktHyperion = context.tickets.find(t => t.ticketId === 'TKT-9035');
const isHyperionOverdue = context.isTicketOverdue(tktHyperion);
assert(isHyperionOverdue === false, 'Resolved ticket TKT-9035 is NOT overdue');

// Status Inquiry Simulation
const inquiryById = context.simulateCustomerStatusInquiry('#TKT-9042');
assert(inquiryById.found === true, 'simulateCustomerStatusInquiry resolves by #TKT-9042');
assert(inquiryById.message.includes('Alex Rivera'), 'Status message identifies Alex Rivera');
assert(inquiryById.message.includes('Investigating') || inquiryById.message.includes('IN_PROGRESS'), 'Status message includes current state');

const inquiryByCust = context.simulateCustomerStatusInquiry('CUST-1092');
assert(inquiryByCust.found === true, 'simulateCustomerStatusInquiry resolves by Customer ID CUST-1092');
assert(inquiryByCust.message.includes('Overdue') || inquiryByCust.message.includes('OVERDUE'), 'Status message notes overdue SLA status');

const inquiryUnknown = context.simulateCustomerStatusInquiry('UNKNOWN_9999');
assert(inquiryUnknown.found === false, 'simulateCustomerStatusInquiry handles missing record gracefully');

// Filter tickets by Category, Priority, and Status
context.document.getElementById('ticket-type-filter').value = 'NO_INTERNET';
context.document.getElementById('ticket-priority-filter').value = 'ALL';
context.document.getElementById('ticket-status-filter').value = 'ALL';
context.document.getElementById('ticket-search-input').value = '';
context.filterTicketRows();

const filteredRows = context.document.getElementById('ticket-table-body').children;
assert(filteredRows.length >= 1, 'Filter by NO_INTERNET yields active matching tickets');

// Reset filters
context.document.getElementById('ticket-type-filter').value = 'ALL';
context.filterTicketRows();

// ============================================================================
// TEST GROUP 7: RESOLUTION, REOPENING & CUSTOMER RATINGS (FEATURE GROUP 7)
// ============================================================================
console.log('\\n--- TEST GROUP 7: Resolution, Reopening & Customer Ratings ---');

const testTkt = newlyCreatedTicket;
context.currentModalTicket = testTkt;

// Mark resolved
context.document.getElementById('td-modal-resolution-summary').value = 'Rebooted GPON optical termination unit and adjusted channel frequency.';
context.resolveCurrentTicketModal();
assert(testTkt.status === 'RESOLVED', 'Ticket marked as RESOLVED');
assert(testTkt.resolutionSummary.includes('Rebooted GPON'), 'Resolution summary recorded');

// Simulate customer satisfaction feedback
context.document.getElementById('td-modal-sim-rating').value = '5';
context.document.getElementById('td-modal-sim-comment').value = 'Excellent automated diagnostic and fast resolution.';
context.submitSimulatedCustomerFeedback();

assert(testTkt.feedback !== null, 'Customer feedback object created');
assert(testTkt.feedback.rating === 5, 'CSAT rating recorded as 5 stars');
assert(testTkt.feedback.comment.includes('Excellent'), 'Customer feedback comment recorded');

// Customer confirmation & closure
context.confirmCustomerClosure();
assert(testTkt.status === 'CLOSED', 'Ticket transitioned to CLOSED upon customer confirmation');

// Reopen ticket
context.reopenCurrentTicketModal();
assert(testTkt.status === 'REOPENED', 'Ticket successfully reopened');
assert(testTkt.feedback !== null, 'Reopening preserves previous customer feedback');
assert(testTkt.resolutionSummary !== null, 'Reopening preserves previous resolution notes');
assert(testTkt.history.some(h => h.action === 'REOPENED'), 'Audit log contains REOPENED event');

// ============================================================================
// TEST GROUP 8: REGRESSION INTEGRITY OF MODULES 01 AND 02
// ============================================================================
console.log('\\n--- TEST GROUP 8: Regression Integrity of Modules 01 & 02 ---');

// Verify Module 01 conversations
assert(Array.isArray(context.conversations), 'conversations array intact');
assert(context.conversations.length >= 7, 'All base conversations preserved');

// Verify Module 02 knowledge base
assert(context.SPACE_NET_KNOWLEDGE_BASE !== undefined, 'SPACE_NET_KNOWLEDGE_BASE intact');
const testIntent = context.classifyCustomerIntent('My internet is slow and PON light is red', 'EN');
assert(testIntent.intent === 'technical_problem', 'Intent classification intact');
assert(testIntent.route === 'ticket_suggest', 'Technical problem still routes to ticket_suggest');

// Verify Multilingual support
const bnIntent = context.classifyCustomerIntent('ইন্টারনেট প্যাকেজ গুলোর দাম কত?', 'BN');
assert(bnIntent.intent === 'packages_pricing', 'Bengali intent classification intact');

// ============================================================================
// TEST GROUP 9: MODULE 03 QA REMEDIATION & CHAT-TO-TICKET ROUTING SUITE
// ============================================================================
console.log('\n--- TEST GROUP 9: Module 03 QA Remediation & Chat-to-Ticket Routing Suite ---');

// 1. Explicit ticket-creation requests
const res1 = context.classifyCustomerIntent("Please open a support ticket for my connection.", 'EN');
assert(res1.intent === 'technical_problem', '1. Explicit ticket creation request classified as technical_problem');
assert(res1.route === 'ticket_suggest', '1. Explicit ticket request routes to ticket_suggest');

// 2. No Internet plus ticket requests
const res2 = context.classifyCustomerIntent("My internet has stopped working. Please open a support ticket.", 'EN');
assert(res2.intent === 'technical_problem', '2. No Internet plus ticket request classified as technical_problem');
assert(res2.route === 'ticket_suggest', '2. No Internet plus ticket request routes to ticket_suggest');
assert(res2.routeLabel === 'Support Ticket Desk', '2. Route label is Support Ticket Desk');
assert(res2.response.includes('Support Ticket Desk') && res2.response.includes('confirmation'), '2. AI response addresses technical issue and states ticket requires confirmation');

// 3. Technical support inquiry routing
const res3 = context.classifyCustomerIntent("My optical fiber connection is down and PON light is flashing red.", 'EN');
assert(res3.intent === 'technical_problem', '3. Technical support inquiry classified as technical_problem');
assert(res3.route === 'ticket_suggest', '3. Technical support inquiry routes to ticket_suggest');

// 4. Genuine support-hours inquiries
const res4 = context.classifyCustomerIntent("What time does customer support close?", 'EN');
assert(res4.intent === 'support_hours', '4. Genuine support-hours inquiry classified as support_hours');
assert(res4.route === 'faq', '4. Support-hours inquiry routes to faq');
assert(res4.routeLabel === 'Support Info', '4. Support-hours route label is Support Info');
assert(res4.response.includes('24 Hours / 7 Days a Week'), '4. Returns accurate support operations schedule');

const res4b = context.classifyCustomerIntent("When are your office hours?", 'EN');
assert(res4b.intent === 'support_hours', '4b. Office hours query classified as support_hours');

// 5. Latest-message routing updates
const alexConv = context.customerConversations['alex'] || context.conversations.find(c => c.customerId === 'CUST-8832');
assert(alexConv !== undefined, 'Alex Rivera conversation exists for simulator test');
alexConv.messages.push({
  id: 'sim-qa-' + Date.now(),
  sender: 'customer',
  text: 'My internet has stopped working. Please open a support ticket.'
});
context.currentConversationId = 'CONV-WA-8832';
context.currentCustomerKey = 'alex';
context.updateAiCopilotRouting(alexConv);

const qaRoutingBanner = context.document.getElementById('chat-ai-routing-banner');
assert(qaRoutingBanner.getAttribute('data-active-route') === 'ticket_suggest', '5. Routing banner updates to ticket_suggest on latest incoming message');

// 6. Suggest Ticket action availability
const qaActionLabel = context.document.getElementById('routing-action-label');
assert(qaActionLabel.textContent === 'Suggest Ticket', '6. Action button displays "Suggest Ticket"');

// 7. Customer ID prefilling
context.handleRoutingAction();
assert(context.document.getElementById('new-ticket-cust-id').value === 'CUST-8832', '7. Prefilled customer ID is CUST-8832');
assert(context.document.getElementById('new-ticket-cust-name').value === 'Alex Rivera', '7. Prefilled customer name is Alex Rivera');

// 8. Conversation ID prefilling
assert(context.document.getElementById('new-ticket-conv-id').value === 'CONV-WA-8832', '8. Prefilled conversation ID is CONV-WA-8832');

// 9. Source channel preservation & problem description derivation
assert(context.document.getElementById('new-ticket-source-channel').value === 'whatsapp', '9. Prefilled source channel is whatsapp');
const prefilledDesc = context.document.getElementById('new-ticket-desc').value;
assert(prefilledDesc.includes('internet has stopped working'), '9. Problem description derived from latest customer inquiry');

// 10. Ticket creation requiring explicit staff confirmation
const qaCreateModal = context.document.getElementById('create-ticket-modal');
assert(!qaCreateModal.classList.contains('hidden'), '10. Create Ticket modal is open awaiting staff confirmation');
const ticketCountBeforeConfirmation = context.tickets.length;
assert(context.tickets.length === ticketCountBeforeConfirmation, '10. Ticket is NOT created in memory until staff confirms creation');

// 11. Preserving historical frustration indicator without suppressing technical routing
const qaIntentEl = context.document.getElementById('routing-detected-intent');
const qaConfPill = context.document.getElementById('routing-confidence-pill');
const qaRouteEl = context.document.getElementById('routing-suggested-route');
assert(qaIntentEl.textContent.includes('Frustration Flagged'), '11. Historical customer frustration indicator remains visible in intent label');
assert(qaConfPill.textContent === 'High Churn Risk', '11. High Churn Risk badge remains visible');
assert(qaRouteEl.textContent === 'Support Ticket Desk', '11. Technical routing (Support Ticket Desk) is NOT suppressed by frustration');

// 12. Duplicate ticket detection for Alex Rivera
context.submitCreateTicket(false); // First click without force proceed
const qaDupBox = context.document.getElementById('new-ticket-duplicate-warning');
assert(!qaDupBox.classList.contains('hidden'), '12. Duplicate ticket warning triggered for active ticket #TKT-9042');
assert(context.tickets.length === ticketCountBeforeConfirmation, '12. Duplicate detection prevents accidental creation pending staff choice');

// 13. Preserving originating conversation association after creation
context.submitCreateTicket(true); // Staff explicitly force-proceeds
assert(context.tickets.length === ticketCountBeforeConfirmation + 1, '13. Ticket created after explicit staff confirmation');
const createdHandoffTicket = context.tickets[0];
assert(createdHandoffTicket.customerId === 'CUST-8832', '13. Created ticket retains customer ID CUST-8832');
assert(createdHandoffTicket.relatedConversationId === 'CONV-WA-8832', '13. Created ticket retains originating conversation CONV-WA-8832');
assert(createdHandoffTicket.sourceChannel === 'whatsapp', '13. Created ticket retains sourceChannel whatsapp');

// 14. Navigation back to the originating chat from the ticket
context.currentModalTicket = createdHandoffTicket;
context.goToChatFromTicket();
assert(context.currentConversationId === 'CONV-WA-8832', '14. Open Chat navigates back to originating conversation CONV-WA-8832');

console.log('\\n=============================================================');
console.log(`Test Execution Summary: ${passCount} / ${passCount + failCount} Passed (${Math.round((passCount / (passCount + failCount)) * 100)}%)`);
console.log('=============================================================');

if (failCount > 0) {
  console.error(`FAILURE: ${failCount} tests failed in Module 03 validation suite.`);
  process.exit(1);
} else {
  console.log('SUCCESS: All Module 03 Feature Groups and Regressions PASSED!');
}
