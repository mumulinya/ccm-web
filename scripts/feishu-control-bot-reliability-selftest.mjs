import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterFile = path.join(root, "ccm-package", "dist", "integrations", "control-bot-acp.js");
const runtimeConfigFile = path.join(root, "ccm-package", "dist", "integrations", "cc-connect-feishu-runtime-config.js");
const adapterSource = fs.readFileSync(path.join(root, "backend", "integrations", "control-bot-acp.ts"), "utf8");
const projectSource = fs.readFileSync(path.join(root, "backend", "modules", "projects", "projects.ts"), "utf8");
const channelSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "feishu-channel.ts"), "utf8");
const routesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "feishu-routes.ts"), "utf8");
const globalApiSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent-api.ts"), "utf8");
const projectSessionsSource = fs.readFileSync(path.join(root, "backend", "modules", "projects", "sessions.ts"), "utf8");
const reactionFeedbackSource = fs.readFileSync(path.join(root, "backend", "integrations", "feishu-reaction-feedback.ts"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "ccm-package", "package.json"), "utf8"));

assert.ok(adapterSource.includes("CCM_CONTROL_BOT_REQUEST_TIMEOUT_MS"), "ACP request timeout must be configurable");
assert.ok(adapterSource.includes("requestFailureReply"), "ACP timeout must produce a user-visible fallback reply");
assert.ok(adapterSource.includes("loadSession: true"), "ACP must advertise the session/load support it implements");
assert.ok(projectSource.includes('language = "zh"\\nidle_timeout_mins = 4\\nmax_turn_time_mins = 4\\n\\n[[projects]]'), "global cc-connect turn guards must be written at the TOML root");
assert.ok(projectSource.includes("reset_on_idle_mins = 0"), "CCM ACP channels must not expose cc-connect idle rotation as a user-visible reply");
assert.ok(projectSource.includes('require.resolve("cc-connect/run.js")'), "installed CCM must prefer its bundled cc-connect runtime");
assert.equal(packageJson.dependencies?.["cc-connect"], "^1.4.1", "published CCM must install a compatible cc-connect runtime");
assert.ok(projectSource.includes("managedChannelProcessIsCurrent"), "control bot startup must verify build/config identity rather than trusting a live PID");
assert.ok(projectSource.includes("const stopped = stopControlBotConnection()") && projectSource.includes("已拒绝启动重复飞书通道"), "a stale control bot must be ownership-checked and recycled before rebinding");
assert.ok(channelSource.includes("socket.endpoint_current") && channelSource.includes("socket.turn_stalled"), "health must reject stale endpoints and stalled turns");
assert.ok(channelSource.includes("engineStarted.at"), "stalled-turn detection must ignore unfinished turns from an older bot process");
assert.ok(routesSource.includes("req.socket?.localPort"), "health routes must evaluate the current server endpoint");
assert.ok(adapterSource.includes("acpSessionId: sessionId"), "global ACP calls must carry their real ACP session identity");
assert.ok(globalApiSource.includes("resolveControlBotAcpPlatformContext"), "global ACP sessions must resolve the Feishu user identity from cc-connect state");
assert.ok(globalApiSource.includes("platform_message_id: threadId"), "global ACP identity must expose the exact Feishu root message id");
assert.ok(projectSessionsSource.includes("latest_message_id: threadId"), "project ACP targets must expose the exact Feishu root message id");
assert.ok(globalApiSource.includes("beginFeishuReactionFeedback") && globalApiSource.includes('finishReaction("completed")'), "global Agent feedback must start after ACP resolution and finish after processing");
assert.ok(adapterSource.includes('postFeishuReactionFeedback("start"') && adapterSource.includes('postFeishuReactionFeedback("finish"'), "project ACP must use non-blocking CCM reaction feedback");
assert.ok(reactionFeedbackSource.includes("AbortSignal.timeout(timeoutMs)"), "Feishu reaction API calls must have a hard timeout");
assert.ok(reactionFeedbackSource.includes("仅允许签名飞书 ACP 调用"), "reaction feedback API must require signed ACP identity");
assert.ok(adapterSource.includes("buildInternalApiHeaders"), "ACP calls must use the signed internal API identity");
assert.ok(adapterSource.includes("prompt received mode="), "ACP must log when a prompt crosses the cc-connect boundary");
assert.ok(adapterSource.includes("completeTurnWithText"), "ACP must complete every prompt with one visible terminal reply");
assert.ok(adapterSource.includes("writeBatchAsync"), "ACP text and end_turn must use one ordered pipe write");
assert.ok(adapterSource.includes("agent_thinking_chunk"), "ACP must keep a long-running turn alive without emitting a visible answer chunk");
assert.ok(adapterSource.includes("enqueueOutput"), "all ACP stdout frames must share one serialized writer");
assert.ok(projectSource.includes("const command = process.execPath"), "cc-connect must launch the Node ACP directly without a second Windows line proxy");
assert.ok(projectSource.includes("disableBlockingFeishuReaction(runtimeContent)"), "existing project configs must disable blocking reactions in private runtime copies");
assert.ok((projectSource.match(/reaction_emoji = "none"/g) || []).length >= 3, "global, project create, and project update configs must disable Feishu reactions");

const { disableBlockingFeishuReaction, disableVisibleCcConnectIdleRotation } = await import(pathToFileURL(runtimeConfigFile).href);
const { applyCcConnectTurnGuards } = await import(pathToFileURL(path.join(root, "ccm-package", "dist", "modules", "projects", "projects.js")).href);
const guardedConfig = applyCcConnectTurnGuards(`language = "zh"\n\n[[projects]]\nname = "demo"\nidle_timeout_mins = 12\nmax_turn_time_mins = 12\nreset_on_idle_mins = 30\n\n[projects.agent]\ntype = "acp"\n`, { idleTimeoutMins: 4, maxTurnTimeMins: 4, resetOnIdleMins: 0 });
assert.match(guardedConfig, /^language = "zh"\n\nidle_timeout_mins = 4\nmax_turn_time_mins = 4\n\n\[\[projects\]\]/);
assert.match(guardedConfig, /\[\[projects\]\]\nreset_on_idle_mins = 0\nname = "demo"/);
assert.equal((guardedConfig.match(/idle_timeout_mins/g) || []).length, 1);
assert.equal((guardedConfig.match(/max_turn_time_mins/g) || []).length, 1);
const savedProjectConfig = `[[projects]]\nname = "demo"\n\n[[projects.platforms]]\ntype = "feishu"\n\n[projects.platforms.options]\nreaction_emoji = "OnIt"\nprogress_style = "card"\n\n[[projects.platforms]]\ntype = "slack"\n\n[projects.platforms.options]\nreaction_emoji = "eyes"\n`;
const privateRuntimeConfig = disableBlockingFeishuReaction(savedProjectConfig);
assert.match(privateRuntimeConfig, /type = "feishu"[\s\S]*?reaction_emoji = "none"/);
assert.match(privateRuntimeConfig, /type = "slack"[\s\S]*?reaction_emoji = "eyes"/);
assert.equal(savedProjectConfig.includes('reaction_emoji = "OnIt"'), true, "saved user config must remain unchanged");
assert.equal(disableBlockingFeishuReaction(privateRuntimeConfig), privateRuntimeConfig, "reaction guard must be idempotent");
const insertedReaction = disableBlockingFeishuReaction(`[[projects]]\nname = "demo"\n\n[[projects.platforms]]\ntype = "lark"\n\n[projects.platforms.options]\nprogress_style = "compact"\n`);
assert.match(insertedReaction, /progress_style = "compact"\nreaction_emoji = "none"/);
const visibleIdleRotation = `[[projects]]\nname = "demo"\nreset_on_idle_mins = 30\n\n[projects.agent]\ntype = "acp"\n`;
const silentIdleRuntime = disableVisibleCcConnectIdleRotation(visibleIdleRotation);
assert.match(silentIdleRuntime, /reset_on_idle_mins = 0/);
assert.doesNotMatch(silentIdleRuntime, /reset_on_idle_mins = 30/);
assert.match(visibleIdleRotation, /reset_on_idle_mins = 30/, "saved user config must remain unchanged");

let successfulRequests = 0;
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    let payload = {};
    try { payload = JSON.parse(body || "{}"); } catch {}
    if (payload.text !== "模拟卡死") {
      successfulRequests += 1;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, reply: `连续回复 ${successfulRequests}` }));
      return;
    }
    // Resolve fetch() immediately, then keep response.json() pending. The timeout
    // must cover the complete response body rather than only the response headers.
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write('{"success":true,"reply":"partial');
  });
});
const sockets = new Set();
server.on("connection", socket => {
  sockets.add(socket);
  socket.once("close", () => sockets.delete(socket));
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const port = server.address().port;
const child = spawn(process.execPath, [adapterFile, `--port=${port}`], {
  cwd: root,
  env: {
    ...process.env,
    CCM_CONTROL_BOT_REQUEST_TIMEOUT_MS: "1000",
    CCM_BOT_HEARTBEAT_DELAY_MS: "150",
    CCM_BOT_HEARTBEAT_INTERVAL_MS: "150",
  },
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});
const messages = [];
let stderr = "";
readline.createInterface({ input: child.stdout }).on("line", line => {
  try { messages.push(JSON.parse(line)); } catch {}
});
child.stderr.on("data", chunk => { stderr += chunk.toString(); });

function send(value) {
  child.stdin.write(`${JSON.stringify(value)}\n`);
}

async function waitFor(predicate, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const match = messages.find(predicate);
    if (match) return match;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`等待 ACP 输出超时：${JSON.stringify(messages)} stderr=${stderr}`);
}

try {
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: 1 } });
  await waitFor(message => message.id === 1 && message.result);
  send({ jsonrpc: "2.0", id: 10, method: "session/prompt", params: { sessionId: "continuity-session", prompt: [{ type: "text", text: "第一条" }] } });
  await waitFor(message => message.method === "session/update" && message.params?.sessionId === "continuity-session" && message.params?.update?.content?.text === "连续回复 1");
  await waitFor(message => message.id === 10 && message.result?.stopReason === "end_turn");
  send({ jsonrpc: "2.0", id: 11, method: "session/prompt", params: { sessionId: "continuity-session", prompt: [{ type: "text", text: "第二条" }] } });
  await waitFor(message => message.method === "session/update" && message.params?.sessionId === "continuity-session" && message.params?.update?.content?.text === "连续回复 2");
  await waitFor(message => message.id === 11 && message.result?.stopReason === "end_turn");
  assert.equal(successfulRequests, 2, "the same ACP session must accept a second turn after the first completes");

  const started = Date.now();
  send({
    jsonrpc: "2.0",
    id: 2,
    method: "session/prompt",
    params: { sessionId: "stalled-session", prompt: [{ type: "text", text: "模拟卡死" }] },
  });
  const heartbeat = await waitFor(message => message.method === "session/update"
    && message.params?.sessionId === "stalled-session"
    && message.params?.update?.sessionUpdate === "agent_thinking_chunk");
  const fallback = await waitFor(message => message.method === "session/update" && /超过 1 秒/.test(message.params?.update?.content?.text || ""));
  const completed = await waitFor(message => message.id === 2 && message.result?.stopReason === "end_turn");
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 900 && elapsed < 4500, `stalled request should settle near the configured timeout, elapsed=${elapsed}`);
  assert.equal(fallback.params.sessionId, "stalled-session");
  assert.equal(heartbeat.params.update.content.text, "...");
  assert.equal(completed.error, undefined);
  const terminalIndex = messages.indexOf(completed);
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.equal(messages.slice(terminalIndex + 1).some(message => message.params?.sessionId === "stalled-session" && message.params?.update?.sessionUpdate === "agent_thinking_chunk"), false, "heartbeats must stop before the terminal result");
  assert.match(stderr, /request failed/i);
  console.log(JSON.stringify({
    pass: true,
    checks: {
      stale_port_rebind_guard: true,
      top_level_turn_guards: true,
      build_fingerprint_rebind_guard: true,
      endpoint_aware_health: true,
      stalled_turn_health: true,
      restart_boundary_health: true,
      bounded_acp_request: true,
      friendly_timeout_reply: true,
      clean_end_turn_after_timeout: true,
      ordered_text_and_terminal_frame: true,
      serialized_stdout_frames: true,
      same_session_second_turn: true,
      invisible_turn_heartbeat: true,
      heartbeat_stops_before_terminal: true,
      pending_response_body_is_bounded: true,
      global_acp_identity_is_hydrated: true,
      pre_acp_reaction_is_disabled: true,
      existing_project_config_is_normalized_privately: true,
      acp_prompt_boundary_is_diagnosable: true,
      idle_rotation_notice_is_suppressed: true,
    },
    timeout_elapsed_ms: elapsed,
  }, null, 2));
} finally {
  child.kill();
  for (const socket of sockets) socket.destroy();
  await new Promise(resolve => server.close(resolve));
}
