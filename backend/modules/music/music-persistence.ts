import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  getObservabilityDatabase,
  observabilityMeta,
  setObservabilityMeta,
  withImmediateObservabilityTransaction,
} from "../../system/observability-database";
import { CCM_DIR } from "../../core/utils";

const WORKSPACE_ID = "workspace";
const COMMANDS_V2_FILE = path.join(CCM_DIR, "music-remote-commands.json");
const COMMAND_V1_FILE = path.join(CCM_DIR, "music-remote-command.json");
const LIBRARY_V3_FILE = path.join(CCM_DIR, "music-library-state.json");
const DOWNLOADS_V1_FILE = path.join(CCM_DIR, "music-download-jobs.json");
const ACTIVE_COMMAND_STATES = ["pending", "resolving", "ready", "claimed", "playing", "needs_user_gesture"];
const TERMINAL_COMMAND_STATES = ["completed", "failed", "superseded", "cancelled"];

function now() {
  return new Date().toISOString();
}

function parseJson(value: any, fallback: any = {}) {
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
}

function commandFromRow(row: any) {
  if (!row) return null;
  return {
    schema: "ccm-music-playback-command-v3",
    version: 3,
    id: String(row.command_id),
    type: String(row.type || "play"),
    keyword: String(row.keyword || ""),
    request_text: String(row.request_text || ""),
    mode: String(row.mode || "auto"),
    source: String(row.source || ""),
    status: String(row.status || "pending"),
    generation: Number(row.generation || 0),
    attempts: Number(row.attempts || 0),
    decision: parseJson(row.decision_json, null),
    origin: parseJson(row.origin_json, null),
    lease_id: String(row.lease_id || "") || undefined,
    fencing_token: Number(row.fencing_token || 0) || undefined,
    claimed_at: row.claimed_at || undefined,
    lease_expires_at: row.lease_expires_at || undefined,
    result: parseJson(row.result_json, null),
    last_error: String(row.last_error || "") || undefined,
    created_at: String(row.created_at),
    terminal_at: row.terminal_at || undefined,
    updated_at: String(row.updated_at),
  };
}

function insertCommand(db: any, command: any, ignore = false) {
  const verb = ignore ? "INSERT OR IGNORE" : "INSERT";
  db.prepare(`
    ${verb} INTO music_playback_commands_v3(
      command_id, type, keyword, request_text, mode, source, status, generation,
      attempts, decision_json, origin_json, lease_id, fencing_token, claimed_at,
      lease_expires_at, result_json, last_error, created_at, terminal_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    command.id,
    command.type || "play",
    command.keyword || "",
    command.request_text || command.requestText || command.keyword || "",
    command.mode || "auto",
    command.source || "",
    command.status || "pending",
    Number(command.generation || 1),
    Number(command.attempts || 0),
    JSON.stringify(command.decision || {}),
    JSON.stringify(command.origin || {}),
    command.lease_id || "",
    Number(command.fencing_token || 0),
    command.claimed_at || null,
    command.lease_expires_at || null,
    JSON.stringify(command.result || {}),
    command.last_error || "",
    command.created_at || now(),
    command.terminal_at || null,
    command.updated_at || now(),
  );
}

function legacyCommands() {
  try {
    if (fs.existsSync(COMMANDS_V2_FILE)) {
      const value = JSON.parse(fs.readFileSync(COMMANDS_V2_FILE, "utf8"));
      return Array.isArray(value?.commands) ? value.commands : Array.isArray(value) ? value : [];
    }
  } catch {}
  try {
    if (fs.existsSync(COMMAND_V1_FILE)) {
      const value = JSON.parse(fs.readFileSync(COMMAND_V1_FILE, "utf8"));
      if (value?.id && value?.keyword && !value?.consumed) return [value];
    }
  } catch {}
  return [];
}

export function ensureMusicPersistenceMigrated() {
  if (!observabilityMeta("music.persistence.v3.commands-imported", false)) {
    withImmediateObservabilityTransaction(db => {
      const existing = Number(db.prepare("SELECT COUNT(*) AS count FROM music_playback_commands_v3").get()?.count || 0);
      if (!existing) {
        legacyCommands().forEach((item: any, index: number) => insertCommand(db, {
          ...item,
          id: String(item.id),
          type: String(item.type || "play"),
          keyword: String(item.keyword || ""),
          request_text: String(item.request_text || item.requestText || item.keyword || ""),
          mode: String(item.mode || "auto"),
          source: String(item.source || "legacy"),
          status: item.status || (item.consumed ? "completed" : "pending"),
          generation: Math.max(1, Number(item.generation || index + 1)),
          created_at: item.created_at || now(),
        }, true));
      }
    });
    setObservabilityMeta("music.persistence.v3.commands-imported", { at: now() });
  }
  ensureLibraryRow();
  ensureDownloadJobsImported();
}

function expireCommandLeases(db: any, leaseMs = 15_000) {
  const rows = db.prepare(`
    SELECT * FROM music_playback_commands_v3
    WHERE status IN ('claimed', 'playing') AND lease_expires_at IS NOT NULL AND lease_expires_at < ?
  `).all(now()) as any[];
  for (const row of rows) {
    if (Number(row.attempts || 0) >= 3) {
      db.prepare(`
        UPDATE music_playback_commands_v3
        SET status = 'failed', terminal_at = ?, lease_id = '', lease_expires_at = NULL,
            last_error = COALESCE(NULLIF(last_error, ''), '播放指令租约已耗尽'), updated_at = ?
        WHERE command_id = ?
      `).run(now(), now(), row.command_id);
    } else {
      db.prepare(`
        UPDATE music_playback_commands_v3
        SET status = CASE WHEN decision_json <> '{}' THEN 'ready' ELSE 'pending' END,
            lease_id = '', lease_expires_at = NULL, claimed_at = NULL,
            last_error = '播放指令租约过期，等待重新领取', updated_at = ?
        WHERE command_id = ?
      `).run(now(), row.command_id);
    }
  }
  return leaseMs;
}

export function listPersistedMusicCommands(limit = 200) {
  ensureMusicPersistenceMigrated();
  return withImmediateObservabilityTransaction(db => {
    expireCommandLeases(db);
    return (db.prepare(`
      SELECT * FROM music_playback_commands_v3 ORDER BY generation ASC LIMIT ?
    `).all(Math.max(1, Math.min(1000, limit))) as any[]).map(commandFromRow);
  });
}

export function replacePersistedMusicCommandsForTest(commands: any[]) {
  ensureMusicPersistenceMigrated();
  withImmediateObservabilityTransaction(db => {
    db.prepare("DELETE FROM music_playback_commands_v3").run();
    (commands || []).forEach((command, index) => insertCommand(db, {
      ...command,
      generation: Math.max(1, Number(command.generation || index + 1)),
    }));
  });
}

export function enqueuePersistedMusicCommand(input: any) {
  ensureMusicPersistenceMigrated();
  return withImmediateObservabilityTransaction(db => {
    expireCommandLeases(db);
    const generation = Number(db.prepare("SELECT COALESCE(MAX(generation), 0) AS value FROM music_playback_commands_v3").get()?.value || 0) + 1;
    const timestamp = now();
    const type = String(input?.type || "play") || "play";
    if (type === "play") {
      db.prepare(`
        UPDATE music_playback_commands_v3
        SET status = 'superseded', terminal_at = ?, lease_id = '', lease_expires_at = NULL,
            last_error = '已被更新的点歌请求替代', updated_at = ?
        WHERE type = 'play' AND status IN (${ACTIVE_COMMAND_STATES.map(() => "?").join(",")})
      `).run(timestamp, timestamp, ...ACTIVE_COMMAND_STATES);
    } else if (type === "stop") {
      db.prepare(`
        UPDATE music_playback_commands_v3
        SET status = 'cancelled', terminal_at = ?, lease_id = '', lease_expires_at = NULL,
            last_error = '已由停止指令取消', updated_at = ?
        WHERE type = 'play' AND status IN (${ACTIVE_COMMAND_STATES.map(() => "?").join(",")})
      `).run(timestamp, timestamp, ...ACTIVE_COMMAND_STATES);
    }
    const command = {
      id: `music_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
      type,
      keyword: String(input?.keyword || "").trim() || (type === "stop" ? "__stop__" : ""),
      request_text: String(input?.request_text || input?.requestText || input?.keyword || "").trim(),
      mode: String(input?.mode || "auto").trim() || "auto",
      source: String(input?.source || "global-agent"),
      status: input?.decision ? "ready" : "pending",
      generation,
      attempts: 0,
      decision: input?.decision || null,
      origin: input?.origin || null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    if (!command.keyword) throw new Error("缺少音乐关键词");
    insertCommand(db, command);
    db.prepare(`
      DELETE FROM music_playback_commands_v3
      WHERE command_id IN (
        SELECT command_id FROM music_playback_commands_v3
        WHERE status IN ('completed','failed','superseded','cancelled')
        ORDER BY generation DESC LIMIT -1 OFFSET 500
      )
    `).run();
    return commandFromRow(db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id = ?").get(command.id));
  });
}

export function peekPersistedMusicCommand() {
  ensureMusicPersistenceMigrated();
  return withImmediateObservabilityTransaction(db => {
    expireCommandLeases(db);
    return commandFromRow(db.prepare(`
      SELECT * FROM music_playback_commands_v3
      WHERE status IN ('ready','pending') ORDER BY generation DESC LIMIT 1
    `).get());
  });
}

export function claimPersistedMusicCommand(input: { id?: string; generation?: number; leaseMs?: number }) {
  ensureMusicPersistenceMigrated();
  return withImmediateObservabilityTransaction(db => {
    expireCommandLeases(db);
    const row = input.id
      ? db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id = ?").get(input.id)
      : db.prepare("SELECT * FROM music_playback_commands_v3 WHERE status IN ('ready','pending') ORDER BY generation DESC LIMIT 1").get();
    if (!row || !["ready", "pending"].includes(String(row.status))) return null;
    if (input.generation && Number(input.generation) !== Number(row.generation)) return null;
    const decision = parseJson(row.decision_json, null);
    if (decision?.expiresAt && Date.parse(String(decision.expiresAt)) <= Date.now()) {
      db.prepare(`
        UPDATE music_playback_commands_v3 SET status='failed', terminal_at=?, last_error=?,
          updated_at=? WHERE command_id=? AND status IN ('ready','pending')
      `).run(now(), "播放决定已过期，请重新点歌", now(), row.command_id);
      return null;
    }
    const leaseId = `music_lease_${crypto.randomUUID()}`;
    const leaseMs = Math.max(5_000, Math.min(60_000, Number(input.leaseMs || 15_000)));
    const changed = db.prepare(`
      UPDATE music_playback_commands_v3
      SET status='claimed', lease_id=?, fencing_token=fencing_token+1, attempts=attempts+1,
          claimed_at=?, lease_expires_at=?, updated_at=?
      WHERE command_id=? AND status IN ('ready','pending')
    `).run(leaseId, now(), new Date(Date.now() + leaseMs).toISOString(), now(), row.command_id);
    if (changed.changes !== 1) return null;
    return commandFromRow(db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id = ?").get(row.command_id));
  });
}

export function heartbeatPersistedMusicCommand(input: any) {
  ensureMusicPersistenceMigrated();
  return withImmediateObservabilityTransaction(db => {
    expireCommandLeases(db);
    const row = db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id = ?").get(String(input.id || ""));
    if (!row) return { success: false, error: "指令不存在" };
    if (input.generation && Number(input.generation) !== Number(row.generation)) return { success: false, error: "播放generation不匹配" };
    if (input.lease_id && input.lease_id !== row.lease_id) return { success: false, error: "播放租约不匹配" };
    if (input.fencing_token && Number(input.fencing_token) !== Number(row.fencing_token)) return { success: false, error: "播放fencing token已失效" };
    if (!["claimed", "playing", "needs_user_gesture"].includes(String(row.status))) return { success: false, error: `当前状态不能续租：${row.status}` };
    const status = ["claimed", "playing", "needs_user_gesture"].includes(String(input.status)) ? input.status : row.status;
    db.prepare(`
      UPDATE music_playback_commands_v3
      SET status=?, lease_expires_at=?, updated_at=?
      WHERE command_id=? AND lease_id=? AND fencing_token=?
    `).run(status, new Date(Date.now() + 15_000).toISOString(), now(), row.command_id, row.lease_id, row.fencing_token);
    return { success: true, command: commandFromRow(db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id = ?").get(row.command_id)) };
  });
}

export function completePersistedMusicCommand(input: any) {
  ensureMusicPersistenceMigrated();
  return withImmediateObservabilityTransaction(db => {
    const row = db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id = ?").get(String(input.id || ""));
    if (!row) return { success: false, error: "指令不存在" };
    if (input.generation && Number(input.generation) !== Number(row.generation)) return { success: false, error: "播放generation不匹配" };
    if (input.lease_id && input.lease_id !== row.lease_id) return { success: false, error: "播放租约不匹配" };
    if (input.fencing_token && Number(input.fencing_token) !== Number(row.fencing_token)) return { success: false, error: "播放fencing token已失效" };
    if (TERMINAL_COMMAND_STATES.includes(String(row.status))) {
      if (row.status === input.status) return { success: true, duplicate: true, command: commandFromRow(row) };
      return { success: false, error: "播放指令已经进入不可修改的终态" };
    }
    const allowed = ["completed", "failed", "needs_user_gesture", "superseded", "cancelled"];
    if (!allowed.includes(String(input.status))) return { success: false, error: "无效播放终态" };
    if (["completed", "failed", "needs_user_gesture"].includes(String(input.status))
      && !["claimed", "playing", "needs_user_gesture"].includes(String(row.status))) {
      return { success: false, error: `当前状态不能提交播放结果：${row.status}` };
    }
    const terminalAt = input.status === "needs_user_gesture" ? null : now();
    db.prepare(`
      UPDATE music_playback_commands_v3
      SET status=?, result_json=?, last_error=?, lease_expires_at=NULL,
          terminal_at=?, updated_at=?
      WHERE command_id=? AND fencing_token=?
    `).run(input.status, JSON.stringify(input.result || {}), String(input.error || "").slice(0, 500), terminalAt, now(), row.command_id, row.fencing_token);
    return { success: true, command: commandFromRow(db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id = ?").get(row.command_id)) };
  });
}

export function requeuePersistedMusicCommand(input: { id: string; generation?: number; error?: string }) {
  ensureMusicPersistenceMigrated();
  return withImmediateObservabilityTransaction(db => {
    const row = db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id=?").get(input.id);
    if (!row) return { success: false, error: "指令不存在" };
    if (input.generation && Number(input.generation) !== Number(row.generation)) return { success: false, error: "播放generation不匹配" };
    if (TERMINAL_COMMAND_STATES.includes(String(row.status))) return { success: false, error: "播放指令已经进入不可修改的终态" };
    if (Number(row.attempts || 0) >= 3) {
      db.prepare(`
        UPDATE music_playback_commands_v3
        SET status='failed', terminal_at=?, lease_expires_at=NULL, last_error=?, updated_at=?
        WHERE command_id=? AND fencing_token=?
      `).run(now(), String(input.error || "播放失败").slice(0, 500), now(), row.command_id, row.fencing_token);
      return { success: true, command: commandFromRow(db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id=?").get(row.command_id)) };
    }
    db.prepare(`
      UPDATE music_playback_commands_v3
      SET status=CASE WHEN decision_json <> '{}' THEN 'ready' ELSE 'pending' END,
          lease_id='', lease_expires_at=NULL, claimed_at=NULL, last_error=?, updated_at=?
      WHERE command_id=? AND fencing_token=?
    `).run(String(input.error || "播放失败").slice(0, 500), now(), row.command_id, row.fencing_token);
    return { success: true, command: commandFromRow(db.prepare("SELECT * FROM music_playback_commands_v3 WHERE command_id=?").get(row.command_id)) };
  });
}

function defaultLibraryState() {
  return {
    version: 4,
    revision: 1,
    favorites: [],
    playlists: [],
    queue: [],
    queueSources: {},
    currentFilename: "",
    playMode: "list",
    history: [],
    updatedAt: now(),
  };
}

function ensureLibraryRow() {
  const db = getObservabilityDatabase();
  if (db.prepare("SELECT 1 FROM music_library_state_v4 WHERE workspace_id=?").get(WORKSPACE_ID)) return;
  let state = defaultLibraryState();
  try {
    if (fs.existsSync(LIBRARY_V3_FILE)) {
      const legacy = JSON.parse(fs.readFileSync(LIBRARY_V3_FILE, "utf8"));
      state = { ...state, ...legacy, version: 4, revision: 1, updatedAt: now() };
    }
  } catch {}
  db.prepare(`
    INSERT OR IGNORE INTO music_library_state_v4(workspace_id, revision, state_json, updated_at)
    VALUES (?, 1, ?, ?)
  `).run(WORKSPACE_ID, JSON.stringify(state), now());
}

export function readPersistedLibraryState() {
  ensureLibraryRow();
  const row = getObservabilityDatabase().prepare("SELECT * FROM music_library_state_v4 WHERE workspace_id=?").get(WORKSPACE_ID);
  const state = parseJson(row?.state_json, defaultLibraryState());
  return { ...defaultLibraryState(), ...state, version: 4, revision: Number(row?.revision || state.revision || 1), updatedAt: row?.updated_at || state.updatedAt };
}

export function mutatePersistedLibraryState(mutator: (state: any) => any, expectedRevision?: number) {
  ensureLibraryRow();
  return withImmediateObservabilityTransaction(db => {
    const row = db.prepare("SELECT * FROM music_library_state_v4 WHERE workspace_id=?").get(WORKSPACE_ID);
    const revision = Number(row?.revision || 1);
    if (expectedRevision !== undefined && Number(expectedRevision) !== revision) {
      const error: any = new Error("音乐库状态已经变化，请刷新后重试");
      error.code = "state_drift";
      error.statusCode = 409;
      error.currentRevision = revision;
      throw error;
    }
    const current = { ...defaultLibraryState(), ...parseJson(row?.state_json, {}) };
    const next = mutator(JSON.parse(JSON.stringify(current))) || current;
    next.version = 4;
    next.revision = revision + 1;
    next.updatedAt = now();
    const changed = db.prepare(`
      UPDATE music_library_state_v4 SET revision=?, state_json=?, updated_at=?
      WHERE workspace_id=? AND revision=?
    `).run(next.revision, JSON.stringify(next), next.updatedAt, WORKSPACE_ID, revision);
    if (changed.changes !== 1) {
      const error: any = new Error("音乐库状态已经变化，请刷新后重试");
      error.code = "state_drift";
      error.statusCode = 409;
      throw error;
    }
    return next;
  });
}

function ensureDownloadJobsImported() {
  if (observabilityMeta("music.persistence.v2.downloads-imported", false)) return;
  withImmediateObservabilityTransaction(db => {
    const count = Number(db.prepare("SELECT COUNT(*) AS count FROM music_download_jobs_v2").get()?.count || 0);
    if (!count) {
      try {
        const rows = JSON.parse(fs.readFileSync(DOWNLOADS_V1_FILE, "utf8"));
        for (const job of Array.isArray(rows) ? rows : []) upsertPersistedDownloadJob(job, db);
      } catch {}
    }
  });
  setObservabilityMeta("music.persistence.v2.downloads-imported", { at: now() });
}

export function upsertPersistedDownloadJob(job: any, suppliedDb?: any) {
  const db = suppliedDb || getObservabilityDatabase();
  db.prepare(`
    INSERT INTO music_download_jobs_v2(
      job_id, source, source_id, status, requested_quality, actual_quality,
      lease_id, fencing_token, lease_expires_at, command_id, consumer_kind,
      checkpoint, job_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(job_id) DO UPDATE SET
      status=excluded.status, requested_quality=excluded.requested_quality,
      actual_quality=excluded.actual_quality, lease_id=excluded.lease_id,
      fencing_token=excluded.fencing_token, lease_expires_at=excluded.lease_expires_at,
      command_id=excluded.command_id, consumer_kind=excluded.consumer_kind,
      checkpoint=excluded.checkpoint, job_json=excluded.job_json, updated_at=excluded.updated_at
  `).run(
    job.id, job.source, String(job.sourceId), job.status,
    job.requestedQuality || job.quality || "high", job.actualQuality || "",
    job.leaseId || "", Number(job.fencingToken || 0), job.leaseExpiresAt || null,
    job.commandId || "", job.consumerKind || "manual", job.checkpoint || job.phase || "",
    JSON.stringify(job), job.createdAt || now(), job.updatedAt || now(),
  );
  return job;
}

export function listPersistedDownloadJobs() {
  ensureMusicPersistenceMigrated();
  return (getObservabilityDatabase().prepare(`
    SELECT job_json FROM music_download_jobs_v2 ORDER BY created_at DESC LIMIT 500
  `).all() as any[]).map(row => parseJson(row.job_json, null)).filter(Boolean);
}

export function deletePersistedDownloadJob(id: string) {
  ensureMusicPersistenceMigrated();
  return getObservabilityDatabase().prepare("DELETE FROM music_download_jobs_v2 WHERE job_id=?").run(id).changes > 0;
}

export function findMusicMediaAsset(source: string, sourceId: string) {
  return getObservabilityDatabase().prepare(`
    SELECT * FROM music_media_assets_v2 WHERE source=? AND source_id=?
  `).get(source, String(sourceId)) as any;
}

export function findMusicMediaAssetByChecksum(checksum: string) {
  return getObservabilityDatabase().prepare(`
    SELECT * FROM music_media_assets_v2 WHERE file_checksum=? LIMIT 1
  `).get(checksum) as any;
}

export function upsertMusicMediaAsset(asset: any) {
  const timestamp = now();
  getObservabilityDatabase().prepare(`
    INSERT INTO music_media_assets_v2(
      asset_id, source, source_id, filename, display_name, requested_quality,
      actual_quality, bitrate, sample_rate, channels, duration_seconds, format,
      file_size, file_checksum, updated_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, source_id) DO UPDATE SET
      filename=excluded.filename, display_name=excluded.display_name,
      requested_quality=excluded.requested_quality, actual_quality=excluded.actual_quality,
      bitrate=excluded.bitrate, sample_rate=excluded.sample_rate, channels=excluded.channels,
      duration_seconds=excluded.duration_seconds, format=excluded.format,
      file_size=excluded.file_size, file_checksum=excluded.file_checksum,
      updated_at=excluded.updated_at
  `).run(
    asset.assetId || `music_asset_${crypto.randomUUID()}`,
    asset.source, String(asset.sourceId), asset.filename, asset.displayName || asset.filename,
    asset.requestedQuality || "", asset.actualQuality || "", Number(asset.bitrate || 0),
    Number(asset.sampleRate || 0), Number(asset.channels || 0), Number(asset.durationSeconds || 0),
    asset.format || "", Number(asset.fileSize || 0), asset.fileChecksum || "", timestamp,
    asset.createdAt || timestamp,
  );
  return findMusicMediaAsset(asset.source, asset.sourceId);
}

export function activeMusicCatalogGeneration() {
  return Number(observabilityMeta("music.catalog.active-generation", 0) || 0);
}

export function setActiveMusicCatalogGeneration(generation: number) {
  setObservabilityMeta("music.catalog.active-generation", generation);
}

export function getMusicCatalogStatus() {
  const db = getObservabilityDatabase();
  const activeGeneration = activeMusicCatalogGeneration();
  const active = activeGeneration
    ? db.prepare("SELECT * FROM music_catalog_generations_v4 WHERE generation=?").get(activeGeneration)
    : null;
  const building = db.prepare(`
    SELECT * FROM music_catalog_generations_v4 WHERE status='building' ORDER BY generation DESC LIMIT 1
  `).get();
  return {
    schema: "ccm-music-catalog-status-v4",
    activeGeneration,
    indexStatus: building ? "indexing" : active ? "ready" : "index_building",
    active: active || null,
    building: building || null,
  };
}

export function listMusicCatalogTracks(input: { cursor?: number; limit?: number; query?: string } = {}) {
  const db = getObservabilityDatabase();
  const generation = activeMusicCatalogGeneration();
  if (!generation) return { tracks: [], total: 0, nextCursor: null, generation: 0 };
  const cursor = Math.max(0, Number(input.cursor || 0));
  const limit = Math.max(1, Math.min(500, Number(input.limit || 200)));
  const query = String(input.query || "").trim().toLowerCase();
  const filter = query ? "AND (LOWER(title) LIKE ? OR LOWER(artist) LIKE ? OR LOWER(filename) LIKE ?)" : "";
  const args = query ? [`%${query}%`, `%${query}%`, `%${query}%`] : [];
  const total = Number(db.prepare(`
    SELECT COUNT(*) AS count FROM music_catalog_tracks_v4 WHERE generation=? ${filter}
  `).get(generation, ...args)?.count || 0);
  const rows = db.prepare(`
    SELECT * FROM music_catalog_tracks_v4
    WHERE generation=? ${filter}
    ORDER BY title COLLATE NOCASE, filename COLLATE NOCASE LIMIT ? OFFSET ?
  `).all(generation, ...args, limit, cursor) as any[];
  return {
    generation,
    total,
    tracks: rows,
    nextCursor: cursor + rows.length < total ? cursor + rows.length : null,
  };
}
