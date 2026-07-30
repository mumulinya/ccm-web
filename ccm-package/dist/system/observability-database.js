"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSERVABILITY_DATABASE_FILE = void 0;
exports.getObservabilityDatabase = getObservabilityDatabase;
exports.withImmediateObservabilityTransaction = withImmediateObservabilityTransaction;
exports.observabilityMeta = observabilityMeta;
exports.setObservabilityMeta = setObservabilityMeta;
exports.closeObservabilityDatabaseForTests = closeObservabilityDatabaseForTests;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const STORE_DIR = path.resolve(process.env.CCM_TASK_STORE_DIR || path.join(os.homedir(), ".cc-connect"));
exports.OBSERVABILITY_DATABASE_FILE = path.join(STORE_DIR, "ccm.db");
let database = null;
function createSchema(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS reliability_traces_v2 (
      trace_id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL DEFAULT '',
      group_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      event_count INTEGER NOT NULL DEFAULT 0,
      last_sequence INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_reliability_traces_v2_updated ON reliability_traces_v2(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reliability_traces_v2_task ON reliability_traces_v2(task_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS reliability_trace_events_v2 (
      trace_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      at TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      task_id TEXT NOT NULL DEFAULT '',
      group_id TEXT NOT NULL DEFAULT '',
      agent TEXT NOT NULL DEFAULT '',
      runtime TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      data_json TEXT NOT NULL DEFAULT '{}',
      data_checksum TEXT NOT NULL DEFAULT '',
      PRIMARY KEY(trace_id, event_id),
      UNIQUE(trace_id, sequence),
      FOREIGN KEY(trace_id) REFERENCES reliability_traces_v2(trace_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reliability_trace_events_v2_task ON reliability_trace_events_v2(task_id, at, sequence);
    CREATE INDEX IF NOT EXISTS idx_reliability_trace_events_v2_trace_sequence ON reliability_trace_events_v2(trace_id, sequence);

    CREATE TABLE IF NOT EXISTS reliability_idempotency_v2 (
      scope TEXT NOT NULL,
      key_checksum TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      status TEXT NOT NULL,
      owner_id TEXT NOT NULL DEFAULT '',
      owner_pid INTEGER NOT NULL DEFAULT 0,
      owner_host TEXT NOT NULL DEFAULT '',
      attempt INTEGER NOT NULL DEFAULT 0,
      fencing_token INTEGER NOT NULL DEFAULT 0,
      duplicate_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      lease_expires_at TEXT,
      completed_at TEXT,
      failed_at TEXT,
      last_duplicate_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      result_json TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY(scope, key_checksum)
    );
    CREATE INDEX IF NOT EXISTS idx_reliability_idempotency_v2_trace ON reliability_idempotency_v2(trace_id, status);
    CREATE INDEX IF NOT EXISTS idx_reliability_idempotency_v2_status ON reliability_idempotency_v2(status, lease_expires_at);

    CREATE TABLE IF NOT EXISTS reliability_task_leases_v2 (
      task_id TEXT PRIMARY KEY,
      lease_id TEXT NOT NULL,
      fencing_token INTEGER NOT NULL,
      trace_id TEXT NOT NULL,
      status TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_pid INTEGER NOT NULL,
      owner_host TEXT NOT NULL,
      acquired_at TEXT NOT NULL,
      renewed_at TEXT NOT NULL,
      expires_at TEXT,
      released_at TEXT,
      final_status TEXT NOT NULL DEFAULT '',
      recovery_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reliability_task_leases_v2_status ON reliability_task_leases_v2(status, expires_at);

    CREATE TABLE IF NOT EXISTS metric_events_v3 (
      event_id TEXT PRIMARY KEY,
      at TEXT NOT NULL,
      date_key TEXT NOT NULL,
      timezone TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      group_id TEXT NOT NULL DEFAULT '',
      project_id TEXT NOT NULL DEFAULT '',
      agent TEXT NOT NULL,
      role TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      runtime TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      file_change_count INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost_usd REAL NOT NULL DEFAULT 0,
      trace_id TEXT NOT NULL DEFAULT '',
      task_id TEXT NOT NULL DEFAULT '',
      execution_id TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      usage_reported INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metric_events_v3_scope_time ON metric_events_v3(scope_type, scope_id, at DESC);
    CREATE INDEX IF NOT EXISTS idx_metric_events_v3_status_time ON metric_events_v3(status, at DESC);
    CREATE INDEX IF NOT EXISTS idx_metric_events_v3_task ON metric_events_v3(task_id, at DESC);
    CREATE INDEX IF NOT EXISTS idx_metric_events_v3_date ON metric_events_v3(date_key, scope_type, scope_id);

    CREATE TABLE IF NOT EXISTS metric_aggregates_v3 (
      bucket_date TEXT NOT NULL DEFAULT '',
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      role TEXT NOT NULL,
      agent TEXT NOT NULL,
      calls INTEGER NOT NULL DEFAULT 0,
      successes INTEGER NOT NULL DEFAULT 0,
      failures INTEGER NOT NULL DEFAULT 0,
      blocked INTEGER NOT NULL DEFAULT 0,
      cancelled INTEGER NOT NULL DEFAULT 0,
      unknown INTEGER NOT NULL DEFAULT 0,
      total_ms INTEGER NOT NULL DEFAULT 0,
      total_file_changes INTEGER NOT NULL DEFAULT 0,
      last_file_change_count INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost_usd REAL NOT NULL DEFAULT 0,
      usage_reported_calls INTEGER NOT NULL DEFAULT 0,
      duration_samples_json TEXT NOT NULL DEFAULT '[]',
      last_call TEXT NOT NULL DEFAULT '',
      PRIMARY KEY(bucket_date, scope_type, scope_id, role, agent)
    );
    CREATE TABLE IF NOT EXISTS reliability_drill_runs_v2 (
      run_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'production',
      status TEXT NOT NULL,
      checkpoint TEXT NOT NULL DEFAULT 'queued',
      owner_instance TEXT,
      pid INTEGER,
      lease_id TEXT,
      fencing_token INTEGER NOT NULL DEFAULT 0,
      requested_by TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      result_json TEXT,
      error_summary TEXT,
      log_summary TEXT,
      cleanup_status TEXT,
      cancel_requested INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_reliability_drill_runs_status ON reliability_drill_runs_v2(status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS cleanup_transactions_v2 (
      transaction_id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      preview_token_checksum TEXT NOT NULL,
      preview_checksum TEXT NOT NULL,
      retention_days INTEGER NOT NULL,
      requested_by TEXT,
      confirmation_phrase TEXT,
      lease_id TEXT,
      fencing_token INTEGER NOT NULL DEFAULT 0,
      owner_instance TEXT,
      requested_count INTEGER NOT NULL DEFAULT 0,
      processed_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      released_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      error_summary TEXT,
      cancel_requested INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cleanup_transactions_status ON cleanup_transactions_v2(status, updated_at DESC);
    CREATE TABLE IF NOT EXISTS cleanup_previews_v2 (
      token_checksum TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      retention_days INTEGER NOT NULL,
      preview_checksum TEXT NOT NULL,
      candidates_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_cleanup_previews_expiry ON cleanup_previews_v2(expires_at, consumed_at);
    CREATE TABLE IF NOT EXISTS cleanup_transaction_steps_v2 (
      transaction_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_checksum TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result_json TEXT,
      error_summary TEXT,
      started_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(transaction_id, item_id),
      FOREIGN KEY(transaction_id) REFERENCES cleanup_transactions_v2(transaction_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_cleanup_steps_status ON cleanup_transaction_steps_v2(transaction_id, status, sequence);

    CREATE TABLE IF NOT EXISTS storage_index_snapshots_v2 (
      generation TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      progress_json TEXT,
      summary_json TEXT,
      error_summary TEXT,
      active INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_storage_index_active ON storage_index_snapshots_v2(active, completed_at DESC);
    CREATE TABLE IF NOT EXISTS task_replay_event_snapshots_v2 (
      task_id TEXT PRIMARY KEY,
      source_checksum TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      event_count INTEGER NOT NULL,
      summary_json TEXT
    );
    CREATE TABLE IF NOT EXISTS task_replay_events_v2 (
      task_id TEXT NOT NULL,
      source_checksum TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      event_id TEXT NOT NULL,
      at TEXT NOT NULL,
      stage TEXT,
      status TEXT,
      actor_type TEXT,
      event_json TEXT NOT NULL,
      PRIMARY KEY(task_id, source_checksum, event_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_replay_page ON task_replay_events_v2(task_id, source_checksum, sequence);

    CREATE TABLE IF NOT EXISTS conversation_search_generations_v3 (
      generation TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      source_count INTEGER NOT NULL DEFAULT 0,
      message_count INTEGER NOT NULL DEFAULT 0,
      degraded_source_count INTEGER NOT NULL DEFAULT 0,
      source_manifest_checksum TEXT NOT NULL DEFAULT '',
      error_summary TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_conversation_search_generation_active
      ON conversation_search_generations_v3(active, completed_at DESC);

    CREATE TABLE IF NOT EXISTS conversation_search_messages_v3 (
      generation TEXT NOT NULL,
      row_id TEXT NOT NULL,
      conversation_type TEXT NOT NULL,
      source TEXT NOT NULL,
      source_label TEXT NOT NULL,
      project_id TEXT NOT NULL DEFAULT '',
      group_id TEXT NOT NULL DEFAULT '',
      group_name TEXT NOT NULL DEFAULT '',
      session_id TEXT NOT NULL,
      session_name TEXT NOT NULL,
      message_id TEXT NOT NULL DEFAULT '',
      message_index INTEGER NOT NULL,
      role TEXT NOT NULL,
      agent TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      content_checksum TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT '',
      task_id TEXT NOT NULL DEFAULT '',
      task_title TEXT NOT NULL DEFAULT '',
      attachments_json TEXT NOT NULL DEFAULT '[]',
      source_identity TEXT NOT NULL,
      source_checksum TEXT NOT NULL,
      indexed_at TEXT NOT NULL,
      PRIMARY KEY(generation, row_id)
    );
    CREATE INDEX IF NOT EXISTS idx_conversation_search_messages_scope
      ON conversation_search_messages_v3(generation, conversation_type, session_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_conversation_search_messages_project
      ON conversation_search_messages_v3(generation, project_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_conversation_search_messages_group
      ON conversation_search_messages_v3(generation, group_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_conversation_search_messages_task
      ON conversation_search_messages_v3(generation, task_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS conversation_search_fts_v3 USING fts5(
      row_id UNINDEXED,
      generation UNINDEXED,
      content,
      tokenize='trigram'
    );

    CREATE TABLE IF NOT EXISTS conversation_search_short_terms_v3 (
      generation TEXT NOT NULL,
      row_id TEXT NOT NULL,
      term TEXT NOT NULL,
      PRIMARY KEY(generation, row_id, term)
    );
    CREATE INDEX IF NOT EXISTS idx_conversation_search_short_term
      ON conversation_search_short_terms_v3(generation, term, row_id);

    CREATE TABLE IF NOT EXISTS conversation_search_sources_v3 (
      generation TEXT NOT NULL,
      source_identity TEXT NOT NULL,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      source_checksum TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      error_summary TEXT NOT NULL DEFAULT '',
      indexed_at TEXT NOT NULL,
      PRIMARY KEY(generation, source_identity)
    );

    CREATE TABLE IF NOT EXISTS conversation_search_favorites_v3 (
      user_id TEXT NOT NULL,
      favorite_id TEXT NOT NULL,
      row_id TEXT NOT NULL,
      source_checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY(user_id, favorite_id)
    );
    CREATE INDEX IF NOT EXISTS idx_conversation_search_favorites_user
      ON conversation_search_favorites_v3(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS task_replay_source_manifests_v3 (
      task_id TEXT NOT NULL,
      generation TEXT NOT NULL,
      source_checksum TEXT NOT NULL,
      source_manifest_json TEXT NOT NULL,
      event_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(task_id, generation)
    );
    CREATE INDEX IF NOT EXISTS idx_task_replay_source_manifest_active
      ON task_replay_source_manifests_v3(task_id, active, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_metric_aggregates_v3_scope ON metric_aggregates_v3(scope_type, scope_id, bucket_date);

    CREATE TABLE IF NOT EXISTS user_notifications_v2 (
      notification_id TEXT PRIMARY KEY,
      recipient_user_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_channel TEXT NOT NULL DEFAULT '',
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL DEFAULT '',
      exact_session_id TEXT NOT NULL DEFAULT '',
      task_id TEXT NOT NULL DEFAULT '',
      notification_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      state TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      action_json TEXT NOT NULL DEFAULT '{}',
      dedupe_key TEXT NOT NULL,
      event_checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      read_at TEXT,
      dismissed_at TEXT,
      resolved_at TEXT,
      expires_at TEXT,
      UNIQUE(recipient_user_id, dedupe_key)
    );
    CREATE INDEX IF NOT EXISTS idx_user_notifications_v2_recipient
      ON user_notifications_v2(recipient_user_id, dismissed_at, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_v2_scope
      ON user_notifications_v2(scope_type, scope_id, exact_session_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_v2_task
      ON user_notifications_v2(task_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS user_notification_deliveries_v2 (
      delivery_id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      state TEXT NOT NULL,
      client_id TEXT NOT NULL DEFAULT '',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT,
      claimed_at TEXT,
      delivered_at TEXT,
      failed_at TEXT,
      last_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(notification_id, channel),
      FOREIGN KEY(notification_id) REFERENCES user_notifications_v2(notification_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_notification_deliveries_v2_pending
      ON user_notification_deliveries_v2(channel, state, next_attempt_at, created_at);

    CREATE TABLE IF NOT EXISTS music_playback_commands_v3 (
      command_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      keyword TEXT NOT NULL,
      request_text TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT 'auto',
      source TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      generation INTEGER NOT NULL UNIQUE,
      attempts INTEGER NOT NULL DEFAULT 0,
      decision_json TEXT NOT NULL DEFAULT '{}',
      origin_json TEXT NOT NULL DEFAULT '{}',
      lease_id TEXT NOT NULL DEFAULT '',
      fencing_token INTEGER NOT NULL DEFAULT 0,
      claimed_at TEXT,
      lease_expires_at TEXT,
      result_json TEXT NOT NULL DEFAULT '{}',
      last_error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      terminal_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_music_playback_commands_v3_head
      ON music_playback_commands_v3(status, generation DESC);
    CREATE INDEX IF NOT EXISTS idx_music_playback_commands_v3_lease
      ON music_playback_commands_v3(status, lease_expires_at);

    CREATE TABLE IF NOT EXISTS music_library_state_v4 (
      workspace_id TEXT PRIMARY KEY,
      revision INTEGER NOT NULL DEFAULT 1,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS music_download_jobs_v2 (
      job_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_quality TEXT NOT NULL,
      actual_quality TEXT NOT NULL DEFAULT '',
      lease_id TEXT NOT NULL DEFAULT '',
      fencing_token INTEGER NOT NULL DEFAULT 0,
      lease_expires_at TEXT,
      command_id TEXT NOT NULL DEFAULT '',
      consumer_kind TEXT NOT NULL DEFAULT 'manual',
      checkpoint TEXT NOT NULL DEFAULT '',
      job_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_music_download_jobs_v2_queue
      ON music_download_jobs_v2(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_music_download_jobs_v2_source
      ON music_download_jobs_v2(source, source_id, requested_quality);

    CREATE TABLE IF NOT EXISTS music_media_assets_v2 (
      asset_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      filename TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      requested_quality TEXT NOT NULL DEFAULT '',
      actual_quality TEXT NOT NULL DEFAULT '',
      bitrate INTEGER NOT NULL DEFAULT 0,
      sample_rate INTEGER NOT NULL DEFAULT 0,
      channels INTEGER NOT NULL DEFAULT 0,
      duration_seconds REAL NOT NULL DEFAULT 0,
      format TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      file_checksum TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(source, source_id)
    );
    CREATE INDEX IF NOT EXISTS idx_music_media_assets_v2_checksum
      ON music_media_assets_v2(file_checksum);

    CREATE TABLE IF NOT EXISTS music_catalog_generations_v4 (
      generation INTEGER PRIMARY KEY,
      status TEXT NOT NULL,
      track_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      checksum TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS music_catalog_tracks_v4 (
      generation INTEGER NOT NULL,
      track_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'local',
      source_id TEXT NOT NULL DEFAULT '',
      duration_seconds REAL NOT NULL DEFAULT 0,
      bitrate INTEGER NOT NULL DEFAULT 0,
      sample_rate INTEGER NOT NULL DEFAULT 0,
      channels INTEGER NOT NULL DEFAULT 0,
      format TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      modified_at TEXT NOT NULL,
      file_checksum TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'ready',
      error TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY(generation, track_id),
      UNIQUE(generation, filename),
      FOREIGN KEY(generation) REFERENCES music_catalog_generations_v4(generation) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_music_catalog_tracks_v4_search
      ON music_catalog_tracks_v4(generation, title, artist);

    CREATE TABLE IF NOT EXISTS music_duplicate_transactions_v1 (
      transaction_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      keep_filename TEXT NOT NULL,
      remove_json TEXT NOT NULL,
      quarantine_json TEXT NOT NULL DEFAULT '[]',
      result_json TEXT NOT NULL DEFAULT '{}',
      error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS observability_meta_v2 (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
function getObservabilityDatabase() {
    if (database)
        return database;
    fs.mkdirSync(path.dirname(exports.OBSERVABILITY_DATABASE_FILE), { recursive: true });
    database = new better_sqlite3_1.default(exports.OBSERVABILITY_DATABASE_FILE);
    database.pragma("busy_timeout = 10000");
    database.pragma("journal_mode = WAL");
    database.pragma("synchronous = NORMAL");
    database.pragma("foreign_keys = ON");
    createSchema(database);
    return database;
}
function withImmediateObservabilityTransaction(operation) {
    const db = getObservabilityDatabase();
    db.exec("BEGIN IMMEDIATE");
    try {
        const result = operation(db);
        db.exec("COMMIT");
        return result;
    }
    catch (error) {
        try {
            db.exec("ROLLBACK");
        }
        catch { }
        throw error;
    }
}
function observabilityMeta(key, fallback = null) {
    const row = getObservabilityDatabase().prepare("SELECT value_json FROM observability_meta_v2 WHERE key = ?").get(key);
    if (!row)
        return fallback;
    try {
        return JSON.parse(String(row.value_json || "null"));
    }
    catch {
        return fallback;
    }
}
function setObservabilityMeta(key, value) {
    getObservabilityDatabase().prepare(`
    INSERT INTO observability_meta_v2(key, value_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value ?? null), new Date().toISOString());
}
function closeObservabilityDatabaseForTests() {
    if (!database)
        return;
    database.close();
    database = null;
}
//# sourceMappingURL=observability-database.js.map