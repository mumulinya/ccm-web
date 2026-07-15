import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterFile = path.join(root, "ccm-package", "dist", "integrations", "control-bot-acp.js");
const adapterSource = fs.readFileSync(path.join(root, "backend", "integrations", "control-bot-acp.ts"), "utf8");
const projectSource = fs.readFileSync(path.join(root, "backend", "modules", "projects", "projects.ts"), "utf8");
const channelSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "feishu-channel.ts"), "utf8");
const routesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "feishu-routes.ts"), "utf8");

assert.ok(adapterSource.includes("CCM_CONTROL_BOT_REQUEST_TIMEOUT_MS"), "ACP request timeout must be configurable");
assert.ok(adapterSource.includes("requestFailureReply"), "ACP timeout must produce a user-visible fallback reply");
assert.ok(projectSource.includes("existingPort === requestedPort"), "control bot startup must compare the configured target port");
assert.ok(projectSource.includes("if (existing) stopControlBotConnection()"), "a stale control bot must be recycled before rebinding");
assert.ok(channelSource.includes("socket.endpoint_current") && channelSource.includes("socket.turn_stalled"), "health must reject stale endpoints and stalled turns");
assert.ok(channelSource.includes("engineStarted.at"), "stalled-turn detection must ignore unfinished turns from an older bot process");
assert.ok(routesSource.includes("req.socket?.localPort"), "health routes must evaluate the current server endpoint");

const server = http.createServer((req, res) => {
  req.resume();
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
  env: { ...process.env, CCM_CONTROL_BOT_REQUEST_TIMEOUT_MS: "1000" },
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
  const started = Date.now();
  send({
    jsonrpc: "2.0",
    id: 2,
    method: "session/prompt",
    params: { sessionId: "stalled-session", prompt: [{ type: "text", text: "模拟卡死" }] },
  });
  const fallback = await waitFor(message => message.method === "session/update" && /超过 1 秒/.test(message.params?.update?.content?.text || ""));
  const completed = await waitFor(message => message.id === 2 && message.result?.stopReason === "end_turn");
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 900 && elapsed < 4500, `stalled request should settle near the configured timeout, elapsed=${elapsed}`);
  assert.equal(fallback.params.sessionId, "stalled-session");
  assert.equal(completed.error, undefined);
  assert.match(stderr, /request failed/i);
  console.log(JSON.stringify({
    pass: true,
    checks: {
      stale_port_rebind_guard: true,
      endpoint_aware_health: true,
      stalled_turn_health: true,
      restart_boundary_health: true,
      bounded_acp_request: true,
      friendly_timeout_reply: true,
      clean_end_turn_after_timeout: true,
    },
    timeout_elapsed_ms: elapsed,
  }, null, 2));
} finally {
  child.kill();
  for (const socket of sockets) socket.destroy();
  await new Promise(resolve => server.close(resolve));
}
