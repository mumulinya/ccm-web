#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { toolManager } = require('../ccm-package/dist/tools/tool-manager.js')
const { runToolCallLoop } = require('../ccm-package/dist/tools/tool-call-loop.js')

const baseUrl = process.env.CCM_BASE_URL || 'http://127.0.0.1:3082'
const report = await fetch(`${baseUrl}/api/tools/chain-verification`).then(response => response.json())
assert.equal(report.success, true, 'chain verification API is unavailable')
const rows = (report.rows || []).filter(row => Number(row?.counts?.mcp || 0) + Number(row?.counts?.skill || 0) > 0)
assert.ok(rows.length > 0, 'no configured project/group tool scopes found')

await toolManager.loadTools()
const status = toolManager.getToolList()
const outcomes = []

for (const row of rows) {
  const mcpGrants = Array.isArray(row?.tools?.mcp) ? row.tools.mcp : []
  const skillGrants = Array.isArray(row?.tools?.skill) ? row.tools.skill : []
  const project = row.scope === 'project'
    ? row.id
    : (row.runtime?.snapshots || []).find(snapshot => snapshot.projectName)?.projectName || ''
  const auditContext = {
    runtime: (row.runtime?.snapshots || [])[0]?.runtime || 'claudecode',
    project,
    groupId: row.scope === 'group' ? row.id : '',
    taskId: `tool-control-live-verification-${row.scope}-${row.id}-${Date.now()}`,
    executionId: `tool-control-live-verification-${row.scope}-${row.id}`,
    source: 'tools-config-live-verification',
  }

  let mcpOk = mcpGrants.length === 0
  if (mcpGrants.length) {
    const server = String(mcpGrants[0]).replace(/^mcp__ccm__/, '').split(/[/:]/)[0]
    const candidates = (status.mcp || []).filter(tool => tool.server === server)
    const selected = candidates.find(tool => !(tool.schema?.required || []).length)
    assert.ok(selected, `no harmless zero-argument MCP tool available for ${server}`)
    let successfulToolEvent = false
    const loop = await runToolCallLoop({
      initialOutput: `<tool_call>${JSON.stringify({ name: selected.name, arguments: {} })}</tool_call>`,
      scope: { mcp: mcpGrants, skill: skillGrants },
      ...auditContext,
      maxRounds: 1,
      parseToolCalls: text => toolManager.parseToolCalls(text),
      executeToolCall: (name, args, scope) => toolManager.executeToolCall(name, args, scope),
      continueAgent: async () => ({ output: '只读工具验证完成。' }),
      onEvent: event => { if (event.type === 'tool_result' && event.ok === true) successfulToolEvent = true },
    })
    mcpOk = loop.toolCalls === 1 && successfulToolEvent
  }

  const skillResults = skillGrants.map(skill => toolManager.invokeSkill(skill, '验证 Skill 可在当前授权范围内读取。', {
    mcp: mcpGrants,
    skill: skillGrants,
    auditContext,
  }))
  const skillOk = skillResults.every(result => result.ok === true)
  outcomes.push({ scope: row.scope, id: row.id, project, mcpOk, skillOk, skills: skillResults.length })
}

toolManager.disconnect()
assert.ok(outcomes.every(item => item.mcpOk && item.skillOk), `live scope verification failed: ${JSON.stringify(outcomes)}`)
console.log(JSON.stringify({ ok: true, outcomes }, null, 2))
