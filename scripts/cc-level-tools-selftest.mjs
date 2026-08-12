import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'ccm-package', 'dist')
const load = (...segments) => import(pathToFileURL(path.join(dist, ...segments)).href)
const provider = await load('system', 'provider-native-tools.js')
const code = await load('system', 'code-intelligence.js')
const webNotebook = await load('tools', 'web-notebook-tools.js')
const search = await load('tools', 'tool-search-index.js')
const projection = await load('system', 'context-source-tool-result-projection.js')
const workspace = await load('tools', 'workspace-readonly-tools.js')
const media = await load('tools', 'workspace-read-media.js')
const transient = await load('system', 'transient-model-content.js')
const marketplace = await load('modules', 'tools', 'marketplace.js')
const lsp = await load('system', 'lsp-client.js')
const toolDisplay = await load('system', 'tool-display-projection.js')
const internalAgentMcp = await load('integrations', 'agent-internal-mcp.js')
const workspaceEdit = await load('integrations', 'workspace-edit-mcp.js')

const usage = { inputTokens: 10, outputTokens: 2, totalTokens: 12, reported: true }
const openai = provider.parseOpenAiAgentTurn({ choices: [{ finish_reason: 'tool_calls', message: { tool_calls: [{ id: 'c1', function: { name: 'read_file', arguments: '{"path":"a.ts"}' } }] } }] }, usage)
assert.equal(openai.toolCalls[0].name, 'read_file')
assert.deepEqual(openai.toolCalls[0].arguments, { path: 'a.ts' })
const gemini = provider.parseGeminiAgentTurn({ candidates: [{ content: { parts: [{ functionCall: { name: 'grep_text', args: { pattern: 'x' } } }] } }] }, usage)
assert.equal(gemini.toolCalls[0].name, 'grep_text')
const anthropic = provider.parseAnthropicAgentTurn({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'a1', name: 'find_definition', input: { symbol: 'x' } }, { type: 'tool_reference', tool_name: 'mcp__deferred' }] }, usage)
assert.equal(anthropic.toolReferences[0], 'mcp__deferred')
assert.match(provider.turnForLegacyJsonLoop(anthropic), /toolRequests/)
const anthropicPatch = provider.providerToolsRequestPatch('anthropic', [{ name: 'later', description: '', inputSchema: { type: 'object' }, deferred: true }], true)
assert.equal(anthropicPatch.body.tools[0].defer_loading, true)
assert.match(anthropicPatch.headers['anthropic-beta'], /advanced-tool-use/)

const ranked = search.searchTools({ query: 'select:find_definition', intent: 'find symbol declaration', tools: [
  { name: 'grep_text', canonicalName: 'grep_text', description: 'text search', inputSchema: { properties: { pattern: {} } }, authorized: true },
  { name: 'find_definition', canonicalName: 'find_definition', aliases: ['definition'], description: 'semantic declaration', inputSchema: { properties: { symbol: {} } }, authorized: true },
  { name: 'secret_definition', description: 'semantic declaration', authorized: false },
] })
assert.equal(ranked.length, 1)
assert.equal(ranked[0].tool.name, 'find_definition')

const parsedSkill = marketplace.parseSkillMarkdown(`---\nname: review\ndescription: review code\ncontext: fork\nallowed-tools:\n  - read_file\n  - grep_text\nagent: reviewer\nmodel: test\neffort: high\n---\nDo it`)
assert.equal(parsedSkill.context, 'fork')
assert.deepEqual(parsedSkill.allowedTools, ['read_file', 'grep_text'])
assert.equal(parsedSkill.effort, 'high')

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-tools-selftest-'))
try {
  process.env.CCM_TASK_COMMAND_RUN_DIR = path.join(temp, 'command-runs')
  const taskCommands = await load('integrations', 'task-command-runtime.js')
  const workspaceContract = workspace.runWorkspaceReadonlyToolsSelfTest()
  assert.equal(workspaceContract.success, true, JSON.stringify(workspaceContract, null, 2))
  assert.ok(workspaceContract.tools.every(tool => tool.toolContractVersion === 3))
  assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.some(tool => tool.name === 'read_files'), true)
  assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.some(tool => tool.name === 'read_files'), false)

  const editTools = workspaceEdit.workspaceEditMcpTools()
  assert.deepEqual(editTools.map(tool => tool.name), ['apply_patch', 'write_file', 'move_path', 'delete_path'])
  assert.equal(editTools.every(tool => !tool.roles.includes('project-agent') && tool.roles.includes('project-child-agent')), true)
  const mcpContext = { taskId: 'tools-selftest', groupId: '', project: 'fixture', workDir: temp }
  const projectMainServers = internalAgentMcp.buildTaskBoundInternalMcpServers({ ...mcpContext, role: 'project-agent' })
  const nativeProjectChildServers = internalAgentMcp.buildTaskBoundInternalMcpServers({ ...mcpContext, role: 'project-child-agent', agentType: 'claudecode', nativeWorkspaceEditing: true })
  const fallbackProjectChildServers = internalAgentMcp.buildTaskBoundInternalMcpServers({ ...mcpContext, role: 'project-child-agent', agentType: 'provider-without-native-edit', nativeWorkspaceEditing: false })
  const groupServers = internalAgentMcp.buildTaskBoundInternalMcpServers({ ...mcpContext, role: 'group-main-agent' })
  assert.equal(Boolean(projectMainServers.ccm__workspace_edit), false)
  assert.equal(Boolean(nativeProjectChildServers.ccm__workspace_edit), false)
  assert.ok(fallbackProjectChildServers.ccm__workspace_edit)
  assert.equal(Boolean(groupServers.ccm__workspace_edit), false)

  const editDisplay = toolDisplay.buildToolDisplayDetail({
    toolName: 'mcp__ccm__ccm_workspace_edit__apply_patch',
    arguments: { path: 'src/a.ts', old_text: 'BODY_SENTINEL_OLD', new_text: 'BODY_SENTINEL_NEW', expected_checksum: 'abc' },
    result: { schema: 'ccm-workspace-edit-result-v1', action: 'apply_patch', path: 'src/a.ts', afterChecksum: 'def', contentStored: false },
  })
  assert.equal(editDisplay.tool.userLabel, '修改文件')
  assert.equal(JSON.stringify(editDisplay).includes('BODY_SENTINEL'), false)

  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const imageFile = path.join(temp, 'pixel.png')
  fs.writeFileSync(imageFile, tinyPng)
  const imageResult = await media.readWorkspaceImage(imageFile, 'pixel.png')
  assert.equal(imageResult.safeReceipt.contentStored, false)
  assert.equal(transient.transientModelBlocks(imageResult).length, 1)
  assert.equal(JSON.stringify(imageResult).includes(tinyPng.toString('base64')), false)

  fs.writeFileSync(path.join(temp, 'sample.ipynb'), JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { name: 'python3' } }, cells: [{ id: 'c1', cell_type: 'code', metadata: {}, source: ['print(1)\n'], outputs: [{ output_type: 'stream', text: ['1\n'] }], execution_count: 1 }] }))
  const notebook = webNotebook.inspectNotebook(temp, { path: 'sample.ipynb' })
  assert.equal(notebook.cells[0].id, 'c1')
  assert.equal(Object.hasOwn(notebook.cells[0], 'source'), false)
  assert.equal(JSON.stringify(notebook).includes('print(1)'), false)

  const mockLsp = path.join(temp, 'mock-lsp.cjs')
  fs.writeFileSync(mockLsp, `let b=Buffer.alloc(0);function send(x){const v=Buffer.from(JSON.stringify(x));process.stdout.write('Content-Length: '+v.length+'\\r\\n\\r\\n');process.stdout.write(v)}process.stdin.on('data',c=>{b=Buffer.concat([b,c]);for(;;){const h=b.indexOf('\\r\\n\\r\\n');if(h<0)return;const m=/Content-Length:\\s*(\\d+)/i.exec(b.subarray(0,h).toString());const n=Number(m&&m[1]);if(!n||b.length<h+4+n)return;const x=JSON.parse(b.subarray(h+4,h+4+n));b=b.subarray(h+4+n);if(x.method==='initialize')send({jsonrpc:'2.0',id:x.id,result:{capabilities:{workspaceSymbolProvider:true}}});else if(x.method==='workspace/symbol')send({jsonrpc:'2.0',id:x.id,result:[{name:'ExternalSymbol',kind:12,location:{uri:x.params.uri||'file:///tmp/external.py',range:{start:{line:0,character:0},end:{line:0,character:14}}}}]});else if(x.method==='shutdown')send({jsonrpc:'2.0',id:x.id,result:null});else if(x.method==='exit')process.exit(0)}})`)
  const client = new lsp.StdioLspClient({ id: 'mock', command: process.execPath, args: [mockLsp], cwd: temp, languages: ['python'], timeoutMs: 3000 })
  await client.start()
  const symbols = await client.request('workspace/symbol', { query: 'External' })
  assert.equal(symbols[0].name, 'ExternalSymbol')
  await client.stop()

  const commandContext = {
    taskId: 'tools-selftest', project: 'fixture', role: 'project-agent', workDir: temp, baseWorkDir: temp,
    communicationGeneration: 2, communicationAttempt: 1, communicationLeaseId: 'lease-selftest',
  }
  const foreground = await taskCommands.runTaskBoundCommand(commandContext, {
    command: `${JSON.stringify(process.execPath)} -p "6*7"`, description: '验证托管命令', timeout_ms: 10000,
  })
  assert.equal(foreground.status, 'completed')
  assert.match(foreground.output, /42/)
} finally { fs.rmSync(temp, { recursive: true, force: true }) }

const webProjection = projection.projectContextSourceToolResultForPersistence('web_fetch', { finalUrl: 'https://example.com/doc', title: 'Doc', text: 'WEB_BODY_SENTINEL', contentChecksum: 'abc' })
assert.equal(webProjection.contentStored, false)
assert.equal(JSON.stringify(webProjection).includes('WEB_BODY_SENTINEL'), false)

const servers = code.listLanguageServers()
assert.equal(servers.find(item => item.id === 'typescript')?.status, 'available')
assert.ok(['pyright', 'gopls', 'rust-analyzer', 'jdtls', 'clangd'].every(id => servers.some(item => item.id === id)))
const semanticFixture = code.runTypeScriptLanguageServiceFixtureSelfTest()
assert.equal(semanticFixture.success, true)

const workspaceSource = fs.readFileSync(path.join(root, 'backend', 'tools', 'workspace-readonly-tools.ts'), 'utf8')
for (const name of ['workspace_symbols', 'document_symbols', 'find_implementations', 'find_type_definition', 'find_incoming_calls', 'find_outgoing_calls', 'read_code_diagnostics', 'inspect_notebook', 'web_fetch']) assert.match(workspaceSource, new RegExp(`name: ["']${name}["']`))
const notebookMcpSource = fs.readFileSync(path.join(root, 'backend', 'integrations', 'notebook-workspace-mcp.ts'), 'utf8')
assert.match(notebookMcpSource, /work_item_id/)
assert.match(notebookMcpSource, /lease_id/)
assert.match(notebookMcpSource, /recordEvidence/)

console.log(JSON.stringify({ success: true, providers: ['anthropic', 'openai', 'gemini'], languageServers: servers.length, semanticFixture, externalLspJsonRpc: true, workspaceContractV3: true, workspaceEditTaskBound: true, taskBoundCommand: true, toolSearch: ranked[0].reasons, contentStored: false }, null, 2))
