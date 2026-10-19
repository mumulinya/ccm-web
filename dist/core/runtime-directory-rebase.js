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
exports.rebaseDirectoryReferences = rebaseDirectoryReferences;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const runtime_directory_transfer_1 = require("./runtime-directory-transfer");
// Only structured values that are absolute paths inside the owned root change.
// External projects, prose, URLs, credentials and user home folders stay intact.
function rebase(value, source, target) {
    if (typeof value === 'string' && path.isAbsolute(value) && (0, runtime_directory_transfer_1.insidePath)(value, source))
        return path.join(target, path.relative(source, value));
    if (Array.isArray(value))
        return value.map(item => rebase(item, source, target));
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rebase(item, source, target)]));
    return value;
}
function rebaseDirectoryReferences(staging, source, target) {
    const changed = [];
    for (const file of (0, runtime_directory_transfer_1.scanData)(staging)) {
        if (file.path.endsWith('.toml')) {
            const full = path.join(staging, file.path), original = fs.readFileSync(full, 'utf8');
            const updated = original.replace(/(=\s*)("(?:[^"\\]|\\.)*"|'[^']*')/g, (match, prefix, quoted) => {
                let value;
                try {
                    value = quoted[0] === "'" ? quoted.slice(1, -1) : JSON.parse(quoted);
                }
                catch {
                    return match;
                }
                const next = rebase(value, source, target);
                return next === value ? match : prefix + JSON.stringify(next);
            });
            if (updated !== original) {
                fs.writeFileSync(full, updated, { mode: 0o600 });
                changed.push(file.path);
            }
            continue;
        }
        if (!file.path.endsWith('.json') || file.path === 'migration-manifest.json')
            continue;
        const full = path.join(staging, file.path);
        let original;
        try {
            original = JSON.parse(fs.readFileSync(full, 'utf8'));
        }
        catch {
            continue;
        }
        const updated = rebase(original, source, target);
        if (JSON.stringify(original) !== JSON.stringify(updated)) {
            fs.writeFileSync(full, JSON.stringify(updated, null, 2) + '\n', { mode: 0o600 });
            changed.push(file.path);
        }
    }
    const database = path.join(staging, 'ccm.db');
    if (fs.existsSync(database)) {
        const Database = require('better-sqlite3'), db = new Database(database);
        const quote = (id) => '"' + id.replace(/"/g, '""') + '"';
        try {
            db.transaction(() => {
                for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
                    const columns = db.prepare(`PRAGMA table_info(${quote(name)})`).all();
                    const keys = columns.filter((column) => column.pk).sort((a, b) => a.pk - b.pk);
                    if (!keys.length)
                        continue;
                    const values = columns.filter((column) => /(?:_json|_path|_dir|^path)$/.test(column.name) && /TEXT/i.test(column.type));
                    if (!values.length)
                        continue;
                    const identities = db.prepare(`SELECT ${keys.map((key) => quote(key.name)).join(',')} FROM ${quote(name)}`).all();
                    const lookup = db.prepare(`SELECT * FROM ${quote(name)} WHERE ${keys.map((key) => `${quote(key.name)}=?`).join(' AND ')}`);
                    for (const identity of identities) {
                        const row = lookup.get(...keys.map((key) => identity[key.name]));
                        if (!row)
                            continue;
                        const patch = {};
                        for (const column of values) {
                            const value = row[column.name];
                            if (typeof value !== 'string')
                                continue;
                            let updated = value;
                            if (column.name.endsWith('_json')) {
                                try {
                                    const parsed = JSON.parse(value), next = rebase(parsed, source, target);
                                    if (JSON.stringify(parsed) !== JSON.stringify(next))
                                        updated = JSON.stringify(next);
                                }
                                catch { }
                            }
                            else
                                updated = rebase(value, source, target);
                            if (updated !== value)
                                patch[column.name] = updated;
                        }
                        if (!Object.keys(patch).length)
                            continue;
                        if (patch.payload_json && columns.some((column) => column.name === 'payload_hash'))
                            patch.payload_hash = crypto.createHash('sha256').update(patch.payload_json).digest('hex');
                        const fields = Object.keys(patch);
                        db.prepare(`UPDATE ${quote(name)} SET ${fields.map(field => `${quote(field)}=?`).join(',')} WHERE ${keys.map((key) => `${quote(key.name)}=?`).join(' AND ')}`).run(...fields.map(field => patch[field]), ...keys.map((key) => row[key.name]));
                    }
                }
            })();
            db.pragma('wal_checkpoint(TRUNCATE)');
        }
        finally {
            db.close();
        }
        changed.push('ccm.db (owned path references)');
    }
    return changed;
}
//# sourceMappingURL=runtime-directory-rebase.js.map