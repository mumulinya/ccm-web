import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { TestAgentArtifactManifest, TestAgentArtifactManifestItem } from "./types";

export interface TestAgentArtifactVerificationItem {
  type: TestAgentArtifactManifestItem["type"] | string;
  title: string;
  path: string;
  status: "passed" | "failed" | "skipped";
  expectedSizeBytes?: number;
  actualSizeBytes?: number;
  expectedSha256?: string;
  actualSha256?: string;
  error?: string;
}

export interface TestAgentArtifactVerification {
  schema: "ccm-test-agent-artifact-verification-v1";
  manifestPath: string;
  reportId: string;
  workOrderId: string;
  checkedAt: string;
  status: "passed" | "failed";
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  items: TestAgentArtifactVerificationItem[];
}

function sha256(filePath: string) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function resolveArtifactPath(manifestPath: string, filePath: string) {
  if (path.isAbsolute(filePath)) return path.resolve(filePath);
  return path.resolve(path.dirname(manifestPath), filePath);
}

function verifyManifestItem(manifestPath: string, item: TestAgentArtifactManifestItem): TestAgentArtifactVerificationItem {
  const resolvedPath = resolveArtifactPath(manifestPath, item.path);
  const expected = item.integrity || { exists: true };
  const base = {
    type: item.type,
    title: item.title,
    path: item.path,
    expectedSizeBytes: expected.sizeBytes,
    expectedSha256: expected.sha256,
  };

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolvedPath);
  } catch (error: any) {
    return {
      ...base,
      status: "failed",
      error: `Artifact is missing: ${error.message || String(error)}`,
    };
  }

  if (!stat.isFile()) {
    return {
      ...base,
      status: "failed",
      actualSizeBytes: stat.size,
      error: "Artifact path exists but is not a file.",
    };
  }

  if (expected.exists === false) {
    return {
      ...base,
      status: "failed",
      actualSizeBytes: stat.size,
      error: "Manifest expected artifact to be missing, but the file exists.",
    };
  }

  if (expected.error === "sha256 omitted for self-referential artifact.") {
    return {
      ...base,
      status: "skipped",
      actualSizeBytes: stat.size,
      error: expected.error,
    };
  }

  if (typeof expected.sizeBytes === "number" && expected.sizeBytes !== stat.size) {
    return {
      ...base,
      status: "failed",
      actualSizeBytes: stat.size,
      error: `Size mismatch: expected ${expected.sizeBytes}, got ${stat.size}.`,
    };
  }

  if (!expected.sha256) {
    return {
      ...base,
      status: expected.error === "sha256 omitted for self-referential artifact." ? "skipped" : "passed",
      actualSizeBytes: stat.size,
      error: expected.error,
    };
  }

  const actual = sha256(resolvedPath);
  if (actual !== expected.sha256) {
    return {
      ...base,
      status: "failed",
      actualSizeBytes: stat.size,
      actualSha256: actual,
      error: "SHA-256 mismatch.",
    };
  }

  return {
    ...base,
    status: "passed",
    actualSizeBytes: stat.size,
    actualSha256: actual,
  };
}

export function verifyTestAgentArtifactManifest(manifest: TestAgentArtifactManifest, manifestPath = ""): TestAgentArtifactVerification {
  const resolvedManifestPath = manifestPath ? path.resolve(manifestPath) : "";
  const items = (manifest.files || []).map(item => verifyManifestItem(resolvedManifestPath || item.path, item));
  const failed = items.filter(item => item.status === "failed").length;
  const passed = items.filter(item => item.status === "passed").length;
  const skipped = items.filter(item => item.status === "skipped").length;
  return {
    schema: "ccm-test-agent-artifact-verification-v1",
    manifestPath: resolvedManifestPath,
    reportId: manifest.reportId || "",
    workOrderId: manifest.workOrderId || "",
    checkedAt: new Date().toISOString(),
    status: failed ? "failed" : "passed",
    summary: {
      total: items.length,
      passed,
      failed,
      skipped,
    },
    items,
  };
}

export function verifyTestAgentArtifactManifestFile(manifestPath: string): TestAgentArtifactVerification {
  const manifest = readJson(manifestPath) as TestAgentArtifactManifest;
  return verifyTestAgentArtifactManifest(manifest, manifestPath);
}
