import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const globalAgent = read('backend/modules/global/global-agent.ts')
const globalLoop = read('backend/agents/global/loop.ts')
const collaboration = read('backend/modules/collaboration/collaboration.ts')
const testAgentRunner = read('backend/modules/collaboration/test-agent-runner.ts')

const checks = {
  globalModuleDoesNotInvokeTestAgentCli:
    !globalAgent.includes('runNativeTestAgentCliHandoff')
    && !globalAgent.includes('runNativeTestAgentCliPlanFromHandoff')
    && !globalLoop.includes('runNativeTestAgentCliHandoff')
    && !globalLoop.includes('runNativeTestAgentCliPlanFromHandoff'),
  globalModuleDoesNotBuildTestAgentHandoff:
    !globalAgent.includes('buildCoordinatorTestAgentHandoff')
    && !globalLoop.includes('buildCoordinatorTestAgentHandoff'),
  directGlobalReviewPathRemoved:
    !collaboration.includes('runDirectProjectIndependentReview')
    && !collaboration.includes('coordinator: "global-agent"')
    && !collaboration.includes('reviewer: "global-agent"'),
  directIndependentReviewFailsClosed:
    collaboration.includes('需要 TestAgent 独立复核的任务必须先交给真实群聊主 Agent'),
  projectTargetsResolveToRealGroups:
    collaboration.includes('candidateGroups = groups.filter')
    && collaboration.includes('validateDailyDevGroupReady(group)')
    && collaboration.includes('requested_target_type: "project"')
    && collaboration.includes('requested_project: config.name'),
  ownershipContractIsPersisted:
    collaboration.includes('ccm-global-group-test-agent-ownership-v1')
    && collaboration.includes('global_agent: "dispatch_and_relay_only"')
    && collaboration.includes('group_main_agent: "plan_dispatch_accept_review_and_summarize"')
    && collaboration.includes('test_agent: "independent_review_after_group_acceptance"'),
  singleProjectToolRequiresGroupOrchestration:
    globalAgent.includes('ccm-global-to-group-supervision-v1')
    && globalAgent.includes('group_orchestration_required: true')
    && globalAgent.includes('global_agent_review_owner: false')
    && globalAgent.includes('test_agent_owner: "group-main-agent"'),
  globalCreateTaskUsesPersistentGroupMission:
    globalAgent.includes('name === "orchestrate_development" || name === "send_project_cmd" || name === "create_task"')
    && globalAgent.includes('source: run.source || "global-agent-create-task"')
    && globalAgent.includes('requires_independent_review: args.requires_independent_review !== false'),
  groupOwnsNativeTestAgentExecution:
    collaboration.includes('runCoordinatorReviewLoop')
    && collaboration.includes('runTestAgentCliJob')
    && collaboration.includes('testAgentInvocationResult.outputValidation?.valid === true')
    && collaboration.includes('testAgentInvocationResult.artifactVerification?.status === "passed"')
    && testAgentRunner.includes('export async function runTestAgentCliJob')
    && testAgentRunner.includes('"--invocation-json"')
    && !globalAgent.includes('runTestAgentCliJob')
    && !globalLoop.includes('runTestAgentCliJob')
    && collaboration.includes('test_agent_native_execution_start')
    && collaboration.includes('test_agent_native_execution_done'),
  globalRelayRemainsReadOnly:
    globalAgent.includes('relayGlobalTestAgentEventFromGroup')
    && globalAgent.includes('test_agent_execution_plan_ready')
    && globalAgent.includes('test_agent_review_ready'),
}

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name)
assert.deepEqual(failed, [], `TestAgent ownership regression: ${failed.join(', ')}`)

console.log(JSON.stringify({ pass: true, checks }, null, 2))
