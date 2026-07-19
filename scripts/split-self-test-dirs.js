/**
 * Directoryize large backend/test-agent/self-test-*.ts files.
 * Keeps stable facade paths (self-test-foo.ts re-exports from self-test-foo/).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../backend/test-agent');
const TARGETS = [
  'self-test-browser-assertions.ts',
  'self-test-browser-flows.ts',
  'self-test-playwright-cli.ts',
  'self-test-core.ts',
];

const MAX_PART_LINES = 1400;

function splitFile(fileName) {
  const srcPath = path.join(root, fileName);
  if (!fs.existsSync(srcPath)) {
    console.log('skip missing', fileName);
    return;
  }
  const raw = fs.readFileSync(srcPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  if (lines.length < 1600) {
    console.log('skip small', fileName, lines.length);
    return;
  }
  // Already a facade?
  if (lines.length < 80 && /from "\.\/self-test-/.test(raw)) {
    console.log('skip already facade', fileName);
    return;
  }

  const base = fileName.replace(/\.ts$/, '');
  const dir = path.join(root, base);
  fs.mkdirSync(dir, { recursive: true });

  // Find header end: first export function
  let headerEnd = lines.findIndex((l) => /^export (async )?function /.test(l));
  if (headerEnd < 0) throw new Error(`No exports in ${fileName}`);
  const header = lines.slice(0, headerEnd);

  // Collect export function ranges
  const exports = [];
  for (let i = headerEnd; i < lines.length; i++) {
    if (/^export (async )?function /.test(lines[i])) {
      const m = lines[i].match(/^export (?:async )?function ([A-Za-z_$][\w$]*)/);
      exports.push({ start: i, name: m[1] });
    }
  }
  for (let i = 0; i < exports.length; i++) {
    exports[i].end = i + 1 < exports.length ? exports[i + 1].start : lines.length;
  }

  // Pack into parts by line budget
  const parts = [];
  let current = [];
  let currentLines = 0;
  for (const exp of exports) {
    const size = exp.end - exp.start;
    if (current.length && currentLines + size > MAX_PART_LINES) {
      parts.push(current);
      current = [];
      currentLines = 0;
    }
    current.push(exp);
    currentLines += size;
  }
  if (current.length) parts.push(current);

  const partFiles = [];
  const allNames = [];
  parts.forEach((part, idx) => {
    const partName = `part-${String(idx + 1).padStart(2, '0')}.ts`;
    const body = part.flatMap((exp) => lines.slice(exp.start, exp.end));
    const names = part.map((p) => p.name);
    allNames.push(...names);
    const adjustedHeader = header.map((l) =>
      l.replace(/from "\.\//g, 'from "../').replace(/from '\.\//g, "from '../")
    );
    const text = [
      `// Behavior-freeze extraction from ${fileName} (${partName}).`,
      ...adjustedHeader,
      '',
      ...body,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(dir, partName), text);
    partFiles.push({ partName, names });
    console.log(`  ${base}/${partName}: ${text.split(/\n/).length} lines, ${names.length} exports`);
  });

  // index inside directory (optional convenience)
  const indexText = [
    `// Barrel for ${base}/ parts.`,
    ...partFiles.map((p) => `export {\n  ${p.names.join(',\n  ')}\n} from "./${p.partName.replace(/\.ts$/, '')}";`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'index.ts'), indexText);

  // Stable facade at original path
  const facade = [
    `// Public compatibility facade. Implementations live in ./${base}/.`,
    ...partFiles.map((p) => `export {\n  ${p.names.join(',\n  ')}\n} from "./${base}/${p.partName.replace(/\.ts$/, '')}";`),
    '',
  ].join('\n');
  fs.writeFileSync(srcPath, facade);

  console.log(`${fileName}: ${lines.length} -> facade ${facade.split(/\n/).length} + ${parts.length} parts`);
}

for (const t of TARGETS) {
  console.log('\n===', t, '===');
  splitFile(t);
}
