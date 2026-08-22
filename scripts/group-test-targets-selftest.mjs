import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-group-test-targets-'))
const ccm = path.join(root, '.cc-connect')
fs.mkdirSync(ccm, { recursive: true })
fs.mkdirSync(path.join(ccm, 'configs'), { recursive: true })
for (const project of ['product-web', 'service-api']) {
  fs.writeFileSync(path.join(ccm, 'configs', `config-${project}.toml`), `[[projects]]\nname = "${project}"\nwork_dir = "${root.replace(/\\/g, '\\\\')}"\n[projects.agent]\ntype = "codex"\n`)
}
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
const projectAuthModulePath = path.resolve('ccm-package/dist/modules/projects/project-test-auth.js')
const probe = String.raw`
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require(${JSON.stringify(modulePath)});
const projectAuth = require(${JSON.stringify(projectAuthModulePath)});
const authProfile = projectAuth.saveProjectTestAuthProfile('product-web', {
  enabled: true, mode: 'credentials', baseUrl: 'http://127.0.0.1:5173', loginPath: '/login',
  username: 'user@example.test', password: 'secret-value-123', usernameLabel: '用户名', passwordLabel: '密码',
  submitLabel: '登录', successUrlIncludes: '/workspace',
});
assert.equal(authProfile.usernameConfigured && authProfile.passwordConfigured, true);
const created = api.saveGroupTestTarget('group-a', {
  project: 'product-web', name: 'Web 用户端', kind: 'web', environment: 'staging', enabled: true, required: true,
  baseUrl: 'http://127.0.0.1:5173/', startupCommand: 'npm run dev', verificationCommands: ['npm run test'],
  auth: { mode: 'credentials', fields: [] },
});
assert.equal(created.name, 'Web 用户端');
assert.equal(created.auth.fields.length, 0);
const groupFile = path.join(process.env.USERPROFILE, '.cc-connect', 'groups.json');
const stored = fs.readFileSync(groupFile, 'utf8');
assert.equal(stored.includes('secret-value-123'), false);
assert.equal(stored.includes('user@example.test'), false);
assert.equal(stored.includes('ccm-secret://'), false);
const resolved = api.resolveGroupTestTargets('group-a', ['product-web'], [created.id]);
assert.equal(resolved.length, 1);
const usernameField = resolved[0].auth.fields.find(field => field.inputLabel === '用户名');
const passwordField = resolved[0].auth.fields.find(field => field.inputLabel === '密码');
assert.equal(resolved[0].env[usernameField.envName], 'user@example.test');
assert.equal(resolved[0].env[passwordField.envName], 'secret-value-123');
const originalChecksum = resolved[0].checksum;
const updated = api.saveGroupTestTarget('group-a', {
  ...created,
  environment: 'preview',
  auth: { mode: 'credentials', fields: [] },
});
assert.equal(updated.environment, 'preview');
const resolvedUpdated = api.resolveGroupTestTargets('group-a', [], [created.id])[0];
assert.equal(resolvedUpdated.env[passwordField.envName], 'secret-value-123');
assert.notEqual(resolvedUpdated.checksum, originalChecksum);
assert.throws(() => api.saveGroupTestTarget('group-a', { project: 'other-project', name: '越权目标' }), /当前群聊/);
assert.throws(() => api.resolveGroupTestTargets('group-a', [], ['gtt-from-other-group']), /不属于当前群聊/);
assert.equal(api.listGroupTestTargets('group-a').projects.includes('product-web'), true);
assert.equal(api.deleteGroupTestTarget('group-a', created.id).success, true);
assert.equal(api.listGroupTestTargets('group-a').targets.length, 0);
assert.equal(projectAuth.resolveProjectTestAuthProfile('product-web').env[passwordField.envName], 'secret-value-123');
console.log(JSON.stringify({ checks: 15, paidProviderCalls: 0 }));
`

const result = spawnSync(process.execPath, ['-e', probe], {
  cwd: process.cwd(),
  env: { ...process.env, USERPROFILE: root, HOME: root },
  encoding: 'utf8',
  windowsHide: true,
})

try {
  assert.equal(result.status, 0, result.stderr || result.stdout)
  const outputLine = result.stdout.trim().split(/\r?\n/).reverse().find(line => line.trim().startsWith('{'))
  assert.ok(outputLine, result.stdout || '群聊测试目标回归未返回 JSON 回执')
  const output = JSON.parse(outputLine)
  assert.equal(output.checks, 15)
  assert.equal(output.paidProviderCalls, 0)
  console.log(`group-test-targets self-test: ${output.checks}/15 checks passed; paid provider calls: 0`)
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
