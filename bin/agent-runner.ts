#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  CCM_DIR,
  UPLOAD_DIR,
  createFileChangeSnapshot,
  getFileChanges,
} from "./utils";
import {
  buildAgentCommand,
  getAgentCommandLabel,
  normalizeAgentRuntimeId,
} from "./agent-runtime";

const AGENT_RUNNER_DIR = path.join(CCM_DIR, "agent-runner");
const REQUESTS_DIR = path.join(AGENT_RUNNER_DIR, "requests");
const RESULTS_DIR = path.join(AGENT_RUNNER_DIR, "results");
const HEARTBEAT_FILE = path.join(AGENT_RUNNER_DIR, "heartbeat.json");

function ensureDirs() {
  for (const dir of [AGENT_RUNNER_DIR, REQUESTS_DIR, RESULTS_DIR, UPLOAD_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function writeHeartbeat(status = "idle", detail = "") {
  ensureDirs();
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify({
    status,
    detail,
    pid: process.pid,
    updated_at: new Date().toISOString(),
  }, null, 2), "utf-8");
}

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJsonAtomic(file: string, data: any) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

function markRequest(file: string, patch: any) {
  const request = readJson(file);
  writeJsonAtomic(file, { ...request, ...patch, updated_at: new Date().toISOString() });
}

async function runRequest(file: string) {
  const request = readJson(file);
  if (!request?.id || request.status === "done" || request.status === "running") return false;

  const resultFile = path.join(RESULTS_DIR, `${request.id}.json`);
  if (fs.existsSync(resultFile)) return false;

  markRequest(file, { status: "running", runner_pid: process.pid, started_at: new Date().toISOString() });
  writeHeartbeat("running", `${request.projectName || "agent"} ${request.id}`);

  const msgFile = path.join(UPLOAD_DIR, `_runner_${request.id}.txt`);
  const workDir = request.workDir || process.cwd();
  const agentType = normalizeAgentRuntimeId(request.agentType || "claudecode");
  const command = getAgentCommandLabel(agentType);
  const timeoutMs = Number(request.timeoutMs || 300000);
  const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;

  try {
    fs.writeFileSync(msgFile, String(request.message || ""), "utf-8");
    const output = execSync(buildAgentCommand(agentType, msgFile), {
      encoding: "utf-8",
      timeout: timeoutMs,
      cwd: workDir,
      shell: true as any,
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
    const fileChanges = getFileChanges(request.projectName || "", changeSnapshot);
    writeJsonAtomic(resultFile, {
      id: request.id,
      success: true,
      output,
      fileChanges,
      agentType,
      command,
      runner: "node",
      completed_at: new Date().toISOString(),
    });
    markRequest(file, { status: "done", completed_at: new Date().toISOString() });
  } catch (error: any) {
    const output = error?.killed || error?.signal === "SIGTERM"
      ? "Agent 响应超时"
      : String(error?.stderr || error?.message || error || "").slice(0, 4000);
    const fileChanges = getFileChanges(request.projectName || "", changeSnapshot);
    writeJsonAtomic(resultFile, {
      id: request.id,
      success: false,
      error: output || "Agent Runner 执行失败",
      output,
      fileChanges,
      agentType,
      command,
      exitCode: error?.status ?? null,
      runner: "node",
      completed_at: new Date().toISOString(),
    });
    markRequest(file, { status: "failed", completed_at: new Date().toISOString(), error: output });
  } finally {
    try { fs.unlinkSync(msgFile); } catch {}
    writeHeartbeat("idle", "");
  }
  return true;
}

async function runOnce() {
  ensureDirs();
  writeHeartbeat("scanning", "");
  const files = fs.readdirSync(REQUESTS_DIR)
    .filter(file => file.endsWith(".json"))
    .map(file => path.join(REQUESTS_DIR, file))
    .sort();
  let handled = 0;
  for (const file of files) {
    try {
      if (await runRequest(file)) handled++;
    } catch (error: any) {
      console.error(`[agent-runner] ${path.basename(file)} ${error.message}`);
    }
  }
  writeHeartbeat("idle", "");
  return handled;
}

async function main() {
  ensureDirs();
  const watch = process.argv.includes("--watch");
  console.log(`[agent-runner] ${watch ? "watching" : "running once"} ${REQUESTS_DIR}`);
  if (!watch) {
    const handled = await runOnce();
    console.log(`[agent-runner] handled ${handled} request(s)`);
    return;
  }
  writeHeartbeat("idle", "");
  while (true) {
    await runOnce();
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

main().catch((error) => {
  writeHeartbeat("error", error.message || String(error));
  console.error("[agent-runner]", error);
  process.exit(1);
});
