#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const retry = require(path.join(root, "ccm-package", "dist", "system", "model-call-retry.js"));
const client = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator-llm-client.js"));
const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-compaction-engine-part-01.js"));
const originalFetch = globalThis.fetch;

const config = {
  apiUrl: "https://provider.example/v1",
  apiKey: "selftest-key",
  model: "selftest-model",
};
const callOptions = {
  messages: [{ role: "user", content: "selftest" }],
  retryBaseDelayMs: 0,
  retryTotalTimeoutMs: 10_000,
  timeoutMs: 5_000,
};

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "" },
    async text() { return typeof body === "string" ? body : JSON.stringify(body); },
  };
}

try {
  const utilityResult = await retry.runModelCallRetrySelfTest();
  assert.equal(utilityResult.pass, true, JSON.stringify(utilityResult.checks));

  let transientCalls = 0;
  globalThis.fetch = async () => {
    transientCalls += 1;
    if (transientCalls < 5) return response(503, { error: "temporary unavailable" });
    return response(200, { choices: [{ message: { content: "fifth attempt ok" } }] });
  };
  const transientResult = await client.callOpenAiCompatibleChat(config, callOptions);
  assert.equal(transientResult, "fifth attempt ok");
  assert.equal(transientCalls, 5, "transient HTTP failures must use exactly five attempts");

  let unauthorizedCalls = 0;
  globalThis.fetch = async () => {
    unauthorizedCalls += 1;
    return response(401, { error: "invalid api key" });
  };
  await assert.rejects(() => client.callOpenAiCompatibleChat(config, callOptions), /HTTP 401/);
  assert.equal(unauthorizedCalls, 1, "deterministic authentication failures must not retry");

  let emptyCalls = 0;
  globalThis.fetch = async () => {
    emptyCalls += 1;
    return response(200, { choices: [{ message: { content: emptyCalls < 5 ? "" : "not empty" } }] });
  };
  assert.equal(await client.callOpenAiCompatibleChat(config, callOptions), "not empty");
  assert.equal(emptyCalls, 5, "empty model responses must retry");

  let jsonCalls = 0;
  globalThis.fetch = async () => {
    jsonCalls += 1;
    const content = jsonCalls < 5 ? "not-json" : '{"decision":"ok"}';
    return response(200, { choices: [{ message: { content } }] });
  };
  assert.deepEqual(await client.callOpenAiCompatibleJson(config, callOptions), { decision: "ok" });
  assert.equal(jsonCalls, 5, "invalid model JSON must retry the complete request");

  let exhaustedCalls = 0;
  globalThis.fetch = async () => {
    exhaustedCalls += 1;
    return response(503, { error: "still unavailable" });
  };
  await assert.rejects(
    () => client.callOpenAiCompatibleChat(config, callOptions),
    error => /已完成 5 次尝试/.test(String(error?.message || error)),
  );
  assert.equal(exhaustedCalls, 5);

  let compactionCalls = 0;
  globalThis.fetch = async () => {
    compactionCalls += 1;
    if (compactionCalls < 5) return response(503, { error: "temporary compact outage" });
    return response(200, {
      id: "compact-selftest",
      model: config.model,
      choices: [{ message: { content: '{"version":1,"summary":"compact ok"}' }, finish_reason: "stop" }],
      usage: { prompt_tokens: 20, completion_tokens: 5 },
    });
  };
  const compacted = await compaction.callCompactionModel({ ...config, enabled: true, modelRetryBaseDelayMs: 0 }, "system", "user", 200);
  assert.equal(compacted.summary.summary, "compact ok");
  assert.equal(compactionCalls, 5, "session compaction must share the five-attempt policy");

  let networkCalls = 0;
  await assert.rejects(() => retry.runModelCallWithRetry(async () => {
    networkCalls += 1;
    const error = new Error("connect ECONNREFUSED 127.0.0.1:443");
    error.code = "ECONNREFUSED";
    throw error;
  }, { baseDelayMs: 0, attemptTimeoutMs: 1_000, totalTimeoutMs: 10_000 }), /已完成 5 次尝试/);
  assert.equal(networkCalls, 5);

  const globalSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent-model.ts"), "utf8");
  const groupSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "group-orchestrator-llm.ts"), "utf8");
  const projectSource = fs.readFileSync(path.join(root, "backend", "modules", "projects", "project-main-agent.ts"), "utf8");
  const musicSource = fs.readFileSync(path.join(root, "backend", "modules", "music", "llm-client.ts"), "utf8");
  for (const [scope, source] of Object.entries({ globalSource, groupSource, projectSource, musicSource })) {
    assert.match(source, /call(?:OpenAi|Anthropic)Compatible(?:Chat|Json)/, `${scope} must use the shared retrying model client`);
  }

  console.log(JSON.stringify({
    pass: true,
    checks: {
      transient_http_uses_five_attempts: true,
      authentication_failure_stops_immediately: true,
      empty_response_retries: true,
      invalid_json_retries: true,
      network_failure_uses_five_attempts: true,
      exhausted_error_reports_attempt_count: true,
      session_compaction_uses_five_attempts: true,
      global_group_project_music_share_client: true,
      paid_provider_calls: 0,
    },
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
