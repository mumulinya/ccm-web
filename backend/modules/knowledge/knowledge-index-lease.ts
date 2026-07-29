import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";

const ROOT = path.join(os.homedir(), ".cc-connect", "private");
const LEASE_FILE = path.join(ROOT, "knowledge-index-v3.lease.json");
const DEFAULT_LEASE_MS = 15 * 60_000;

export type KnowledgeIndexLease = {
  schema: "ccm-knowledge-index-lease-v1";
  ownerId: string;
  pid: number;
  hostname: string;
  acquiredAt: string;
  expiresAt: string;
  reason: string;
};

function readLease(): KnowledgeIndexLease | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(LEASE_FILE, "utf-8"));
    return parsed?.schema === "ccm-knowledge-index-lease-v1" ? parsed : null;
  } catch { return null; }
}

function processAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function activeLease(lease: KnowledgeIndexLease | null) {
  if (!lease) return false;
  if (Date.parse(lease.expiresAt) <= Date.now()) return false;
  if (lease.hostname === os.hostname() && !processAlive(lease.pid)) return false;
  return true;
}

export function inspectKnowledgeIndexLease() {
  const lease = readLease();
  return { active: activeLease(lease), lease };
}

export function acquireKnowledgeIndexLease(reason: string, leaseMs = DEFAULT_LEASE_MS) {
  fs.mkdirSync(ROOT, { recursive: true });
  try { fs.chmodSync(ROOT, 0o700); } catch {}
  const existing = readLease();
  if (activeLease(existing)) return { acquired: false, lease: existing };
  if (existing) {
    try { fs.unlinkSync(LEASE_FILE); } catch {}
  }
  const now = Date.now();
  const lease: KnowledgeIndexLease = {
    schema: "ccm-knowledge-index-lease-v1",
    ownerId: randomUUID(),
    pid: process.pid,
    hostname: os.hostname(),
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + Math.max(60_000, leaseMs)).toISOString(),
    reason: String(reason || "knowledge-index").slice(0, 120),
  };
  try {
    fs.writeFileSync(LEASE_FILE, JSON.stringify(lease), { encoding: "utf-8", mode: 0o600, flag: "wx" });
    return { acquired: true, lease };
  } catch {
    return { acquired: false, lease: readLease() };
  }
}

export function renewKnowledgeIndexLease(ownerId: string, leaseMs = DEFAULT_LEASE_MS) {
  const current = readLease();
  if (!current || current.ownerId !== ownerId) return false;
  const next = { ...current, expiresAt: new Date(Date.now() + Math.max(60_000, leaseMs)).toISOString() };
  fs.writeFileSync(LEASE_FILE, JSON.stringify(next), { encoding: "utf-8", mode: 0o600 });
  return true;
}

export function releaseKnowledgeIndexLease(ownerId: string) {
  const current = readLease();
  if (!current || current.ownerId !== ownerId) return false;
  try { fs.unlinkSync(LEASE_FILE); } catch { return false; }
  return true;
}

export async function waitForKnowledgeIndexLeaseRelease(timeoutMs = 60_000) {
  const deadline = Date.now() + Math.max(1_000, timeoutMs);
  while (Date.now() < deadline) {
    if (!inspectKnowledgeIndexLease().active) return true;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return !inspectKnowledgeIndexLease().active;
}

