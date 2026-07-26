import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectsSource = fs.readFileSync(path.join(root, "backend", "modules", "projects", "projects.ts"), "utf8");
const runnerSource = fs.readFileSync(path.join(root, "ccm-package", "bin", "agent-runner.ps1"), "utf8");
const agentRunnerSource = fs.readFileSync(path.join(root, "backend", "agents", "execution-kernel.ts"), "utf8");
const serverRunnerSource = fs.readFileSync(path.join(root, "backend", "server-agent-runner.ts"), "utf8");

assert.match(projectsSource, /function spawnCcConnect[\s\S]*ensureWindowsNoWindowLauncher\(\)/, "cc-connect must use the no-window launcher on Windows");
assert.match(projectsSource, /CreateNoWindow = true/, "the Windows launcher must prohibit console allocation");
assert.match(projectsSource, /target:winexe/, "the Windows launcher must be compiled as a windowless executable");
assert.match(runnerSource, /\$Watch -and -not \$HiddenChild/, "the PowerShell watch runner must hand off to a hidden child");
assert.match(runnerSource, /Start-Process[\s\S]*-WindowStyle Hidden/, "the PowerShell fallback runner must start hidden");
assert.match(agentRunnerSource, /runManagedCommand[\s\S]*windowsHide: true/, "managed Agent execution must hide Windows child processes");
assert.match(serverRunnerSource, /callAgentForGroupStream[\s\S]*windowsHide: true/, "project and group Agent execution must hide direct child processes");
assert.doesNotMatch(projectsSource.match(/function spawnCcConnect[\s\S]*?\n}/)?.[0] || "", /windowsHide:\s*false/, "cc-connect task execution must never request a visible window");

console.log("project-agent-hidden-process-selftest: 8 checks passed");
