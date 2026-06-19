#!/usr/bin/env node
const assert = require("assert");
const { runCollaborationProtocolSelfTest } = require("../dist/modules/collaboration.js");
const { runCronDailyDevProtocolSelfTest } = require("../dist/modules/cron.js");
const { defaultOrchestratorConfig, runCoordinatorProtocolSelfTest } = require("../dist/modules/group-orchestrator.js");

const result = runCoordinatorProtocolSelfTest();
const defaultConfig = defaultOrchestratorConfig();
const cronResult = runCronDailyDevProtocolSelfTest();
const collaborationResult = runCollaborationProtocolSelfTest();

assert.ok(result.pass, "Coordinator 协议自测未通过");
assert.strictEqual(defaultConfig.fallbackToRules, true, "规则主 Agent 降级默认应开启");
assert.ok(cronResult.pass, "定时 daily_dev 协议自测未通过");
assert.ok(collaborationResult.pass, "协作闭环协议自测未通过");

console.log(JSON.stringify({
  ok: true,
  defaultFallbackToRules: defaultConfig.fallbackToRules,
  cronDailyDevProtocol: cronResult,
  collaborationProtocol: collaborationResult,
  assignments: result.assignments,
  phases: result.coordinationPlan?.phases || [],
  llmDocumentGuardPass: result.llmDocumentGuardPass,
  shortDocBackendFirstPass: result.shortDocBackendFirstPass,
  shortDocExecutionOrder: result.shortDocExecutionOrder,
  documentFindings: result.documentFindings || [],
}, null, 2));
