// test_module_05.mjs - Comprehensive Empirical Validation Suite for Module 05 (AI Troubleshooting & Diagnostics)
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 05 Empirical Validation Suite');
console.log('AI Troubleshooting & Diagnostics — Interactive Demo');
console.log('=============================================================\n');

// Read index.html to extract the JavaScript runtime
const htmlPath = resolve('./index.html');
const htmlContent = readFileSync(htmlPath, 'utf-8');

// Locate the main application <script> block
const scriptMatches = [...htmlContent.matchAll(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/gi)];
const appScriptMatch = scriptMatches.find(m =>
  m[1].includes('conversations') &&
  m[1].includes('tickets') &&
  m[1].includes('SPACE_NET_CUSTOMERS') &&
  m[1].includes('SPACE_NET_DIAGNOSTIC_WORKFLOWS')
);

if (!appScriptMatch) {
  console.error('FATAL: Could not locate main application <script> block in index.html');
  process.exit(1);
}

const rawScriptCode = appScriptMatch[1];
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
      id === 'view-ai-diagnostics' ||
      id === 'view-sales-leads' ||
      id === 'view-network-outages';

    const initialClasses = isHiddenByDefault ? new Set(['hidden']) : new Set();

    const el = {
      id,
      textContent: '',
      value: '',
      checked: false,
      disabled: false,
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      getAttribute(k) { return this.attributes[k] || null; },
      classList: {
        add: (...cls) => cls.forEach(c => initialClasses.add(c)),
        remove: (...cls) => cls.forEach(c => initialClasses.delete(c)),
        contains: (c) => initialClasses.has(c),
        toggle: (c, force) => {
          if (force !== undefined) {
            force ? initialClasses.add(c) : initialClasses.delete(c);
          } else {
            initialClasses.has(c) ? initialClasses.delete(c) : initialClasses.add(c);
          }
        }
      },
      className: isHiddenByDefault ? 'hidden' : '',
      style: {},
      children: [],
      appendChild: function (child) {
        this.children.push(child);
        return child;
      },
      removeChild: function (child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) this.children.splice(idx, 1);
        return child;
      },
      querySelectorAll: function (selector) {
        return [];
      },
      querySelector: function (selector) {
        return null;
      },
      focus: () => { },
      blur: () => { }
    };
    let _innerHTML = '';
    Object.defineProperty(el, 'innerHTML', {
      get() { return _innerHTML; },
      set(val) {
        _innerHTML = val;
        if (val === '') this.children = [];
      }
    });
    mockElements.set(id, el);
  }
  return mockElements.get(id);
}

const mockDocument = {
  getElementById: (id) => getOrCreateMockElement(id),
  querySelectorAll: (selector) => {
    if (selector === '.app-view') {
      return [
        getOrCreateMockElement('view-dashboard'),
        getOrCreateMockElement('view-unified-inbox'),
        getOrCreateMockElement('view-tickets'),
        getOrCreateMockElement('view-customer-profiles'),
        getOrCreateMockElement('view-ai-diagnostics'),
        getOrCreateMockElement('view-sales-leads'),
        getOrCreateMockElement('view-network-outages')
      ];
    }
    if (selector === '.view-switch-btn') {
      return [
        getOrCreateMockElement('nav-btn-dashboard'),
        getOrCreateMockElement('nav-btn-unified-inbox'),
        getOrCreateMockElement('nav-btn-tickets'),
        getOrCreateMockElement('nav-btn-customer-profiles'),
        getOrCreateMockElement('nav-btn-ai-diagnostics'),
        getOrCreateMockElement('nav-btn-sales-leads'),
        getOrCreateMockElement('nav-btn-network-outages')
      ];
    }
    if (selector === 'aside nav a') {
      const paths = ['dashboard', 'unified-inbox', 'tickets', 'customer-profiles', 'ai-diagnostics', 'sales-leads', 'network-outages'];
      return paths.map(p => ({
        getAttribute: (attr) => attr === 'data-path' ? p : null,
        className: '',
        addEventListener: () => {}
      }));
    }
    return [];
  },
  querySelector: (selector) => {
    if (selector.startsWith('#')) return getOrCreateMockElement(selector.slice(1));
    return null;
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
      appendChild(child) { this.children.push(child); return child; },
      querySelector(s) { return null; },
      querySelectorAll(s) { return []; },
      onclick: null
    };
    return el;
  }};

const windowListeners = new Map();
global.document = mockDocument;
global.window = {
  location: { hash: '' },
  scrollTo: () => {},
  addEventListener: (event, fn) => {
    if (!windowListeners.has(event)) windowListeners.set(event, []);
    windowListeners.get(event).push(fn);
  },
  removeEventListener: (event, fn) => {
    if (windowListeners.has(event)) {
      const arr = windowListeners.get(event);
      const idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    }
  },
  document: mockDocument
};

global.setTimeout = (fn) => { fn(); return 1; };
global.clearTimeout = () => {};

const context = vm.createContext(global);

try {
  vm.runInContext(scriptCode, context);
  console.log('✓ index.html script successfully evaluated into Node runtime.\n');
} catch (e) {
  console.error('FATAL: Script evaluation error in index.html:', e);
  process.exit(1);
}

let testIndex = 0;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  testIndex++;
  if (condition) {
    passCount++;
    console.log(`  [PASS] Test ${testIndex}: ${message}`);
  } else {
    failCount++;
    console.error(`  [FAIL] Test ${testIndex}: ${message}`);
  }
}

// ============================================================================
// TEST GROUP 1: DETERMINISTIC WORKFLOWS & DECISION TREES (FG1)
// ============================================================================
console.log('--- TEST GROUP 1: AI-Guided Troubleshooting Workflows ---');

assert(typeof context.SPACE_NET_DIAGNOSTIC_WORKFLOWS === 'object', 'SPACE_NET_DIAGNOSTIC_WORKFLOWS dataset exists');
assert(!!context.SPACE_NET_DIAGNOSTIC_WORKFLOWS.NO_INTERNET, 'NO_INTERNET workflow is defined');
assert(!!context.SPACE_NET_DIAGNOSTIC_WORKFLOWS.SLOW_INTERNET, 'SLOW_INTERNET workflow is defined');
assert(!!context.SPACE_NET_DIAGNOSTIC_WORKFLOWS.ROUTER_WIFI, 'ROUTER_WIFI workflow is defined');

// Test No Internet stages
const noNetWf = context.SPACE_NET_DIAGNOSTIC_WORKFLOWS.NO_INTERNET;
assert(noNetWf.stages.length >= 4, 'NO_INTERNET workflow contains at least 4 guided stages');
assert(noNetWf.stages[0].id === 'pwr_check', 'Stage 1 checks equipment and power state');
assert(noNetWf.stages[1].id === 'pon_check', 'Stage 2 checks GPON PON indicator status');
assert(noNetWf.stages[2].id === 'los_check', 'Stage 3 checks optical LOS alarm indicator');
assert(noNetWf.stages[3].id === 'device_scope', 'Stage 4 checks client device outage scope');

// Test Slow Internet stages
const slowNetWf = context.SPACE_NET_DIAGNOSTIC_WORKFLOWS.SLOW_INTERNET;
assert(slowNetWf.stages.length >= 3, 'SLOW_INTERNET workflow contains at least 3 stages');
assert(slowNetWf.stages[0].id === 'medium_check', 'Stage 1 isolates Wi-Fi vs Ethernet medium');
assert(slowNetWf.stages[1].id === 'band_check', 'Stage 2 evaluates 2.4GHz vs 5GHz band contention');

// Test Wi-Fi / Router stages
const wifiWf = context.SPACE_NET_DIAGNOSTIC_WORKFLOWS.ROUTER_WIFI;
assert(wifiWf.stages.length >= 3, 'ROUTER_WIFI workflow contains at least 3 stages');
assert(wifiWf.stages[0].id === 'ssid_check', 'Stage 1 tests SSID visibility & broadcasting');
assert(wifiWf.stages[1].id === 'auth_check', 'Stage 2 tests WPA password authentication');

// ============================================================================
// TEST GROUP 2: STAGE TRANSITIONS & DETERMINISTIC RESPONSES (FG1 & FG5)
// ============================================================================
console.log('\n--- TEST GROUP 2: Stage Transitions & Deterministic Responses ---');

// Set active workflow to NO_INTERNET
context.switchDiagWorkflow('NO_INTERNET');
assert(context.currentDiagWorkflowKey === 'NO_INTERNET', 'Current workflow set to NO_INTERNET');
assert(context.currentDiagStageIndex === 0, 'Stage index starts at 0 (Power Check)');
assert(context.currentDiagResponses.length === 0, 'Responses start empty');

// Step 1: Power ON -> Progress to PON check
context.handleDiagAnswer('pwr_check', 'pwr_yes');
assert(context.currentDiagResponses.length === 1, 'Response recorded for pwr_check');
assert(context.currentDiagStageIndex === 1, 'Advanced to Stage 2 (pon_check)');

// Step 2: PON Blinking -> Progress to LOS check
context.handleDiagAnswer('pon_check', 'pon_blink');
assert(context.currentDiagResponses.length === 2, 'Response recorded for pon_check');
assert(context.currentDiagStageIndex === 2, 'Advanced to Stage 3 (los_check)');

// Step 3: LOS Red Alarm -> Terminal critical recommendation
context.handleDiagAnswer('los_check', 'los_red');
assert(context.currentDiagResponses.length === 3, 'Response recorded for los_check');
const lastSession = context.diagnosticSessions[0];
assert(lastSession.severity === 'Critical', 'LOS Red Alert classifies severity as Critical');
assert(lastSession.outcome === 'Critical', 'Outcome evaluated as Critical');
assert(lastSession.nextAction.includes('Escalate to Support Ticket'), 'Recommends ticket escalation for field technician');

// Test Previous Step Navigation
context.goToPrevDiagStage();
assert(context.currentDiagResponses.length === 2, 'goToPrevDiagStage pops last response');

// Test Restart Workflow
context.restartDiagWorkflow();
assert(context.currentDiagStageIndex === 0, 'restartDiagWorkflow resets stage index to 0');
assert(context.currentDiagResponses.length === 0, 'restartDiagWorkflow clears responses');

// Test Invalid Response Handling
const prevRespCount = context.currentDiagResponses.length;
context.handleDiagAnswer('pwr_check', 'non_existent_key_xyz');
assert(context.currentDiagResponses.length === prevRespCount, 'Invalid answer key is rejected gracefully');

// ============================================================================
// TEST GROUP 3: CONNECTION-AWARE TARGETING & ISOLATION (FG3)
// ============================================================================
console.log('\n--- TEST GROUP 3: Connection-Aware Diagnostics & Isolation ---');

// Select Alex Rivera primary connection
context.selectDiagCustomer('CUST-8832', 'SPN-FBR-0941');
assert(context.currentDiagCustomerId === 'CUST-8832', 'Customer targeted: Alex Rivera (CUST-8832)');
assert(context.currentDiagCircuitId === 'SPN-FBR-0941', 'Target circuit set to primary SPN-FBR-0941');

const alexCust = context.SPACE_NET_CUSTOMERS.find(c => c.customerId === 'CUST-8832');
assert(alexCust.circuitId === 'SPN-FBR-0941', 'Primary circuit in registry is SPN-FBR-0941');

// Target Alex Rivera secondary connection
context.selectDiagCircuit('SPN-FBR-0942');
assert(context.currentDiagCircuitId === 'SPN-FBR-0942', 'Diagnostic target updated to secondary circuit SPN-FBR-0942');
assert(alexCust.circuitId === 'SPN-FBR-0941', 'Primary circuitId in customer registry NOT overwritten by secondary selection');

// Telemetry on secondary circuit is Healthy, while primary is Degraded
const ontCheckSecondary = context.simulateOntStatusCheck('CUST-8832', 'SPN-FBR-0942');
assert(ontCheckSecondary.circuitId === 'SPN-FBR-0942', 'ONT check explicitly targets secondary circuit');
assert(ontCheckSecondary.isPrimary === false, 'isPrimary correctly flagged as false for secondary circuit');
assert(ontCheckSecondary.severity === 'Healthy', 'Secondary circuit ONT status is Healthy');

// Check primary circuit ONT status
const ontCheckPrimary = context.simulateOntStatusCheck('CUST-8832', 'SPN-FBR-0941');
assert(ontCheckPrimary.circuitId === 'SPN-FBR-0941', 'ONT check targets primary circuit');
assert(ontCheckPrimary.isPrimary === true, 'isPrimary correctly flagged as true for primary circuit');
assert(ontCheckPrimary.severity === 'Degraded', 'Primary circuit ONT status reflects fixture Degraded condition');

// Verify Vanguard Logistics dual circuits
context.selectDiagCustomer('CUST-4410', 'SPN-DED-4410');
assert(context.currentDiagCircuitId === 'SPN-DED-4410', 'Vanguard primary circuit SPN-DED-4410 targeted');
context.selectDiagCircuit('SPN-FBR-4412');
assert(context.currentDiagCircuitId === 'SPN-FBR-4412', 'Vanguard secondary circuit SPN-FBR-4412 targeted');
const vCust = context.SPACE_NET_CUSTOMERS.find(c => c.customerId === 'CUST-4410');
assert(vCust.circuitId === 'SPN-DED-4410', 'Vanguard primary circuitId immutable in customer registry');

// ============================================================================
// TEST GROUP 4: SIMULATED EQUIPMENT & TELEMETRY SWEEPS (FG2)
// ============================================================================
console.log('\n--- TEST GROUP 4: Simulated Router, ONT & Telemetry Sweeps ---');

// 1. Remote Reboot Simulation
const rebootResult = context.simulateRouterReboot('CUST-8832', 'SPN-FBR-0941');
assert(rebootResult.diagnosticName.includes('Reboot'), 'Reboot diagnostic returns correct diagnostic name');
assert(rebootResult.telemetry.rebootTimeSec === 14.2, 'Simulated reboot reports 14.2s renegotiation time');
assert(rebootResult.outcome === 'Resolved', 'Reboot execution marked Resolved');

// 2. Optical Power Sweep Simulation
const sweepHealthy = context.simulateOpticalPowerSweep('CUST-8832', 'SPN-FBR-0942');
assert(sweepHealthy.telemetry.opticalRx.includes('-16.8 dBm'), 'Secondary circuit optical Rx is optimal (-16.8 dBm)');
assert(sweepHealthy.severity === 'Healthy', 'Secondary optical power classified Healthy');

const sweepDegraded = context.simulateOpticalPowerSweep('CUST-8832', 'SPN-FBR-0941');
assert(sweepDegraded.telemetry.opticalRx.includes('-27.4 dBm'), 'Primary circuit optical Rx reflects -27.4 dBm attenuation');
assert(sweepDegraded.severity === 'Degraded', 'Primary optical power classified Degraded');

const sweepCut = context.simulateOpticalPowerSweep('CUST-1092', 'SPN-VDS-1092');
assert(sweepCut.telemetry.opticalRx.includes('-34.2 dBm'), 'Outage affected circuit reports loss of light (-34.2 dBm)');
assert(sweepCut.severity === 'Critical', 'Loss of light classified Critical');

// 3. WAN Connectivity Check Simulation
const wanResult = context.simulateWanConnectivityCheck('CUST-8832', 'SPN-FBR-0942');
assert(wanResult.telemetry.packetLoss === '0.0%', 'Healthy circuit reports 0% packet loss');
assert(wanResult.telemetry.dnsResolution.includes('SpaceNet Core DNS'), 'Reports SpaceNet Core DNS resolution');

// 4. Wi-Fi Channel Inspection Simulation
const wifiScan = context.simulateWifiChannelInspection('CUST-8832', 'SPN-FBR-0941');
assert(wifiScan.telemetry.wifi24Channel === 6, 'Detects 2.4 GHz Channel 6');
assert(wifiScan.telemetry.wifi5Channel === 36, 'Detects 5 GHz Channel 36');
assert(wifiScan.telemetry.recommendation.includes('Shift 2.4 GHz channel'), 'Recommends channel shift optimization');

// ============================================================================
// TEST GROUP 5: SIMULATED INTERNET SPEED TESTING (FG4)
// ============================================================================
console.log('\n--- TEST GROUP 5: Simulated Internet Speed Testing ---');

// Speed test on healthy secondary circuit (Fiber Home Office 100M)
const speedHealthy = context.startSimulatedSpeedTest('CUST-8832', 'SPN-FBR-0942');
assert(speedHealthy.provisionedMbps === 100, 'Provisioned plan recognized as 100 Mbps');
assert(speedHealthy.downloadMbps >= 90 && speedHealthy.downloadMbps <= 100, 'Download speed ~96% of plan (>90 Mbps)');
assert(speedHealthy.uploadMbps >= 85 && speedHealthy.uploadMbps <= 98, 'Upload speed within plan tier');
assert(speedHealthy.latencyMs <= 15, 'Ping latency is low (<15ms)');
assert(speedHealthy.packetLossPct === '0.0%', '0% packet loss on healthy connection');
assert(speedHealthy.severity === 'Healthy', 'Speed test classified as Healthy');
assert(speedHealthy.analysis.includes('Healthy within expected plan range'), 'Analysis confirms throughput within expected range');

// Speed test on degraded primary circuit (Fiber 500M with attenuation alert)
const speedDegraded = context.startSimulatedSpeedTest('CUST-8832', 'SPN-FBR-0941');
assert(speedDegraded.provisionedMbps === 500, 'Provisioned plan recognized as 500 Mbps');
assert(speedDegraded.downloadMbps < 200, 'Download throughput degraded (<50% of plan)');
assert(speedDegraded.severity === 'Degraded', 'Speed test classified as Degraded');
assert(speedDegraded.recommendation.includes('Verify optical Rx dBm'), 'Recommends optical Rx inspection');

// Test Repeat Speed Test
const initialHistoryCount = context.diagnosticSessions.length;
context.repeatSimulatedSpeedTest();
assert(context.diagnosticSessions.length === initialHistoryCount + 1, 'repeatSimulatedSpeedTest appends new session to history');

// ============================================================================
// TEST GROUP 6: DIAGNOSTIC SESSIONS & PERSISTENCE (FG7)
// ============================================================================
console.log('\n--- TEST GROUP 6: Diagnostic Sessions & In-Memory History ---');

assert(Array.isArray(context.diagnosticSessions), 'diagnosticSessions array exists');
assert(context.diagnosticSessions.length >= 4, 'diagnosticSessions contains baseline seed sessions');

// Verify session identifier format
const sampleSession = context.diagnosticSessions[0];
assert(/^DIAG-\d{8}-\d{3}$/.test(sampleSession.sessionId) || sampleSession.sessionId.startsWith('DIAG-'), 'Session ID adheres to standard DIAG-<NUM> format');
assert(!!sampleSession.customerId, 'Session stores canonical customerId');
assert(!!sampleSession.circuitId, 'Session stores specific circuitId');
assert(!!sampleSession.diagnosticType, 'Session stores diagnosticType');
assert(!!sampleSession.severity, 'Session stores severity level');
assert(!!sampleSession.timestamp, 'Session stores timestamp');

// Seed session circuit retention
const seedPrimary = context.diagnosticSessions.find(s => s.sessionId === 'DIAG-20261031-001');
const seedSecondary = context.diagnosticSessions.find(s => s.sessionId === 'DIAG-20261031-004');
assert(seedPrimary.circuitId === 'SPN-FBR-0941', 'Seed 001 preserves primary circuit SPN-FBR-0941');
assert(seedSecondary.circuitId === 'SPN-FBR-0942', 'Seed 004 preserves secondary circuit SPN-FBR-0942');
assert(seedSecondary.isPrimaryCircuit === false, 'Seed 004 records isPrimaryCircuit: false');

// History Filtering
context.filterDiagHistory('circuit');
assert(context.diagHistoryFilter === 'circuit', 'filterDiagHistory toggles to active circuit filter');
context.filterDiagHistory('all');
assert(context.diagHistoryFilter === 'all', 'filterDiagHistory toggles back to all');

// Reset Demo Session action
context.resetDiagnosticsDemoState();
assert(context.diagnosticSessions.length === context.DEFAULT_DIAGNOSTIC_SESSIONS.length, 'resetDiagnosticsDemoState restores default sessions length');
assert(context.currentDiagCustomerId === 'CUST-8832', 'Target customer reset to default CUST-8832');
assert(context.currentDiagCircuitId === 'SPN-FBR-0941', 'Target circuit reset to default SPN-FBR-0941');

// ============================================================================
// TEST GROUP 7: CROSS-MODULE INTEGRATION & NAVIGATION (FG6)
// ============================================================================
console.log('\n--- TEST GROUP 7: Cross-Module Integration & Navigation ---');

// 1. Launch from Customer Profile
context.openDiagnosticsFromProfile('CUST-8832', 'SPN-FBR-0942');
assert(context.currentActiveView === 'ai-diagnostics', 'openDiagnosticsFromProfile switches view to ai-diagnostics');
assert(context.currentDiagCustomerId === 'CUST-8832', 'Target customer set to Alex Rivera');
assert(context.currentDiagCircuitId === 'SPN-FBR-0942', 'Target circuit set to chosen secondary line SPN-FBR-0942');
assert(context.currentDiagOrigin.origin === 'profile', 'Origin context recorded as profile');

// 2. Return Navigation to Profile
context.returnFromDiagnostics();
assert(context.currentActiveView === 'customer-profiles', 'returnFromDiagnostics returns to customer-profiles view');

// 3. Launch from Support Ticket
context.openDiagnosticsFromTicket('TKT-9042');
assert(context.currentActiveView === 'ai-diagnostics', 'openDiagnosticsFromTicket switches view to ai-diagnostics');
assert(context.currentDiagCustomerId === 'CUST-8832', 'Target customer resolved from ticket');
assert(context.currentDiagCircuitId === 'SPN-FBR-0941', 'Target circuit resolved from ticket affected line');
assert(context.currentDiagWorkflowKey === 'NO_INTERNET', 'Ticket category NO_INTERNET preselected workflow');
assert(context.currentDiagOrigin.origin === 'ticket', 'Origin context recorded as ticket');
assert(context.currentDiagOrigin.ticketId === 'TKT-9042', 'Origin ticketId preserved');

// 4. Return Navigation to Ticket
context.returnFromDiagnostics();
assert(context.currentActiveView === 'tickets', 'returnFromDiagnostics returns to tickets view');

// 5. Launch from Chat
context.openDiagnosticsFromChat('CONV-WA-8832');
assert(context.currentActiveView === 'ai-diagnostics', 'openDiagnosticsFromChat switches view to ai-diagnostics');
assert(context.currentDiagCustomerId === 'CUST-8832', 'Target customer resolved from chat thread');
assert(context.currentDiagOrigin.origin === 'chat', 'Origin context recorded as chat');

// 6. Return Navigation to Chat
context.returnFromDiagnostics();
assert(context.currentActiveView === 'unified-inbox', 'returnFromDiagnostics returns to unified-inbox view');

// ============================================================================
// TEST GROUP 8: TICKET ESCALATION & AUDIT SYNC (FG6)
// ============================================================================
console.log('\n--- TEST GROUP 8: Ticket Escalation & Audit Synchronization ---');

// Set active diagnostic session on secondary circuit
context.selectDiagCustomer('CUST-8832', 'SPN-FBR-0942');
context.currentDiagWorkflowKey = 'SLOW_INTERNET';
context.currentDiagResponses = [
  { questionId: 'medium_check', question: 'Medium', answerKey: 'med_eth', answerLabel: 'Direct Cat6 Ethernet' },
  { questionId: 'speed_test_step', question: 'Speed', answerKey: 'speed_low', answerLabel: 'Substantially Degraded' }
];

// Trigger escalation to ticket
context.escalateDiagnosticToTicket();
const modalCustId = getOrCreateMockElement('new-ticket-cust-id').value;
const modalCircuit = getOrCreateMockElement('new-ticket-cust-circuit').value;
const modalCategory = getOrCreateMockElement('new-ticket-type').value;
const modalSubject = getOrCreateMockElement('new-ticket-subject').value;
const modalDesc = getOrCreateMockElement('new-ticket-desc').value;

assert(modalCustId === 'CUST-8832', 'Ticket modal prefilled with customer CUST-8832');
assert(modalCircuit === 'SPN-FBR-0942', 'Ticket modal prefilled with tested secondary circuit SPN-FBR-0942');
assert(modalCategory === 'SLOW_INTERNET', 'Ticket modal prefilled with category SLOW_INTERNET');
assert(modalSubject.includes('AI Diagnostic Escalation'), 'Ticket subject indicates diagnostic escalation');
assert(modalDesc.includes('SPN-FBR-0942'), 'Ticket description includes tested circuit telemetry');

// Test Sync to Linked Ticket
context.openDiagnosticsFromTicket('TKT-9042');
const targetTkt = context.tickets.find(t => t.ticketId === 'TKT-9042');
const tktHistLenBefore = targetTkt.history.length;
context.syncDiagnosticToLinkedTicket();
assert(targetTkt.history.length === tktHistLenBefore + 1, 'syncDiagnosticToLinkedTicket appends event to ticket history');
assert(targetTkt.history[targetTkt.history.length - 1].action === 'DIAGNOSTIC_EXEC', 'History action is DIAGNOSTIC_EXEC');
assert(targetTkt.history[targetTkt.history.length - 1].notes.includes('AI Diagnostics Workbench'), 'History records sync from AI Diagnostics Workbench');

// Test Mark Diagnostic Resolved
context.markDiagnosticResolved();
const resolvedSession = context.diagnosticSessions[0];
assert(resolvedSession.status === 'RESOLVED', 'markDiagnosticResolved marks session as RESOLVED');
assert(resolvedSession.severity === 'Resolved', 'Session severity updated to Resolved');

// ============================================================================
// TEST GROUP 9: HUMAN TAKEOVER & SAFETY SAFEGUARDS (FG6)
// ============================================================================
console.log('\n--- TEST GROUP 9: Human Takeover & Safety Safeguards ---');

// Verify conversation under takeover does not dispatch automated customer messages from diagnostics
const convAlex = context.getConversation('CONV-WA-8832');
convAlex.status = 'human_takeover';

const msgCountBefore = convAlex.messages.length;
// Execute simulated diagnostics while in human takeover
context.simulateOpticalPowerSweep('CUST-8832', 'SPN-FBR-0941');
context.simulateRouterReboot('CUST-8832', 'SPN-FBR-0941');

assert(convAlex.messages.length === msgCountBefore, 'No customer-visible messages automatically sent during human takeover');
assert(convAlex.status === 'human_takeover', 'Human takeover state preserved');

// Verify internal note confidentiality
const hasLeakedNotes = convAlex.messages.some(m => m.isInternal && m.sender === 'customer');
assert(!hasLeakedNotes, 'Internal staff notes are not exposed as customer-facing diagnostic messages');

// Reset conv status
convAlex.status = 'ai_handling';

// ============================================================================
// TEST GROUP 10: REGRESSION INTEGRITY OF MODULES 01–04
// ============================================================================
console.log('\n--- TEST GROUP 10: Regression Integrity of Modules 01–04 ---');

assert(Array.isArray(context.conversations) && context.conversations.length >= 6, 'Module 01: conversations array intact');
assert(typeof context.classifyCustomerIntent === 'function', 'Module 02: classifyCustomerIntent function intact');
assert(typeof context.SPACE_NET_KNOWLEDGE_BASE === 'object', 'Module 02: Knowledge base intact');
assert(Array.isArray(context.tickets) && context.tickets.length >= 6, 'Module 03: tickets array intact');
assert(typeof context.verifyCustomer === 'function', 'Module 03: verifyCustomer intact');
assert(typeof context.checkDuplicateTicket === 'function', 'Module 03: checkDuplicateTicket intact');
assert(Array.isArray(context.SPACE_NET_CUSTOMERS) && context.SPACE_NET_CUSTOMERS.length >= 9, 'Module 04: SPACE_NET_CUSTOMERS registry intact');
assert(typeof context.selectCustomerConnection === 'function', 'Module 04: selectCustomerConnection intact');

// Test global quick ONT sweep integration
context.triggerGlobalDiagnostics();
const latestDiag = context.diagnosticSessions[0];
assert(latestDiag.diagnosticType === 'OPTICAL_SWEEP', 'triggerGlobalDiagnostics triggers optical sweep recorded in diagnostic sessions');

// ============================================================================
// TEST GROUP 11: BROWSER QA REMEDIATION — WORKBENCH INITIALIZATION & RUNTIME
// ============================================================================
console.log('\n--- TEST GROUP 11: Browser QA Remediation — Workbench Initialization & Runtime ---');

// 1. Pure ES6 script execution without TDZ exceptions
let pureEs6Success = false;
try {
  const cleanEs6Context = vm.createContext({
    document: mockDocument,
    window: global.window,
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    escapeHtml: global.escapeHtml
  });
  vm.runInContext(rawScriptCode, cleanEs6Context);
  pureEs6Success = typeof cleanEs6Context.window.renderDiagnosticsWorkspace === 'function';
} catch (e) {
  console.error('Pure ES6 evaluation error:', e);
  pureEs6Success = false;
}
assert(pureEs6Success, 'Script parses and initializes in pure ES6 without Temporal Dead Zone ReferenceError');

// 2. validViews includes ai-diagnostics in index.html
const validViewsMatch = htmlContent.match(/const\s+validViews\s*=\s*\[([^\]]+)\]/);
const validViewsStr = validViewsMatch ? validViewsMatch[1] : '';
assert(validViewsStr.includes("'ai-diagnostics'"), "validViews routing whitelist includes 'ai-diagnostics'");

// 3. Remote tool buttons in HTML call functions without lexical scope arguments
const btnOntRebootInHtml = htmlContent.includes('onclick="simulateRouterReboot()"');
const btnOpticalSweepInHtml = htmlContent.includes('onclick="simulateOpticalPowerSweep()"');
const btnWanPingInHtml = htmlContent.includes('onclick="simulateWanConnectivityCheck()"');
const btnWifiScanInHtml = htmlContent.includes('onclick="simulateWifiChannelInspection()"');
const btnSpeedTestInHtml = htmlContent.includes('onclick="startSimulatedSpeedTest()"');
assert(btnOntRebootInHtml && btnOpticalSweepInHtml && btnWanPingInHtml && btnWifiScanInHtml && btnSpeedTestInHtml,
  'Inline HTML diagnostic action buttons invoke functions without un-scoped lexical arguments');

// 4. Initial load with hash #ai-diagnostics
global.window.location.hash = '#ai-diagnostics';
if (windowListeners.has('DOMContentLoaded')) {
  windowListeners.get('DOMContentLoaded').forEach(fn => fn());
}
assert(context.currentActiveView === 'ai-diagnostics', 'DOMContentLoaded with hash #ai-diagnostics activates ai-diagnostics view');
assert(!getOrCreateMockElement('view-ai-diagnostics').classList.contains('hidden'), '#view-ai-diagnostics view section is revealed (hidden removed)');

// 5. Diagnostics workspace DOM populated properly
const custSelectEl = getOrCreateMockElement('diag-customer-select');
assert(custSelectEl.children.length === 9, 'Target Subscriber dropdown populated with all 9 canonical customer options');
assert(custSelectEl.value === 'CUST-8832', 'Alex Rivera (CUST-8832) selected by default in Target Subscriber dropdown');

const circuitPillsEl = getOrCreateMockElement('diag-circuit-pills');
assert(circuitPillsEl.children.length === 2, 'Active Circuit selector contains pills for both circuits of Alex Rivera');

const answersContainerEl = getOrCreateMockElement('diag-answers-container');
assert(answersContainerEl.children.length >= 2, 'No Internet workflow Step 1 renders visible answer choice buttons');

const ontModelEl = getOrCreateMockElement('diag-ont-model');
assert(ontModelEl.textContent === 'Huawei EchoLife HG8245H5 GPON ONT', 'ONT Terminal model populated from circuit equipment fixture');

const routerModelEl = getOrCreateMockElement('diag-router-model');
assert(routerModelEl.textContent === 'TP-Link Archer AX73 (Wi-Fi 6 Dual-Band)', 'Wi-Fi Gateway model populated from circuit equipment fixture');

const oltPortEl = getOrCreateMockElement('diag-olt-port');
assert(oltPortEl.textContent === 'Dhanmondi OLT-04 Port 2 (GPON Slot 3)', 'Upstream OLT Port populated from circuit equipment fixture');

const macBadgeEl = getOrCreateMockElement('diag-mac-badge');
assert(macBadgeEl.textContent.includes('00:E0:4C:88:32:01'), 'MAC Address populated from circuit equipment fixture');

const targetCustNameEl = getOrCreateMockElement('diag-target-customer-name');
assert(targetCustNameEl.textContent === 'Alex Rivera', 'Session Target card displays subscriber name Alex Rivera');

const targetCircuitBadgeEl = getOrCreateMockElement('diag-target-circuit-badge');
assert(targetCircuitBadgeEl.textContent.includes('SPN-FBR-0941'), 'Session Target card displays active primary circuit SPN-FBR-0941');

// 6. Zero-argument invocation of remote diagnostic tools
const zReboot = context.simulateRouterReboot();
assert(zReboot && zReboot.outcome === 'Resolved', 'simulateRouterReboot() executes cleanly with zero arguments');

const zSweep = context.simulateOpticalPowerSweep();
assert(zSweep && zSweep.severity === 'Degraded', 'simulateOpticalPowerSweep() executes cleanly with zero arguments');

const zWan = context.simulateWanConnectivityCheck();
assert(zWan && zWan.severity === 'Degraded', 'simulateWanConnectivityCheck() executes cleanly with zero arguments');

const zWifi = context.simulateWifiChannelInspection();
assert(zWifi && zWifi.severity === 'Degraded', 'simulateWifiChannelInspection() executes cleanly with zero arguments');

const zSpeed = context.startSimulatedSpeedTest();
assert(zSpeed && zSpeed.severity === 'Degraded', 'startSimulatedSpeedTest() executes cleanly with zero arguments');

// 7. Subscriber switching updates all DOM elements and equipment fixtures
context.selectDiagCustomer('CUST-4491');
assert(context.currentDiagCustomerId === 'CUST-4491', 'Changing selected subscriber updates currentDiagCustomerId to CUST-4491');
assert(context.currentDiagCircuitId === 'SPN-FBR-4491', 'Target circuit automatically updates to CUST-4491 primary circuit');
assert(getOrCreateMockElement('diag-circuit-pills').children.length === 1, 'Active Circuit selector updates to single circuit for corporate account');
assert(getOrCreateMockElement('diag-ont-model').textContent === 'Cisco Catalyst 3850 Leased Terminal', 'Equipment ONT updates to Cisco Catalyst fixture for CUST-4491');
assert(getOrCreateMockElement('diag-target-customer-name').textContent === 'Sarah Jenkins', 'Session Target card updates to Sarah Jenkins');

// 8. Reset restores default baseline fixtures
context.resetDiagnosticsDemoState();
assert(context.currentDiagCustomerId === 'CUST-8832', 'Reset restores target customer to default Alex Rivera (CUST-8832)');
assert(context.currentDiagCircuitId === 'SPN-FBR-0941', 'Reset restores target circuit to default primary SPN-FBR-0941');
assert(getOrCreateMockElement('diag-ont-model').textContent === 'Huawei EchoLife HG8245H5 GPON ONT', 'Reset restores equipment ONT model to Huawei fixture');

// 9. Window bindings & global accessibility
assert(context.window.currentDiagCustomerId === 'CUST-8832', 'window.currentDiagCustomerId is synchronized');
assert(context.window.currentDiagCircuitId === 'SPN-FBR-0941', 'window.currentDiagCircuitId is synchronized');
assert(typeof context.window.simulateRouterReboot === 'function', 'window.simulateRouterReboot is exposed');
assert(typeof context.window.renderDiagnosticsWorkspace === 'function', 'window.renderDiagnosticsWorkspace is exposed');
assert(typeof context.window.initDiagnosticsModule === 'function', 'window.initDiagnosticsModule is exposed');

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('\n=============================================================');
console.log(`Test Execution Summary: ${passCount} / ${passCount + failCount} Passed (${Math.round((passCount / (passCount + failCount)) * 100)}%)`);
if (failCount === 0) {
  console.log('SUCCESS: All Module 05 Feature Groups and Regressions PASSED!');
} else {
  console.error(`FAILURE: ${failCount} tests failed.`);
  process.exit(1);
}
console.log('=============================================================');
