import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

type ServerInstanceLock = {
  bypassed?: boolean;
  file: string;
  token: string;
  pid: number;
  port: number;
  listenHost: string;
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

function getLockFile() {
  if (process.env.CCM_SERVER_LOCK_FILE) return path.resolve(process.env.CCM_SERVER_LOCK_FILE);
  const storeDir = path.resolve(process.env.CCM_TASK_STORE_DIR || path.join(os.homedir(), ".cc-connect"));
  return path.join(storeDir, "run", "ccm-server-instance.lock");
}

function readOwner(file: string) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function removeStaleLock(file: string) {
  if (!fs.existsSync(file)) return true;
  const owner = readOwner(file);
  const localOwner = !owner?.hostname || String(owner.hostname) === os.hostname();
  const stale = localOwner && !processAlive(Number(owner?.pid || 0));
  if (!stale) return false;
  try {
    fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

export function acquireCcmServerInstanceLock(port: number, listenHost = "127.0.0.1"): ServerInstanceLock {
  const file = getLockFile();
  if (process.env.CCM_ALLOW_SHARED_DATA_DIR === "1") {
    return { bypassed: true, file, token: "", pid: process.pid, port, listenHost };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = crypto.randomBytes(16).toString("hex");
    const owner = {
      schema: "ccm-server-instance-lock-v1",
      token,
      pid: process.pid,
      port,
      listen_host: listenHost,
      hostname: os.hostname(),
      acquired_at: new Date().toISOString(),
      data_directory: path.dirname(path.dirname(file)),
    };
    try {
      const fd = fs.openSync(file, "wx", 0o600);
      try {
        fs.writeFileSync(fd, `${JSON.stringify(owner, null, 2)}\n`, "utf-8");
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      return { file, token, pid: process.pid, port, listenHost };
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      if (attempt === 0 && removeStaleLock(file)) continue;
      const current = readOwner(file) || {};
      throw new Error(
        `同一数据目录已有 CCM 服务运行`
        + `${current.pid ? `（PID ${current.pid}` : ""}`
        + `${current.port ? `，端口 ${current.port}` : ""}`
        + `${current.pid ? "）" : ""}。请停止旧实例，或为测试设置独立 HOME/CCM_TASK_STORE_DIR。`,
      );
    }
  }
  throw new Error("无法获取 CCM 数据目录实例锁");
}

export function releaseCcmServerInstanceLock(lock: ServerInstanceLock | null | undefined) {
  if (!lock || lock.bypassed) return false;
  const current = readOwner(lock.file);
  if (!current || String(current.token || "") !== lock.token || Number(current.pid || 0) !== lock.pid) return false;
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
  return {
    file,
    present: fs.existsSync(file),
    owner,
    active: !!owner && String(owner.hostname || "") === os.hostname() && processAlive(Number(owner.pid || 0)),
  };
}
