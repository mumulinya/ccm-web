import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const load = (...segments) => import(pathToFileURL(path.join(root, 'ccm-package', 'dist', ...segments)).href)
const code = await load('system', 'code-intelligence.js')

const fixture = code.runTypeScriptLanguageServiceFixtureSelfTest()
assert.equal(fixture.success, true)

const apiSource = fs.readFileSync(path.join(root, 'backend', 'system', 'code-intelligence-api.ts'), 'utf8')
for (const route of [
  '/api/code-intelligence/query',
  '/source',
  '/index-runs',
  '/repair',
  '/files',
]) assert.ok(apiSource.includes(route), `missing code intelligence route ${route}`)
assert.match(apiSource, /recordEvidence/)
assert.match(apiSource, /contentStored:\s*false/)

const engineSource = fs.readFileSync(path.join(root, 'backend', 'system', 'code-intelligence.ts'), 'utf8')
for (const operation of ['workspace_symbols','document_symbols','find_definition','find_references','find_implementations','find_type_definition','find_incoming_calls','find_outgoing_calls','read_code_diagnostics']) assert.ok(engineSource.includes(operation), `missing ${operation}`)
for (const language of ['vue','python','go','rust','java','kotlin','cpp','csharp','php','ruby','lua','html','css','json']) assert.ok(engineSource.includes(`"${language}"`), `missing language ${language}`)
assert.match(engineSource, /Number\(args\?\.line\)\s*>\s*0/)
assert.match(engineSource, /Cache-Control|source-preview-v1/)
assert.doesNotMatch(engineSource, /grep.*definition/i, 'semantic definition must not be faked with grep')

const uiSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'tools', 'CodeIntelligence.vue'), 'utf8')
for (const label of ['代码智能工作台','工作区符号','查找定义','查找引用','查找实现','类型定义','调用者','被调用者','代码诊断','源码定位','交给项目 Agent','交给群聊 Agent','打开代码改动页']) assert.ok(uiSource.includes(label), `missing UI capability ${label}`)
assert.match(uiSource, /ccm:code-intelligence:query-history:v1/)
assert.match(uiSource, /JSON\.stringify\(\{ schema: 'ccm-code-intelligence-export-v1'/)
assert.match(uiSource, /draftMessage/)
assert.doesNotMatch(uiSource, /自动创建.*任务/)

const appSource = fs.readFileSync(path.join(root, 'frontend', 'src', 'App.vue'), 'utf8')
assert.match(appSource, /handleCodeIntelligenceNavigate/)
assert.match(appSource, /ccm-code-changes-target/)

console.log(JSON.stringify({ success: true, semanticFixture: fixture, queryOperations: 9, sourceStored: false, agentHandoff: 'draft-only' }, null, 2))
