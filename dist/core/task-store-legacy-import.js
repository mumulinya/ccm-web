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
exports.importLegacyTaskJson = importLegacyTaskJson;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
// Forward-only import into an empty canonical table. Keep legacy source bytes;
// ordinary startup/reopen never replays them over newer SQLite records.
function importLegacyTaskJson(db, directory, handlers) {
    const sources = [
        ['tasks', 'tasks.json'], ['task_logs', 'task-logs.json'], ['group_logs', 'group-logs.json'],
    ];
    for (const [table, filename] of sources) {
        const key = `legacy_json_import:${filename}`;
        if (db.prepare('SELECT 1 FROM app_meta WHERE key=?').get(key))
            continue;
        const file = path.join(directory, filename);
        if (!fs.existsSync(file))
            continue;
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink())
            throw new Error('legacy_task_source_invalid');
        const bytes = fs.readFileSync(file);
        const value = JSON.parse(bytes.toString('utf8'));
        if (table === 'tasks' ? !Array.isArray(value) : !value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('legacy_task_source_invalid');
        const checksum = crypto.createHash('sha256').update(bytes).digest('hex');
        const backupDirectory = path.join(directory, 'legacy-json-backups');
        fs.mkdirSync(backupDirectory, { recursive: true });
        const backup = path.join(backupDirectory, `${filename}.${checksum}.json`);
        if (!fs.existsSync(backup))
            fs.writeFileSync(backup, bytes, { flag: 'wx', mode: 0o600 });
        db.transaction(() => {
            if (db.prepare('SELECT 1 FROM app_meta WHERE key=?').get(key))
                return;
            const empty = Number(db.prepare(`SELECT COUNT(*) count FROM ${table}`).get().count) === 0;
            if (empty)
                handlers[table](value);
            db.prepare('INSERT INTO app_meta(key,value_json,updated_at) VALUES(?,?,?)').run(key, JSON.stringify({ checksum, imported: empty, sourcePreserved: true }), new Date().toISOString());
        }).immediate();
    }
}
//# sourceMappingURL=task-store-legacy-import.js.map