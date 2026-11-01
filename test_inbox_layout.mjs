// test_inbox_layout.mjs - Inbox responsive layout guard (QA D3/D4).
// Parses the real Inbox markup into an element tree and checks the layout invariants that caused the bugs:
// D3: below lg the stacked Inbox must not inherit the desktop fixed height (the stream got 32px);
// D4: the conversation header and composer must be able to wrap/shrink inside the card.
// Geometry itself was verified in a real browser at 375/390/768/1440 px (see the fix report).
import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Inbox Layout Validation Suite');
console.log('=============================================================\n');

const html = readFileSync(resolve('./index.html'), 'utf-8').replace(/\r\n/g, '\n');
const css = (html.match(/<style id="spacenet-theme">([\s\S]*?)<\/style>/) || [])[1] || '';
const start = html.indexOf('id="view-unified-inbox"');
const section = html.slice(html.lastIndexOf('<section', start), html.indexOf('</section>', start) + '</section>'.length);

let passed = 0, total = 0;
function assert(cond, msg) { total++; if (cond) { passed++; console.log(`  [PASS] Test ${total}: ${msg}`); } else console.log(`  [FAIL] Test ${total}: ${msg}`); }

// Minimal tag-stack parser: records, for each element with an id, its own classes and its ancestors' classes.
const VOID = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'path', 'circle', 'ellipse']);
const byId = {};
const stack = [];
for (const m of section.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g)) {
  const [, close, tag, attrs, selfClose] = m;
  const name = tag.toLowerCase();
  if (close) { while (stack.length && stack.pop().name !== name); continue; }
  const cls = ((attrs.match(/\bclass="([^"]*)"/) || [])[1] || '').split(/\s+/).filter(Boolean);
  const id = (attrs.match(/\bid="([^"]*)"/) || [])[1];
  const node = { name, cls, id };
  if (id) byId[id] = { node, ancestors: stack.slice() };
  if (!VOID.has(name) && !selfClose) stack.push(node);
}
const has = (n, c) => n.cls.includes(c);
// An unprefixed (all-breakpoint) height lock, e.g. h-full, h-[calc(...)], min-h-[700px].
const lockedHeight = n => n.cls.some(c => /^(h-(full|screen|\[)|min-h-\[)/.test(c));

const stream = byId['chat-message-stream'];
assert(!!stream, 'Message stream exists in the Inbox markup');
const chain = stream.ancestors.filter(a => a.name !== 'section');
assert(chain.every(a => !lockedHeight(a)), 'D3: no ancestor of the message stream locks its height at phone/tablet widths (desktop locks are lg:-prefixed)');
assert(chain.some(a => a.cls.some(c => /^lg:h-/.test(c))), 'D3: the desktop split still uses a fixed (lg:) height');
assert(stream.node.cls.some(c => /^min-h-\[/.test(c)) && has(stream.node, 'overflow-y-auto') && has(stream.node, 'lg:min-h-0'), 'D3: the stream has a small-screen minimum height, scrolls internally, and resets on desktop');
assert(stream.node.cls.some(c => /^max-h-\[/.test(c)), 'D3: the stream is capped on small screens so history scrolls inside the panel');

const name = byId['chat-customer-name'];
const row = name.ancestors[name.ancestors.length - 1];
assert(has(row, 'flex-wrap'), 'D4: the name/badge row can wrap');
const headerCols = name.ancestors.slice(-3, -1);
assert(headerCols.every(a => has(a, 'min-w-0')), 'D4: the header columns can shrink below their content width');
const toggle = byId['copilot-toggle'];
const controls = [...toggle.ancestors].reverse().find(a => a.name === 'div' && has(a, 'items-center') && a.cls.some(c => c.startsWith('gap-')));
assert(!!controls && has(controls, 'flex-wrap'), 'D4: the header control group (360 Profile, Copilot, Override) can wrap');
assert(/#chat-input\s*\{\s*min-width:\s*0;?\s*\}/.test(css), 'D4: the composer input may shrink (CSS rule survives setComposerMode class rewrites)');

console.log(`\nTest Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
if (passed !== total) process.exit(1);
