// test_ai_channel.mjs - QA D1/D2: AI-channel enforcement, queued replies and staff-message attribution.
// Same vm harness as test_module_10, but with a deterministic fake clock: setTimeout queues work,
// clearTimeout really cancels it, and tick() runs whatever is due. No sleeps.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import vm from 'vm';

console.log('=============================================================');
console.log('SpaceNet AI CRM — AI Channel Enforcement Suite (QA D1/D2)');
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
      setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k] || null; },
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

// Deterministic clock
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

const conv = id => ctx.getConversation(id);
const ai = c => c.messages.filter(m => m.sender === 'ai').length;
const leadsFor = c => ctx.leads.filter(l => l.source.conversationId === c.conversationId).length;
const inbound = (c, text) => { ctx.currentConversationId = c.conversationId; ctx.executeSimulateCustomerMessage(text); };
const staffSend = (c, text) => { ctx.currentConversationId = c.conversationId; el('chat-input').value = text; ctx.sendChatMessage(); };
const LEAD_TEXT = 'Dhanmondi-te notun line nite chai setup fee koto?';
const PLAIN = 'What are your support working hours?';
assert(ctx.isNewConnectionInquiry(ctx.classifyCustomerIntent(LEAD_TEXT, 'EN')) && !ctx.isNewConnectionInquiry(ctx.classifyCustomerIntent(PLAIN, 'EN')), 'Precondition: one sample text qualifies for lead capture, the other does not');

console.log('--- Customer messages and the channel switch ---');
const wa = conv('CONV-WA-8832');
let a0 = ai(wa); inbound(wa, PLAIN); tick(800);
assert(ai(wa) === a0 + 1, '1. Customer message with AI on: exactly one AI reply');
ctx.setAiChannelEnabled('whatsapp', false);
a0 = ai(wa); inbound(wa, PLAIN); tick(5000);
assert(ai(wa) === a0, '2. Customer message with AI off: no AI reply');
a0 = ai(wa); inbound(wa, LEAD_TEXT); tick(5000);
assert(ai(wa) === a0 && leadsFor(wa) === 1, '5. AI off: a qualifying customer message is still captured as a lead');
ctx.setAiChannelEnabled('whatsapp', true);

const fb = conv('CONV-FB-4491');
a0 = ai(fb); inbound(fb, LEAD_TEXT); tick(300);
assert(!!fb._pendingReplyTimeout && ai(fb) === a0, 'Setup: a reply is queued and not yet delivered');
ctx.setAiChannelEnabled('facebook', false);
assert(!fb._pendingReplyTimeout, '3a. Switching the channel off cancels the queued timer immediately');
tick(5000);
assert(ai(fb) === a0, '3b. Queued reply never appears after the switch (no further message needed)');
assert(leadsFor(fb) === 1, '3c. The cancelled reply\'s customer message is still captured as a lead');

ctx.setAiChannelEnabled('facebook', true);
const fb2 = conv('CONV-FB-5120');
a0 = ai(fb2); inbound(fb2, PLAIN); tick(300);
ctx.setAiChannelEnabled('facebook', false); ctx.setAiChannelEnabled('facebook', true); tick(5000);
assert(ai(fb2) === a0, '4. Off then on before the timer fires: the cancelled reply is not resurrected');
a0 = ai(fb2); inbound(fb2, PLAIN); tick(300);
for (let i = 0; i < 5; i++) { ctx.setAiChannelEnabled('facebook', false); ctx.setAiChannelEnabled('facebook', true); }
inbound(fb2, PLAIN); tick(5000);
assert(ai(fb2) === a0 + 1, '11. Repeated toggles then a new message: exactly one AI reply, no duplicates');
a0 = ai(fb2); inbound(fb2, PLAIN); tick(800);
assert(ai(fb2) === a0 + 1, 'Re-enabled channel replies to new messages again');

const tg = conv('CONV-TG-7721');
ctx.setAiChannelEnabled('whatsapp', false); ctx.setAiChannelEnabled('facebook', false);
a0 = ai(tg); inbound(tg, PLAIN); tick(800);
assert(ai(tg) === a0 + 1 && ctx.isAiChannelEnabled('telegram'), '12. Other channels keep replying while WhatsApp and Facebook are off');
ctx.setAiChannelEnabled('whatsapp', true); ctx.setAiChannelEnabled('facebook', true);

console.log('\n--- Staff messages ---');
const web = conv('CONV-WEB-1092');
a0 = ai(web); staffSend(web, 'Checking your line now.'); tick(5000);
assert(ai(web) === a0, '6. Staff message with AI on: no automatic AI reply');
const staffMsg = web.messages.find(m => m.text === 'Checking your line now.');
assert(staffMsg && staffMsg.sender === 'staff' && staffMsg.author === 'Rohan (Tier III NOC)', '8. Staff message is stored as staff (Rohan / Tier III NOC), not as AI');
ctx.setAiChannelEnabled('web', false);
a0 = ai(web); staffSend(web, 'Second staff update.'); tick(5000);
assert(ai(web) === a0 && web.messages.some(m => m.text === 'Second staff update.' && m.sender === 'staff'), '7. Staff message with AI off: no AI reply, message kept as staff');
ctx.setAiChannelEnabled('web', true);
a0 = ai(web); const l0 = leadsFor(web); inbound(web, LEAD_TEXT); tick(300); staffSend(web, 'A specialist is on it.'); tick(5000);
assert(ai(web) === a0 && leadsFor(web) === l0 + 1, 'Staff reply supersedes a queued AI reply; the lead is still captured');
const rendered = ctx.renderCustomerConversation.toString();
assert(/m\.sender === 'staff'[\s\S]*Human Agent/.test(rendered), 'Staff messages render through the Human Agent bubble');

console.log('\n--- Human takeover ---');
const ig = conv('CONV-IG-6210');
ctx.currentConversationId = ig.conversationId;
ig.status = 'human_takeover';
a0 = ai(ig); inbound(ig, PLAIN); tick(5000);
assert(ai(ig) === a0, '9. Human takeover: no AI reply to a customer message');
ig.status = 'ai_handling';
a0 = ai(ig); inbound(ig, PLAIN); tick(300);
ig.status = 'human_takeover'; tick(5000);
assert(ai(ig) === a0, '10. A reply queued before takeover is not delivered after it');
ig.status = 'ai_handling';
a0 = ai(ig); inbound(ig, PLAIN); tick(300);
ctx.toggleAgentOverride({ checked: true });
assert(!ig._pendingReplyTimeout && ig.status === 'human_takeover', '10b. The real Override handler clears a queued reply when takeover starts');
tick(5000);
assert(ai(ig) === a0, '10c. ...and that reply is never delivered');
a0 = ai(ig); const n0 = ig.messages.length; staffSend(ig, 'Inspecting your fiber signal now.'); tick(5000);
assert(ai(ig) === a0 && ig.messages.slice(n0).some(m => m.sender === 'customer'), 'Takeover keeps the simulated customer acknowledgement (Module 02 behaviour)');

console.log(`\nTest Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
if (passed !== total) process.exit(1);
