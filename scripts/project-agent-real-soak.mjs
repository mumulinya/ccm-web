#!/usr/bin/env node
import http from "node:http";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    i += 1;
  } else {
    args.set(key, "true");
  }
}

const host = args.get("host") || "localhost";
const port = Number(args.get("port") || 3080);
const project = args.get("project") || "ccm-e2e-mini-kanban";
const count = Math.max(1, Number(args.get("count") || 3));
const delayMs = Math.max(0, Number(args.get("delay-ms") || 1200));
const prefix = args.get("prefix") || `soak-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const taskTemplates = [
  index => `真实 E2E 压测第 ${index} 轮：给页面增加或更新一个很小的可见稳定性标记，标记文本包含 "${prefix}-${index}"，完成后运行 npm run build 和 npm test。`,
  index => `真实 E2E 压测第 ${index} 轮：微调看板上的说明文案，文案中包含 "${prefix}-${index}"，不要破坏已有功能，完成后运行 npm run build 和 npm test。`,
  index => `真实 E2E 压测第 ${index} 轮：为一个现有交互元素补充可访问性提示，提示内容包含 "${prefix}-${index}"，完成后运行 npm run build 和 npm test。`,
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseSseChunk(buffer, onEvent) {
  const parts = buffer.split(/\n\n/);
  const rest = parts.pop() || "";
  for (const part of parts) {
    const lines = part.split(/\r?\n/).filter(line => line.startsWith("data:"));
    if (!lines.length) continue;
    const raw = lines.map(line => line.slice(5).trimStart()).join("\n");
    try {
      onEvent(JSON.parse(raw));
    } catch {
      onEvent({ type: "raw", text: raw });
    }
  }
  return rest;
}

function sendTask(message) {
  const body = JSON.stringify({ project, message });
  return new Promise((resolve) => {
    const summary = {
      status: "unknown",
      runId: "",
      traceId: "",
      nativeSessionId: "",
      fileChangeCount: 0,
      error: "",
      events: 0,
    };
    let pending = "";
    const req = http.request({
      hostname: host,
      port,
      path: "/api/send-stream",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, res => {
      res.setEncoding("utf8");
      res.on("data", chunk => {
        pending += chunk;
        pending = parseSseChunk(pending, event => {
          summary.events += 1;
          if (event.run?.id) summary.runId = event.run.id;
          if (event.run?.trace_id) summary.traceId = event.run.trace_id;
          if (event.run?.native_session_id) summary.nativeSessionId = event.run.native_session_id;
          if (typeof event.fileChanges?.count === "number") summary.fileChangeCount = event.fileChanges.count;
          if (event.type === "done") summary.status = "done";
          if (event.type === "error") {
            summary.status = "error";
            summary.error = String(event.text || event.error || "unknown error").slice(0, 500);
          }
        });
      });
      res.on("end", () => resolve(summary));
    });
    req.on("error", error => resolve({ ...summary, status: "request_error", error: error.message }));
    req.write(body);
    req.end();
  });
}

const results = [];
for (let i = 1; i <= count; i += 1) {
  const message = taskTemplates[(i - 1) % taskTemplates.length](i);
  console.log(`\n[${i}/${count}] ${message}`);
  const result = await sendTask(message);
  results.push({ index: i, ...result });
  console.log(JSON.stringify(result, null, 2));
  if (i < count && delayMs) await sleep(delayMs);
}

const passed = results.filter(item => item.status === "done").length;
const failed = results.length - passed;
const report = {
  project,
  count,
  passed,
  failed,
  prefix,
  results,
};
console.log("\n[soak-summary]");
console.log(JSON.stringify(report, null, 2));
if (failed > 0) process.exitCode = 1;
