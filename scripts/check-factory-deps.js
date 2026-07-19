/**
 * Scan create*(deps) factories vs object-literal call sites for missing keys.
 * Catches regressions like hasExplicitGlobalWriteAuthorization not passed into createGlobalAgentAgenticRuntime.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = [
  {
    factoryFile: "backend/modules/global/global-agent-agentic-runtime.ts",
    factoryName: "createGlobalAgentAgenticRuntime",
    callFile: "backend/modules/global/global-agent.ts",
  },
  {
    factoryFile: "backend/modules/global/global-agent-api.ts",
    factoryName: "createGlobalAgentApi",
    callFile: "backend/modules/global/global-agent.ts",
  },
  {
    factoryFile: "backend/modules/global/global-agent-status.ts",
    factoryName: "createGlobalAgentStatusRuntime",
    callFile: "backend/modules/global/global-agent.ts",
  },
  {
    factoryFile: "backend/modules/global/global-agent-feishu-channel.ts",
    factoryName: "createGlobalAgentFeishuChannel",
    callFile: "backend/modules/global/global-agent.ts",
  },
  {
    factoryFile: "backend/modules/global/global-agent-feishu-actions.ts",
    factoryName: "createGlobalAgentFeishuActions",
    callFile: "backend/modules/global/global-agent.ts",
  },
  {
    factoryFile: "backend/modules/global/global-agent-direct-dispatch.ts",
    factoryName: "createGlobalAgentDirectDispatchRuntime",
    callFile: "backend/modules/global/global-agent.ts",
  },
  {
    factoryFile: "backend/modules/global/global-agent-test-agent-relay.ts",
    factoryName: "createGlobalAgentTestAgentRelay",
    callFile: "backend/modules/global/global-agent.ts",
  },
  {
    factoryFile: "backend/modules/global/global-agent-history.ts",
    factoryName: "createGlobalAgentHistoryRuntime",
    callFile: "backend/modules/global/global-agent.ts",
  },
  {
    factoryFile: "backend/server-pet-activity.ts",
    factoryName: "createPetActivityRuntime",
    callFile: "backend/server.ts",
  },
  {
    factoryFile: "backend/server-agent-runner.ts",
    factoryName: "createAgentRunnerRuntime",
    callFile: "backend/server.ts",
  },
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function extractDestructureNames(source, factoryName) {
  const start = source.indexOf(`export function ${factoryName}(deps`);
  if (start < 0) return null;
  // Prefer the destructure that binds directly from `deps` (not createXSupport(deps)).
  const window = source.slice(start, start + 20000);
  // Disallow nested `{` so we don't swallow createXSupport(deps) + deps into one match.
  const matches = [...window.matchAll(/const\s*\{([^{}]*)\}\s*=\s*deps\b/g)];
  if (!matches.length) return null;
  const body = matches[matches.length - 1][1];
  return body
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(/\s+as\s+/)[0].trim())
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
}

function extractCallKeys(source, factoryName) {
  const callRe = new RegExp(`${factoryName}\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\)`, "m");
  const m = source.match(callRe);
  if (!m) return null;
  const body = m[1];
  const keys = new Set();
  // shorthand or key: value
  const keyRe = /(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?::|,|\}|\n)/g;
  let match;
  while ((match = keyRe.exec(body))) {
    keys.add(match[1]);
  }
  // also catch lines that are just identifiers
  for (const line of body.split(/\r?\n/)) {
    const id = line.trim().replace(/,$/, "");
    if (/^[A-Za-z_$][\w$]*$/.test(id)) keys.add(id);
  }
  return [...keys];
}

let failures = 0;
for (const target of targets) {
  const factorySrc = read(target.factoryFile);
  const callSrc = read(target.callFile);
  const needed = extractDestructureNames(factorySrc, target.factoryName);
  const provided = extractCallKeys(callSrc, target.factoryName);
  if (!needed) {
    console.warn(`[check-factory-deps] skip ${target.factoryName}: destructure not found`);
    continue;
  }
  if (!provided) {
    console.error(`[check-factory-deps] FAIL ${target.factoryName}: call site not found in ${target.callFile}`);
    failures += 1;
    continue;
  }
  const providedSet = new Set(provided);
  const missing = needed.filter((name) => !providedSet.has(name));
  if (missing.length) {
    console.error(
      `[check-factory-deps] FAIL ${target.factoryName}: missing deps → ${missing.join(", ")}`
    );
    failures += 1;
  } else {
    console.log(
      `[check-factory-deps] ok ${target.factoryName} (${needed.length}/${needed.length})`
    );
  }
}

if (failures) {
  console.error(`[check-factory-deps] ${failures} failure(s)`);
  process.exit(1);
}
console.log("[check-factory-deps] all passed");
