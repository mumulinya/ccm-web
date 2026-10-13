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
exports.reservePersistentAutomaticRework = reservePersistentAutomaticRework;
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const rework_policy_1 = require("./rework-policy");
/** Main Agent and TestAgent reserve from the same persisted cycle under one
 * cross-process lock. Evidence must be collected before acquiring the lock. */
function reservePersistentAutomaticRework(taskId, gaps, evidence) {
    const file = path.join(utils_1.CCM_DIR, "rework-reservations", (0, crypto_1.createHash)("sha256").update(taskId).digest("hex"));
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
        if (!task)
            throw new Error("返工任务不存在");
        const reservation = (0, rework_policy_1.reserveAutomaticRework)(task, gaps, evidence);
        const updated = require("./collaboration-task-service").updateTask(taskId, reservation.update);
        return { ...reservation, task: updated };
    });
}
//# sourceMappingURL=dispatch-rework-reservation.js.map