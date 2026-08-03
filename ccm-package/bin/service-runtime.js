"use strict";

const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function processIdentityFingerprint(pid) {
  try {
    let identity = "";
    if (process.platform === "win32") {
      const script = [
        `$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue`,
        "if ($null -eq $p -or $null -eq $p.StartTime -or [string]::IsNullOrWhiteSpace([string]$p.Path)) { exit 3 }",
        "$v=[ordered]@{created=$p.StartTime.ToUniversalTime().ToString('o');executable=$p.Path}|ConvertTo-Json -Compress",
        "Write-Output $v",
      ].join(";");
      identity = String(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
        encoding: "utf-8",
        windowsHide: true,
        timeout: 4_000,
      })).trim();
    } else {
      identity = String(execFileSync("ps", ["-p", String(pid), "-o", "lstart=", "-o", "command="], {
        encoding: "utf-8",
        timeout: 4_000,
      })).trim();
    }
    return identity ? sha256(identity) : "";
  } catch {
    return "";
  }
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf-8", mode: 0o600, flag: "wx" });
  fs.renameSync(temporary, file);
}

function endpointHost(identity) {
  const host = String(identity?.listen_host || "127.0.0.1");
  if (host === "0.0.0.0") return "127.0.0.1";
  if (host === "::") return "::1";
  return host;
}

function endpointUrl(identity, pathname) {
  const host = endpointHost(identity);
  return `http://${host.includes(":") ? `[${host}]` : host}:${Number(identity?.port || 0)}${pathname}`;
}

function strictIdentityMatch(lockIdentity, remoteIdentity) {
  const keys = [
    "schema",
    "instance_id",
    "boot_id",
    "token",
    "pid",
    "process_fingerprint",
    "entry_checksum",
    "port",
    "listen_host",
    "data_directory",
  ];
  return keys.every(key => String(lockIdentity?.[key] ?? "") === String(remoteIdentity?.[key] ?? ""));
}

async function queryLifecycle(identity, pathname, internalApiHeaders, timeoutMs = 1_500) {
  try {
    const response = await fetch(endpointUrl(identity, pathname), {
      headers: internalApiHeaders("ccm-cli", "GET", pathname),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: null, error: String(error?.message || error) };
  }
}

async function inspectService(lockFile, internalApiHeaders, options = {}) {
  const owner = readJson(lockFile, null);
  if (!owner) {
    return {
      active: false,
      verified: false,
      ownershipState: "absent",
      pid: 0,
      port: Number(options.defaultPort || 3080),
      host: String(options.defaultHost || "127.0.0.1"),
      owner: null,
      lockFile,
      stale: false,
    };
  }
  const pid = Number(owner.pid || 0);
  const local = !owner.hostname || String(owner.hostname) === os.hostname();
  const alive = local && processAlive(pid);
  if (!alive) {
    return {
      active: false,
      verified: false,
      ownershipState: local ? "stale" : "foreign_host",
      pid: 0,
      port: Number(owner.port || 3080),
      host: String(owner.listen_host || "127.0.0.1"),
      owner,
      lockFile,
      stale: local,
    };
  }
  const lifecycle = await queryLifecycle(owner, "/api/internal/lifecycle/identity", internalApiHeaders, Number(options.timeoutMs || 1_500));
  const remoteIdentity = lifecycle.body?.identity;
  const remoteIdentityVerified = lifecycle.ok
    && lifecycle.body?.identity_verified === true
    && strictIdentityMatch(owner, remoteIdentity);
  const fingerprint = processIdentityFingerprint(pid);
  if (!remoteIdentityVerified) {
    return {
      active: false,
      verified: false,
      remoteIdentityVerified,
      osFingerprintObserved: !!fingerprint,
      ownershipState: "ownership_unproven",
      pid,
      port: Number(owner.port || 3080),
      host: String(owner.listen_host || "127.0.0.1"),
      owner,
      lockFile,
      stale: false,
    };
  }
  const verified = true;
  return {
    active: verified,
    verified,
    remoteIdentityVerified,
    osFingerprintObserved: !!fingerprint,
    ownershipState: verified ? "verified" : "ownership_unproven",
    lifecycleState: String(lifecycle.body?.lifecycle_state || ""),
    pid,
    port: Number(owner.port || 3080),
    host: String(owner.listen_host || "127.0.0.1"),
    publicOrigin: String(owner.public_origin || ""),
    launchMode: String(owner.launch_mode || "unknown"),
    packageVersion: String(owner.package_version || ""),
    acquiredAt: String(owner.acquired_at || ""),
    owner,
    lockFile,
    stale: false,
  };
}

async function waitForVerifiedReady(lockFile, expected, internalApiHeaders, child, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let childExit = null;
  let lastState = null;
  const onExit = (code, signal) => { childExit = { code, signal }; };
  child?.once?.("exit", onExit);
  try {
    while (Date.now() < deadline) {
      if (childExit) return { ready: false, code: "process_exited", childExit };
      const owner = readJson(lockFile, null);
      if (owner && processAlive(Number(owner.pid || 0))) {
        const remote = await queryLifecycle(owner, "/api/internal/lifecycle/ready", internalApiHeaders, 800);
        const remoteIdentity = remote.body?.identity;
        if (
          remote.ok
          && remote.body?.ready === true
          && remote.body?.identity_verified === true
          && strictIdentityMatch(owner, remoteIdentity)
        ) {
          const state = await inspectService(lockFile, internalApiHeaders, { timeoutMs: 1_500, defaultPort: expected.port, defaultHost: expected.host });
          lastState = state;
          if (
            state.verified
            && state.lifecycleState === "ready"
            && state.port === expected.port
            && state.host === expected.host
            && (!expected.packageVersion || state.packageVersion === expected.packageVersion)
          ) return { ready: true, state };
        }
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return { ready: false, code: "startup_timeout", state: lastState };
  } finally {
    child?.off?.("exit", onExit);
  }
}

function portAcceptsConnections(host, port, timeoutMs = 600) {
  const targetHost = ["0.0.0.0", "::"].includes(host) ? (host === "::" ? "::1" : "127.0.0.1") : host;
  return new Promise(resolve => {
    const socket = net.createConnection({ host: targetHost, port });
    const done = result => { socket.destroy(); resolve(result); };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

function canTerminateVerifiedProcess(state) {
  if (!state?.verified || !state?.owner || !processAlive(Number(state.pid || 0))) return false;
  return state.remoteIdentityVerified === true;
}

function rotateLogFiles(file, maxBytes = 10 * 1024 * 1024, keep = 5) {
  try {
    if (!fs.existsSync(file) || fs.statSync(file).size < maxBytes) return false;
    for (let index = keep - 1; index >= 1; index -= 1) {
      const source = `${file}.${index}`;
      const target = `${file}.${index + 1}`;
      if (fs.existsSync(source)) {
        try { fs.unlinkSync(target); } catch {}
        fs.renameSync(source, target);
      }
    }
    const first = `${file}.1`;
    try { fs.unlinkSync(first); } catch {}
    fs.renameSync(file, first);
    return true;
  } catch {
    return false;
  }
}

function readTail(file, lineCount, maxBytes = 2 * 1024 * 1024) {
  const stat = fs.statSync(file);
  const fd = fs.openSync(file, "r");
  try {
    let position = stat.size;
    let text = "";
    const blockSize = 64 * 1024;
    while (position > 0 && Buffer.byteLength(text, "utf-8") < maxBytes) {
      const size = Math.min(blockSize, position);
      position -= size;
      const buffer = Buffer.allocUnsafe(size);
      fs.readSync(fd, buffer, 0, size, position);
      text = buffer.toString("utf-8") + text;
      if ((text.match(/\n/g) || []).length > lineCount) break;
    }
    return text.split(/\r?\n/).slice(-lineCount).join("\n");
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = {
  canTerminateVerifiedProcess,
  inspectService,
  portAcceptsConnections,
  processAlive,
  processIdentityFingerprint,
  queryLifecycle,
  readJson,
  readTail,
  rotateLogFiles,
  strictIdentityMatch,
  waitForVerifiedReady,
  writeJsonAtomic,
};
