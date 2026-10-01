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
exports.pathInside = pathInside;
exports.coveredPath = coveredPath;
exports.fixtureShape = fixtureShape;
exports.captureAcceptanceSnapshot = captureAcceptanceSnapshot;
exports.auditAcceptanceScope = auditAcceptanceScope;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const acceptance_git_audit_1 = require("./acceptance-git-audit");
const ts = __importStar(require("typescript"));
const acceptance_contract_1 = require("./acceptance-contract");
function pathInside(root, relative) {
    if (!(0, acceptance_contract_1.relativeAcceptancePath)(relative))
        throw new Error("invalid_relative_path");
    const resolved = path.resolve(root, relative);
    let cursor = resolved;
    while (!fs.existsSync(cursor)) {
        const parent = path.dirname(cursor);
        if (parent === cursor)
            throw new Error("workspace_missing");
        cursor = parent;
    }
    const real = fs.realpathSync(cursor), realRoot = fs.realpathSync(root);
    const rel = path.relative(realRoot, real);
    if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel))
        throw new Error("workspace_link_escape");
    return resolved;
}
function coveredPath(file, declared) {
    const key = (s) => s.replace(/\\/g, "/").replace(/\/$/, "").replace(/^\.\//, "");
    const f = key(file), d = key(declared);
    return d === "." || f === d || f.startsWith(`${d}/`);
}
/** Mask only literal initializers of explicitly named fields; all other syntax stays auditable. */
function fixtureShape(file, source, allowed) {
    if (file.endsWith(".json")) {
        const json = JSON.parse(source);
        for (const field of allowed) {
            const parts = field.split(".");
            let owner = json;
            for (const p of parts.slice(0, -1))
                owner = owner?.[p];
            const key = parts[parts.length - 1];
            if (!owner || !Object.prototype.hasOwnProperty.call(owner, key))
                throw new Error("fixture_field_missing");
            owner[key] = { ccmAuthorizedLiteral: field };
        }
        return (0, acceptance_contract_1.acceptanceHash)(json);
    }
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (tree.parseDiagnostics?.length)
        throw new Error("fixture_parse_error");
    const replacements = [];
    const seen = new Set();
    const walk = (node) => {
        if ((ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) && node.name && node.initializer) {
            const key = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : "";
            const init = node.initializer;
            if (allowed.includes(key)) {
                if (seen.has(key) || !(ts.isStringLiteral(init) || ts.isNumericLiteral(init)
                    || init.kind === ts.SyntaxKind.TrueKeyword || init.kind === ts.SyntaxKind.FalseKeyword || init.kind === ts.SyntaxKind.NullKeyword))
                    throw new Error("fixture_field_not_unique_literal");
                seen.add(key);
                replacements.push({ start: init.getStart(tree), end: init.end, key });
            }
        }
        ts.forEachChild(node, walk);
    };
    walk(tree);
    if (allowed.some(key => !seen.has(key)))
        throw new Error("fixture_field_missing");
    for (const r of replacements.sort((a, b) => b.start - a.start))
        source = source.slice(0, r.start) + `__CCM_LITERAL_${r.key}__` + source.slice(r.end);
    return (0, acceptance_contract_1.acceptanceHash)(source);
}
function captureAcceptanceSnapshot(root, contract, projectId) {
    const files = {}, fixtureShapes = {};
    let real = path.resolve(root);
    let error;
    const items = contract.workItems.filter(w => w.projectId === projectId);
    const cleanup = items.flatMap(w => w.cleanupPaths);
    let total = 0;
    try {
        real = fs.realpathSync(root);
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
                if ([".git", "node_modules"].includes(entry.name))
                    continue;
                const abs = path.join(dir, entry.name), rel = path.relative(real, abs).replace(/\\/g, "/");
                if (cleanup.some(p => coveredPath(rel, p)))
                    continue;
                if (entry.isSymbolicLink()) {
                    pathInside(real, rel);
                    throw new Error("workspace_symlink_requires_explicit_audit");
                }
                if (entry.isDirectory())
                    walk(abs);
                else if (entry.isFile()) {
                    const size = fs.statSync(abs).size;
                    total += size;
                    if (total > 128 * 1024 * 1024 || Object.keys(files).length >= 20000)
                        throw new Error("snapshot_budget_exceeded");
                    files[rel] = (0, acceptance_contract_1.acceptanceHash)(fs.readFileSync(abs).toString("base64"));
                }
            }
        };
        walk(real);
        for (const fixture of items.flatMap(w => w.synchronizedFixturePaths)) {
            const abs = pathInside(real, fixture.path);
            fixtureShapes[fixture.path] = fixtureShape(fixture.path, fs.readFileSync(abs, "utf8"), fixture.allowedChanges);
        }
    }
    catch (e) {
        error = String(e.code || e.message || "snapshot_failed");
    }
    const git = (0, acceptance_git_audit_1.captureAcceptanceGitAudit)(real, cleanup);
    return { root: real, fingerprint: (0, acceptance_contract_1.acceptanceHash)(files), files, fixtureShapes,
        gitFingerprint: git.fingerprint, mode: git.available ? "git" : "snapshot_only", ...(error ? { error } : {}) };
}
function auditAcceptanceScope(contract, projectId, before, after) {
    const items = contract.workItems.filter(w => w.projectId === projectId);
    const changed = [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].filter(f => before.files[f] !== after.files[f]);
    const readonly = items.flatMap(w => [...w.readOnlyPaths, ...w.forbiddenPaths]);
    const fixtures = items.flatMap(w => w.synchronizedFixturePaths);
    const violations = changed.filter(file => readonly.some(p => coveredPath(file, p))
        || (!fixtures.some(f => f.path === file) && !items.some(w => w.editablePaths.some(p => coveredPath(file, p)))));
    const fixtureViolations = fixtures.filter(f => changed.includes(f.path)
        && (!before.fixtureShapes[f.path] || before.fixtureShapes[f.path] !== after.fixtureShapes[f.path])).map(f => f.path);
    return { status: before.error || after.error ? "blocked" : violations.length || fixtureViolations.length ? "failed"
            : before.mode === "git" && after.mode === "git" ? "passed" : "snapshot_only",
        changedFiles: changed, outOfScopeFiles: violations, fixtureViolations };
}
//# sourceMappingURL=acceptance-workspace.js.map