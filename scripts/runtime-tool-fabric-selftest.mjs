#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runAgentRuntimeSessionSelfTest } = require("../ccm-package/dist/agents/runtime.js");
const { runMarketplaceSelfTest } = require("../ccm-package/dist/modules/tools/marketplace.js");
const { runRuntimeToolSyncSelfTest } = require("../ccm-package/dist/tools/runtime-tool-sync.js");
const { runToolAuthorizationSelfTest } = require("../ccm-package/dist/tools/tool-authorization.js");
const { runToolCallLoopSelfTest } = require("../ccm-package/dist/tools/tool-call-loop.js");
const { runToolManagerRuntimeSelfTest } = require("../ccm-package/dist/tools/tool-manager.js");
const { runAgentRunnerSelfTest } = require("../ccm-package/dist/agents/runner.js");
const { runToolChainVerificationSelfTest } = require("../ccm-package/dist/modules/tools/tools.js");

const results = {
  agentRuntime: runAgentRuntimeSessionSelfTest(),
  agentRunner: runAgentRunnerSelfTest(),
  runtimeSync: runRuntimeToolSyncSelfTest(),
  toolAuthorization: runToolAuthorizationSelfTest(),
  toolManager: await runToolManagerRuntimeSelfTest(),
  toolLoop: await runToolCallLoopSelfTest(),
  marketplace: await runMarketplaceSelfTest(),
  toolChainVerification: runToolChainVerificationSelfTest(),
};

for (const [name, result] of Object.entries(results)) {
  assert.equal(result?.pass, true, `${name} self-test failed`);
}

console.log(JSON.stringify({
  ok: true,
  checks: Object.fromEntries(Object.entries(results).map(([name, result]) => [name, result.checks])),
}, null, 2));
