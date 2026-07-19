/**
 * Behavior-freeze split of agent-sessions.ts into bind / resume / purge + shared + facade.
 * Verify helpers used by shared stay in shared. All shared symbols are exported for sibling modules.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../backend/tasks');
const srcPath = path.join(dir, 'agent-sessions.ts');
const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

if (lines.length < 2000) {
  console.log('agent-sessions.ts already looks split (', lines.length, 'lines). Aborting.');
  process.exit(0);
}

const decls = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const m = l.match(/^(export\s+)?(async\s+)?(function|const|type|interface|class)\s+([A-Za-z_$][\w$]*)/);
  if (m) {
    decls.push({ start: i, exported: !!m[1], kind: m[3], name: m[4], line: l });
  }
}
for (let i = 0; i < decls.length; i++) {
  decls[i].end = i + 1 < decls.length ? decls[i + 1].start : lines.length;
}

// Large domain-only exports (verify* stay shared — helpers call them)
const BIND = new Set([
  'prepareTaskAgentMemoryEntrySyncContext',
  'verifyTaskAgentMemoryEntryRenderContentionReceipt',
  'prepareTaskAgentMemoryEntrySyncContextWithRetry',
  'bindTaskAgentMemoryContextSnapshot',
  'attachTaskAgentFinalDispatchPayloadGate',
  'recordTaskAgentMemoryContextDelivery',
  'readTaskAgentMemoryContextDeliveryReceipt',
  'listTaskAgentMemoryContextSnapshots',
  'buildTaskAgentMemoryContextSnapshotInventory',
]);

const RESUME = new Set([
  'openTaskAgentSession',
  'recordTaskAgentSessionTurn',
  'verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker',
  'inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker',
  'recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome',
  'advanceTaskAgentSession',
  'reopenTaskAgentSessions',
  'getTaskAgentSessionOptions',
  'getTaskAgentSessionContinuity',
  'listTaskAgentSessions',
  'markTaskAgentSessionsForCapacityDowngrade',
  'verifyTaskAgentSessionCapacityRevalidationProof',
  'verifyTaskAgentSessionCapacityRevalidationCommitReceipt',
  'prepareTaskAgentSessionCapacityRevalidation',
  'commitTaskAgentSessionCapacityRevalidation',
  'acknowledgeTaskAgentSessionCapacityRevalidation',
  'runTaskAgentSessionModelIdentitySelfTest',
]);

const PURGE = new Set([
  'closeTaskAgentSessions',
  'pruneTaskAgentMemoryContextSnapshots',
  'purgeTaskAgentSessions',
  'reconcileTaskAgentSessions',
  'shouldCloseTaskAgentSessions',
]);

function classify(name) {
  if (BIND.has(name)) return 'bind';
  if (RESUME.has(name)) return 'resume';
  if (PURGE.has(name)) return 'purge';
  if (name === 'runTaskAgentSessionSelfTest') return 'facade';
  return 'shared';
}

// Parse imports
const importLines = [];
let i = 0;
while (i < lines.length) {
  if (/^import\s/.test(lines[i])) {
    let block = lines[i];
    i++;
    while (!block.includes(';') && i < lines.length) {
      block += '\n' + lines[i];
      i++;
    }
    importLines.push(block);
    while (i < lines.length && lines[i].trim() === '') i++;
    continue;
  }
  break;
}
const importEnd = i;
const headerImports = importLines.join('\n');

const buckets = { shared: [], bind: [], resume: [], purge: [], facade: [] };
for (const d of decls) buckets[classify(d.name)].push(d);

const sliceDecl = (d) => lines.slice(d.start, d.end).join('\n');

const sharedParts = [];
if (importEnd < (decls[0]?.start ?? importEnd)) {
  sharedParts.push(lines.slice(importEnd, decls[0].start).join('\n'));
}
for (const d of buckets.shared) sharedParts.push(sliceDecl(d));

function ensureExported(text) {
  // Export every top-level function/const/type/interface in shared
  return text
    .replace(/^(async function )/gm, 'export $1')
    .replace(/^(function )/gm, 'export $1')
    .replace(/^(const )/gm, 'export $1')
    .replace(/^(type )/gm, 'export $1')
    .replace(/^(interface )/gm, 'export $1')
    .replace(/^export export /gm, 'export ');
}

function collectExportedNames(text) {
  const names = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function|const|type|interface|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  return names;
}

function usedNames(text, available) {
  return [...available].filter((n) => new RegExp(`\\b${n}\\b`).test(text)).sort();
}

let sharedBody = ensureExported(sharedParts.join('\n\n'));
const sharedNames = collectExportedNames(sharedBody);

function buildDomain(declsInBucket) {
  const body = declsInBucket.map(sliceDecl).join('\n\n');
  const fromShared = usedNames(body, sharedNames);
  // drop names defined in this module
  const localNames = new Set(declsInBucket.map((d) => d.name));
  const imports = fromShared.filter((n) => !localNames.has(n));
  return {
    body,
    names: declsInBucket.filter((d) => d.exported || true).map((d) => d.name),
    exportNames: declsInBucket.map((d) => d.name),
    text: [
      '// Behavior-freeze extraction from agent-sessions.ts.',
      headerImports,
      '',
      imports.length ? `import {\n  ${imports.join(',\n  ')}\n} from "./agent-sessions-shared";` : '',
      '',
      body,
      '',
    ].filter((x, idx, arr) => !(x === '' && arr[idx - 1] === '')).join('\n'),
  };
}

let bindMod = buildDomain(buckets.bind);
let resumeMod = buildDomain(buckets.resume);
let purgeMod = buildDomain(buckets.purge);

// Cross-module imports (domain -> domain)
function addCross(mod, other, rel) {
  const needed = other.exportNames.filter((n) => !mod.exportNames.includes(n) && new RegExp(`\\b${n}\\b`).test(mod.body));
  if (!needed.length) return mod;
  const line = `import {\n  ${needed.join(',\n  ')}\n} from "${rel}";`;
  if (mod.text.includes(`from "${rel}"`)) return mod;
  mod.text = mod.text.replace(
    /from "\.\/agent-sessions-shared";\n/,
    `from "./agent-sessions-shared";\n\n${line}\n`
  );
  return mod;
}

bindMod = addCross(bindMod, resumeMod, './agent-sessions-resume');
bindMod = addCross(bindMod, purgeMod, './agent-sessions-purge');
resumeMod = addCross(resumeMod, bindMod, './agent-sessions-bind');
resumeMod = addCross(resumeMod, purgeMod, './agent-sessions-purge');
purgeMod = addCross(purgeMod, bindMod, './agent-sessions-bind');
purgeMod = addCross(purgeMod, resumeMod, './agent-sessions-resume');

const sharedExportedForFacade = buckets.shared.filter((d) => d.exported).map((d) => d.name);
// Also export verify helpers that were previously exported and stayed in shared
const previouslyExportedInShared = sharedExportedForFacade;

const selfTestDecl = buckets.facade[0];
const selfTestBody = selfTestDecl ? sliceDecl(selfTestDecl) : '';

const facade = `// Public compatibility facade. Implementations live in focused modules.
export {
  ${previouslyExportedInShared.join(',\n  ')}
} from "./agent-sessions-shared";
export {
  ${bindMod.exportNames.join(',\n  ')}
} from "./agent-sessions-bind";
export {
  ${resumeMod.exportNames.join(',\n  ')}
} from "./agent-sessions-resume";
export {
  ${purgeMod.exportNames.join(',\n  ')}
} from "./agent-sessions-purge";

import * as crypto from "crypto";
import * as fs from "fs";
import { getAgentRuntime } from "../agents/runtime";
import type { TaskAgentSession } from "./agent-sessions-shared";
import {
  openTaskAgentSession,
  advanceTaskAgentSession,
  getTaskAgentSessionOptions,
  getTaskAgentSessionContinuity,
} from "./agent-sessions-resume";
import { bindTaskAgentMemoryContextSnapshot, listTaskAgentMemoryContextSnapshots } from "./agent-sessions-bind";
import { purgeTaskAgentSessions, shouldCloseTaskAgentSessions } from "./agent-sessions-purge";

${selfTestBody}
`;

const sharedFile = `// Behavior-freeze shared store/types/helpers for agent-sessions.
${headerImports}

${sharedBody}
`;

fs.writeFileSync(path.join(dir, 'agent-sessions-shared.ts'), sharedFile);
fs.writeFileSync(path.join(dir, 'agent-sessions-bind.ts'), bindMod.text);
fs.writeFileSync(path.join(dir, 'agent-sessions-resume.ts'), resumeMod.text);
fs.writeFileSync(path.join(dir, 'agent-sessions-purge.ts'), purgeMod.text);
fs.writeFileSync(srcPath, facade);

const count = (f) => fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).length;
console.log('agent-sessions split:');
for (const f of ['agent-sessions.ts', 'agent-sessions-shared.ts', 'agent-sessions-bind.ts', 'agent-sessions-resume.ts', 'agent-sessions-purge.ts']) {
  console.log(String(count(f)).padStart(6), f);
}
console.log('facade shared exports', previouslyExportedInShared.length);
console.log('bind', bindMod.exportNames.length, 'resume', resumeMod.exportNames.length, 'purge', purgeMod.exportNames.length);
