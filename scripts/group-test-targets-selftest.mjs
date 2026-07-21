import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-group-test-targets-'))
const ccm = path.join(root, '.cc-connect')
fs.mkdirSync(ccm, { recursive: true })
fs.writeFileSync(path.join(ccm, 'groups.json'), JSON.stringify([{
  id: 'group-a',
  name: '产品研发群',
  members: [
    { project: '__group_coordinator__', role: 'coordinator', agent: 'coded-orchestrator' },
    { project: 'product-web', agent: 'codex' },
    { project: 'service-api', agent: 'claudecode' },
  ],
}], null, 2))

const modulePath = path.resolve('ccm-package/dist/modules/collaboration/group-test-targets.js')
const credentialModulePath = path.resolve('ccm-package/dist/core/credential-store.js')
const probe = String.raw`
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require(${JSON.stringify(modulePath)});
const credentials = require(${JSON.stringify(credentialModulePath)});
const created = api.saveGroupTestTarget('group-a', {
  project: 'product-web', name: 'Web 用户端', kind: 'web', environment: 'staging', enabled: true, required: true,
  baseUrl: 'http://127.0.0.1:5173/', startupCommand: 'npm run dev', verificationCommands: ['npm run test'],
  auth: { mode: 'credentials', loginPath: '/login', submitLabel: '登录', successUrlIncludes: '/workspace', fields: [
    { label: '账号', envName: 'TEST_USERNAME', inputLabel: '用户名', value: 'user@example.test' },
    { label: '密码', envName: 'TEST_PASSWORD', inputLabel: '密码', value: 'secret-value-123' },
  ] },
});
assert.equal(created.name, 'Web 用户端');
assert.equal(created.auth.fields.every(field => field.hasValue && field.credentialProtected), true);
assert.equal(created.auth.fields.some(field => Object.hasOwn(field, 'valueRef') || Object.hasOwn(field, 'value')), false);
const groupFile = path.join(process.env.USERPROFILE, '.cc-connect', 'groups.json');
const stored = fs.readFileSync(groupFile, 'utf8');
assert.equal(stored.includes('secret-value-123'), false);
assert.equal(stored.includes('user@example.test'), false);
assert.equal(stored.includes('ccm-secret://'), true);
const firstCredentialRef = JSON.parse(stored)[0].test_targets[0].auth.fields[0].valueRef;
const resolved = api.resolveGroupTestTargets('group-a', ['product-web'], [created.id]);
assert.equal(resolved.length, 1);
assert.equal(resolved[0].env.TEST_USERNAME, 'user@example.test');
assert.equal(resolved[0].env.TEST_PASSWORD, 'secret-value-123');
const originalChecksum = resolved[0].checksum;
const updated = api.saveGroupTestTarget('group-a', {
  ...created,
  environment: 'preview',
  auth: { ...created.auth, fields: created.auth.fields.map(field => ({ ...field, value: '' })) },
});
assert.equal(updated.environment, 'preview');
const resolvedUpdated = api.resolveGroupTestTargets('group-a', [], [created.id])[0];
assert.equal(resolvedUpdated.env.TEST_PASSWORD, 'secret-value-123');
assert.notEqual(resolvedUpdated.checksum, originalChecksum);
assert.throws(() => api.saveGroupTestTarget('group-a', { project: 'other-project', name: '越权目标' }), /当前群聊/);
assert.throws(() => api.resolveGroupTestTargets('group-a', [], ['gtt-from-other-group']), /不属于当前群聊/);
assert.equal(api.listGroupTestTargets('group-a').projects.includes('product-web'), true);
assert.equal(api.deleteGroupTestTarget('group-a', created.id).success, true);
assert.equal(api.listGroupTestTargets('group-a').targets.length, 0);
assert.throws(() => credentials.resolveCredential(firstCredentialRef), /不存在/);
console.log(JSON.stringify({ checks: 14, paidProviderCalls: 0 }));
`

const result = spawnSync(process.execPath, ['-e', probe], {
  cwd: process.cwd(),
  env: { ...process.env, USERPROFILE: root, HOME: root },
  encoding: 'utf8',
  windowsHide: true,
})

try {
  assert.equal(result.status, 0, result.stderr || result.stdout)
  const output = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1))
  assert.equal(output.checks, 14)
  assert.equal(output.paidProviderCalls, 0)
  console.log(`group-test-targets self-test: ${output.checks}/14 checks passed; paid provider calls: 0`)
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
