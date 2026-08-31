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
exports.TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA = void 0;
exports.runtimeFingerprintChecksum = runtimeFingerprintChecksum;
exports.captureTestAgentRuntimeFingerprint = captureTestAgentRuntimeFingerprint;
exports.runtimeFingerprintChanged = runtimeFingerprintChanged;
exports.readTestAgentRuntimeFingerprint = readTestAgentRuntimeFingerprint;
exports.runTestAgentRuntimeFingerprintSelfTest = runTestAgentRuntimeFingerprintSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA = "ccm-test-agent-runtime-fingerprint-v1";
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function runtimeFingerprintChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value ?? null))).digest("hex");
}
function safeString(value, max = 240) {
    return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
function canonicalUrl(value) {
    const source = safeString(value, 1000);
    if (!source)
        return "";
    try {
        const url = new URL(source);
        // Never include query strings, fragments, credentials, or tokens in a
        // persisted fingerprint. Host/path are enough to invalidate stale tests.
        return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/+$/, "").toLowerCase();
    }
    catch {
        return source.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
    }
}
function fileChecksum(file) {
    try {
        const stat = fs.statSync(file);
        if (!stat.isFile() || stat.size > 16 * 1024 * 1024)
            return `${stat.size}:${Math.round(stat.mtimeMs)}`;
        return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    }
    catch {
        return "missing";
    }
}
const DEFAULT_RUNTIME_FILES = [
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    ".env.example",
];
function captureTestAgentRuntimeFingerprint(input = {}) {
    const workDir = path.resolve(String(input.workDir || process.cwd()));
    const requestedFiles = [...new Set([...(input.runtimeFiles || []), ...DEFAULT_RUNTIME_FILES])]
        .map(item => safeString(item, 260).replace(/\\/g, "/").replace(/^\.\//, ""))
        .filter(Boolean)
        .slice(0, 80);
    const files = requestedFiles.map(relative => ({
        path: relative,
        checksum: fileChecksum(path.join(workDir, relative)),
    }));
    const core = {
        schema: exports.TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA,
        version: 1,
        capturedAt: new Date().toISOString(),
        workDir,
        runtime: {
            node: process.version,
            platform: os.platform(),
            arch: process.arch,
        },
        files,
        target: {
            url: canonicalUrl(input.targetUrl),
            providerFamily: safeString(input.providerFamily, 120).toLowerCase(),
            providerCapabilityVersion: safeString(input.providerCapabilityVersion, 160),
        },
        isolation: {
            mode: safeString(input.isolationMode, 80) || "unknown",
            environmentId: safeString(input.isolationEnvironmentId, 180),
            testTenantReferenceChecksum: input.testTenantReference ? runtimeFingerprintChecksum(String(input.testTenantReference)) : "",
            credentialReferenceChecksum: input.credentialReference ? runtimeFingerprintChecksum(String(input.credentialReference)) : "",
        },
        contentStored: false,
    };
    const { capturedAt: _capturedAt, ...stableCore } = core;
    return { ...core, checksum: runtimeFingerprintChecksum(stableCore) };
}
function runtimeFingerprintChanged(before, after) {
    return !!before?.checksum && !!after?.checksum && String(before.checksum) !== String(after.checksum);
}
function readTestAgentRuntimeFingerprint(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.schema === exports.TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA && value.version === 1 && value.checksum)
        return value;
    // v0/v1 runner records used runtimeEnvFingerprint only. Preserve it as a
    // compatibility hint without pretending that it contains a complete v2
    // environment snapshot.
    if (value.runtimeEnvFingerprint || value.runtime_env_fingerprint) {
        const hint = String(value.runtimeEnvFingerprint || value.runtime_env_fingerprint);
        return captureTestAgentRuntimeFingerprint({
            workDir: value.workDir || process.cwd(),
            providerCapabilityVersion: `legacy-env:${hint.slice(0, 160)}`,
            isolationMode: "legacy_unknown",
        });
    }
    return null;
}
function runTestAgentRuntimeFingerprintSelfTest() {
    const first = captureTestAgentRuntimeFingerprint({
        workDir: process.cwd(),
        targetUrl: "https://example.test/login?token=must-not-persist",
        providerFamily: "mock",
        isolationMode: "sandbox",
        isolationEnvironmentId: "env-selftest",
        testTenantReference: "tenant-selftest",
        credentialReference: "secret-reference-only",
    });
    const serialized = JSON.stringify(first);
    return {
        pass: first.schema === exports.TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA
            && first.target.url === "https://example.test/login"
            && !serialized.includes("must-not-persist")
            && !serialized.includes("secret-reference-only")
            && !serialized.includes("tenant-selftest")
            && first.contentStored === false,
        fingerprint: first,
    };
}
//# sourceMappingURL=runtime-fingerprint.js.map