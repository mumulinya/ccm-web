import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { getObservabilityDatabase } from "../../system/observability-database";
import { MUSIC_DIR } from "./library";
import { musicLibraryState } from "./library-state";
import { queryMusicCatalog, resolveSafeMusicFile, scheduleMusicCatalogRescan } from "./music-catalog";

const QUALITY_WEIGHT: Record<string, number> = {
  ".flac": 600,
  ".wav": 550,
  ".m4a": 450,
  ".aac": 400,
  ".ogg": 350,
  ".mp3": 300,
};

function normalizeIdentity(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\[(（【](?:hi[- ]?res|lossless|无损|高音质|标准音质|live|现场|伴奏|纯享|official|mv|歌词版|完整版|remaster(?:ed)?|\d{3,4}kbps)[\])）】]/gi, " ")
    .replace(/(?:[-_ ]copy|副本|\(\d+\)|（\d+）)$/gi, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

const QUARANTINE_DIR = path.join(CCM_DIR, "music", ".quarantine");

function qualityScore(filename: string, size: number, bitrate: number, sampleRate: number) {
  const extension = path.extname(filename).toLowerCase();
  return Math.max(0, bitrate || 0) * 10_000_000
    + Math.max(0, sampleRate || 0) * 1_000
    + (QUALITY_WEIGHT[extension] || 0) * 100
    + Math.min(99, Math.max(0, size || 0) / 1024 / 1024);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function allCatalogTracks() {
  const tracks: any[] = [];
  let cursor: number | undefined = 0;
  do {
    const page = queryMusicCatalog({ cursor, limit: 500 });
    tracks.push(...page.tracks);
    cursor = page.nextCursor == null ? undefined : page.nextCursor;
  } while (cursor != null);
  return tracks;
}

export function scanMusicDuplicates() {
  const files = allCatalogTracks().filter(track => {
    if (track.state !== "ready") return false;
    try {
      resolveSafeMusicFile(track.filename);
      return true;
    } catch {
      return false;
    }
  });
  const groups = new Map<string, any[]>();
  for (const track of files) {
    try {
      const filename = track.filename;
      const titleKey = normalizeIdentity(track.title);
      const artistKey = normalizeIdentity(track.artist === "未知艺术家" ? "" : track.artist);
      if (!titleKey) continue;
      const key = `${titleKey}::${artistKey}`;
      const extension = path.extname(filename).toLowerCase();
      const item = {
        ...track,
        extension: extension.slice(1).toUpperCase(),
        source: "本地曲库",
        relativePath: `music/${filename}`,
        sizeLabel: formatBytes(track.size),
        qualityScore: qualityScore(filename, track.size, track.bitrate, track.sampleRate),
      };
      groups.set(key, [...(groups.get(key) || []), item]);
    } catch {}
  }

  return Array.from(groups.entries())
    .filter(([, items]) => items.length > 1)
    .map(([id, items]) => {
      const sorted = [...items].sort((a, b) => b.qualityScore - a.qualityScore || b.modified.localeCompare(a.modified));
      return {
        id,
        title: sorted[0].title,
        artist: sorted[0].artist,
        recommendedFilename: sorted[0].filename,
        items: sorted.map(({ qualityScore: _qualityScore, ...item }) => item),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function writeTransaction(transaction: any) {
  getObservabilityDatabase().prepare(`
    INSERT INTO music_duplicate_transactions_v1(
      transaction_id, status, keep_filename, remove_json, quarantine_json,
      result_json, error, created_at, updated_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(transaction_id) DO UPDATE SET
      status=excluded.status, quarantine_json=excluded.quarantine_json,
      result_json=excluded.result_json, error=excluded.error, updated_at=excluded.updated_at
  `).run(
    transaction.transactionId,
    transaction.status,
    transaction.keepFilename,
    JSON.stringify(transaction.removeFilenames || []),
    JSON.stringify(transaction.quarantine || []),
    JSON.stringify(transaction.result || {}),
    transaction.error || "",
    transaction.createdAt,
    transaction.updatedAt,
  );
}

function readTransaction(transactionId: string) {
  const row = getObservabilityDatabase().prepare(`
    SELECT * FROM music_duplicate_transactions_v1 WHERE transaction_id=?
  `).get(transactionId) as any;
  if (!row) throw new Error("重复项事务不存在");
  return {
    transactionId: row.transaction_id,
    status: row.status,
    keepFilename: row.keep_filename,
    removeFilenames: JSON.parse(row.remove_json || "[]"),
    quarantine: JSON.parse(row.quarantine_json || "[]"),
    result: JSON.parse(row.result_json || "{}"),
    error: row.error || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mergeMusicDuplicateGroup(keepFilename: string, removeFilenames: string[]) {
  const keep = String(keepFilename || "");
  const remove = Array.from(new Set((Array.isArray(removeFilenames) ? removeFilenames : []).map(String)))
    .filter(filename => filename && filename !== keep);
  const group = scanMusicDuplicates().find(item => (
    item.items.some((track: any) => track.filename === keep)
    && remove.every(filename => item.items.some((track: any) => track.filename === filename))
  ));
  if (!group) throw new Error("重复项已经变化，请重新扫描后再合并");
  if (!remove.length) throw new Error("没有需要合并的重复文件");

  resolveSafeMusicFile(keep);
  for (const filename of remove) {
    resolveSafeMusicFile(filename);
  }

  const timestamp = new Date().toISOString();
  const transaction = {
    transactionId: `music_dup_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
    status: "executing",
    keepFilename: keep,
    removeFilenames: remove,
    quarantine: [] as Array<{ filename: string; quarantinePath: string }>,
    result: { libraryStateBefore: musicLibraryState.get() } as any,
    error: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeTransaction(transaction);
  const transactionDir = path.join(QUARANTINE_DIR, transaction.transactionId);
  fs.mkdirSync(transactionDir, { recursive: true });
  try {
    for (const filename of remove) {
      const source = resolveSafeMusicFile(filename).filePath;
      const quarantinePath = path.join(transactionDir, filename);
      fs.renameSync(source, quarantinePath);
      transaction.quarantine.push({ filename, quarantinePath });
      transaction.updatedAt = new Date().toISOString();
      writeTransaction(transaction);
    }
    musicLibraryState.replaceTrackReferences(keep, remove);
    transaction.status = "completed";
    transaction.result = {
      ...transaction.result,
      kept: keep,
      quarantined: remove,
      libraryStateAfterRevision: musicLibraryState.get().revision,
    };
    transaction.updatedAt = new Date().toISOString();
    writeTransaction(transaction);
    scheduleMusicCatalogRescan("duplicates_merged");
    return {
      transactionId: transaction.transactionId,
      status: transaction.status,
      kept: keep,
      deleted: remove,
      quarantined: remove,
      groups: scanMusicDuplicates(),
    };
  } catch (error: any) {
    transaction.status = "recovery_required";
    transaction.error = error?.message || "合并重复歌曲失败";
    transaction.updatedAt = new Date().toISOString();
    writeTransaction(transaction);
    throw Object.assign(new Error(transaction.error), { transactionId: transaction.transactionId });
  }
}

export function rollbackMusicDuplicateTransaction(transactionId: string) {
  const transaction = readTransaction(transactionId);
  if (!["completed", "recovery_required"].includes(transaction.status)) {
    throw new Error("当前事务不能回滚");
  }
  for (const item of transaction.quarantine) {
    const target = path.join(MUSIC_DIR, path.basename(item.filename));
    if (fs.existsSync(target)) throw new Error(`目标文件已经存在，无法回滚：${item.filename}`);
    if (fs.existsSync(item.quarantinePath)) fs.renameSync(item.quarantinePath, target);
  }
  if (transaction.result?.libraryStateBefore) {
    musicLibraryState.restoreSnapshot(transaction.result.libraryStateBefore);
  }
  transaction.status = "rolled_back";
  transaction.updatedAt = new Date().toISOString();
  transaction.error = "";
  writeTransaction(transaction);
  scheduleMusicCatalogRescan("duplicates_rollback");
  return transaction;
}

export function retryMusicDuplicateTransaction(transactionId: string) {
  const transaction = readTransaction(transactionId);
  if (transaction.status !== "recovery_required") throw new Error("只有待恢复事务可以重试");
  const transactionDir = path.join(QUARANTINE_DIR, transaction.transactionId);
  fs.mkdirSync(transactionDir, { recursive: true });
  for (const filename of transaction.removeFilenames) {
    const quarantined = transaction.quarantine.find((item: any) => item.filename === filename);
    if (quarantined && fs.existsSync(quarantined.quarantinePath)) continue;
    const source = resolveSafeMusicFile(filename).filePath;
    const quarantinePath = path.join(transactionDir, path.basename(filename));
    fs.renameSync(source, quarantinePath);
    transaction.quarantine = transaction.quarantine
      .filter((item: any) => item.filename !== filename)
      .concat({ filename, quarantinePath });
    transaction.updatedAt = new Date().toISOString();
    writeTransaction(transaction);
  }
  musicLibraryState.replaceTrackReferences(transaction.keepFilename, transaction.removeFilenames);
  transaction.status = "completed";
  transaction.error = "";
  transaction.result = {
    ...transaction.result,
    kept: transaction.keepFilename,
    quarantined: transaction.removeFilenames,
    libraryStateAfterRevision: musicLibraryState.get().revision,
  };
  transaction.updatedAt = new Date().toISOString();
  writeTransaction(transaction);
  scheduleMusicCatalogRescan("duplicates_retry");
  return transaction;
}
