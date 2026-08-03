import * as crypto from "crypto";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type ServiceInstanceIdentityV2 = {
  schema: "ccm-service-instance-v2";
  instance_id: string;
  boot_id: string;
  token: string;
  pid: number;
  process_fingerprint: string;
  entry_checksum: string;
  entry_path: string;
  port: number;
  listen_host: string;
  public_origin: string;
  launch_mode: "foreground" | "background" | "unknown";
  package_version: string;
  hostname: string;
  acquired_at: string;
  data_directory: string;
};

export type ServerInstanceLock = {
  bypassed?: boolean;
  file: string;
  token: string;
  pid: number;
  port: number;
  listenHost: string;
  identity: ServiceInstanceIdentityV2;
};

function processAlive(pid: number) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sha256(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function executableIdentity(pid: number) {
  try {
    if (process.platform === "win32") {
      const script = [
        `$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue`,
        "if ($null -eq $p -or $null -eq $p.StartTime -or [string]::IsNullOrWhiteSpace([string]$p.Path)) { exit 3 }",
        "$v=[ordered]@{created=$p.StartTime.ToUniversalTime().ToString('o');executable=$p.Path}|ConvertTo-Json -Compress",
        "Write-Output $v",
      ].join(";");
      return String(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
        encoding: "utf-8",
        windowsHide: true,
        timeout: 4_000,
      })).trim();
    }
    return String(execFileSync("ps", ["-p", String(pid), "-o", "lstart=", "-o", "command="], {
      encoding: "utf-8",
      timeout: 4_000,
    })).trim();
  } catch {
    return "";
  }
}

let currentProcessFingerprint = "";

function createCurrentProcessFallbackFingerprint() {
  const approximateStartedAt = Date.now() - Math.floor(process.uptime() * 1_000);
  return sha256([
    "ccm-process-instance-v2",
    process.pid,
    process.execPath,
    path.resolve(process.argv[1] || ""),
    approximateStartedAt,
    crypto.randomBytes(32).toString("hex"),
  ].join("\0"));
}

export function getProcessIdentityFingerprint(pid = process.pid) {
  if (pid === process.pid && currentProcessFingerprint) return currentProcessFingerprint;
  const identity = executableIdentity(pid);
  const fingerprint = identity
    ? sha256(identity)
    : pid === process.pid
      ? createCurrentProcessFallbackFingerprint()
      : "";
  if (pid === process.pid) currentProcessFingerprint = fingerprint;
  return fingerprint;
}

function entryIdentity() {
  const entryPath = path.resolve(process.argv[1] || "");
  try {
    const stat = fs.lstatSync(entryPath);
    if (!stat.isFile() || stat.isSymbolicLink()) return { entryPath, checksum: "" };
    return { entryPath, checksum: sha256(fs.readFileSync(entryPath)) };
  } catch {
    return { entryPath, checksum: "" };
  }
}

function getLockFile() {
  if (process.env.CCM_SERVER_LOCK_FILE) return path.resolve(process.env.CCM_SERVER_LOCK_FILE);
  const storeDir = path.resolve(process.env.CCM_TASK_STORE_DIR || path.join(os.homedir(), ".cc-connect"));
  return path.join(storeDir, "run", "ccm-server-instance.lock");
}

function readOwner(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function archiveDeadLock(file: string) {
  if (!fs.existsSync(file)) return true;
  const owner = readOwner(file);
  const localOwner = !owner?.hostname || String(owner.hostname) === os.hostname();
  if (!localOwner || processAlive(Number(owner?.pid || 0))) return false;
  try {
    const archiveDir = path.join(path.dirname(file), "stale");
    fs.mkdirSync(archiveDir, { recursive: true });
    const archive = path.join(archiveDir, `${path.basename(file)}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.json`);
    fs.renameSync(file, archive);
    return true;
  } catch {
    return false;
  }
}

export function acquireCcmServerInstanceLock(
  port: number,
  listenHost = "127.0.0.1",
  options: {
    publicOrigin?: string;
    launchMode?: "foreground" | "background" | "unknown";
    packageVersion?: string;
    bootId?: string;
  } = {},
): ServerInstanceLock {
  const file = getLockFile();
  const entry = entryIdentity();
  const token = crypto.randomBytes(24).toString("hex");
  const identity: ServiceInstanceIdentityV2 = {
    schema: "ccm-service-instance-v2",
    instance_id: `ccmi_${Date.now().toString(36)}_${crypto.randomBytes(8).toString("hex")}`,
    boot_id: String(options.bootId || `boot_${os.hostname()}_${process.pid}_${crypto.randomBytes(6).toString("hex")}`),
    token,
    pid: process.pid,
    process_fingerprint: getProcessIdentityFingerprint(process.pid),
    entry_checksum: entry.checksum,
    entry_path: entry.entryPath,
    port,
    listen_host: listenHost,
    public_origin: String(options.publicOrigin || ""),
    launch_mode: options.launchMode || "unknown",
    package_version: String(options.packageVersion || ""),
    hostname: os.hostname(),
    acquired_at: new Date().toISOString(),
    data_directory: path.dirname(path.dirname(file)),
  };
  if (!identity.process_fingerprint || !identity.entry_checksum) {
    throw new Error("无法建立可核验的 CCM 进程身份，拒绝启动");
  }
  if (process.env.CCM_ALLOW_SHARED_DATA_DIR === "1") {
    return { bypassed: true, file, token, pid: process.pid, port, listenHost, identity };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(file, "wx", 0o600);
      try {
        fs.writeFileSync(fd, `${JSON.stringify(identity, null, 2)}\n`, "utf-8");
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      return { file, token, pid: process.pid, port, listenHost, identity };
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      if (attempt === 0 && archiveDeadLock(file)) continue;
      const current = readOwner(file) || {};
      const ownership = processAlive(Number(current.pid || 0)) ? "ownership_unproven" : "stale_lock_unrecoverable";
      const next: any = new Error(
        `同一数据目录已有CCM实例记录`
        + `${current.pid ? `（PID ${current.pid}` : ""}`
        + `${current.port ? `，端口 ${current.port}` : ""}`
        + `${current.pid ? "）" : ""}，状态：${ownership}`,
      );
      next.code = ownership;
      throw next;
    }
  }
  throw new Error("无法获取 CCM 数据目录实例锁");
}

export function releaseCcmServerInstanceLock(lock: ServerInstanceLock | null | undefined) {
  if (!lock || lock.bypassed) return false;
  const current = readOwner(lock.file);
  if (
    !current
    || String(current.schema || "") !== "ccm-service-instance-v2"
    || String(current.instance_id || "") !== lock.identity.instance_id
    || String(current.token || "") !== lock.token
    || Number(current.pid || 0) !== lock.pid
  ) return false;
  try {
    fs.unlinkSync(lock.file);
    return true;
  } catch {
    return false;
  }
}

export function inspectCcmServerInstanceLock() {
  const file = getLockFile();
  const owner = readOwner(file);
  const alive = !!owner && String(owner.hostname || "") === os.hostname() && processAlive(Number(owner.pid || 0));
  const fingerprint = alive ? getProcessIdentityFingerprint(Number(owner.pid || 0)) : "";
  const identityVerified = !!(
    alive
    && owner?.schema === "ccm-service-instance-v2"
    && owner?.process_fingerprint
    && fingerprint
    && fingerprint === owner.process_fingerprint
  );
  return {
    file,
    present: fs.existsSync(file),
    owner,
    active: identityVerified,
    process_alive: alive,
    identity_verified: identityVerified,
    ownership_state: identityVerified ? "verified" : alive ? "ownership_unproven" : owner ? "stale" : "absent",
  };
}
