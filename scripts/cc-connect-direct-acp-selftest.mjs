import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adapterFile = path.join(root, "ccm-package", "dist", "integrations", "control-bot-acp.js");

function findCcConnect() {
  if (process.platform === "win32") {
    for (const entry of String(process.env.PATH || "").split(path.delimiter)) {
      const base = entry.replace(/^"|"$/g, "").trim();
      if (!base) continue;
      const executable = path.join(base, "node_modules", "cc-connect", "bin", "cc-connect.exe");
      if (fs.existsSync(executable)) return executable;
    }
  }
  return "cc-connect";
}

function tomlString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function waitFor(predicate, describe, timeoutMs = 12_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error(`等待 ${describe} 超时\n${ccConnectOutput.slice(-4000)}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-acp-chain-"));
const replies = [];
const inbound = [];
let backendCalls = 0;
let ccConnectOutput = "";

const backend = http.createServer((req, res) => {
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    backendCalls += 1;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, reply: `链路回复 ${backendCalls}` }));
  });
});

const gateway = http.createServer((req, res) => {
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname.toLowerCase();
    if (pathname.endsWith("/getupdates")) {
      const messages = inbound.splice(0, inbound.length);
      const respond = () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ret: 0,
          errcode: 0,
          errmsg: "",
          msgs: messages,
          get_updates_buf: String(Date.now()),
          longpolling_timeout_ms: 25,
        }));
      };
      setTimeout(respond, messages.length > 0 ? 0 : 25);
      return;
    }
    if (pathname.endsWith("/sendmessage")) {
      try { replies.push(JSON.parse(body || "{}")); } catch {}
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ret: 0, errcode: 0, errmsg: "", typing_ticket: "" }));
  });
});

const backendPort = await listen(backend);
const gatewayPort = await listen(gateway);

const configPath = path.join(tempDir, "config.toml");
const config = `language = "zh"
data_dir = "${tomlString(tempDir)}"
idle_timeout_mins = 1
max_turn_time_mins = 1

[[projects]]
name = "turn-scoped-chain"
reset_on_idle_mins = 0

[projects.agent]
type = "acp"

[projects.agent.options]
work_dir = "${tomlString(tempDir)}"
cmd = "${tomlString(process.execPath)}"
args = ["${tomlString(adapterFile)}", "--port=${backendPort}"]
env = { CCM_CONTROL_BOT_REQUEST_TIMEOUT_MS = "3000" }
display_name = "CCM ACP Chain Test"

[[projects.platforms]]
type = "weixin"

[projects.platforms.options]
token = "ccm-chain-token"
base_url = "http://127.0.0.1:${gatewayPort}"
allow_from = "*"
account_id = "turn-scoped-selftest"
long_poll_timeout_ms = 50
`;
fs.writeFileSync(configPath, config, "utf8");

const ccConnect = spawn(findCcConnect(), ["--config", configPath, "--force"], {
  cwd: tempDir,
  env: { ...process.env },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
  shell: process.platform !== "win32",
});
ccConnect.stdout.on("data", chunk => { ccConnectOutput += chunk.toString(); });
ccConnect.stderr.on("data", chunk => { ccConnectOutput += chunk.toString(); });

async function postInbound(index) {
  inbound.push({
    seq: index,
    message_id: index,
    from_user_id: "selftest@im.wechat",
    to_user_id: "ccm",
    client_id: `client-${index}`,
    create_time_ms: Date.now(),
    session_id: "turn-scoped",
    message_type: 1,
    message_state: 2,
    context_token: `context-${index}`,
    item_list: [{
      type: 1,
      text_item: { text: `第${index}条` },
    }],
  });
}

try {
  await waitFor(() => /platform ready/.test(ccConnectOutput), "cc-connect 本地微信假通道启动");
  await postInbound(1);
  await waitFor(() => replies.find(item => JSON.stringify(item).includes("链路回复 1")), "第一条链路回复");
  await waitFor(() => /turn complete/.test(ccConnectOutput), "第一条回合完成");

  await postInbound(2);
  await waitFor(() => replies.find(item => JSON.stringify(item).includes("链路回复 2")), "第二条链路回复");
  await waitFor(() => (ccConnectOutput.match(/prompt received mode=global/g) || []).length >= 2, "同一 ACP 的第二个 prompt");

  assert.equal(backendCalls, 2);
  assert.equal((ccConnectOutput.match(/session spawned/g) || []).length, 1, "healthy direct ACP should be reused across turns");
  assert.doesNotMatch(ccConnectOutput, /idle timeout|force-killing|session timed out|no response/i);
  console.log(JSON.stringify({
    pass: true,
    checks: {
      real_cc_connect_binary: true,
      first_turn_reply: true,
      second_turn_reply: true,
      direct_acp_second_prompt: true,
      healthy_acp_process_reused: true,
      no_stalled_turn: true,
    },
    paid_provider_calls: 0,
  }, null, 2));
} finally {
  if (ccConnect.exitCode === null) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/T", "/F", "/PID", String(ccConnect.pid)], { windowsHide: true, stdio: "ignore" });
    } else {
      ccConnect.kill();
    }
    await Promise.race([
      new Promise(resolve => ccConnect.once("exit", resolve)),
      new Promise(resolve => setTimeout(resolve, 3_000)),
    ]);
  }
  await Promise.all([
    new Promise(resolve => backend.close(resolve)),
    new Promise(resolve => gateway.close(resolve)),
  ]);
  fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
