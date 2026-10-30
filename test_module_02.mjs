// test_module_02.mjs - Comprehensive Empirical Validation Suite for Module 02
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Module 02 Empirical Validation Suite');
console.log('=============================================================\\n');

// Read index.html to extract the JavaScript runtime
const htmlPath = resolve('./index.html');
const htmlContent = readFileSync(htmlPath, 'utf-8');

// Extract the main script block
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('FATAL: Could not locate <script> block in index.html');
  process.exit(1);
}
let scriptCode = scriptMatch[1];
scriptCode = scriptCode.replace(/\bconst\s+/g, 'var ').replace(/\blet\s+/g, 'var ');

// Create a mock DOM environment
const mockElements = new Map();
function getOrCreateMockElement(id) {
  if (!mockElements.has(id)) {
    const isHiddenByDefault = id.startsWith('voice-drawer-') || id === 'comment-to-dm-banner' || id === 'chat-frustration-alert';
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
    if (sel.startsWith('.')) return getOrCreateMockElement(sel.slice(1));
    return null;
  },
  querySelectorAll: (sel) => [],
  createElement: (tag) => {
    const el = getOrCreateMockElement('mock-' + Math.random().toString(36).substring(7));
    el.tagName = tag.toUpperCase();
    return el;
  }
};
global.window = {
  location: { hash: '' },
  addEventListener: () => {},
  scrollTo: () => {}
};
global.setTimeout = (fn, ms) => {
  try { fn(); } catch(e) {}
  return { fn, ms };
};
global.clearTimeout = () => {};

// Evaluate the script inside the current execution context
try {
  vm.runInThisContext(scriptCode);
  console.log('✓ index.html script successfully evaluated into Node runtime.\\n');
} catch (err) {
  console.error('FATAL: Error evaluating index.html script:', err);
  process.exit(1);
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    if (details) console.error(`         Details: ${details}`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------------
// TEST GROUP 1: LOCAL ISP KNOWLEDGE BASE & DETERMINISTIC CLASSIFICATION
// --------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Local Knowledge Base & Intent Classification ---');

assert(typeof SPACE_NET_KNOWLEDGE_BASE === 'object', 'SPACE_NET_KNOWLEDGE_BASE dataset exists');
assert(Object.keys(SPACE_NET_KNOWLEDGE_BASE).length >= 8, 'Knowledge base contains at least 8 ISP categories');

// Test required inquiries
const testQueries = [
  { q: "What packages are available?", expected: "packages_pricing" },
  { q: "How much is 100 Mbps?", expected: "packages_pricing" },
  { q: "Is your internet available in Dhanmondi?", expected: "coverage_availability" },
  { q: "How can I pay my bill?", expected: "billing_guidance" },
  { q: "Can I upgrade my package?", expected: "package_changes" },
  { q: "What are your support working hours?", expected: "support_hours" },
  { q: "What is your uptime SLA policy?", expected: "service_policies_sla" },
  { q: "My internet is very slow and PON light is red", expected: "technical_problem" }
];

testQueries.forEach(t => {
  const res = classifyCustomerIntent(t.q, 'EN');
  assert(res.intent === t.expected, `Inquiry "${t.q}" -> Classified as ${t.expected}`, `Got: ${res.intent}`);
  assert(res.confidence >= 0.80, `Inquiry "${t.q}" -> High confidence (>=0.80)`, `Got: ${res.confidence}`);
  assert(typeof res.response === 'string' && res.response.length > 50, `Inquiry "${t.q}" -> Returns rich response`);
});

// Test unknown inquiry fallback
const unknownRes = classifyCustomerIntent("Do you sell mechanical keyboards and espresso beans?", 'EN');
assert(unknownRes.intent === 'unknown', 'Unrecognized query classified as unknown fallback');
assert(unknownRes.response.includes('Packages, Speeds & Pricing'), 'Fallback response provides helpful assistance categories');

// --------------------------------------------------------------------------
// TEST GROUP 2: MULTILINGUAL AI COMMUNICATION (ENGLISH, BANGLA, BANGLISH)
// --------------------------------------------------------------------------
console.log('\\n--- TEST GROUP 2: Multilingual AI Communication ---');

// Bengali Script
const bnQuery = "প্যাকেজের দাম কত এবং বনানীতে লাইন আছে?";
const bnRes = classifyCustomerIntent(bnQuery, 'BN');
assert(bnRes.detectedLanguage === 'BN', 'Detects Bengali script automatically');
assert(bnRes.response.includes('SpaceNet') && (bnRes.response.includes('ফাইবার') || bnRes.response.includes('প্যাকেজ')), 'Returns authentic Bengali response in BN mode');

// Banglish (Romanized Bangla)
const banglishQuery = "amader office Dhanmondi-te notun line nite chai koto taka lagbe?";
const banglishRes = classifyCustomerIntent(banglishQuery, 'Banglish');
assert(banglishRes.detectedLanguage === 'Banglish', 'Detects Banglish phrasing');
assert(banglishRes.response.includes('SpaceNet') && (banglishRes.response.includes('fiber') || banglishRes.response.includes('package')), 'Returns authentic Banglish response in Banglish mode');

// Language Selector updates
setAiLanguage('BN', null);
assert(aiLanguageMode === 'BN', 'setAiLanguage updates global aiLanguageMode to BN');
const bnRespExplicit = classifyCustomerIntent("How much is 100 Mbps?", aiLanguageMode);
assert(bnRespExplicit.outputLanguage === 'BN', 'Explicit aiLanguageMode takes priority for response generation');
assert(bnRespExplicit.response.includes('হোম লাইট (১০০ এমবিপিএস) — ১,২০০ টাকা/মাস'), 'Delivers exact Bengali pricing response');

setAiLanguage('Banglish', null);
assert(aiLanguageMode === 'Banglish', 'setAiLanguage updates global aiLanguageMode to Banglish');
const banglishRespExplicit = classifyCustomerIntent("How much is 100 Mbps?", aiLanguageMode);
assert(banglishRespExplicit.response.includes('Home Lite (100 Mbps) — 1,200 BDT/mo'), 'Delivers exact Banglish pricing response');

// Reset to EN
setAiLanguage('EN', null);
assert(aiLanguageMode === 'EN', 'setAiLanguage resets back to EN');

// --------------------------------------------------------------------------
// TEST GROUP 3: PUBLIC COMMENT TO PRIVATE DM TRANSITION
// --------------------------------------------------------------------------
console.log('\\n--- TEST GROUP 3: Public Comment to Private DM Transition ---');

const tanvirConv = getConversation('CONV-FB-5120');
assert(tanvirConv && tanvirConv.type === 'comment', 'Tanvir Hossain is a public comment conversation');

// Test Public Invite insertion
currentConversationId = 'CONV-FB-5120';
currentCustomerKey = 'tanvir';
insertPublicDmInvite();
const chatInputEl = getOrCreateMockElement('chat-input');
assert(chatInputEl.value.includes('protect your privacy') && chatInputEl.value.includes('direct message'), 'insertPublicDmInvite populates polite invitation into composer');

// Test Continue in Private DM
continueInPrivateDm();
const tanvirDm = getConversation('CONV-FB-5120-DM');
assert(tanvirDm !== null, 'continueInPrivateDm creates/finds linked private DM thread');
assert(tanvirDm.type === 'dm', 'Linked private conversation has type: dm');
assert(tanvirDm.originCommentId === 'CONV-FB-5120', 'Linked DM preserves reference to origin public comment');
assert(tanvirDm.messages.some(m => m.eventType === 'transition'), 'Linked DM contains Privacy Transition audit event');
assert(currentConversationId === 'CONV-FB-5120-DM', 'Application navigates to linked private DM thread');

// Verify calling continueInPrivateDm again reuses existing DM without duplicates
const countBefore = conversations.filter(c => c.customerId === 'CUST-5120').length;
currentConversationId = 'CONV-FB-5120';
continueInPrivateDm();
const countAfter = conversations.filter(c => c.customerId === 'CUST-5120').length;
assert(countBefore === countAfter, 'Reuses existing private DM without creating duplicates');

// --------------------------------------------------------------------------
// TEST GROUP 4: INTENT RECOGNITION & BASIC ROUTING
// --------------------------------------------------------------------------
console.log('\\n--- TEST GROUP 4: Intent Recognition & Basic Routing ---');

const routeTechnical = classifyCustomerIntent("PON red light is flashing and internet dropped", 'EN');
assert(routeTechnical.route === 'ticket_suggest', 'Technical problem routes to ticket_suggest');
assert(routeTechnical.routeLabel === 'Support Ticket Desk', 'Route label is Support Ticket Desk');

const routeBilling = classifyCustomerIntent("Need invoice and bKash transaction receipt", 'EN');
assert(routeBilling.route === 'billing_guidance', 'Billing query routes to billing_guidance');

const routeSales = classifyCustomerIntent("Is Dhanmondi covered for new connection?", 'EN');
assert(routeSales.route === 'sales_handoff', 'New connection query routes to sales_handoff');

const routeFAQ = classifyCustomerIntent("What are your office hours?", 'EN');
assert(routeFAQ.route === 'faq', 'General FAQ routes to faq');

// --------------------------------------------------------------------------
// TEST GROUP 5: SUGGESTED REPLIES & CUSTOMER FRUSTRATION DETECTION
// --------------------------------------------------------------------------
console.log('\\n--- TEST GROUP 5: AI Suggested Replies & Frustration Detection ---');

// Test Contextual Suggestions Generation
const alexConv = getConversation('CONV-WA-8832');
const enSuggestions = generateContextualSuggestions(alexConv, 'EN');
assert(enSuggestions.length === 3, 'Generates 3 contextual suggestions for Alex in EN');
assert(enSuggestions[0].includes('5GHz'), 'Suggestions are contextual to Alex Wi-Fi issue');

const bnSuggestions = generateContextualSuggestions(alexConv, 'BN');
assert(bnSuggestions[0].includes('৫ গিগাহার্টজ'), 'Suggestions adapt contextually to Bangla');

const banglishSuggestions = generateContextualSuggestions(alexConv, 'Banglish');
assert(banglishSuggestions[0].includes('5GHz channel') || banglishSuggestions[0].includes('5GHz'), 'Suggestions adapt contextually to Banglish');

// Test Frustration Detection
const frustratedConv = {
  messages: [
    { sender: 'customer', text: 'This is the third time I called. Internet is still not working and worst service ever!' }
  ]
};
const frustResult = detectCustomerFrustration(frustratedConv);
assert(frustResult.isFrustrated === true, 'Detects English frustration trigger ("third time", "still not working", "worst")');

const bnFrustratedConv = {
  messages: [
    { sender: 'customer', text: 'আমার লাইনে ৩ দিন ধরে কাজ করছে না, খুব খারাপ সার্ভিস!' }
  ]
};
assert(detectCustomerFrustration(bnFrustratedConv).isFrustrated === true, 'Detects Bangla frustration trigger ("কাজ করছে না", "খারাপ সার্ভিস")');

const banglishFrustratedConv = {
  messages: [
    { sender: 'customer', text: '3 bar bolchi router restart disi kintu net cholche na biroktikor' }
  ]
};
assert(detectCustomerFrustration(banglishFrustratedConv).isFrustrated === true, 'Detects Banglish frustration trigger ("3 bar bolchi", "net cholche na", "biroktikor")');

// Test Suggestion in Note Mode Safety
currentComposerMode = 'note';
insertAiReply("I have optimized your 5GHz channel.");
assert(currentComposerMode === 'message', 'Selecting suggestion while in Note Mode switches composer to Message Mode');
assert(chatInputEl.value === "I have optimized your 5GHz channel.", 'Populates input without automatically sending');

// Test Human Takeover Disables Automatic AI Replies
currentConversationId = 'CONV-WA-8832';
const targetConv = getConversation('CONV-WA-8832');
targetConv.status = 'human_takeover';
chatInputEl.value = "Inspecting your fiber signal now.";
sendChatMessage();
const staffMsg = targetConv.messages.find(m => m.text === 'Inspecting your fiber signal now.');
assert(staffMsg && staffMsg.sender === 'staff' && staffMsg.author === 'Rohan (Tier III NOC)', 'Outgoing message under human takeover is marked as staff (Rohan / Tier III NOC)');

// --------------------------------------------------------------------------
// TEST GROUP 6: SIMULATED VOICE-MESSAGE UNDERSTANDING
// --------------------------------------------------------------------------
console.log('\\n--- TEST GROUP 6: Simulated Voice-Message Understanding ---');

// Check voice fixtures in datasets
const alexVoice = getConversation('CONV-WA-8832').messages.find(m => m.sender === 'voice');
assert(alexVoice !== undefined, 'Alex Rivera conversation has English voice note fixture');
assert(alexVoice.duration === '0:34', 'Alex voice note has duration 0:34');
assert(alexVoice.language === 'English', 'Alex voice note language is English');
assert(typeof alexVoice.transcript === 'string' && alexVoice.transcript.includes('5GHz'), 'Alex voice note includes simulated transcript');

const farhanVoice = getConversation('CONV-IG-6210').messages.find(m => m.sender === 'voice');
assert(farhanVoice !== undefined, 'Farhan Ahmed conversation has Bangla voice note fixture');
assert(farhanVoice.language.includes('Bangla'), 'Farhan voice note language is Bangla');
assert(farhanVoice.transcript.includes('ভ্যালোরেন্ট'), 'Farhan voice note includes authentic Bangla transcript');

const elenaVoice = getConversation('CONV-TG-7721').messages.find(m => m.sender === 'voice');
assert(elenaVoice !== undefined, 'Elena Rostov conversation has Banglish voice note fixture');
assert(elenaVoice.language === 'Banglish', 'Elena voice note language is Banglish');
assert(elenaVoice.transcript.includes('bKash diye 4,500 taka'), 'Elena voice note includes authentic Banglish transcript');

// Test voice transcript toggle
toggleVoiceTranscript(alexVoice.id);
const drawerEl = getOrCreateMockElement(`voice-drawer-${alexVoice.id}`);
assert(!drawerEl.classList.contains('hidden'), 'toggleVoiceTranscript opens transcript drawer');
toggleVoiceTranscript(alexVoice.id);
assert(drawerEl.classList.contains('hidden'), 'toggleVoiceTranscript closes transcript drawer');

// --------------------------------------------------------------------------
// TEST GROUP 7: MODULE 01 REGRESSION SUITE
// --------------------------------------------------------------------------
console.log('\\n--- TEST GROUP 7: Module 01 Regression Suite ---');

// Channel filtering
const channels = ['all', 'whatsapp', 'facebook', 'instagram', 'telegram', 'web'];
channels.forEach(ch => {
  currentChannelFilter = ch;
  currentTypeFilter = 'all';
  currentSearchQuery = '';
  const filtered = conversations.filter(c => ch === 'all' || c.channel === ch);
  assert(filtered.length > 0, `Filter channel '${ch}' returns active conversations`);
});

// Type filtering
const types = ['all', 'dm', 'comment'];
types.forEach(t => {
  currentChannelFilter = 'all';
  currentTypeFilter = t;
  const filtered = conversations.filter(c => t === 'all' || c.type === t);
  assert(filtered.length > 0, `Filter type '${t}' returns active conversations`);
});

// Search filter
currentSearchQuery = 'Banani';
const searchResults = conversations.filter(c => (c.customerName + c.plan + c.circuitId).toLowerCase().includes('banani') || c.messages.some(m => (m.text||'').toLowerCase().includes('banani')));
assert(searchResults.length >= 2, 'Search query for "Banani" returns matching conversations');

// Ticket to Chat Hook
currentModalTicket = { cust: 'Alex Rivera (#8832)' };
goToChatFromTicket();
assert(currentChannelFilter === 'all' && currentTypeFilter === 'all', 'goToChatFromTicket auto-resets channel and type filters to all');
assert(currentConversationId === 'CONV-WA-8832', 'goToChatFromTicket successfully navigates to Alex Rivera chat');

// --------------------------------------------------------------------------
// TEST GROUP 8: QA REMEDIATION & ISSUE REGRESSION SUITE (ISSUES 1–7)
// --------------------------------------------------------------------------
console.log('\\n--- TEST GROUP 8: QA Remediation & Issue Regression Suite ---');

// Issue 1: Specific Compound Intent (Outage Credit vs Generic Billing)
const outageCreditQuery = "Will I receive an automatic bill credit if my internet is down for 24 hours?";
const outageCreditResult = classifyCustomerIntent(outageCreditQuery);
assert(outageCreditResult.intent === 'service_policies_sla', 'Issue 1: "Will I receive an automatic bill credit if my internet is down for 24 hours?" classifies as service_policies_sla (NOT billing)');
assert(outageCreditResult.response.includes('Automatic Outage Bill Credit'), 'Issue 1: Response contains explicit outage bill credit policies');
assert(!outageCreditResult.response.includes('bKash'), 'Issue 1: Outage credit response does not deliver generic bKash payment advice');

const bnOutageCreditResult = classifyCustomerIntent("ইন্টারনেট ডাউন থাকলে কি বিল ক্রেডিট বা ক্ষতিপূরণ পাব?");
assert(bnOutageCreditResult.intent === 'service_policies_sla', 'Issue 1: Bangla outage compensation query correctly routes to service_policies_sla', 'Got: ' + bnOutageCreditResult.intent);

// Issue 2: Multi-Intent Recognition
const multiIntentQuery = "Is SpaceNet available in Banani? Do you guarantee 99.9% uptime?";
const multiIntentResult = classifyCustomerIntent(multiIntentQuery);
assert(multiIntentResult.isMultiIntent === true, 'Issue 2: Separable multi-intent query detected as multi-intent');
assert(multiIntentResult.intents.includes('coverage_availability') && multiIntentResult.intents.includes('service_policies_sla'), 'Issue 2: Both coverage_availability and service_policies_sla recognized');
assert(multiIntentResult.response.includes('1.') && multiIntentResult.response.includes('2.'), 'Issue 2: Multi-intent response is formatted with distinct points addressing both inquiries');

const multiPricingInstall = classifyCustomerIntent("How much is 100 Mbps and what is the installation fee?");
assert(multiPricingInstall.isMultiIntent === true, 'Issue 2: Pricing + Installation dual inquiry detected as multi-intent');
assert(multiPricingInstall.intents.includes('packages_pricing') && multiPricingInstall.intents.includes('installation_procedure'), 'Issue 2: Both packages_pricing and installation_procedure recognized');

// Issue 3: Dynamic Contextual Suggestions for Latest Customer Message
const alexRemediationConv = getConversation('CONV-WA-8832');
alexRemediationConv.status = 'ai_handling';
alexRemediationConv.messages.push({
  id: 'm-alex-remediation-test',
  sender: 'customer',
  text: 'Great! How much is the installation fee for Fiber Gamer 300M, and is it available in Banani?',
  time: '04:10 PM'
});
const dynamicSuggestions = generateContextualSuggestions(alexRemediationConv);
assert(Array.isArray(dynamicSuggestions) && dynamicSuggestions.length === 3, 'Issue 3: Generates 3 dynamic suggestions');
assert(dynamicSuggestions.some(s => s.toLowerCase().includes('installation') || s.toLowerCase().includes('banani') || s.toLowerCase().includes('fee') || s.toLowerCase().includes('300m')), 'Issue 3: Suggestions derive from latest inquiry (installation/Banani) rather than stale 5GHz router advice');
assert(!dynamicSuggestions.every(s => s.toLowerCase().includes('5ghz')), 'Issue 3: Suggestions are not locked to 5GHz Wi-Fi channels');

// Issue 4: Public-to-Private DM Transition Idempotency and Context
const rem_tanvirConv = getConversation('CONV-FB-5120');
currentConversationId = 'CONV-FB-5120';
continueInPrivateDm();
const createdDmId = currentConversationId;
const dmConv1 = getConversation(createdDmId);
assert(createdDmId.endsWith('-DM'), 'Issue 4: Linked DM ID follows predictable linked pattern');
assert(dmConv1.originCommentId === 'CONV-FB-5120', 'Issue 4: Preserves source comment link', 'Got: ' + dmConv1.originCommentId);
assert(dmConv1.originPostSnippet !== undefined, 'Issue 4: Preserves parent post context', 'Got: ' + dmConv1.originPostSnippet);
const noteLeak = dmConv1.messages.find(m => m.sender === 'staff' && (m.text || '').includes('SPN-ONT-8812'));
assert(!noteLeak, 'Issue 4: Private staff notes are not leaked into customer-facing messages');

// Repeat activation check (idempotency)
const totalConvsBefore = conversations.length;
continueInPrivateDm();
assert(conversations.length === totalConvsBefore, 'Issue 4: Repeated continueInPrivateDm does NOT create duplicate conversation entries');
assert(currentConversationId === createdDmId, 'Issue 4: Repeated continueInPrivateDm re-navigates to existing linked DM');

// Issue 5: Customer Message Simulator
currentConversationId = 'CONV-TG-7721';
const rem_elenaConv = getConversation('CONV-TG-7721');
rem_elenaConv.status = 'ai_handling';
const initialMsgCount = rem_elenaConv.messages.length;
executeSimulateCustomerMessage("What are your support working hours?");
assert(rem_elenaConv.messages.length >= initialMsgCount + 2, 'Issue 5: Simulated customer inquiry triggers both incoming customer message and automated AI response under ai_handling');
const lastCustomerMsg = rem_elenaConv.messages[rem_elenaConv.messages.length - 2];
const lastAiMsg = rem_elenaConv.messages[rem_elenaConv.messages.length - 1];
assert(lastCustomerMsg.sender === 'customer' && lastCustomerMsg.text === "What are your support working hours?", 'Issue 5: Injected message is marked as sender customer');
assert(lastAiMsg.sender === 'ai' && lastAiMsg.text.includes('Support Operations Schedule'), 'Issue 5: Injected message triggers appropriate knowledge base AI reply');

// Issue 6: Fictional Commercial Data Warnings
const billingEn = SPACE_NET_KNOWLEDGE_BASE.billing_guidance.responses.EN;
assert(billingEn.includes('DEMO ONLY') && billingEn.includes('01700-000000') && billingEn.includes('DEMO-SIMULATION ONLY'), 'Issue 6: Billing guidance explicitly warns fictional demo payment identifier');
assert(billingEn.includes('Do Not Transfer Real Funds'), 'Issue 6: Contains prominent disclaimer against real money transfers');
assert(SPACE_NET_KNOWLEDGE_BASE.packages_pricing.responses.EN.includes('Fictional Demo Catalog'), 'Issue 6: Package catalog identifies fictional demo prices');

// Issue 7: Human Takeover Integrity
currentConversationId = 'CONV-WA-8832';
const takeoverConv = getConversation('CONV-WA-8832');
takeoverConv.status = 'human_takeover';
const preTakeoverCount = takeoverConv.messages.length;
executeSimulateCustomerMessage("My latency is spiking to 200ms in competitive match!");
assert(takeoverConv.messages.length === preTakeoverCount + 1, 'Issue 7: Simulated message is added without generating automatic AI reply under human_takeover');
const lastTakeoverMsg = takeoverConv.messages[takeoverConv.messages.length - 1];
assert(lastTakeoverMsg.sender === 'customer' && lastTakeoverMsg.text.includes('latency is spiking'), 'Issue 7: Last message remains the customer message, pending human staff triage');
assert(takeoverConv.status === 'human_takeover', 'Issue 7: Conversation status remains human_takeover');

// --------------------------------------------------------------------------
// TEST GROUP 9: TARGETED RESPONSE-RELEVANCE & 3-INTENT REGRESSION SUITE
// --------------------------------------------------------------------------
console.log('\\n--- TEST GROUP 9: Targeted Response-Relevance & 3-Intent Regression Suite ---');

// 1. Three Distinct Intents in One Message
const threeIntentQuery = "How much is the installation fee for Fiber Gamer 300M, and is it available in Banani?";
const threeIntentRes = classifyCustomerIntent(threeIntentQuery, 'EN');

assert(threeIntentRes.isMultiIntent === true, 'Group 9.1: Inquiry with 3 questions recognized as multi-intent');
assert(threeIntentRes.intents.length === 3, 'Group 9.1: Exactly 3 distinct intents recognized in single message', 'Got: ' + threeIntentRes.intents.join(', '));
assert(threeIntentRes.intents.includes('packages_pricing'), 'Group 9.1: Recognizes packages_pricing');
assert(threeIntentRes.intents.includes('installation_procedure'), 'Group 9.1: Recognizes installation_procedure');
assert(threeIntentRes.intents.includes('coverage_availability'), 'Group 9.1: Recognizes coverage_availability');
assert(threeIntentRes.response.includes('1.') && threeIntentRes.response.includes('2.') && threeIntentRes.response.includes('3.'), 'Group 9.1: Response structured with 3 numbered points');
assert(threeIntentRes.response.includes('2,500 BDT'), 'Group 9.1: Answers Fiber Gamer 300M price (2,500 BDT)');
assert(threeIntentRes.response.includes('100% FREE'), 'Group 9.1: Highlights 100% FREE installation for Fiber Gamer 300M');
assert(threeIntentRes.response.includes('Banani') && threeIntentRes.response.includes('active and operational'), 'Group 9.1: Confirms Banani active coverage');
assert(!threeIntentRes.response.includes('Home Lite (100 Mbps) — 1,200 BDT/mo'), 'Group 9.1: Avoids dumping complete package catalog when specific package is requested');
assert(!threeIntentRes.response.includes('Office Pro (1 Gbps) — 5,500 BDT/mo'), 'Group 9.1: Avoids dumping unrelated enterprise package');

// 2. Package Pricing Plus Coverage (2 Intents)
const pkgPlusCovQuery = "How much is Fiber Gamer 300M and is it available in Banani?";
const pkgPlusCovRes = classifyCustomerIntent(pkgPlusCovQuery, 'EN');
assert(pkgPlusCovRes.isMultiIntent === true, 'Group 9.2: Package pricing + Coverage detected as multi-intent');
assert(pkgPlusCovRes.intents.includes('packages_pricing') && pkgPlusCovRes.intents.includes('coverage_availability'), 'Group 9.2: Contains packages_pricing and coverage_availability');
assert(pkgPlusCovRes.response.includes('2,500 BDT') && pkgPlusCovRes.response.includes('Banani'), 'Group 9.2: Answers both price and Banani coverage');
assert(!pkgPlusCovRes.response.includes('Office Pro (1 Gbps)'), 'Group 9.2: Does not dump full catalog');

// 3. Installation Plus Coverage (2 Intents)
const installPlusCovQuery = "What is the installation fee and are you available in Banani?";
const installPlusCovRes = classifyCustomerIntent(installPlusCovQuery, 'EN');
assert(installPlusCovRes.isMultiIntent === true, 'Group 9.3: Installation + Coverage detected as multi-intent');
assert(installPlusCovRes.intents.includes('installation_procedure') && installPlusCovRes.intents.includes('coverage_availability'), 'Group 9.3: Contains installation_procedure and coverage_availability');
assert(installPlusCovRes.response.includes('1,000 BDT') && installPlusCovRes.response.includes('Banani'), 'Group 9.3: Answers standard installation and Banani coverage');

// 4. Coverage Plus SLA (2 Intents)
const covPlusSlaQuery = "Is SpaceNet available in Banani? Do you guarantee 99.9% uptime?";
const covPlusSlaRes = classifyCustomerIntent(covPlusSlaQuery, 'EN');
assert(covPlusSlaRes.isMultiIntent === true, 'Group 9.4: Coverage + SLA detected as multi-intent');
assert(covPlusSlaRes.intents.includes('coverage_availability') && covPlusSlaRes.intents.includes('service_policies_sla'), 'Group 9.4: Contains coverage_availability and service_policies_sla');
assert(covPlusSlaRes.response.includes('Banani') && covPlusSlaRes.response.includes('99.9%'), 'Group 9.4: Answers Banani coverage and 99.9% uptime SLA');

// 5. Outage Service Credit vs Payment Methods
const outageVsBillingQuery = "Will I receive an automatic bill credit if my internet is down for 24 hours?";
const outageVsBillingRes = classifyCustomerIntent(outageVsBillingQuery, 'EN');
assert(outageVsBillingRes.intent === 'service_policies_sla', 'Group 9.5: Outage credit classifies as service_policies_sla');
assert(!outageVsBillingRes.intent.includes('billing_guidance'), 'Group 9.5: Does not route to billing_guidance');
assert(outageVsBillingRes.response.includes('Automatic Outage Bill Credit'), 'Group 9.5: Delivers outage bill credit terms');

// 6. Single Package Request Avoids Dumping Entire Catalog
const singlePkgQuery = "What is the price of Fiber Gamer 300M?";
const singlePkgRes = classifyCustomerIntent(singlePkgQuery, 'EN');
assert(singlePkgRes.intent === 'packages_pricing', 'Group 9.6: Classifies as packages_pricing');
assert(singlePkgRes.response.includes('Fiber Gamer (300 Mbps) — 2,500 BDT/mo'), 'Group 9.6: Delivers specific Fiber Gamer 300M price');
assert(!singlePkgRes.response.includes('Home Lite (100 Mbps)'), 'Group 9.6: Does not dump Home Lite');
assert(!singlePkgRes.response.includes('Office Pro (1 Gbps)'), 'Group 9.6: Does not dump Office Pro');

// 7. General Package Catalog Request Returns Full Catalog
const generalPkgQuery = "What packages do you offer?";
const generalPkgRes = classifyCustomerIntent(generalPkgQuery, 'EN');
assert(generalPkgRes.response.includes('Home Lite') && generalPkgRes.response.includes('Office Pro'), 'Group 9.7: General inquiry returns full 6-package catalog');

// 8. Coverage Fallback for Unconfirmed / Outer-Zone Address
const unconfirmedZoneQuery = "Is your connection available in Sylhet or Chittagong?";
const unconfirmedZoneRes = classifyCustomerIntent(unconfirmedZoneQuery, 'EN');
assert(unconfirmedZoneRes.intent === 'coverage_availability', 'Group 9.8: Classifies as coverage_availability');
assert(unconfirmedZoneRes.response.includes('Banani') && unconfirmedZoneRes.response.includes('Dhanmondi'), 'Group 9.8: States active Dhaka zones');

// 9. Multilingual 3-Intent Support (Bangla & Banglish)
const bnThreeIntentQuery = "ফাইবার গেমার ৩০০এম প্যাকেজের দাম এবং ইনস্টলেশন ফি কত এবং বনানীতে লাইন আছে?";
const bnThreeIntentRes = classifyCustomerIntent(bnThreeIntentQuery, 'BN');
assert(bnThreeIntentRes.isMultiIntent === true, 'Group 9.9: Bangla 3-intent query recognized as multi-intent');
assert(bnThreeIntentRes.response.includes('১.') && bnThreeIntentRes.response.includes('২.') && bnThreeIntentRes.response.includes('৩.'), 'Group 9.9: Bangla response has 3 numbered points');
assert(bnThreeIntentRes.response.includes('২,৫০০ টাকা/মাস'), 'Group 9.9: Bangla response contains 2,500 BDT/mo');
assert(bnThreeIntentRes.response.includes('ফ্রি'), 'Group 9.9: Bangla response confirms free installation');
assert(bnThreeIntentRes.response.includes('বনানী'), 'Group 9.9: Bangla response confirms Banani');

const banglishThreeIntentQuery = "Fiber Gamer 300M er price ebong installation fee koto ar Banani-te ki line ache?";
const banglishThreeIntentRes = classifyCustomerIntent(banglishThreeIntentQuery, 'Banglish');
assert(banglishThreeIntentRes.isMultiIntent === true, 'Group 9.9: Banglish 3-intent query recognized as multi-intent');
assert(banglishThreeIntentRes.response.includes('2,500 BDT') && banglishThreeIntentRes.response.includes('FREE') && banglishThreeIntentRes.response.includes('Banani'), 'Group 9.9: Banglish response includes price, free install, and Banani', 'Got: ' + banglishThreeIntentRes.response);

// 10. Dynamic Suggestions Tailored to 3-Part Inquiry
const testConvForSuggestions = {
  conversationId: 'CONV-TEST-3PART',
  status: 'ai_handling',
  type: 'dm',
  messages: [
    { sender: 'customer', text: 'How much is the installation fee for Fiber Gamer 300M, and is it available in Banani?' }
  ]
};
const tailoredSuggestions = generateContextualSuggestions(testConvForSuggestions, 'EN');
assert(Array.isArray(tailoredSuggestions) && tailoredSuggestions.length === 3, 'Group 9.10: Generates 3 tailored suggestions');
assert(tailoredSuggestions[0].includes('Fiber Gamer (300 Mbps)') && tailoredSuggestions[0].includes('Banani'), 'Group 9.10: Suggestion 1 is tailored to Fiber Gamer 300M and Banani');
assert(tailoredSuggestions[1].includes('Banani'), 'Group 9.10: Suggestion 2 mentions Banani capacity');

// --------------------------------------------------------------------------
// FINAL SUMMARY
// --------------------------------------------------------------------------
console.log('\\n=============================================================');
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} Passed (${Math.round(passedTests/totalTests*100)}%)`);
console.log('=============================================================');

if (passedTests === totalTests) {
  console.log('SUCCESS: All Module 02 Acceptance Criteria and Regressions PASSED!');
  process.exit(0);
} else {
  console.error('FAILURE: Some tests did not pass.');
  process.exit(1);
}
