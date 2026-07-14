#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runAgentRuntimeSessionSelfTest } = require("../ccm-package/dist/agents/runtime.js");
const { runMarketplaceSelfTest } = require("../ccm-package/dist/modules/tools/marketplace.js");
const { runRuntimeToolSyncSelfTest } = require("../ccm-package/dist/tools/runtime-tool-sync.js");
const { runRuntimeToolRealCliMatrixSelfTest } = require("../ccm-package/dist/tools/runtime-tool-real-cli-matrix.js");
const { runToolAuthorizationSelfTest } = require("../ccm-package/dist/tools/tool-authorization.js");
const { runToolCallLoopSelfTest } = require("../ccm-package/dist/tools/tool-call-loop.js");
const { runToolManagerRuntimeSelfTest } = require("../ccm-package/dist/tools/tool-manager.js");
const { runAgentRunnerSelfTest } = require("../ccm-package/dist/agents/runner.js");
const { runToolChainVerificationSelfTest } = require("../ccm-package/dist/modules/tools/tools.js");
const projectManagerSource = fs.readFileSync(new URL("../frontend/src/components/projects/ProjectManager.vue", import.meta.url), "utf-8");
const projectToolsModalSource = fs.readFileSync(new URL("../frontend/src/components/projects/ProjectToolsModal.vue", import.meta.url), "utf-8");
const toolsConfigSource = fs.readFileSync(new URL("../frontend/src/components/tools/ToolsConfig.vue", import.meta.url), "utf-8");
const appSource = fs.readFileSync(new URL("../frontend/src/App.vue", import.meta.url), "utf-8");
const projectToolUiChecks = {
  projectResponsibilityStateDeclared: /const projectResponsibility = ref\(''\)/.test(projectManagerSource),
  projectCapabilitiesStateDeclared: /const projectCapabilities = ref\(''\)/.test(projectManagerSource),
  projectWritablePathsStateDeclared: /const projectWritablePaths = ref\(''\)/.test(projectManagerSource),
  projectForbiddenPathsStateDeclared: /const projectForbiddenPaths = ref\(''\)/.test(projectManagerSource),
  projectDeliveryContractStateDeclared: /const projectDeliveryContract = ref\(''\)/.test(projectManagerSource),
  projectToolOverlayAboveMobileNavigation: /\.modal-overlay\s*\{[\s\S]*?z-index:\s*10001\s*!important;[\s\S]*?\}/.test(projectToolsModalSource),
  incompleteScopeActionNavigatesToBusinessSurface: /action\?\.kind === 'open_scope_real_task'[\s\S]*?emit\('navigate', \{ tab: 'groups', groupId: scopeId \}\)[\s\S]*?emit\('navigate', \{ tab: 'projects', project: scopeId \}\)/.test(toolsConfigSource),
  incompleteScopeActionDoesNotRunGenericMatrix: !/action\?\.kind === 'run_child_agent_e2e'[\s\S]*?runRealCliMatrix\(\)/.test(toolsConfigSource),
  toolsNavigationUsesWorkspaceRouter: /<ToolsConfig @navigate="applyPetNavigationTarget" \/>/.test(appSource),
};

const results = {
  agentRuntime: runAgentRuntimeSessionSelfTest(),
  agentRunner: runAgentRunnerSelfTest(),
  runtimeSync: runRuntimeToolSyncSelfTest(),
  runtimeRealCliMatrix: runRuntimeToolRealCliMatrixSelfTest(),
  toolAuthorization: runToolAuthorizationSelfTest(),
  toolManager: await runToolManagerRuntimeSelfTest(),
  toolLoop: await runToolCallLoopSelfTest(),
  marketplace: await runMarketplaceSelfTest(),
  toolChainVerification: runToolChainVerificationSelfTest(),
  projectToolUi: { pass: Object.values(projectToolUiChecks).every(Boolean), checks: projectToolUiChecks },
};

for (const [name, result] of Object.entries(results)) {
  assert.equal(result?.pass, true, `${name} self-test failed`);
}

console.log(JSON.stringify({
  ok: true,
  checks: Object.fromEntries(Object.entries(results).map(([name, result]) => [name, result.checks])),
}, null, 2));
