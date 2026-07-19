const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../backend/test-agent');
const dirs = [
  'self-test-browser-assertions',
  'self-test-browser-flows',
  'self-test-playwright-cli',
  'self-test-core',
];

for (const d of dirs) {
  const dir = path.join(root, d);
  for (const f of fs.readdirSync(dir).filter((x) => x.startsWith('part-') && x.endsWith('.ts'))) {
    const p = path.join(dir, f);
    let t = fs.readFileSync(p, 'utf8');
    const before = t;
    t = t.replace(/from "\.\//g, 'from "../');
    t = t.replace(/from '\.\//g, "from '../");
    if (t !== before) {
      fs.writeFileSync(p, t);
      console.log('fixed', path.relative(root, p));
    } else {
      console.log('unchanged', path.relative(root, p));
    }
  }
}
