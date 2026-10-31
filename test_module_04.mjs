// test_module_04.mjs - Comprehensive Empirical Validation Suite for Module 04 (Customer Profiles & Unified Customer 360° View)
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 04 Empirical Validation Suite');
console.log('Customer Profiles & Unified Customer 360° View');
console.log('=============================================================\n');

// Read index.html to extract the JavaScript runtime
const htmlPath = resolve('./index.html');
const htmlContent = readFileSync(htmlPath, 'utf-8');

// Locate the main application <script> block
const scriptMatches = [...htmlContent.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)];
const appScriptMatch = scriptMatches.find(m => m[1].includes('conversations') && m[1].includes('tickets') && m[1].includes('SPACE_NET_CUSTOMERS'));

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
    const isHiddenByDefault = id.startsWith('voice-drawer-') ||
      id === 'comment-to-dm-banner' ||
      id === 'chat-frustration-alert' ||
      id === 'create-ticket-modal' ||
      id === 'ticket-detail-modal' ||
      id === 'status-inquiry-modal' ||
      id === 'new-ticket-duplicate-warning' ||
      id === 'customer-directory-empty-state' ||
      id === 'view-unified-inbox' ||
      id === 'view-tickets' ||
      id === 'view-customer-profiles' ||
      id === 'view-sales-leads' ||
      id === 'view-network-outages';

    const initialClasses = isHiddenByDefault ? new Set(['hidden']) : new Set();

    const el = {
      id,
      textContent: '',
      innerHTML: '',
      value: '',
      className: isHiddenByDefault ? 'hidden' : '',
      classList: {
        classes: initialClasses,
        add(...args) { args.forEach(c => this.classes.add(c)); },
        remove(...args) { args.forEach(c => this.classes.delete(c)); },
        contains(c) { return this.classes.has(c); }
      },
      style: {},
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k] || null; },
      children: [],
      appendChild(c) { this.children.push(c); },
      querySelector(sel) {
        if (sel && sel.startsWith('#')) return getOrCreateMockElement(sel.slice(1));
        return null;
      },
      querySelectorAll(sel) { return []; },
      parentElement: null,
      focus() {},
      checked: false,
      disabled: false,
      href: ''
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
    if (sel === '.app-view') {
      return [
        getOrCreateMockElement('view-dashboard'),
        getOrCreateMockElement('view-unified-inbox'),
        getOrCreateMockElement('view-tickets'),
        getOrCreateMockElement('view-customer-profiles'),
        getOrCreateMockElement('view-sales-leads'),
        getOrCreateMockElement('view-network-outages')
      ];
    }
    if (sel === '.view-switch-btn') {
      return [
        getOrCreateMockElement('nav-btn-dashboard'),
        getOrCreateMockElement('nav-btn-unified-inbox'),
        getOrCreateMockElement('nav-btn-tickets'),
        getOrCreateMockElement('nav-btn-customer-profiles'),
        getOrCreateMockElement('nav-btn-sales-leads'),
        getOrCreateMockElement('nav-btn-network-outages')
      ];
    }
    if (sel === 'aside nav a') {
      return [];
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
        add(...args) { args.forEach(c => this.classes.add(c)); },
        remove(...args) { args.forEach(c => this.classes.delete(c)); },
        contains(c) { return this.classes.has(c); }
      },
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k] || null; },
      appendChild(child) { this.children.push(child); },
      querySelector(s) { return null; },
      querySelectorAll(s) { return []; },
      onclick: null
    };
    return el;
  }
};

global.window = {
  location: { hash: '' },
  scrollTo: () => {},
  addEventListener: () => {},
  document: global.document
};

global.setTimeout = (fn, ms) => fn();
global.clearTimeout = () => {};

// Evaluate script inside VM context
const context = vm.createContext(global);
try {
  vm.runInContext(scriptCode, context);
  console.log('✓ index.html script successfully evaluated into Node runtime.\n');
} catch (err) {
  console.error('FATAL: Script evaluation error in index.html:', err);
  process.exit(1);
}

// Test runner assertion helper
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testDescription) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testDescription}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test ${totalTests}: ${testDescription}`);
  }
}

// =========================================================================
// TEST GROUP 1: Canonical Shared Customer Registry & Schema Integrity
// =========================================================================
console.log('--- TEST GROUP 1: Canonical Customer Registry & Schema Integrity ---');
assert(Array.isArray(context.SPACE_NET_CUSTOMERS), 'SPACE_NET_CUSTOMERS dataset exists and is an array');
assert(context.SPACE_NET_CUSTOMERS.length === 9, 'SPACE_NET_CUSTOMERS contains exactly 9 canonical subscribers');

const allCustIds = context.SPACE_NET_CUSTOMERS.map(c => c.customerId);
assert(allCustIds.every(id => id.startsWith('CUST-')), 'All customer IDs follow canonical CUST-<ID> format');

const alex = context.SPACE_NET_CUSTOMERS.find(c => c.customerId === 'CUST-8832');
assert(alex !== undefined, 'Alex Rivera (CUST-8832) exists in registry');
assert(alex.name === 'Alex Rivera', 'Alex Rivera name matches fixture');
assert(alex.phone === '+880 1711-098832', 'Alex Rivera phone matches fixture');
assert(alex.email === 'alex.rivera@example.com', 'Alex Rivera email matches fixture');
assert(alex.circuitId === 'SPN-FBR-0941', 'Alex Rivera primary circuitId is SPN-FBR-0941');
assert(alex.plan === 'Fiber 500M', 'Alex Rivera plan is Fiber 500M');
assert(alex.zone === 'Dhanmondi', 'Alex Rivera zone is Dhanmondi');
assert(alex.accountStatus !== undefined, 'Alex Rivera has accountStatus defined');
assert(Array.isArray(alex.connections), 'Alex Rivera has structured connections array');
assert(alex.connections.length >= 2, 'Alex Rivera has multiple connections (at least 2)');

const vanguard = context.SPACE_NET_CUSTOMERS.find(c => c.customerId === 'CUST-4410');
assert(vanguard !== undefined, 'Vanguard Logistics (CUST-4410) exists in registry');
assert(vanguard.circuitId === 'SPN-DED-4410', 'Vanguard Logistics primary circuitId is SPN-DED-4410');
assert(vanguard.connections.length >= 2, 'Vanguard Logistics has multiple connections (at least 2)');

const allHaveConnections = context.SPACE_NET_CUSTOMERS.every(c => Array.isArray(c.connections) && c.connections.length >= 1);
assert(allHaveConnections, 'Every customer record contains structured connections array with >= 1 connection');

const allConnectionsHaveEquip = context.SPACE_NET_CUSTOMERS.every(c =>
  c.connections.every(conn => conn.equipment && conn.equipment.ontModel && conn.equipment.routerModel && conn.equipment.oltPort)
);
assert(allConnectionsHaveEquip, 'All connections contain hardware equipment details (ONT, Router, OLT Port)');

// =========================================================================
// TEST GROUP 2: Search Engine & Customer Directory
// =========================================================================
console.log('\n--- TEST GROUP 2: Customer Search & Directory Engine ---');
assert(typeof context.searchCustomers === 'function', 'searchCustomers function exists');

// 1. Search by Customer ID
const searchId = context.searchCustomers('CUST-8832');
assert(searchId.length === 1 && searchId[0].customerId === 'CUST-8832', 'Search by exact Customer ID "CUST-8832" returns Alex Rivera');

const searchIdNum = context.searchCustomers('8832');
assert(searchIdNum.length === 1 && searchIdNum[0].customerId === 'CUST-8832', 'Search by Customer ID digits "8832" returns Alex Rivera');

// 2. Search by Name
const searchName = context.searchCustomers('sarah');
assert(searchName.length === 1 && searchName[0].customerId === 'CUST-4491', 'Search by Name "sarah" (case-insensitive) returns Sarah Jenkins');

// 3. Search by Phone
const searchPhone = context.searchCustomers('01912');
assert(searchPhone.length === 1 && searchPhone[0].customerId === 'CUST-6210', 'Search by Phone digits "01912" returns Farhan Ahmed');

// 4. Search by Primary Circuit
const searchCircuit = context.searchCustomers('SPN-VDS-1092');
assert(searchCircuit.length === 1 && searchCircuit[0].customerId === 'CUST-1092', 'Search by primary Circuit ID "SPN-VDS-1092" returns Marcus Vance');

// 5. Search by Secondary Circuit (Multiple Connections feature)
const searchSecCircuit = context.searchCustomers('SPN-FBR-0942');
assert(searchSecCircuit.length === 1 && searchSecCircuit[0].customerId === 'CUST-8832', 'Search by secondary Circuit ID "SPN-FBR-0942" resolves to Alex Rivera');

const searchVanguardSec = context.searchCustomers('SPN-FBR-4412');
assert(searchVanguardSec.length === 1 && searchVanguardSec[0].customerId === 'CUST-4410', 'Search by secondary Circuit ID "SPN-FBR-4412" resolves to Vanguard Logistics');

// 6. Search by Area / Zone
const searchZone = context.searchCustomers('Mirpur');
assert(searchZone.length === 1 && searchZone[0].customerId === 'CUST-3340', 'Search by Area "Mirpur" returns Nabila Karim');

const searchDhanmondi = context.searchCustomers('Dhanmondi');
assert(searchDhanmondi.length >= 2, 'Search by Area "Dhanmondi" returns all Dhanmondi subscribers (Alex & Tanvir)');

// 7. Zone Filter Dropdown
const filterGulshan = context.searchCustomers('', 'Gulshan', 'ALL');
assert(filterGulshan.length === 1 && filterGulshan[0].name === 'Sarah Jenkins', 'Zone filter "Gulshan" isolates Sarah Jenkins');

// 8. Status Filter Dropdown
const filterVIP = context.searchCustomers('', 'ALL', 'VIP');
assert(filterVIP.length >= 2, 'Status filter "VIP" returns corporate accounts (Sarah & Vanguard)');

// 9. Unknown search handling
const searchUnknown = context.searchCustomers('nonexistent-subscriber-xyz');
assert(Array.isArray(searchUnknown) && searchUnknown.length === 0, 'Search for nonexistent customer returns empty array without throwing');

// 10. verifyCustomer fallback contract
const verifyUnknown = context.verifyCustomer('unknown-xyz-9999');
assert(verifyUnknown.verified === false, 'verifyCustomer for unknown query returns verified: false');
assert(verifyUnknown.error.includes('Fictional verification fallback'), 'verifyCustomer provides explicit fictional verification guidance');

// =========================================================================
// TEST GROUP 3: Multiple Connections & Circuit Compatibility
// =========================================================================
console.log('\n--- TEST GROUP 3: Multiple Connections & Circuit Compatibility ---');
assert(alex.connections.length === 2, 'Alex Rivera has exactly 2 provisioned connections');
const alexPrimary = alex.connections.find(c => c.isPrimary);
const alexSecondary = alex.connections.find(c => !c.isPrimary);

assert(alexPrimary !== undefined, 'Alex Rivera primary connection is marked isPrimary: true');
assert(alexSecondary !== undefined, 'Alex Rivera secondary connection is marked isPrimary: false');
assert(alexPrimary.circuitId === alex.circuitId, 'Primary connection circuitId strictly matches customer circuitId (SPN-FBR-0941)');
assert(alexSecondary.circuitId === 'SPN-FBR-0942', 'Secondary connection has stable circuit identifier SPN-FBR-0942');
assert(alexSecondary.plan === 'Fiber Home Office 100M', 'Secondary connection has distinct plan (Fiber Home Office 100M)');
assert(alexSecondary.connectionStatus === 'Active (Online)', 'Secondary connection has connectionStatus');

// Interactive connection switching
context.selectCustomerProfile('CUST-8832');
assert(context.currentProfileCustomerId === 'CUST-8832', 'selectCustomerProfile sets currentProfileCustomerId');
assert(context.currentProfileCircuitId === 'SPN-FBR-0941', 'Default selected circuit is primary circuit SPN-FBR-0941');

context.selectCustomerConnection('SPN-FBR-0942');
assert(context.currentProfileCircuitId === 'SPN-FBR-0942', 'selectCustomerConnection switches active circuit to SPN-FBR-0942');

// Ensure legacy single-circuit lookups still work
const legacyLookups = context.SPACE_NET_CUSTOMERS.every(c => typeof c.circuitId === 'string' && c.circuitId.startsWith('SPN-'));
assert(legacyLookups, 'All customers retain primary circuitId in SPN-<TYPE>-<ID> format for legacy lookups');

// =========================================================================
// TEST GROUP 4: Unified Omnichannel Conversation History
// =========================================================================
console.log('\n--- TEST GROUP 4: Unified Omnichannel Conversation History ---');
const alexConvs = context.conversations.filter(c => c.customerId === 'CUST-8832');
assert(alexConvs.length === 1, 'Alex Rivera has 1 linked conversation (CONV-WA-8832)');
assert(alexConvs[0].channel === 'whatsapp', 'Alex Rivera channel is whatsapp');
assert(alexConvs[0].type === 'dm', 'Alex Rivera conversation is a direct message');

const tanvirConvs = context.conversations.filter(c => c.customerId === 'CUST-5120');
assert(tanvirConvs.length >= 1, 'Tanvir Hossain has linked conversation');
const tanvirComment = tanvirConvs.find(c => c.conversationId === 'CONV-FB-5120');
assert(tanvirComment.type === 'comment', 'Tanvir conversation CONV-FB-5120 is classified as comment');
assert(tanvirComment.postContext !== undefined, 'Public comment conversation contains postContext');

// Internal note privacy check
const sarahConv = context.conversations.find(c => c.customerId === 'CUST-4491');
assert(sarahConv !== undefined, 'Sarah Jenkins conversation exists');
const internalNotes = sarahConv.messages.filter(m => m.isInternal || m.sender === 'note');
assert(internalNotes.length >= 1, 'Sarah Jenkins thread contains internal staff notes');
assert(internalNotes[0].isInternal === true, 'Internal note explicitly has isInternal: true');
assert(internalNotes[0].sender === 'note', 'Internal note has sender: "note"');

// Customers with no conversation history
const vanguardConvs = context.conversations.filter(c => c.customerId === 'CUST-4410');
assert(vanguardConvs.length === 0, 'Vanguard Logistics has no social chat conversations (Portal user)');

// =========================================================================
// TEST GROUP 5: Support Tickets & Complaint History
// =========================================================================
console.log('\n--- TEST GROUP 5: Support Tickets & Complaint History ---');
const alexTickets = context.tickets.filter(t => t.customerId === 'CUST-8832');
assert(alexTickets.length >= 1, 'Alex Rivera has at least 1 support ticket');
const alexTkt = alexTickets.find(t => t.ticketId === 'TKT-9042');
assert(alexTkt !== undefined, 'Ticket TKT-9042 links to Alex Rivera (CUST-8832)');
assert(alexTkt.category === 'NO_INTERNET', 'TKT-9042 category is NO_INTERNET');
assert(alexTkt.priority === 'URGENT', 'TKT-9042 priority is URGENT');
assert(alexTkt.status === 'IN_PROGRESS', 'TKT-9042 status is IN_PROGRESS');

const marcusTickets = context.tickets.filter(t => t.customerId === 'CUST-1092');
assert(marcusTickets.length >= 1, 'Marcus Vance has support ticket');
const marcusTkt = marcusTickets.find(t => t.ticketId === 'TKT-9031');
assert(marcusTkt.status === 'ESCALATED', 'TKT-9031 status is ESCALATED');
assert(context.isTicketOverdue(marcusTkt) === true, 'TKT-9031 is correctly detected as SLA OVERDUE');

const hyperionTickets = context.tickets.filter(t => t.customerId === 'CUST-7719');
assert(hyperionTickets.length >= 1, 'Hyperion Studio has support ticket');
const hyperionTkt = hyperionTickets.find(t => t.ticketId === 'TKT-9035');
assert(hyperionTkt.status === 'RESOLVED', 'TKT-9035 is RESOLVED');
assert(hyperionTkt.feedback !== null && hyperionTkt.feedback.rating === 5, 'TKT-9035 has 5-star CSAT customer rating');

const farhanTickets = context.tickets.filter(t => t.customerId === 'CUST-6210');
assert(farhanTickets.length >= 1, 'Farhan Ahmed has support ticket');
const farhanTkt = farhanTickets.find(t => t.ticketId === 'TKT-9019');
assert(farhanTkt.status === 'REOPENED', 'TKT-9019 status is REOPENED');
assert(farhanTkt.history.length >= 2, 'Reopened ticket preserves prior history entries');

// =========================================================================
// TEST GROUP 6: Customer 360° Workspace & Cross-Navigation
// =========================================================================
console.log('\n--- TEST GROUP 6: Customer 360° Workspace & Cross-Navigation ---');

// 1. Profile Selection
context.selectCustomerProfile('CUST-4491');
assert(context.currentProfileCustomerId === 'CUST-4491', 'selectCustomerProfile switches to Sarah Jenkins (CUST-4491)');
assert(context.currentProfileCircuitId === 'SPN-FBR-4491', 'Active circuit is SPN-FBR-4491');

// 2. Profile-to-Chat Navigation
context.selectCustomerProfile('CUST-8832');
context.goToChatFromProfile('CONV-WA-8832');
assert(context.currentActiveView === 'unified-inbox', 'goToChatFromProfile switches active view to unified-inbox');
assert(context.currentConversationId === 'CONV-WA-8832', 'goToChatFromProfile selects conversation CONV-WA-8832');

// 3. Profile-to-Ticket Navigation
let modalOpened = false;
const origOpenTicketDetail = context.openTicketDetail;
context.openTicketDetail = (tkt) => {
  modalOpened = true;
  origOpenTicketDetail(tkt);
};
context.openTicketDetailFromProfile('TKT-9042');
assert(modalOpened === true, 'openTicketDetailFromProfile invokes openTicketDetail for TKT-9042');

// 4. Create Ticket from Profile
let createTicketPrefill = null;
const origOpenCreate = context.openCreateTicketModal;
context.openCreateTicketModal = (prefill) => {
  createTicketPrefill = prefill;
  origOpenCreate(prefill);
};
context.createTicketFromProfile('CUST-8832');
assert(createTicketPrefill !== null, 'createTicketFromProfile opens create ticket modal with prefill');
assert(createTicketPrefill.customerId === 'CUST-8832', 'Prefilled customerId is CUST-8832');
assert(createTicketPrefill.customerName === 'Alex Rivera', 'Prefilled customerName is Alex Rivera');
assert(createTicketPrefill.circuitId === 'SPN-FBR-0941', 'Prefilled circuitId matches active circuit SPN-FBR-0941');

// 5. Chat-to-Profile Navigation
context.goToProfileFromChat('CUST-6210');
assert(context.currentActiveView === 'customer-profiles', 'goToProfileFromChat switches view to customer-profiles');
assert(context.currentProfileCustomerId === 'CUST-6210', 'goToProfileFromChat selects customer Farhan Ahmed (CUST-6210)');

// 6. Ticket-to-Profile Navigation
context.goToProfileFromTicket('CUST-1092');
assert(context.currentActiveView === 'customer-profiles', 'goToProfileFromTicket switches view to customer-profiles');
assert(context.currentProfileCustomerId === 'CUST-1092', 'goToProfileFromTicket selects customer Marcus Vance (CUST-1092)');

// =========================================================================
// TEST GROUP 7: Chronological Complaint & Support Event Timeline
// =========================================================================
console.log('\n--- TEST GROUP 7: Chronological Complaint & Support Event Timeline ---');
context.selectCustomerProfile('CUST-8832');
const timelineContainer = global.document.getElementById('cust-timeline-container');
assert(timelineContainer !== null, 'Timeline container DOM element exists');
assert(timelineContainer.children.length >= 2, 'Timeline renders multiple milestone cards for Alex Rivera');

// Verify timeline aggregation logic directly
const alexCust = context.SPACE_NET_CUSTOMERS.find(c => c.customerId === 'CUST-8832');
const alexHistoryEvents = [];
context.tickets.filter(t => t.customerId === alexCust.customerId).forEach(tkt => {
  (tkt.history || []).forEach(h => {
    alexHistoryEvents.push({
      action: h.action,
      notes: h.notes,
      timestamp: new Date(h.timestamp).getTime()
    });
  });
});
assert(alexHistoryEvents.length >= 2, 'Alex Rivera has >= 2 historical support events from tickets');
assert(alexHistoryEvents.some(e => e.action === 'CREATED'), 'Timeline contains CREATED action event');
assert(alexHistoryEvents.some(e => e.action === 'DIAGNOSTICS_RUN'), 'Timeline contains DIAGNOSTICS_RUN action event');

// =========================================================================
// TEST GROUP 8: Metrics Ribbon & Dynamic Calculation
// =========================================================================
console.log('\n--- TEST GROUP 8: Metrics Ribbon & Dynamic Calculations ---');
context.updateCustomerMetricRibbon();
const metricTotal = String(global.document.getElementById('cust-metric-total').textContent);
const metricCircuits = String(global.document.getElementById('cust-metric-circuits').textContent);
const metricMulti = String(global.document.getElementById('cust-metric-multi').textContent);
const metricIncidents = String(global.document.getElementById('cust-metric-incidents').textContent);
const metricZones = String(global.document.getElementById('cust-metric-zones').textContent);

assert(metricTotal === '9', 'Customer metric total shows 9 subscribers');
assert(parseInt(metricCircuits, 10) >= 11, 'Customer metric circuits shows >= 11 total connections');
assert(metricMulti === '2', 'Customer metric multi-connection accounts shows 2 (Alex & Vanguard)');
assert(parseInt(metricIncidents, 10) >= 3, 'Customer metric active incidents reflects open tickets');
assert(parseInt(metricZones, 10) >= 7, 'Customer metric coverage zones reflects >= 7 service zones');

// =========================================================================
// TEST GROUP 9: Regression Integrity of Modules 01, 02 & 03
// =========================================================================
console.log('\n--- TEST GROUP 9: Regression Integrity of Modules 01, 02 & 03 ---');
assert(Array.isArray(context.conversations) && context.conversations.length >= 7, 'Module 01: conversations array intact');
assert(typeof context.SPACE_NET_KNOWLEDGE_BASE === 'object', 'Module 02: Knowledge base intact');
assert(typeof context.classifyCustomerIntent === 'function', 'Module 02: Intent classifier intact');

const techInquiry = context.classifyCustomerIntent('My internet is completely down and PON red');
assert(techInquiry.intent === 'technical_problem', 'Module 02: Intent technical_problem intact');
assert(techInquiry.route === 'ticket_suggest', 'Module 02: Route ticket_suggest intact');

assert(Array.isArray(context.tickets) && context.tickets.length >= 6, 'Module 03: tickets array intact');
assert(typeof context.verifyCustomer === 'function', 'Module 03: verifyCustomer intact');
assert(typeof context.checkDuplicateTicket === 'function', 'Module 03: checkDuplicateTicket intact');
assert(typeof context.isTicketOverdue === 'function', 'Module 03: isTicketOverdue intact');
assert(typeof context.simulateCustomerStatusInquiry === 'function', 'Module 03: simulateCustomerStatusInquiry intact');

// =========================================================================
// TEST GROUP 10: Module 04 QA Remediation Suite
// =========================================================================
console.log('\n--- TEST GROUP 10: Module 04 QA Remediation (Return Navigation & Secondary Circuits) ---');

// 1. Chat header Profile action renders
const chatProfileBtn = document.getElementById('chat-customer-profile-btn');
assert(chatProfileBtn !== null, 'QA-1: Chat header Profile action button #chat-customer-profile-btn exists in DOM');
assert(htmlContent.includes('id="chat-customer-profile-btn"') && htmlContent.includes('360° Profile'), 'QA-1: Profile action button displays "360° Profile" label');

// 2. Profile action opens correct customer from active conversation
context.selectConversation('CONV-WA-8832');
assert(context.currentConversationId === 'CONV-WA-8832', 'QA-2: Active conversation set to Alex Rivera');
context.goToProfileFromChat();
assert(context.currentActiveView === 'customer-profiles', 'QA-2: goToProfileFromChat navigated to customer-profiles view');
assert(context.currentProfileCustomerId === 'CUST-8832', 'QA-2: Correct customer Alex Rivera (CUST-8832) is selected');

// 3. Profile navigation works from different conversations across channels
context.switchView('unified-inbox');
context.selectConversation('CONV-IG-6210'); // Farhan Ahmed (Instagram)
context.goToProfileFromChat();
assert(context.currentProfileCustomerId === 'CUST-6210', 'QA-3: Profile navigation works from Instagram chat to Farhan Ahmed (CUST-6210)');

context.switchView('unified-inbox');
context.selectConversation('CONV-FB-5120'); // Tanvir Hossain (Facebook public comment)
context.goToProfileFromChat();
assert(context.currentProfileCustomerId === 'CUST-5120', 'QA-3: Profile navigation works from Facebook comment thread to Tanvir Hossain (CUST-5120)');

// 4. Customer identity resolves by canonical customer ID
const testConv = context.getConversation('CONV-WA-8832');
assert(testConv.customerId === 'CUST-8832', 'QA-4: Canonical customerId is CUST-8832');

// 5. Navigation preserves chat state
const alexConv = context.getConversation('CONV-WA-8832');
const msgCountBefore = alexConv.messages.length;
const statusBefore = alexConv.status;
context.selectConversation('CONV-WA-8832');
context.goToProfileFromChat();
assert(alexConv.messages.length === msgCountBefore, 'QA-5: Conversation messages length preserved during navigation');
assert(alexConv.status === statusBefore, 'QA-5: Conversation AI/human handling status preserved');

// 6. Selecting a secondary circuit updates the active connection context
context.selectCustomerProfile('CUST-8832');
assert(context.currentProfileCircuitId === 'SPN-FBR-0941', 'QA-6: Default active circuit is primary SPN-FBR-0941');
context.selectCustomerConnection('SPN-FBR-0942');
assert(context.currentProfileCircuitId === 'SPN-FBR-0942', 'QA-6: Active connection updated to secondary circuit SPN-FBR-0942');

// 7. Create Ticket passes the selected secondary circuit
context.createTicketFromProfile('CUST-8832');
const modalCircuitInput = document.getElementById('new-ticket-cust-circuit');
assert(modalCircuitInput && modalCircuitInput.value === 'SPN-FBR-0942', 'QA-7: Create Ticket modal prefilled with secondary circuit SPN-FBR-0942');

// 8. The modal identifies the selected circuit clearly
const feedbackEl = document.getElementById('new-ticket-cust-feedback');
assert(feedbackEl && feedbackEl.innerHTML.includes('Selected Service Circuit:'), 'QA-8: Modal displays "Selected Service Circuit:" label in verified banner');
assert(feedbackEl && feedbackEl.innerHTML.includes('SPN-FBR-0942'), 'QA-8: Modal feedback explicitly shows SPN-FBR-0942');
assert(feedbackEl && feedbackEl.innerHTML.includes('Primary Customer Circuit:'), 'QA-8: Modal feedback also identifies Primary Customer Circuit: SPN-FBR-0941');

// 9. Submitted ticket stores the selected circuit as circuitId
const ticketCountBefore = context.tickets.length;
context.submitCreateTicket(true); // forceProceed bypass
assert(context.tickets.length === ticketCountBefore + 1, 'QA-9: New ticket created in memory');
const createdSecTicket = context.tickets[0];
assert(createdSecTicket.circuitId === 'SPN-FBR-0942', 'QA-9: Created ticket stores circuitId as SPN-FBR-0942');
assert(createdSecTicket.customerId === 'CUST-8832', 'QA-9: Created ticket retains customerId CUST-8832');
assert(createdSecTicket.connectionType.includes('300Mbps') || createdSecTicket.connectionType.includes('Fiber'), 'QA-9: Connection plan corresponds to secondary connection');

// 10. Ticket detail displays the correct circuit
context.openTicketDetail(createdSecTicket);
const tdCircuitEl = document.getElementById('td-modal-circuit');
assert(tdCircuitEl && tdCircuitEl.textContent === 'SPN-FBR-0942', 'QA-10: Ticket detail modal displays Affected Service Circuit SPN-FBR-0942');
const tdPrimaryCircuitEl = document.getElementById('td-modal-primary-circuit');
assert(tdPrimaryCircuitEl && tdPrimaryCircuitEl.textContent === 'SPN-FBR-0941', 'QA-10b: Ticket detail modal displays Primary Customer Circuit SPN-FBR-0941');
assert(htmlContent.includes('Affected Service Circuit:'), 'QA-10c: Ticket detail modal UI contains "Affected Service Circuit:" label');
assert(htmlContent.includes('Primary Customer Circuit:'), 'QA-10d: Ticket detail modal UI contains "Primary Customer Circuit:" label');

// 11. Primary-circuit ticket creation remains unchanged and registry is untouched
const alexCustRegistry = context.SPACE_NET_CUSTOMERS.find(c => c.customerId === 'CUST-8832');
assert(alexCustRegistry.circuitId === 'SPN-FBR-0941', 'QA-11: Primary circuit in customer registry remains SPN-FBR-0941 (not overwritten)');

context.selectCustomerConnection('SPN-FBR-0941');
context.createTicketFromProfile('CUST-8832');
assert(document.getElementById('new-ticket-cust-circuit').value === 'SPN-FBR-0941', 'QA-11: Primary circuit selection pre-fills SPN-FBR-0941');

// 12. Existing Module 03 duplicate warning behavior remains valid
const dupForPrimary = context.checkDuplicateTicket('CUST-8832', 'NO_INTERNET', 'SPN-FBR-0941');
assert(dupForPrimary !== null, 'QA-12: Duplicate detection identifies existing active ticket for primary circuit SPN-FBR-0941');

const dupForSecondary = context.checkDuplicateTicket('CUST-8832', 'NO_INTERNET', 'SPN-FBR-0942');
assert(dupForSecondary === null, 'QA-12: Independent secondary circuit SPN-FBR-0942 is not falsely marked duplicate for primary incident');

const legacyDupMatch = context.checkDuplicateTicket('CUST-8832', 'NO_INTERNET');
assert(legacyDupMatch !== null, 'QA-12: Legacy 2-argument checkDuplicateTicket matches active customer incident');

console.log('\n=============================================================');
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
  console.log('SUCCESS: All Module 04 Feature Groups and Regressions PASSED!');
  console.log('=============================================================');
} else {
  console.error(`FAILURE: ${failedTests} test(s) failed.`);
  console.log('=============================================================');
  process.exit(1);
}
