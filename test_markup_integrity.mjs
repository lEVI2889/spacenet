// test_markup_integrity.mjs - every element the app script looks up by a literal id must exist in the
// real markup (or in a template the script renders). The older vm suites (02-05) use a mock DOM that
// creates any element on demand, so a deleted input or button cannot fail them; this suite closes that gap.
import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=============================================================');
console.log('SpaceNet AI CRM — Markup Integrity Suite');
console.log('=============================================================\n');

const html = readFileSync(resolve('./index.html'), 'utf-8').replace(/\r\n/g, '\n');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].find(m => m[1].includes('SPACE_NET_CUSTOMERS'))[1];
const markup = html.replace(script, '');

// Deliberately optional: the command palette is not part of this demo build; openCmdPalette()
// detects the missing markup and tells the user instead of throwing.
const OPTIONAL = new Set(['cmd-palette-modal', 'cmd-palette-container', 'cmd-palette-input']);

let passed = 0, total = 0;
function assert(cond, msg) { total++; if (cond) { passed++; console.log(`  [PASS] Test ${total}: ${msg}`); } else console.log(`  [FAIL] Test ${total}: ${msg}`); }

const staticIds = new Set([...markup.matchAll(/\bid="([^"$]+)"/g)].map(m => m[1]));
const templateIds = new Set([...script.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map(m => m[1]));
const referenced = [...new Set([...script.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)].map(m => m[1]))];
const missing = referenced.filter(id => !staticIds.has(id) && !templateIds.has(id) && !OPTIONAL.has(id));

assert(referenced.length > 200, `Scanned ${referenced.length} literal id lookups`);
assert(missing.length === 0, `Every looked-up id exists in markup or a rendered template${missing.length ? ' — missing: ' + missing.join(', ') : ''}`);
assert([...OPTIONAL].every(id => !staticIds.has(id)) && /Global Search Unavailable/.test(script), 'Optional command-palette ids are still absent and handled with an honest message (update OPTIONAL if that changes)');
const dupes = [...markup.matchAll(/\bid="([^"$]+)"/g)].map(m => m[1]).filter((id, i, a) => a.indexOf(id) !== i);
assert(dupes.length === 0, `No duplicate static ids${dupes.length ? ' — ' + [...new Set(dupes)].join(', ') : ''}`);

console.log(`\nTest Execution Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
if (passed !== total) process.exit(1);
