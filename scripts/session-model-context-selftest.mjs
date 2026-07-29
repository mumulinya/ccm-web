import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const context = await import("../ccm-package/dist/system/session-model-context.js");
const result = context.runUnifiedSessionModelContextSelfTest();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sources = [
  "backend/agents/global/memory.ts",
  "backend/modules/collaboration/group-session-model-context.ts",
  "backend/modules/projects/project-session-compaction.ts",
].map(file => fs.readFileSync(path.join(root, file), "utf8"));
const projectMain = fs.readFileSync(path.join(root, "backend/modules/projects/project-main-agent.ts"), "utf8");
const wiring = {
  allScopesUseUnifiedProjector: sources.every(source => source.includes("buildUnifiedSessionModelContextProjection")),
  allScopesUseUnifiedMicroCompactPolicy: sources.every(source => source.includes("resolveSessionModelMicroCompactPolicy"))
    && sources.every(source => !/microCompact:\s*\{\s*enabled:\s*true/s.test(source)),
  projectSessionCharacterCutsRemoved: !/cleanText\(input\.context\s*\|\|\s*"",\s*(?:5000|12000|24000)\)/.test(projectMain)
    && !/conversation_context:\s*cleanText\(input\.conversationContext/.test(projectMain),
  projectUsesActualPayloadCapacityGate: projectMain.includes("ensureProjectMainModelCapacity")
    && projectMain.includes("project_main_actual_model_payload")
    && projectMain.includes("payload.totalTokens < threshold"),
};

for (const [name, value] of Object.entries({ ...result.checks, ...wiring })) assert.equal(value, true, name);
console.log(JSON.stringify({ pass: true, checks: Object.keys({ ...result.checks, ...wiring }).length, ...result.checks, ...wiring }, null, 2));
