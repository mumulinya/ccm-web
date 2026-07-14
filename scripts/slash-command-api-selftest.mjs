import assert from 'node:assert/strict'

const baseUrl = process.env.CCM_SLASH_URL || 'http://127.0.0.1:3082'
const projects = await fetch(`${baseUrl}/api/projects`).then(response => response.json())
const groups = await fetch(`${baseUrl}/api/groups`).then(response => response.json())
const project = (projects.projects || projects.configs || [])[0]?.name || 'cc-connect-test'
const group = (groups.groups || [])[0] || {}

const contexts = {
  global: { sessionId: 'slash-contract-global' },
  project: { project, sessionId: 'slash-contract-project' },
  group: { group: group.name || 'slash-contract-group', groupId: group.id || 'slash-contract-group', sessionId: 'slash-contract-group-session' },
}

const counts = {}
for (const scope of ['global', 'project', 'group']) {
  const params = new URLSearchParams({ scope, ...contexts[scope] })
  const listingResponse = await fetch(`${baseUrl}/api/slash-commands?${params}`)
  const listing = await listingResponse.json()
  assert.equal(listingResponse.ok, true, `${scope} 命令列表读取失败`)
  assert.ok(listing.commands.length >= 50, `${scope} 命令数不足 50`)
  counts[scope] = listing.commands.length

  for (const command of listing.commands) {
    const argument = command.requiresArgs ? 'regression-probe' : ''
    const response = await fetch(`${baseUrl}/api/slash-commands/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: `/${command.name}${argument ? ` ${argument}` : ''}`, scope, context: contexts[scope] }),
    })
    const data = await response.json()
    assert.equal(response.ok, true, `${scope} /${command.name} 解析失败：${data.error || response.status}`)
    assert.equal(data.success, true, `${scope} /${command.name} 未返回成功`)
    assert.equal(data.result?.type, command.actionType, `${scope} /${command.name} 动作类型失配`)
    assert.equal(data.command?.implementation, command.implementation, `${scope} /${command.name} 实现类型失配`)
    if (['query', 'mutation'].includes(data.result.type)) {
      assert.ok(data.result.endpoint.startsWith('/api/'), `${scope} /${command.name} 端点无效`)
      assert.ok(!data.result.endpoint.includes('$'), `${scope} /${command.name} 端点仍有占位符`)
    }
    if (data.result.type === 'prompt') assert.ok(data.result.prompt.trim(), `${scope} /${command.name} Agent 工作流为空`)
    if (data.result.type === 'navigate') assert.ok(data.result.tab, `${scope} /${command.name} 页面目标为空`)
    if (data.result.type === 'client') assert.ok(data.result.action, `${scope} /${command.name} 客户端动作为空`)
  }
}

console.log(JSON.stringify({ pass: true, baseUrl, project, group: group.name || group.id || '', counts }, null, 2))

