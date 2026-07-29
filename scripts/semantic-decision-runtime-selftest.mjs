#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Module, { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const dist = process.env.CCM_BACKEND_DIST_DIR || path.join(root, 'ccm-package', 'dist')
process.env.NODE_PATH = [path.join(root, 'node_modules'), process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter)
Module._initPaths()
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-semantic-decision-'))
process.env.CCM_SEMANTIC_DECISION_DIR = path.join(temp, 'receipts')
const require = createRequire(import.meta.url)
const runtime = require(path.join(dist, 'system', 'semantic-decision-runtime.js'))

try {
  const contract = runtime.runSemanticDecisionRuntimeSelfTest()
  assert.equal(contract.pass, true)

  const config = {
    enabled: true,
    apiUrl: 'https://mock.invalid/v1',
    apiKey: 'mock-only',
    model: 'semantic-mock',
    format: 'openai-compatible',
    timeoutMs: 120000,
  }
  let calls = 0
  const request = {
    kind: 'agent_collaboration_route',
    identity: { scope: 'group', scopeId: 'group-a', sessionId: 'gcs_a', taskId: 'task-a' },
    system: 'mock semantic route',
    input: { question: 'The browser contract and API owner must align', candidates: ['web', 'api'] },
    config,
    modelCall: async () => {
      calls += 1
      await new Promise(resolve => setTimeout(resolve, 20))
      return { action: 'ask_agent', targetProject: 'api', reason: 'The API project owns the contract', confidence: 0.94 }
    },
    validate: value => runtime.normalizeCollaborationRouteDecision(value, ['web', 'api']),
    confidence: value => value.confidence,
  }
  const [first, second] = await Promise.all([
    runtime.runSemanticDecision(request),
    runtime.runSemanticDecision(request),
  ])
  assert.equal(calls, 1)
  assert.equal(first.value.targetProject, 'api')
  assert.equal(first.receipt.checksum, second.receipt.checksum)
  assert.equal(first.receipt.identity.sessionId, 'gcs_a')

  const files = fs.readdirSync(path.join(temp, 'receipts'))
  assert.equal(files.length, 1)
  const persisted = fs.readFileSync(path.join(temp, 'receipts', files[0]), 'utf8')
  assert.equal(persisted.includes('The browser contract'), false)
  assert.equal(persisted.includes('mock-only'), false)

  let invalidRejected = false
  try {
    runtime.normalizeCollaborationRouteDecision({ action: 'ask_agent', targetProject: 'sibling' }, ['web', 'api'])
  } catch {
    invalidRejected = true
  }
  assert.equal(invalidRejected, true)

  let overCapacityModelCalls = 0
  let overCapacityRejected = false
  try {
    await runtime.runSemanticDecision({
      ...request,
      identity: { scope: 'group', scopeId: 'group-a', sessionId: 'gcs_capacity', taskId: 'task-capacity' },
      config: { ...config, format: 'anthropic-compatible' },
      input: { content: 'capacity '.repeat(220_000) },
      modelCall: async () => {
        overCapacityModelCalls += 1
        return { action: 'ask_user', reason: 'should not run', confidence: 1 }
      },
    })
  } catch (error) {
    overCapacityRejected = error?.code === 'SEMANTIC_DECISION_CONTEXT_OVER_CAPACITY'
  }
  assert.equal(overCapacityRejected, true)
  assert.equal(overCapacityModelCalls, 0)

  console.log(JSON.stringify({
    pass: true,
    paidProviderCalls: 0,
    checks: {
      contract: contract.checks,
      singleflightCalls: calls,
      exactScopeBound: first.receipt.identity.sessionId === 'gcs_a',
      promptAndKeyNotPersisted: !persisted.includes('The browser contract') && !persisted.includes('mock-only'),
      invalidTargetRejected: invalidRejected,
      tokenCapacityFailsClosedBeforeProvider: overCapacityRejected && overCapacityModelCalls === 0,
    },
  }, null, 2))
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
