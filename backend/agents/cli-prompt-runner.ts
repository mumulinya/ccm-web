#!/usr/bin/env node
import * as fs from "fs";
import { spawnSync } from "child_process";

function fail(message: string, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

const [, , promptFile, command, encodedArgs = "W10="] = process.argv;
if (!promptFile || !command) fail("Usage: cli-prompt-runner <prompt-file> <command> <base64-json-args>");

let args: string[] = [];
try {
  const parsed = JSON.parse(Buffer.from(encodedArgs, "base64").toString("utf-8"));
  if (!Array.isArray(parsed)) throw new Error("args must be an array");
  args = parsed.map(item => String(item));
} catch (error: any) {
  fail(`Invalid CLI arg payload: ${error?.message || error}`);
}

let prompt = "";
try {
  prompt = fs.readFileSync(promptFile, "utf-8");
} catch (error: any) {
  fail(`Failed to read prompt file: ${error?.message || error}`);
}

function resolveCommand(value: string) {
  if (process.platform !== "win32" || /[\\/]/.test(value) || /\.[a-z0-9]+$/i.test(value)) return value;
  const where = spawnSync("where.exe", [value], {
    encoding: "utf-8",
    windowsHide: true,
    shell: false,
  });
  const first = String(where.stdout || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean)[0];
  return first || value;
}

const resolvedCommand = resolveCommand(command);
const needsShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(resolvedCommand);
const result = spawnSync(resolvedCommand, [...args, prompt], {
  encoding: "utf-8",
  env: process.env,
  windowsHide: true,
  shell: needsShell,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) fail(result.error.message || String(result.error));
process.exit(result.status ?? 0);
