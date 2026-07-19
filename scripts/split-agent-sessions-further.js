/**
 * Further polish: extract snapshot-rows and delivery/inventory from shared/bind.
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../backend/tasks');

function readLines(file) {
  return fs.readFileSync(path.join(dir, file), 'utf8').split(/\r?\n/);
}

function write(file, text) {
  fs.writeFileSync(path.join(dir, file), text.endsWith('\n') ? text : text + '\n');
}

function importBlock(lines) {
  let ie = 0;
  let seenImport = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('import ') || (seenImport && (l.startsWith('}') || l.startsWith(' ') || l.includes(' from ')))) {
      seenImport = true;
      ie = i + 1;
    } else if (seenImport && l.trim() === '') {
      ie = i + 1;
      break;
    } else if (seenImport) break;
  }
  return { imports: lines.slice(0, ie).join('\n'), importEnd: ie };
}

function exportedNames(text) {
  return [...text.matchAll(/^export\s+(?:async\s+)?(?:function|const|type|interface)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
}

function usedFrom(text, names) {
  return names.filter((n) => new RegExp(`\\b${n}\\b`).test(text)).sort();
}

function count(file) {
  return readLines(file).length;
}

// --- 1) snapshot rows from shared ---
{
  const lines = readLines('agent-sessions-shared.ts');
  const start = lines.findIndex((l) => /^export function buildTaskAgentMemorySnapshotRow/.test(l));
  if (start < 0) throw new Error('buildTaskAgentMemorySnapshotRow missing');
  const body = lines.slice(start);
  const keep = lines.slice(0, start);
  const { imports } = importBlock(lines);
  const sharedNames = exportedNames(keep.join('\n'));
  const rowText = body.join('\n');
  const used = usedFrom(rowText, sharedNames);
  const out = [
    '// Behavior-freeze extraction: memory snapshot row builder.',
    imports.replace('shared store/types/helpers for agent-sessions.', 'snapshot row builder.'),
    '',
    `import {\n  ${used.join(',\n  ')}\n} from "./agent-sessions-shared";`,
    '',
    ...body,
    '',
  ].join('\n');
  write('agent-sessions-snapshot-rows.ts', out);
  write('agent-sessions-shared.ts', keep.join('\n'));
  console.log('shared', count('agent-sessions-shared.ts'), 'snapshot-rows', count('agent-sessions-snapshot-rows.ts'));
}

// --- 2) delivery + inventory from bind ---
{
  const lines = readLines('agent-sessions-bind.ts');
  const deliveryStart = lines.findIndex((l) => /^export function recordTaskAgentMemoryContextDelivery/.test(l));
  const listStart = lines.findIndex((l) => /^export function listTaskAgentMemoryContextSnapshots/.test(l));
  if (deliveryStart < 0 || listStart < 0) throw new Error('bind markers missing');

  const head = lines.slice(0, deliveryStart); // keep prepare/bind/attach
  const deliveryBody = lines.slice(deliveryStart, listStart); // record + read
  const inventoryBody = lines.slice(listStart); // list + inventory

  const { imports } = importBlock(lines);
  // shared import line from bind head
  const sharedImportMatch = lines.join('\n').match(/import \{[\s\S]*?\} from "\.\/agent-sessions-shared";/);
  const sharedImport = sharedImportMatch ? sharedImportMatch[0] : '';

  // delivery module
  const sharedNames = exportedNames(fs.readFileSync(path.join(dir, 'agent-sessions-shared.ts'), 'utf8'));
  const rowNames = exportedNames(fs.readFileSync(path.join(dir, 'agent-sessions-snapshot-rows.ts'), 'utf8'));
  const deliveryText = deliveryBody.join('\n');
  const fromSharedD = usedFrom(deliveryText, sharedNames);
  const fromRowsD = usedFrom(deliveryText, rowNames);
  const deliveryOut = [
    '// Behavior-freeze extraction: memory context delivery receipts.',
    imports.split('\n').filter((l) => !l.includes('agent-sessions-shared')).join('\n'),
    '',
    fromSharedD.length ? `import {\n  ${fromSharedD.join(',\n  ')}\n} from "./agent-sessions-shared";` : '',
    fromRowsD.length ? `import {\n  ${fromRowsD.join(',\n  ')}\n} from "./agent-sessions-snapshot-rows";` : '',
    '',
    ...deliveryBody,
    '',
  ].join('\n');
  write('agent-sessions-delivery.ts', deliveryOut);

  const invText = inventoryBody.join('\n');
  const fromSharedI = usedFrom(invText, sharedNames);
  const fromRowsI = usedFrom(invText, rowNames);
  const invOut = [
    '// Behavior-freeze extraction: memory context snapshot listing/inventory.',
    imports.split('\n').filter((l) => !l.includes('agent-sessions-shared')).join('\n'),
    '',
    fromSharedI.length ? `import {\n  ${fromSharedI.join(',\n  ')}\n} from "./agent-sessions-shared";` : '',
    fromRowsI.length ? `import {\n  ${fromRowsI.join(',\n  ')}\n} from "./agent-sessions-snapshot-rows";` : '',
    '',
    ...inventoryBody,
    '',
  ].join('\n');
  write('agent-sessions-inventory.ts', invOut);

  // trim bind head — may still import symbols only used by delivery/inventory; leave as-is for safety
  write('agent-sessions-bind.ts', head.join('\n'));
  console.log('bind', count('agent-sessions-bind.ts'), 'delivery', count('agent-sessions-delivery.ts'), 'inventory', count('agent-sessions-inventory.ts'));
}

// --- 3) update facade ---
{
  let facade = fs.readFileSync(path.join(dir, 'agent-sessions.ts'), 'utf8');
  // Remove delivery/inventory exports from bind re-export list and add new modules
  facade = facade.replace(
    /export \{\n([\s\S]*?)\} from "\.\/agent-sessions-bind";/,
    (m, inner) => {
      const names = inner.split(',').map((s) => s.trim()).filter(Boolean)
        .filter((n) => !['recordTaskAgentMemoryContextDelivery', 'readTaskAgentMemoryContextDeliveryReceipt', 'listTaskAgentMemoryContextSnapshots', 'buildTaskAgentMemoryContextSnapshotInventory'].includes(n));
      return `export {\n  ${names.join(',\n  ')}\n} from "./agent-sessions-bind";
export {
  recordTaskAgentMemoryContextDelivery,
  readTaskAgentMemoryContextDeliveryReceipt,
} from "./agent-sessions-delivery";
export {
  listTaskAgentMemoryContextSnapshots,
  buildTaskAgentMemoryContextSnapshotInventory,
} from "./agent-sessions-inventory";`;
    }
  );
  // listTaskAgentMemoryContextSnapshots import in self-test may still come from bind — fix
  facade = facade.replace(
    'import { bindTaskAgentMemoryContextSnapshot, listTaskAgentMemoryContextSnapshots } from "./agent-sessions-bind";',
    `import { bindTaskAgentMemoryContextSnapshot } from "./agent-sessions-bind";
import { listTaskAgentMemoryContextSnapshots } from "./agent-sessions-inventory";`
  );
  write('agent-sessions.ts', facade);
}

// bind may call buildTaskAgentMemorySnapshotRow — add import if needed
{
  const bind = fs.readFileSync(path.join(dir, 'agent-sessions-bind.ts'), 'utf8');
  if (/\bbuildTaskAgentMemorySnapshotRow\b/.test(bind) && !bind.includes('agent-sessions-snapshot-rows')) {
    const updated = bind.replace(
      /from "\.\/agent-sessions-shared";\n/,
      `from "./agent-sessions-shared";\n\nimport {\n  buildTaskAgentMemorySnapshotRow,\n} from "./agent-sessions-snapshot-rows";\n`
    );
    write('agent-sessions-bind.ts', updated);
  }
}

console.log('facade lines', count('agent-sessions.ts'));
for (const f of [
  'agent-sessions.ts',
  'agent-sessions-shared.ts',
  'agent-sessions-bind.ts',
  'agent-sessions-resume.ts',
  'agent-sessions-purge.ts',
  'agent-sessions-snapshot-rows.ts',
  'agent-sessions-delivery.ts',
  'agent-sessions-inventory.ts',
]) {
  console.log(String(count(f)).padStart(6), f);
}
