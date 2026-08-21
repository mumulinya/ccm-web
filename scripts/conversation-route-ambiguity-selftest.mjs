#!/usr/bin/env node
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { decideConversationMessageRoute } = require(path.join(process.cwd(), 'ccm-package', 'dist', 'agents', 'conversation-message-routing.js'))
const decision = confidence => ({
  actionRequired: true,
  requiresCodeChanges: true,
  continuationKind: 'supplement',
  confidence,
  targetRefs: [{ scope: 'project', scopeId: 'web' }],
})
const task = id => ({ id, title: id, status: 'in_progress', target_project: 'web' })

assert.equal(decideConversationMessageRoute({ workflowDecision: decision(0.99), candidates: [] }).routeKind, 'needs_user')
assert.equal(decideConversationMessageRoute({ workflowDecision: decision(0.8), candidates: [task('one')] }).routeKind, 'needs_user')
const multiple = decideConversationMessageRoute({ workflowDecision: decision(0.99), candidates: [task('one'), task('two')] })
assert.equal(multiple.routeKind, 'needs_user')
assert.deepEqual(multiple.candidateTaskIds, ['one', 'two'])
const answer = decideConversationMessageRoute({ workflowDecision: { ...decision(0.99), actionRequired: false, requiresCodeChanges: false }, candidates: [task('one')] })
assert.equal(answer.routeKind, 'answer_only')
console.log(JSON.stringify({ pass: true, checks: 4 }, null, 2))
