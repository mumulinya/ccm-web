import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA = "ccm-test-agent-runtime-fingerprint-v1" as const;

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

export function runtimeFingerprintChecksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value ?? null))).digest("hex");
}

function safeString(value: any, max = 240) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function canonicalUrl(value: any) {
  const source = safeString(value, 1000);
  if (!source) return "";
  try {
    const url = new URL(source);
    // Never include query strings, fragments, credentials, or tokens in a
    // persisted fingerprint. Host/path are enough to invalidate stale tests.
    return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return source.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
  }
}

function fileChecksum(file: string) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024) return `${stat.size}:${Math.round(stat.mtimeMs)}`;
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  } catch {
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

export type TestAgentRuntimeFingerprint = {
  schema: typeof TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA;
  version: 1;
  capturedAt: string;
  workDir: string;
  runtime: {
    node: string;
    platform: string;
    arch: string;
  };
  files: Array<{ path: string; checksum: string }>;
  target: {
    url: string;
    providerFamily: string;
    providerCapabilityVersion: string;
  };
  isolation: {
    mode: string;
    environmentId: string;
    testTenantReferenceChecksum: string;
    credentialReferenceChecksum: string;
  };
  checksum: string;
  contentStored: false;
};

export function captureTestAgentRuntimeFingerprint(input: {
  workDir?: string;
  targetUrl?: string;
  providerFamily?: string;
  providerCapabilityVersion?: string;
  runtimeFiles?: string[];
  isolationMode?: string;
  isolationEnvironmentId?: string;
  testTenantReference?: string;
  credentialReference?: string;
} = {}): TestAgentRuntimeFingerprint {
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
    schema: TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA,
    version: 1 as const,
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
    contentStored: false as const,
  };
  const { capturedAt: _capturedAt, ...stableCore } = core;
  return { ...core, checksum: runtimeFingerprintChecksum(stableCore) };
}

export function runtimeFingerprintChanged(before: any, after: any) {
  return !!before?.checksum && !!after?.checksum && String(before.checksum) !== String(after.checksum);
}

export function readTestAgentRuntimeFingerprint(value: any): TestAgentRuntimeFingerprint | null {
  if (!value || typeof value !== "object") return null;
  if (value.schema === TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA && value.version === 1 && value.checksum) return value as TestAgentRuntimeFingerprint;
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

export function runTestAgentRuntimeFingerprintSelfTest() {
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
    pass: first.schema === TEST_AGENT_RUNTIME_FINGERPRINT_SCHEMA
      && first.target.url === "https://example.test/login"
      && !serialized.includes("must-not-persist")
      && !serialized.includes("secret-reference-only")
      && !serialized.includes("tenant-selftest")
      && first.contentStored === false,
    fingerprint: first,
  };
}
