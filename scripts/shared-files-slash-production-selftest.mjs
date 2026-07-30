import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-shared-v2-'))
const modulePath = path.join(root, 'ccm-package', 'dist', 'modules', 'tools', 'shared-files-v2.js')
const child = spawnSync(process.execPath, ['-e', `
  const assert = require('node:assert/strict');
  const shared = require(${JSON.stringify(modulePath)});
  assert.throws(() => shared.validateSharedFileV2Name('../project-configs.json'));
  assert.throws(() => shared.validateSharedFileV2Name('payload.exe.txt'));
  const first = shared.upsertSharedTextV2('global', 'global', 'rules.md', '# Rules\\n\\n完整内容');
  const second = shared.upsertSharedTextV2('project', 'demo', 'contract.md', '# Contract\\n\\n字段 A');
  const longText = '没有换行的完整共享文件内容'.repeat(5000);
  const longFile = shared.upsertSharedTextV2('group', 'long-line', 'long.txt', longText);
  assert.notEqual(first.id, second.id);
  assert.equal(shared.listSharedFilesV2('global', 'global').length, 1);
  assert.equal(shared.listSharedFilesV2('project', 'demo').length, 1);
  assert.equal(shared.listSharedFilesV2('group', 'demo').length, 0);
  const longRead = shared.readSharedFileV2('group', 'long-line', longFile.id);
  assert.ok(longRead.chunks.length > 1);
  assert.ok(longRead.chunks.every(chunk => chunk.token_count <= 10000));
  assert.equal(
    longRead.chunks.map(chunk => shared.readSharedFileChunkV2('group', 'long-line', longFile.id, chunk.id).content).join(''),
    longText,
  );
  const read = shared.readSharedFileV2('global', 'global', first.id);
  assert.match(read.content, /完整内容/);
  const projection = shared.buildSharedFilesContextV2('global', 'global', { maxTokens: 8000 });
  assert.equal(projection.complete, true);
  assert.equal(projection.files[0].content_file, undefined);
  assert.equal(projection.files[0].source_file, undefined);
  const chunk = shared.readSharedFileChunkV2('global', 'global', first.id, read.chunks[0].id);
  assert.match(chunk.content, /Rules/);
  assert.equal(shared.deleteSharedFileV2('global', 'global', first.id), true);
  assert.equal(shared.listSharedFilesV2('global', 'global').length, 0);
  console.log(JSON.stringify({ success: true, checksum: projection.checksum }));
`], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, HOME: temp, USERPROFILE: temp },
})

try {
  assert.equal(child.status, 0, child.stderr || child.stdout)
  const slash = fs.readFileSync(path.join(root, 'backend', 'modules', 'tools', 'slash-commands.ts'), 'utf8')
  const access = fs.readFileSync(path.join(root, 'backend', 'modules', 'system', 'api-access-control.ts'), 'utf8')
  const server = fs.readFileSync(path.join(root, 'backend', 'server.ts'), 'utf8')
  const agentic = fs.readFileSync(path.join(root, 'backend', 'modules', 'global', 'global-agent-agentic-runtime.ts'), 'utf8')
  const projectServer = server
  const groupRuntime = fs.readFileSync(path.join(root, 'backend', 'modules', 'collaboration', 'collaboration-runtime-plan-tools.ts'), 'utf8')

  assert.match(slash, /scope=group&scope_id=\$GROUP_ID/, '群聊 /files 必须绑定精确群聊作用域')
  assert.match(slash, /authorizedSkillNames/, 'Skill命令必须经过作用域授权')
  assert.doesNotMatch(slash, /customFile:\s*CUSTOM_COMMANDS_FILE|auditFile:\s*AUDIT_FILE/, '公开摘要不能泄露本地路径')
  assert.match(access, /slash-commands\\\/\(\?:resolve\|confirm\)/, '斜杠解析和确认必须进入中央RBAC')
  assert.match(agentic, /global_shared_files/, '全局Agent必须消费全局共享文件')
  assert.match(projectServer, /projectSharedFiles\.context/, '项目主Agent与子Agent链必须消费项目共享文件')
  assert.match(groupRuntime, /buildSharedFilesContextV2\("group"/, '群聊主Agent必须消费群聊共享文件')
  assert.match(server, /TEMPLATE_FEATURE_REMOVED/, '历史模板接口必须返回明确410')
  assert.equal(fs.existsSync(path.join(root, 'backend', 'modules', 'templates', 'templates.ts')), false)
  assert.equal(fs.existsSync(path.join(root, 'frontend', 'src', 'composables', 'useChatTemplates.js')), false)
  assert.doesNotMatch(
    [
      fs.readFileSync(path.join(root, 'backend', 'agents', 'global', 'global-agent-run-store.ts'), 'utf8'),
      fs.readFileSync(path.join(root, 'frontend', 'src', 'composables', 'useGlobalAgentActions.js'), 'utf8'),
    ].join('\n'),
    /create_template/,
    '模板Agent动作必须移除',
  )
  console.log(JSON.stringify({ success: true, child: JSON.parse(child.stdout.trim()) }, null, 2))
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
