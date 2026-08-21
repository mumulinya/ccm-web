#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = process.cwd()
const require = createRequire(import.meta.url)
const { decideConversationMessageRoute } = require(path.join(root, 'ccm-package', 'dist', 'agents', 'conversation-message-routing.js'))
const completed = { id: 'task-completed', title: '已交付登录功能', status: 'done', acceptance_state: 'accepted', target_project: 'web', work_items: [{ id: 'done', status: 'completed' }] }
const base = { actionRequired: true, requiresCodeChanges: true, confidence: 0.93, targetRefs: [{ scope: 'project', scopeId: 'web' }] }

const vague = decideConversationMessageRoute({ workflowDecision: { ...base, continuationKind: 'supplement' }, candidates: [completed] })
assert.equal(vague.routeKind, 'needs_user')
const rework = decideConversationMessageRoute({ workflowDecision: { ...base, continuationKind: 'revise_goal' }, candidates: [completed] })
assert.equal(rework.routeKind, 'revise_existing_task')
assert.equal(rework.candidateTaskId, completed.id)

const continuationSource = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-runtime-runtime-tools.ts'), 'utf8')
assert.match(continuationSource, /completedBeforeContinuation[\s\S]*execution_attempt:[\s\S]*\+ 1/)
assert.match(continuationSource, /const continuationRouteKind =[\s\S]*revise_existing_task/)
assert.match(continuationSource, /continuation_route_kind: continuationRouteKind/)
console.log(JSON.stringify({ pass: true, vague: vague.routeKind, rework: rework.routeKind }, null, 2))
