import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectsSource = fs.readFileSync(path.join(root, "backend", "modules", "projects", "projects.ts"), "utf8");
const runnerSource = fs.readFileSync(path.join(root, "ccm-package", "bin", "agent-runner.ps1"), "utf8");
const agentRunnerSource = fs.readFileSync(path.join(root, "backend", "agents", "execution-kernel.ts"), "utf8");
const serverRunnerSource = fs.readFileSync(path.join(root, "backend", "server-agent-runner.ts"), "utf8");
const searchIndexSource = fs.readFileSync(path.join(root, "backend", "modules", "search", "conversation-search-index.ts"), "utf8");
const coreUtilsSource = fs.readFileSync(path.join(root, "backend", "core", "utils.ts"), "utf8");
const toolsSource = fs.readFileSync(path.join(root, "backend", "modules", "tools", "tools.ts"), "utf8");
const cliSource = fs.readFileSync(path.join(root, "ccm-package", "bin", "ccm.js"), "utf8");

assert.match(projectsSource, /function spawnCcConnect[\s\S]*ensureWindowsNoWindowLauncher\(\)/, "cc-connect must use the no-window launcher on Windows");
assert.match(projectsSource, /CreateNoWindow = true/, "the Windows launcher must prohibit console allocation");
assert.match(projectsSource, /target:winexe/, "the Windows launcher must be compiled as a windowless executable");
assert.match(runnerSource, /\$Watch -and -not \$HiddenChild/, "the PowerShell watch runner must hand off to a hidden child");
assert.match(runnerSource, /Start-Process[\s\S]*-WindowStyle Hidden/, "the PowerShell fallback runner must start hidden");
assert.match(agentRunnerSource, /runManagedCommand[\s\S]*windowsHide: true/, "managed Agent execution must hide Windows child processes");
assert.match(serverRunnerSource, /callAgentForGroupStream[\s\S]*windowsHide: true/, "project and group Agent execution must hide direct child processes");
assert.doesNotMatch(projectsSource.match(/function spawnCcConnect[\s\S]*?\n}/)?.[0] || "", /windowsHide:\s*false/, "cc-connect task execution must never request a visible window");
assert.match(searchIndexSource, /spawn\(process\.execPath,\s*\[__filename,[\s\S]*?windowsHide:\s*true/, "conversation search workers must stay hidden on Windows");
assert.match(coreUtilsSource, /execFileSync\("reg\.exe"[\s\S]*?windowsHide:\s*true/, "PATH refresh must not open a console window");
assert.match(toolsSource, /execFileSync\("powershell\.exe"[\s\S]*?windowsHide:\s*true/, "native folder browsing must hide the PowerShell host window");
assert.match(cliSource, /spawnSync\(process\.execPath,\s*\[cli,[\s\S]*?"--background"[\s\S]*?windowsHide:\s*true/, "background restart must not open a Node console window");

console.log("project-agent-hidden-process-selftest: 12 checks passed");
