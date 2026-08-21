#!/usr/bin/env node
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const routing = require(path.join(process.cwd(), 'ccm-package', 'dist', 'agents', 'conversation-message-routing.js'))

const candidate = {
  id: 'task-active-v2',
  title: '添加登录功能',
  status: 'in_progress',
  target_project: 'web',
  exact_session_id: 'session-v2',
  execution_attempt: 1,
}
const decision = {
  actionRequired: true,
  requiresCodeChanges: true,
  continuationKind: 'supplement',
  confidence: 0.91,
  targetRefs: [{ scope: 'project', scopeId: 'web' }],
  reason: '目标与当前任务一致',
}

const route = routing.decideConversationMessageRoute({
  workflowDecision: decision,
  candidates: [candidate],
  exactSessionId: 'session-v2',
  scope: 'project',
})
assert.equal(route.routeKind, 'continue_current_session')
assert.equal(route.source, 'model')
assert.equal(route.candidateTaskId, candidate.id)
assert.equal(route.confidenceBand, 'high')
assert.equal(route.contentStored, false)

const workflowDecision = { ...decision }
routing.bindConversationRouteToWorkflowDecision(workflowDecision, route, candidate, 'session_anchor')
assert.equal(workflowDecision.continuationTaskId, candidate.id)
assert.equal(workflowDecision.conversationRouteKind, 'continue_current_session')
assert.equal(workflowDecision.conversationRouteBinding.contentStored, false)

const selftest = routing.runConversationMessageRoutingSelfTest()
assert.equal(selftest.pass, true, JSON.stringify(selftest.checks))
console.log(JSON.stringify({ pass: true, routeKind: route.routeKind, checks: selftest.checks }, null, 2))
