import * as path from "path";
import { spawn } from "child_process";

const RESULT_MARKER = "__CCM_TEST_AGENT_SELF_TEST_RESULT__";

export interface TestAgentSelfTestMatrixOptions {
  selfTestModulePath?: string;
  names?: string[];
  pattern?: RegExp | string;
  timeoutMs?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stopOnFailure?: boolean;
}

export interface TestAgentSelfTestMatrixItem {
  name: string;
  pass: boolean;
  durationMs: number;
  exitCode: number | null;
  timedOut: boolean;
  reason?: string | null;
  status?: string | null;
  stdoutTail: string;
  stderrTail: string;
}

export interface TestAgentSelfTestMatrixReport {
  pass: boolean;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  modulePath: string;
  timeoutMs: number;
  results: TestAgentSelfTestMatrixItem[];
}

function defaultSelfTestModulePath() {
  return path.join(__dirname, "self-test.js");
}

function tail(value: string, max = 4000) {
  if (value.length <= max) return value;
  return value.slice(value.length - max);
}

function patternMatches(name: string, pattern?: RegExp | string) {
  if (!pattern) return true;
  if (typeof pattern === "string") return name.includes(pattern);
  return pattern.test(name);
}

export function discoverTestAgentSelfTests(selfTestModulePath = defaultSelfTestModulePath(), pattern?: RegExp | string) {
  const mod = require(path.resolve(selfTestModulePath));
  return Object.keys(mod)
    .filter(name => /^runTestAgent.*SelfTest$/.test(name))
    .filter(name => patternMatches(name, pattern))
    .sort();
}

function childScript() {
  return `
const marker = ${JSON.stringify(RESULT_MARKER)};
const modulePath = process.argv[1];
const name = process.argv[2];
const timeoutMs = Number(process.argv[3] || 180000);
function summarizeResult(result) {
  return {
    name,
    pass: !!(result === true || (result && result.pass)),
    reason: result && result.reason ? String(result.reason) : null,
    status: result && result.report && result.report.status
      || result && result.passReport && result.passReport.status
      || result && result.failReport && result.failReport.status
      || null
  };
}
function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve({ pass: false, reason: 'timeout ' + timeoutMs + 'ms in ' + name }), timeoutMs))
  ]);
}
(async () => {
  try {
    require('module').Module._initPaths();
    const tests = require(modulePath);
    if (typeof tests[name] !== 'function') {
      const summary = { name, pass: false, reason: 'self-test export not found', status: null };
      console.log(marker + JSON.stringify(summary));
      process.exit(1);
      return;
    }
    const result = await withTimeout(Promise.resolve().then(() => tests[name]()));
    const summary = summarizeResult(result);
    console.log(marker + JSON.stringify(summary));
    process.exit(summary.pass ? 0 : 1);
  } catch (error) {
    const summary = { name, pass: false, reason: error && error.stack || error && error.message || String(error), status: null };
    console.log(marker + JSON.stringify(summary));
    process.exit(1);
  }
})();
`;
}

async function runOneSelfTest(
  selfTestModulePath: string,
  name: string,
  options: Required<Pick<TestAgentSelfTestMatrixOptions, "timeoutMs" | "cwd">> & Pick<TestAgentSelfTestMatrixOptions, "env">,
): Promise<TestAgentSelfTestMatrixItem> {
  const started = Date.now();
  const child = spawn(process.execPath, ["-e", childScript(), path.resolve(selfTestModulePath), name, String(options.timeoutMs)], {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stdout = "";
  let stderr = "";
  let parentTimedOut = false;
  let parsed: any = null;
  const parentTimeoutMs = Math.max(options.timeoutMs + 5000, 1000);

  const timer = setTimeout(() => {
    parentTimedOut = true;
    child.kill();
  }, parentTimeoutMs);

  return await new Promise(resolve => {
    child.stdout?.on("data", chunk => {
      stdout += String(chunk);
      const lines = stdout.split(/\r?\n/);
      for (const line of lines) {
        if (!line.startsWith(RESULT_MARKER)) continue;
        try { parsed = JSON.parse(line.slice(RESULT_MARKER.length)); } catch {}
      }
    });
    child.stderr?.on("data", chunk => {
      stderr += String(chunk);
    });
    child.on("close", code => {
      clearTimeout(timer);
      const durationMs = Date.now() - started;
      const timedOut = parentTimedOut || String(parsed?.reason || "").startsWith("timeout ");
      const pass = Boolean(parsed?.pass) && code === 0 && !timedOut;
      resolve({
        name,
        pass,
        durationMs,
        exitCode: code,
        timedOut,
        reason: parsed?.reason || (parentTimedOut ? `parent timeout ${parentTimeoutMs}ms in ${name}` : code === 0 ? null : `exit code ${code}`),
        status: parsed?.status || null,
        stdoutTail: tail(stdout),
        stderrTail: tail(stderr),
      });
    });
    child.on("error", error => {
      clearTimeout(timer);
      resolve({
        name,
        pass: false,
        durationMs: Date.now() - started,
        exitCode: null,
        timedOut: parentTimedOut,
        reason: error.message,
        status: null,
        stdoutTail: tail(stdout),
        stderrTail: tail(stderr),
      });
    });
  });
}

export async function runTestAgentSelfTestMatrix(options: TestAgentSelfTestMatrixOptions = {}): Promise<TestAgentSelfTestMatrixReport> {
  const started = Date.now();
  const modulePath = path.resolve(options.selfTestModulePath || defaultSelfTestModulePath());
  const timeoutMs = options.timeoutMs || 180000;
  const cwd = options.cwd || process.cwd();
  const names = (options.names && options.names.length ? options.names : discoverTestAgentSelfTests(modulePath, options.pattern));
  const results: TestAgentSelfTestMatrixItem[] = [];

  for (const name of names) {
    const result = await runOneSelfTest(modulePath, name, { timeoutMs, cwd, env: options.env });
    results.push(result);
    if (!result.pass && options.stopOnFailure) break;
  }

  const passed = results.filter(item => item.pass).length;
  const failed = results.length - passed;
  return {
    pass: failed === 0 && results.length === names.length,
    total: results.length,
    passed,
    failed,
    durationMs: Date.now() - started,
    modulePath,
    timeoutMs,
    results,
  };
}

export function formatTestAgentSelfTestMatrixSummary(report: TestAgentSelfTestMatrixReport) {
  const lines = [
    `TestAgent self-test matrix: ${report.pass ? "passed" : "failed"}`,
    `Total: ${report.total}, passed: ${report.passed}, failed: ${report.failed}, durationMs: ${report.durationMs}`,
  ];
  for (const item of report.results) {
    const suffix = item.pass ? "" : ` reason=${item.reason || "unknown"}`;
    lines.push(`${item.pass ? "PASS" : "FAIL"} ${item.name} ${item.durationMs}ms${suffix}`);
  }
  return lines.join("\n");
}
