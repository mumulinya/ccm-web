#!/usr/bin/env node
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { decideConversationMessageRoute } = require(path.join(process.cwd(), 'ccm-package', 'dist', 'agents', 'conversation-message-routing.js'))
const candidate = { id: 'task-parity', title: '统一导出能力', status: 'interrupted', target_project: 'api', execution_attempt: 2 }
const workflowDecision = {
  actionRequired: true,
  requiresCodeChanges: true,
  continuationKind: 'supplement',
  confidence: 0.9,
  targetRefs: [{ scope: 'project', scopeId: 'api' }],
}

const scopes = ['global', 'group', 'project', 'feishu']
const routes = scopes.map(scope => decideConversationMessageRoute({ workflowDecision, candidates: [candidate], exactSessionId: 'same-session', scope }))
for (const route of routes) {
  assert.equal(route.routeKind, 'resume_existing_task')
  assert.equal(route.candidateTaskId, candidate.id)
  assert.equal(route.confidenceBand, 'high')
  assert.deepEqual(route.candidateTaskIds, [candidate.id])
}
assert.deepEqual(routes.map(route => route.routeKind), scopes.map(() => 'resume_existing_task'))
console.log(JSON.stringify({ pass: true, scopes, routeKind: 'resume_existing_task' }, null, 2))
