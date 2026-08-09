import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { getSlashCommandContractSnapshot } = require(path.join(root, 'ccm-package/dist/modules/tools/slash-commands.js'))
const { buildCommandResult } = await import(pathToFileURL(path.join(root, 'frontend/src/composables/useSlashCommands.js')).href)
const snapshot = getSlashCommandContractSnapshot()
const sentinel = 'COMMAND_RESULT_PRIVATE_BODY_SENTINEL_9a7f'
const secret = 'sk-command-result-secret-123456789'

function fixture(name) {
  const base = { success: true, status: 'ok', message: '命令执行成功' }
  if (name === 'doctor') return { ...base, readiness: 'partial', summary: '系统可用，但有一项需要关注', counts: { checks: 2, ok: 1, warn: 1, fail: 0 }, checks: [{ id: 'ok', label: '核心服务', status: 'ok', message: '正常' }, { id: 'warn', label: '执行器', status: 'warn', message: '需要重新连接' }] }
  if (name === 'task') return { tasks: [{ id: 'task-1', title: '示例任务', status: 'running', target_project: 'fixture', trace_id: 'trace-1', logs: [] }] }
  if (name === 'trace') return { trace: { id: 'trace-1', task_id: 'task-1', events: [{ type: 'dispatch', message: '已派发', status: 'ok' }] } }
  if (name === 'knowledge') return { matched: [{ filename: 'guide.md', chunk_id: 'chunk-1', score: 0.93, text: sentinel, content: sentinel }] }
  if (name === 'shared-files') return { files: [{ name: 'README.md', type: 'text/markdown', readable: true }] }
  if (name === 'mcp') return { scope: 'project', scope_id: 'fixture', tools: [{ name: 'fetch-web-mcp', description: '公开网页读取', runtime: { connected: true, state: 'connected', toolsCount: 1, authState: 'not_required' }, authorization: { fullServer: true, tools: [] } }], authorization: { requested: 2, available: 1, missing: ['missing-mcp'] } }
  if (name === 'skills') return { scope: 'project', scope_id: 'fixture', skills: [{ name: 'review', description: 'Review code', enabled: true }], authorization: { requested: 1, available: 1, missing: [] } }
  if (name === 'diff' || name === 'git-status') return { branch: 'main', total: 1, files: [{ path: 'src/app.ts', status: 'M', statusText: '已修改' }] }
  if (name === 'history') return { commits: [{ hash: 'abcdef', shortHash: 'abcdef', message: 'fixture commit', author: 'CCM', timestamp: '2026-08-09' }] }
  if (name === 'agent-health' || name === 'model') return { runtimes: [{ id: 'codex', label: 'Codex', available: true, sessionResume: true }] }
  if (name === 'cron') return { jobs: [{ id: 'job-1', name: '每日检查', enabled: true, cron: '0 9 * * *' }] }
  if (name === 'soak') return { state: { running: false, sampleCount: 3 }, report: { availability: 100, restarts: 0 } }
  if (name === 'logs') return { logs: [{ level: 'info', message: `正常记录 ${secret}`, at: '2026-08-09T00:00:00.000Z' }] }
  if (name === 'checkpoint') return { checkpoint: { id: 'cp-1', executionId: 'exec-1', mode: 'worktree' } }
  if (name === 'rollback') return { checkpointId: 'cp-1', executionId: 'exec-1', restoredHead: 'abcdef' }
  if (name === 'permissions') return { tools: [{ name: 'read', description: '只读', risk: 'safe' }] }
  if (name === 'hooks') return { hooks: [{ id: 'hook-1', phase: 'before_tool', tool: '*', effect: 'audit' }] }
  return { ...base, summary: '本地命令已完成', metrics: { 状态: '正常' }, items: [{ title: '结果', detail: '已处理', status: '成功' }] }
}

const resultCommands = snapshot.commands.filter(command => ['query', 'mutation', 'client'].includes(command.action?.type))
assert.ok(resultCommands.length >= 30, '结果命令覆盖数量不足')

for (const command of resultCommands) {
  const args = command.name === 'task' ? 'task-1' : command.name === 'trace' ? 'trace-1' : 'fixture'
  const result = buildCommandResult(command, fixture(command.name), args, { scope: 'project', project: 'fixture' }, 12)
  assert.equal(result.schema, 'ccm-command-result-v2', `/${command.name} 未生成 V2 结果`)
  assert.ok(result.variant, `/${command.name} 缺少展示类型`)
  assert.ok(['neutral', 'success', 'warning', 'danger'].includes(result.tone), `/${command.name} tone 无效`)
  assert.equal(result.contentStored, false, `/${command.name} 必须声明不保存正文`)
  assert.equal(result.rawPreview, '', `/${command.name} 不应保留原始响应`)
  assert.ok(result.technicalDetails?.schema, `/${command.name} 缺少安全技术详情`)
  const serialized = JSON.stringify(result)
  assert.ok(!serialized.includes(sentinel), `/${command.name} 泄漏知识或文件正文`)
  assert.ok(!serialized.includes(secret), `/${command.name} 泄漏密钥`)
}

const mcp = buildCommandResult(resultCommands.find(item => item.name === 'mcp'), fixture('mcp'), '', { scope: 'project', project: 'fixture' }, 8)
assert.equal(mcp.tone, 'warning', '存在授权缺失时 MCP 卡片应为警告')
assert.equal(mcp.stats.find(item => item.label === '已连接')?.value, '1', 'MCP 必须区分真实连接数')
assert.ok(mcp.sections.some(section => section.id === 'authorization-issues'), 'MCP 必须单列缺失授权')
assert.ok(mcp.actions.some(action => action.tab === 'tools'), 'MCP 必须提供工具配置入口')

const component = fs.readFileSync(path.join(root, 'frontend/src/components/common/CommandResultCard.vue'), 'utf8')
assert.match(component, /技术详情/, '公共卡片必须使用技术详情')
assert.doesNotMatch(component, /查看原始结果/, '公共卡片不能继续暴露原始结果')
assert.match(component, /ccm-command-result-action/, '公共卡片操作必须接入统一导航')

const toolsSource = fs.readFileSync(path.join(root, 'backend/modules/tools/tools.ts'), 'utf8')
for (const field of ['connected', 'toolsCount', 'authState', 'lastErrorAt']) assert.ok(toolsSource.includes(field), `MCP 安全运行状态缺少 ${field}`)
assert.match(toolsSource, /redactMcpRuntimeError/, 'MCP 运行错误必须在返回页面前脱敏')

console.log(JSON.stringify({ success: true, schema: 'ccm-command-result-v2', coveredCommands: resultCommands.length }, null, 2))
