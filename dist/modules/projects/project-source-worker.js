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
exports.executeProjectSourceOperation = executeProjectSourceOperation;
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const project_main_agent_source_1 = require("./project-main-agent-source");
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const failure = (code) => Object.assign(new Error(code), { code });
function offset(value, key) {
    if (!value)
        return 0;
    try {
        const cursor = JSON.parse(Buffer.from(String(value), 'base64url').toString());
        if (cursor.key !== key || !Number.isSafeInteger(cursor.offset) || cursor.offset < 0)
            throw failure('SOURCE_CURSOR_INVALID');
        return cursor.offset;
    }
    catch {
        throw failure('SOURCE_CURSOR_INVALID');
    }
}
const cursorFor = (key, offset) => Buffer.from(JSON.stringify({ key, offset })).toString('base64url');
function permittedPath(value) {
    const name = (0, project_main_agent_source_1.normalizeRelativePath)(String(value || ''));
    if (!name || /^(?:[a-z]:|\/)|:|(?:^|\/)\.\.(?:\/|$)/i.test(name))
        throw failure('SOURCE_PATH_INVALID');
    return name;
}
function contents(root, name) {
    const file = (0, project_main_agent_source_1.safeResolvedFile)(root, name);
    if (!file || (0, project_main_agent_source_1.isSensitivePath)(name))
        throw failure('SOURCE_PATH_FORBIDDEN');
    const fd = fs.openSync(file, 'r');
    try {
        const before = fs.fstatSync(fd);
        if (!before.isFile() || before.size > 512 * 1024)
            throw failure('SOURCE_FILE_SIZE_EXCEEDED');
        const version = (s) => `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`;
        const text = (0, project_main_agent_source_1.redactSensitiveValues)(fs.readFileSync(fd, 'utf8'));
        if (version(before) !== version(fs.fstatSync(fd)) || version(before) !== version(fs.statSync(file)) || file !== (0, project_main_agent_source_1.safeResolvedFile)(root, name))
            throw failure('SOURCE_CHANGED_DURING_READ');
        return text;
    }
    finally {
        fs.closeSync(fd);
    }
}
/** Runs only in the existing managed readonly Worker. Never writes business data. */
async function executeProjectSourceOperation(input, cancelled = () => false) {
    const started = Date.now();
    const args = input.args || {};
    if (cancelled())
        throw failure('SOURCE_READ_ABORTED');
    const manifest = (0, project_main_agent_source_1.buildProjectSourceManifest)(input.project, input.root);
    if (cancelled())
        throw failure('SOURCE_READ_ABORTED');
    if (args.expectedManifestChecksum && args.expectedManifestChecksum !== manifest.checksum)
        throw failure('SOURCE_MANIFEST_CHANGED');
    if (input.operation === 'manifest')
        return manifest;
    if (input.operation === 'legacy-read')
        return (0, project_main_agent_source_1.readProjectSourceEvidence)({ project: input.project, workDir: input.root, manifest, selectedPaths: args.selectedPaths });
    const base = { success: true, project: input.project, manifestChecksum: manifest.checksum,
        manifestTruncated: manifest.truncated, manifestTruncationReasons: manifest.truncationReasons, scannedFiles: manifest.scannedFiles, coverageScope: 'approved_manifest', contentStored: false };
    const allowed = new Set(manifest.files.map(row => row.path));
    if (input.operation === 'list') {
        const directory = args.path ? permittedPath(args.path).replace(/\/$/, '') : '';
        const rows = manifest.files.filter(row => !directory || row.path === directory || row.path.startsWith(directory + '/'));
        const key = hash([input.project, manifest.checksum, 'list', directory]), start = offset(args.cursor, key);
        const page = rows.slice(start, start + 100);
        return { ...base, files: page.map(({ path, size, extension }) => ({ path, size, extension })), total: rows.length,
            nextCursor: start + page.length < rows.length ? cursorFor(key, start + page.length) : null, durationMs: Date.now() - started };
    }
    if (input.operation === 'search') {
        const query = String(args.query || '');
        if (!query || query.length > 500 || /[\0\r\n]/.test(query))
            throw failure('SOURCE_QUERY_INVALID');
        const paths = Array.isArray(args.paths) ? args.paths.map(permittedPath) : [];
        if (paths.some(name => !allowed.has(name)))
            throw failure('SOURCE_PATH_FORBIDDEN');
        const rows = manifest.files.filter(row => !paths.length || paths.includes(row.path));
        const key = hash([input.project, manifest.checksum, 'search', query, paths]), start = offset(args.cursor, key);
        const matches = [];
        let observed = 0, examinedFiles = 0, nextCursor = null;
        for (const file of rows) {
            if (cancelled())
                throw failure('SOURCE_READ_ABORTED');
            const raw = contents(input.root, file.path), checksum = crypto.createHash('sha256').update(raw).digest('hex');
            const lines = raw.split(/\r?\n/);
            examinedFiles++;
            for (let i = 0; i < lines.length; i++)
                if (lines[i].includes(query)) {
                    if (observed++ < start)
                        continue;
                    if (matches.length === 50) {
                        nextCursor = cursorFor(key, start + 50);
                        break;
                    }
                    matches.push({ path: file.path, startLine: i + 1, endLine: i + 1, checksum,
                        evidenceId: `src_match_${hash([input.project, file.path, checksum, i + 1]).slice(0, 24)}`, kind: 'search_hit', verified: false });
                }
            if (nextCursor)
                break;
            if (examinedFiles % 25 === 0)
                await new Promise(resolve => setImmediate(resolve));
        }
        return { ...base, matches, examinedFiles, nextCursor, coverageComplete: !nextCursor && !manifest.truncated, durationMs: Date.now() - started };
    }
    if (input.operation !== 'read')
        throw failure('SOURCE_OPERATION_INVALID');
    if (!Array.isArray(args.files) || !args.files.length || args.files.length > 12)
        throw failure('SOURCE_FILE_COUNT_INVALID');
    const files = [], evidenceRefs = [];
    let totalChars = 0;
    for (const requested of args.files) {
        if (cancelled())
            throw failure('SOURCE_READ_ABORTED');
        const name = permittedPath(requested.path);
        if (!allowed.has(name))
            throw failure('SOURCE_PATH_FORBIDDEN');
        const raw = contents(input.root, name), checksum = crypto.createHash('sha256').update(raw).digest('hex');
        const lines = raw.split(/\r?\n/), startLine = requested.startLine ?? 1, endLine = requested.endLine ?? lines.length;
        if (!Number.isSafeInteger(startLine) || !Number.isSafeInteger(endLine) || startLine < 1 || endLine < startLine || startLine > lines.length)
            throw failure('SOURCE_LINE_RANGE_INVALID');
        const selected = lines.slice(startLine - 1, Math.min(endLine, lines.length)).join('\n');
        const content = selected.slice(0, Math.min(16000, Math.max(0, 72000 - totalChars)));
        const lastLine = content ? startLine + content.split('\n').length - 1 : startLine;
        const truncated = content.length < selected.length;
        const ref = { project: input.project, path: name, startLine, endLine: lastLine, checksum,
            evidenceId: `src_${hash([input.project, name, checksum]).slice(0, 24)}`, kind: 'source_read', verified: content.length > 0 || selected.length === 0,
            truncated, nextLine: truncated ? lastLine : null, totalLines: lines.length, chars: content.length };
        Object.assign(ref, { truncationReason: truncated ? (totalChars + content.length >= 72000 ? 'request_char_limit' : 'file_char_limit') : null,
            ...(truncated && lastLine === startLine ? { cannotContinueWithinLine: true } : {}) });
        totalChars += content.length;
        evidenceRefs.push(ref);
        files.push({ ...ref, content });
        await new Promise(resolve => setImmediate(resolve));
    }
    return { ...base, files, evidenceRefs, totalChars, truncated: evidenceRefs.some(ref => ref.truncated), durationMs: Date.now() - started };
}
//# sourceMappingURL=project-source-worker.js.map