#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

function fail(message: string, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

const [, , promptFile, developerInstructionsFile = "", encodedArgs = "W10="] = process.argv;
if (!promptFile) fail("Usage: codex-prompt-runner <prompt-file> <developer-instructions-file> <base64-json-args>");

function readRequiredFile(file: string, label: string) {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch (error: any) {
    fail(`Failed to read ${label}: ${error?.message || error}`);
  }
}

let args: string[] = [];
try {
  const parsed = JSON.parse(Buffer.from(encodedArgs, "base64").toString("utf-8"));
  if (!Array.isArray(parsed)) throw new Error("args must be an array");
  args = parsed.map(item => String(item));
} catch (error: any) {
  fail(`Invalid Codex CLI arg payload: ${error?.message || error}`);
}

const prompt = readRequiredFile(promptFile, "prompt file");
if (developerInstructionsFile) {
  const instructions = readRequiredFile(developerInstructionsFile, "developer instructions file");
  if (!instructions.trim()) fail("Developer instructions file is empty");
  const configArg = `developer_instructions=${JSON.stringify(instructions)}`;
  const insertionIndex = args[0] === "exec" && args[1] === "resume" ? 2 : 1;
  args.splice(insertionIndex, 0, "--config", configArg);
}

function resolveCodexLaunch() {
  if (process.platform !== "win32") return { command: "codex", prefixArgs: [] as string[], shell: false };
  const where = spawnSync("where.exe", ["codex"], { encoding: "utf-8", windowsHide: true, shell: false });
  const candidates = String(where.stdout || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  for (const candidate of candidates) {
    if (/\.exe$/i.test(candidate)) return { command: candidate, prefixArgs: [] as string[], shell: false };
    if (/\.cmd$/i.test(candidate)) {
      const npmEntry = path.join(path.dirname(candidate), "node_modules", "@openai", "codex", "bin", "codex.js");
      if (fs.existsSync(npmEntry)) return { command: process.execPath, prefixArgs: [npmEntry], shell: false };
    }
  }
  const cmd = candidates.find(candidate => /\.cmd$/i.test(candidate)) || "codex.cmd";
  return { command: cmd, prefixArgs: [] as string[], shell: true };
}

const launch = resolveCodexLaunch();
const result = spawnSync(launch.command, [...launch.prefixArgs, ...args], {
  encoding: "utf-8",
  env: process.env,
  input: prompt,
  windowsHide: true,
  shell: launch.shell,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) fail(result.error.message || String(result.error));
process.exit(result.status ?? 0);
