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
Object.defineProperty(exports, "__esModule", { value: true });
exports.retainPendingTaskSourceRecord = retainPendingTaskSourceRecord;
exports.hasPendingTaskSourceSync = hasPendingTaskSourceSync;
exports.completePendingTaskSourceRecord = completePendingTaskSourceRecord;
exports.reconcilePendingTaskSourceSync = reconcilePendingTaskSourceSync;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const credential_store_1 = require("../../core/credential-store");
const hash = (value) => (0, crypto_1.createHash)("sha256").update(value).digest("hex");
const directory = (taskId) => path.join(utils_1.CCM_DIR, "task-session-source-sync", hash(taskId));
function retainPendingTaskSourceRecord(taskId, record) {
    const file = path.join(directory(taskId), `${hash(record.message_id)}.json`);
    (0, atomic_json_file_1.writeJsonAtomic)(file, { schema: "ccm-task-source-sync-v1", taskId, record: JSON.parse((0, credential_store_1.redactSensitiveText)(JSON.stringify(record))), at: new Date().toISOString() });
    return file;
}
function hasPendingTaskSourceSync(taskId) {
    const dir = directory(taskId);
    return fs.existsSync(dir) && fs.readdirSync(dir).some(name => /^[a-f0-9]{64}\.json$/.test(name));
}
function completePendingTaskSourceRecord(file) { fs.rmSync(file, { force: true }); }
/** Retry saved, already-authorized source records even if the source chat was removed. */
function reconcilePendingTaskSourceSync(taskId) {
    const dir = directory(taskId);
    if (!fs.existsSync(dir))
        return { repaired: 0 };
    let repaired = 0;
    for (const name of fs.readdirSync(dir).filter(name => /^[a-f0-9]{64}\.json$/.test(name))) {
        const file = path.join(dir, name);
        const pending = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
        if (pending?.schema !== "ccm-task-source-sync-v1" || pending.taskId !== taskId || pending.record?.task_id !== taskId)
            throw new Error("任务上下文补偿记录身份无效");
        require("./task-session-store").appendTaskSessionMessage(taskId, pending.record, pending.record.created_at);
        completePendingTaskSourceRecord(file);
        repaired++;
    }
    return { repaired };
}
//# sourceMappingURL=task-session-source-sync.js.map