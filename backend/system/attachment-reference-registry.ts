import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { loadTasks } from "../core/db";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { CCM_DIR, UPLOAD_DIR } from "../core/utils";

const REGISTRY_FILE = path.join(CCM_DIR, "attachment-references-v2.json");
const SECURE_UPLOAD_NAME = /^\d{13}-[0-9a-f]{16}\.[a-z0-9]+$/i;

function safeUploadPath(value: any) {
  const target = path.resolve(String(value || ""));
  const root = `${path.resolve(UPLOAD_DIR)}${path.sep}`;
  return target.startsWith(root) ? target : "";
}

function attachmentPaths(task: any) {
  return (Array.isArray(task?.source_attachments) ? task.source_attachments : [])
    .map((item: any) => safeUploadPath(item?.path || item?.savedPath))
    .filter(Boolean);
}

function secureUploadFiles() {
  if (!fs.existsSync(UPLOAD_DIR)) return [];
  return fs.readdirSync(UPLOAD_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile() && SECURE_UPLOAD_NAME.test(entry.name))
    .map(entry => path.join(UPLOAD_DIR, entry.name));
}

export function reconcileAttachmentReferences(tasks: any[] = loadTasks()) {
  return withFileLock(REGISTRY_FILE, () => {
    const references = new Map<string, Set<string>>();
    for (const task of tasks) {
      for (const file of attachmentPaths(task)) {
        if (!references.has(file)) references.set(file, new Set());
        references.get(file)!.add(String(task.id || ""));
      }
    }
    const now = new Date().toISOString();
    const items = secureUploadFiles().map(file => {
      const stat = fs.statSync(file);
      const taskIds = [...(references.get(file) || new Set<string>())].filter(Boolean).sort();
      return {
        id: path.basename(file),
        path_checksum: crypto.createHash("sha256").update(file).digest("hex"),
        bytes: stat.size,
        created_at: stat.birthtime.toISOString(),
        updated_at: stat.mtime.toISOString(),
        reference_count: taskIds.length,
        task_ids: taskIds,
      };
    });
    const value = { schema: "ccm-attachment-reference-registry-v2", version: 2, updated_at: now, items };
    writeJsonAtomic(REGISTRY_FILE, value);
    return value;
  }, { timeoutMs: 30_000, staleMs: 5 * 60_000 });
}

export function listOrphanAttachments(minAgeMs = 24 * 60 * 60_000) {
  const registry = reconcileAttachmentReferences();
  const cutoff = Date.now() - Math.max(60_000, Number(minAgeMs || 0));
  return registry.items.filter((item: any) => item.reference_count === 0 && Date.parse(item.updated_at) <= cutoff);
}

export function purgeOrphanAttachment(id: string, minAgeMs = 24 * 60 * 60_000) {
  const name = path.basename(String(id || ""));
  const candidate = listOrphanAttachments(minAgeMs).find((item: any) => item.id === name);
  if (!candidate) throw new Error("附件已被引用、尚未达到保留期或已不存在");
  const target = safeUploadPath(path.join(UPLOAD_DIR, name));
  if (!target || !SECURE_UPLOAD_NAME.test(name)) throw new Error("无效的孤立附件身份");
  const bytes = fs.existsSync(target) ? fs.statSync(target).size : 0;
  if (fs.existsSync(target)) fs.unlinkSync(target);
  reconcileAttachmentReferences();
  return { id: name, bytes, removed: true };
}

export function cleanupStaleUploadStaging(minAgeMs = 60 * 60_000) {
  const staging = path.join(UPLOAD_DIR, ".staging");
  if (!fs.existsSync(staging)) return { removed: 0, bytes: 0 };
  let removed = 0;
  let bytes = 0;
  const cutoff = Date.now() - Math.max(60_000, minAgeMs);
  for (const entry of fs.readdirSync(staging, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(staging, entry.name);
    const stat = fs.statSync(file);
    if (stat.mtimeMs > cutoff) continue;
    bytes += stat.size;
    fs.unlinkSync(file);
    removed += 1;
  }
  return { removed, bytes };
}

export function readAttachmentReferenceRegistry() {
  return readJsonWithBackup(REGISTRY_FILE, { schema: "ccm-attachment-reference-registry-v2", version: 2, updated_at: "", items: [] });
}
