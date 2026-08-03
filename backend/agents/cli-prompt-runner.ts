#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
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
  const candidates = String(where.stdout || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  // npm on Windows installs both an extensionless POSIX shim and a .cmd shim.
  // Node cannot execute the former directly, even though where.exe lists it first.
  return candidates.find(candidate => /\.(?:exe|com|cmd|bat)$/i.test(candidate)) || candidates[0] || value;
}

const resolvedCommand = resolveCommand(command);

function resolveLaunch(commandPath: string) {
  if (process.platform !== "win32" || !/\.(?:cmd|bat)$/i.test(commandPath)) {
    return { command: commandPath, prefixArgs: [] as string[] };
  }
  let source = "";
  try { source = fs.readFileSync(commandPath, "utf-8"); } catch {}
  const shimDir = path.dirname(commandPath);

  // npm command shims forward `%*` through cmd.exe. Using shell:true around
  // those shims reparses a prompt containing spaces and turns it into several
  // positional arguments. Resolve the generated shim to its real entrypoint so
  // every argv item reaches the CLI unchanged.
  const nodeEntry = source.match(/["']?%(?:dp0|SCRIPT_DIR)%[\\/]([^"'\r\n]+?\.js)["']?\s+%\*/i)?.[1];
  if (nodeEntry) {
    return {
      command: process.execPath,
      prefixArgs: [path.resolve(shimDir, nodeEntry.replace(/[\\/]+/g, path.sep))],
    };
  }
  const executableEntry = source.match(/["']?%(?:dp0|SCRIPT_DIR)%[\\/]([^"'\r\n]+?\.(?:exe|com))["']?\s+%\*/i)?.[1];
  if (executableEntry) {
    return {
      command: path.resolve(shimDir, executableEntry.replace(/[\\/]+/g, path.sep)),
      prefixArgs: [] as string[],
    };
  }
  const powershellEntry = source.match(/-File\s+["']?%(?:dp0|SCRIPT_DIR)%[\\/]([^"'\r\n]+?\.ps1)["']?\s+%\*/i)?.[1];
  if (powershellEntry) {
    return {
      command: path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
      prefixArgs: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.resolve(shimDir, powershellEntry.replace(/[\\/]+/g, path.sep))],
    };
  }
  fail(`Unsupported Windows command shim: ${path.basename(commandPath)}`);
  return { command: commandPath, prefixArgs: [] as string[] };
}

const launch = resolveLaunch(resolvedCommand);
const result = spawnSync(launch.command, [...launch.prefixArgs, ...args, prompt], {
  encoding: "utf-8",
  env: process.env,
  windowsHide: true,
  shell: false,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) fail(result.error.message || String(result.error));
process.exit(result.status ?? 0);
