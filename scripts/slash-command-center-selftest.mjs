import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const slashModule = require(path.join(root, 'ccm-package/dist/modules/tools/slash-commands.js'))
const snapshot = slashModule.getSlashCommandContractSnapshot()
const builtin = slashModule.runSlashCommandSelfTest()

const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const absolute = path.join(directory, entry.name)
  if (entry.isDirectory()) return walk(absolute)
  return entry.isFile() && /\.(ts|js)$/.test(entry.name) ? [absolute] : []
})

assert.equal(builtin.pass, true, '内置命令解析自测必须通过')
assert.ok(snapshot.counts.global >= 50, '全局入口命令数不足 50')
assert.ok(snapshot.counts.project >= 50, '项目入口命令数不足 50')
assert.ok(snapshot.counts.group >= 50, '群聊入口命令数不足 50')

const names = new Set()
for (const command of snapshot.commands) {
  assert.ok(!names.has(command.name), `命令重复：/${command.name}`)
  names.add(command.name)
  assert.ok(command.scopes.length > 0, `命令没有作用域：/${command.name}`)
  assert.ok(command.action?.type, `命令没有执行动作：/${command.name}`)
  if (command.requiresArgs) assert.ok(command.action.type !== 'navigate', `导航命令不应强制参数：/${command.name}`)
  if (command.risk === 'high') assert.ok(['local-mutation', 'client', 'agent-workflow'].includes(command.implementation), `高风险命令实现类型异常：/${command.name}`)
}

const appSource = read('frontend/src/App.vue')
const tabs = new Set([...appSource.matchAll(/\{\s*id:\s*'([^']+)'/g)].map(match => match[1]))
for (const command of snapshot.commands.filter(item => item.action.type === 'navigate')) {
  assert.ok(tabs.has(command.action.tab), `/${command.name} 指向不存在的页面 ${command.action.tab}`)
}

const clientSource = read('frontend/src/composables/useSlashCommandClientActions.js')
for (const command of snapshot.commands.filter(item => item.action.type === 'client')) {
  assert.ok(clientSource.includes(`action === '${command.action.clientAction}'`), `/${command.name} 缺少客户端实现 ${command.action.clientAction}`)
}

const backendSources = walk(path.join(root, 'backend')).map(file => fs.readFileSync(file, 'utf8')).join('\n')
for (const command of snapshot.commands.filter(item => ['query', 'mutation'].includes(item.action.type))) {
  const endpoints = [itemEndpoint(command.action.endpoint), ...Object.values(command.action.endpointByScope || {}).map(itemEndpoint)].filter(Boolean)
  for (const endpoint of endpoints) assert.ok(backendSources.includes(`"${endpoint}"`), `/${command.name} 的端点未注册：${endpoint}`)
}

const slashClientSource = read('frontend/src/composables/useSlashCommands.js')
assert.ok(slashClientSource.includes("command.risk === 'high' || command.actionType === 'mutation'"), '高风险命令必须经过确认')
assert.ok(!slashClientSource.includes('.slice(0, 18)'), '命令菜单不能继续限制为 18 项')

for (const page of [
  'frontend/src/components/global/GlobalAgent.vue',
  'frontend/src/components/projects/ProjectManager.vue',
  'frontend/src/components/collaboration/GroupChat.vue',
]) {
  const source = read(page)
  assert.ok(source.includes('useSlashCommands'), `${page} 未接入命令中心`)
  assert.ok(source.includes('onClientAction'), `${page} 未接入客户端动作`)
  assert.ok(source.includes('command_result'), `${page} 未接入命令结果卡片`)
}

console.log(JSON.stringify({ success: true, counts: snapshot.counts, checks: builtin.checks }, null, 2))

function itemEndpoint(value = '') {
  return String(value || '').split('?')[0]
}

