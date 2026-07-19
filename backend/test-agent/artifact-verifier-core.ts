// Behavior-freeze split from artifact-verifier.ts (part 1/3).
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import {
  AcceptanceCoverageItem,
  RequiredCheckCoverageItem,
  TestAgentArtifactManifest,
  TestAgentArtifactManifestItem,
  TestAgentReport,
  TestAgentVerdict,
} from "./types";
import { buildBrowserMultiSessionSummary } from "./browser/multi-session-summary";
import { browserStabilityMetadata, buildBrowserStabilitySummary } from "./browser/stability-summary";
import { browserAuthenticationEvidenceErrors } from "./browser/authentication";
import { buildBrowserAuthenticationSummary } from "./browser/authentication-summary";
import {
  browserRecoveryEvidenceErrors,
  browserRecoverySummaryErrors,
} from "./browser/recovery-validation";
import { buildBrowserRecoverySummary } from "./browser/recovery-summary";
import {
  browserActionEffectResultErrors,
} from "./browser/action-effects";
import {
  browserActionEffectSummaryErrors,
  buildBrowserActionEffectSummary,
} from "./browser/action-effect-summary";
import {
  adversarialEvidenceSummaryErrors,
  buildAdversarialEvidenceSummary,
} from "./adversarial-summary";
import {
  acceptanceEvidenceGateSummaryErrors,
  buildAcceptanceEvidenceGateSummary,
} from "./acceptance-gate";
import {
  buildHttpConcurrencySummary,
  httpConcurrencyEvidenceErrors,
  httpConcurrencyResultStatus,
  httpConcurrencySummaryErrors,
} from "./http-concurrency";
import { httpPageResourceEvidenceErrors } from "./http-page-resources";
import {
  browserCheckExecutionEvidenceErrors,
  buildBrowserCheckExecutionCoverage,
} from "./browser/check-execution-coverage";
import {
  browserToolEvidenceLineageErrors,
  buildBrowserToolEvidenceLineage,
} from "./browser/tool-evidence-lineage";
import {
  browserToolCallTimeoutEvidenceErrors,
  buildBrowserToolCallTimeoutSummary,
} from "./browser/tool-call-timeout";
import {
  browserEvidenceTemporalIntegrityErrors,
  buildBrowserEvidenceTemporalIntegrity,
} from "./browser/evidence-temporal-integrity";
import {
  browserResourceLifecycleErrors,
  buildBrowserResourceLifecycleSummary,
} from "./browser/resource-lifecycle";

export interface TestAgentArtifactVerificationItem {
  type: TestAgentArtifactManifestItem["type"] | string;
  title: string;
  path: string;
  status: "passed" | "failed" | "skipped";
  expectedSizeBytes?: number;
  actualSizeBytes?: number;
  expectedSha256?: string;
  actualSha256?: string;
  imageFormat?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageUniqueColors?: number;
  imageBlank?: boolean;
  artifactFormat?: string;
  artifactEntries?: number;
  artifactEvents?: number;
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

export function sha256(filePath: string) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function resolveArtifactPath(manifestPath: string, filePath: string) {
  if (path.isAbsolute(filePath)) return path.resolve(filePath);
  return path.resolve(path.dirname(manifestPath), filePath);
}

export function verifyManifestItem(manifestPath: string, item: TestAgentArtifactManifestItem): TestAgentArtifactVerificationItem {
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

function pngMetadataItem(
  item: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  image?: PngInfo,
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "screenshot_png_metadata",
    title: `PNG metadata: ${item.title}`,
    path: item.path,
    status,
    ...(image ? {
      imageFormat: `png:${image.bitDepth}:${image.colorType}`,
      imageWidth: image.width,
      imageHeight: image.height,
    } : {}),
    ...(error ? { error } : {}),
  };
}

function pngContentItem(
  item: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  image?: PngInfo,
  content?: { uniqueColors: number; blank: boolean },
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "screenshot_png_content",
    title: `PNG content: ${item.title}`,
    path: item.path,
    status,
    ...(image ? {
      imageFormat: `png:${image.bitDepth}:${image.colorType}`,
      imageWidth: image.width,
      imageHeight: image.height,
    } : {}),
    ...(content ? {
      imageUniqueColors: content.uniqueColors,
      imageBlank: content.blank,
    } : {}),
    ...(error ? { error } : {}),
  };
}

interface PngInfo {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  idat: Buffer;
}

function readPngInfo(filePath: string): PngInfo {
  const buffer = fs.readFileSync(filePath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error("Invalid PNG signature.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;
  const idatChunks: Buffer[] = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + 4;
    if (nextOffset > buffer.length) throw new Error(`PNG chunk ${type || "(unknown)"} exceeds file length.`);

    if (!sawIhdr && type !== "IHDR") throw new Error("PNG IHDR chunk must be first.");
    if (type === "IHDR") {
      if (sawIhdr) throw new Error("PNG contains duplicate IHDR chunks.");
      if (length !== 13) throw new Error(`PNG IHDR chunk has invalid length ${length}.`);
      width = buffer.readUInt32BE(dataOffset);
      height = buffer.readUInt32BE(dataOffset + 4);
      bitDepth = buffer[dataOffset + 8];
      colorType = buffer[dataOffset + 9];
      if (width <= 0 || height <= 0) throw new Error(`PNG dimensions must be positive, got ${width}x${height}.`);
      sawIhdr = true;
    } else if (type === "IDAT") {
      sawIdat = true;
      idatChunks.push(buffer.subarray(dataOffset, dataOffset + length));
    } else if (type === "IEND") {
      sawIend = true;
      break;
    }
    offset = nextOffset;
  }

  if (!sawIhdr) throw new Error("PNG IHDR chunk is missing.");
  if (!sawIdat) throw new Error("PNG IDAT chunk is missing.");
  if (!sawIend) throw new Error("PNG IEND chunk is missing.");
  return { width, height, bitDepth, colorType, idat: Buffer.concat(idatChunks) };
}

function paethPredictor(left: number, up: number, upperLeft: number) {
  const p = left + up - upperLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upperLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upperLeft;
}

function pngChannels(colorType: number) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  return 0;
}

function pixelKey(row: Buffer, offset: number, colorType: number) {
  if (colorType === 0) {
    const gray = row[offset];
    return `${gray},${gray},${gray},255`;
  }
  if (colorType === 2) return `${row[offset]},${row[offset + 1]},${row[offset + 2]},255`;
  if (colorType === 4) {
    const gray = row[offset];
    return `${gray},${gray},${gray},${row[offset + 1]}`;
  }
  return `${row[offset]},${row[offset + 1]},${row[offset + 2]},${row[offset + 3]}`;
}

function analyzePngContent(info: PngInfo) {
  if (info.bitDepth !== 8) {
    return { status: "skipped" as const, error: `PNG blank-image detection supports bit depth 8 only, got ${info.bitDepth}.` };
  }
  const channels = pngChannels(info.colorType);
  if (!channels) {
    return { status: "skipped" as const, error: `PNG blank-image detection does not support color type ${info.colorType}.` };
  }
  const pixelCount = info.width * info.height;
  if (pixelCount < 16) {
    return { status: "skipped" as const, content: { uniqueColors: 1, blank: false }, error: `PNG is ${info.width}x${info.height}; too small for blank-image detection.` };
  }

  const rowBytes = info.width * channels;
  const expectedBytes = info.height * (rowBytes + 1);
  const inflated = zlib.inflateSync(info.idat);
  if (inflated.length < expectedBytes) {
    throw new Error(`PNG pixel data is truncated: expected at least ${expectedBytes} bytes, got ${inflated.length}.`);
  }

  let previous = Buffer.alloc(rowBytes);
  let offset = 0;
  const uniqueColors = new Set<string>();
  for (let y = 0; y < info.height; y += 1) {
    const filter = inflated[offset];
    offset += 1;
    const source = inflated.subarray(offset, offset + rowBytes);
    offset += rowBytes;
    const row = Buffer.alloc(rowBytes);
    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x] || 0;
      const upperLeft = x >= channels ? previous[x - channels] || 0 : 0;
      if (filter === 0) row[x] = source[x];
      else if (filter === 1) row[x] = (source[x] + left) & 0xff;
      else if (filter === 2) row[x] = (source[x] + up) & 0xff;
      else if (filter === 3) row[x] = (source[x] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[x] = (source[x] + paethPredictor(left, up, upperLeft)) & 0xff;
      else throw new Error(`PNG uses unsupported filter type ${filter}.`);
    }

    for (let x = 0; x < rowBytes; x += channels) {
      uniqueColors.add(pixelKey(row, x, info.colorType));
      if (uniqueColors.size > 1) {
        return { status: "passed" as const, content: { uniqueColors: uniqueColors.size, blank: false } };
      }
    }
    previous = row;
  }

  return {
    status: "failed" as const,
    content: { uniqueColors: uniqueColors.size, blank: true },
    error: `Screenshot appears blank or single-color (${uniqueColors.size} unique color across ${info.width}x${info.height}).`,
  };
}

export function verifyScreenshotMetadata(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
): TestAgentArtifactVerificationItem[] {
  return manifestFiles.flatMap((item, index) => {
    if (item.type !== "screenshot") return [];
    const integrity = integrityItems[index];
    if (integrity?.status !== "passed") {
      return [pngMetadataItem(item, "skipped", undefined, "Screenshot file integrity did not pass, so PNG metadata could not be checked.")];
    }
    const ext = path.extname(item.path).toLowerCase();
    if (ext !== ".png") {
      return [
        pngMetadataItem(item, "skipped", undefined, `Screenshot artifact is ${ext || "extensionless"}; PNG metadata validation only applies to local .png screenshots.`),
        pngContentItem(item, "skipped", undefined, undefined, `Screenshot artifact is ${ext || "extensionless"}; PNG content validation only applies to local .png screenshots.`),
      ];
    }
    try {
      const image = readPngInfo(resolveArtifactPath(manifestPath || item.path, item.path));
      const content = analyzePngContent(image);
      return [
        pngMetadataItem(item, "passed", image),
        pngContentItem(item, content.status, image, content.content, content.error),
      ];
    } catch (error: any) {
      return [
        pngMetadataItem(item, "failed", undefined, error.message || String(error)),
        pngContentItem(item, "skipped", undefined, undefined, "PNG metadata validation failed, so content validation could not run."),
      ];
    }
  });
}

function browserEvidenceMetadataItem(
  item: TestAgentArtifactManifestItem,
  type: string,
  status: TestAgentArtifactVerificationItem["status"],
  metadata: { format?: string; entries?: number; events?: number } = {},
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type,
    title: `Browser artifact metadata: ${item.title}`,
    path: item.path,
    status,
    ...(metadata.format ? { artifactFormat: metadata.format } : {}),
    ...(typeof metadata.entries === "number" ? { artifactEntries: metadata.entries } : {}),
    ...(typeof metadata.events === "number" ? { artifactEvents: metadata.events } : {}),
    ...(error ? { error } : {}),
  };
}

function readFileHeader(filePath: string, length = 32) {
  const file = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const bytes = fs.readSync(file, buffer, 0, length, 0);
    return buffer.subarray(0, bytes);
  } finally {
    fs.closeSync(file);
  }
}

function validateZipArtifact(filePath: string) {
  const header = readFileHeader(filePath, 8);
  if (header.length < 4) throw new Error("ZIP artifact is too small.");
  const signature = header.readUInt32LE(0);
  const valid = signature === 0x04034b50 || signature === 0x06054b50 || signature === 0x08074b50;
  if (!valid) throw new Error("Expected ZIP signature for browser trace artifact.");
  const zip = readZipDirectoryMetadata(filePath);
  if (zip.entries <= 0) throw new Error("Browser trace ZIP must contain at least one entry.");
  if (!zip.traceEventEntry) throw new Error("Browser trace ZIP must contain a trace.trace event entry.");
  const events = countTraceEvents(zip.buffer, zip.traceEventEntry);
  if (events <= 0) throw new Error("Browser trace event entry must contain at least one JSON event.");
  return { format: "zip:trace", entries: zip.entries, events };
}

function readZipDirectoryMetadata(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 22) throw new Error("ZIP artifact is too small for an end-of-central-directory record.");
  const minOffset = Math.max(0, buffer.length - 65_557);
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ZIP end-of-central-directory record is missing.");

  const entries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirSize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (centralDirOffset + centralDirSize > buffer.length) {
    throw new Error("ZIP central directory exceeds file length.");
  }

  let offset = centralDirOffset;
  const entriesMetadata: ZipEntryMetadata[] = [];
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`ZIP central directory entry ${index + 1} is invalid.`);
    }
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buffer.length) throw new Error(`ZIP central directory entry ${index + 1} name exceeds file length.`);
    const name = buffer.toString("utf-8", nameStart, nameEnd);
    entriesMetadata.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    offset = nameEnd + extraLength + commentLength;
  }

  const traceEventEntry = entriesMetadata.find(entry => /(^|\/)trace\.trace$/i.test(entry.name));
  return {
    buffer,
    entries,
    traceEventEntry,
  };
}

interface ZipEntryMetadata {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

function readZipEntryData(buffer: Buffer, entry: ZipEntryMetadata) {
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error(`ZIP local header for ${entry.name} is invalid.`);
  }
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new Error(`ZIP entry ${entry.name} exceeds file length.`);
  const compressed = buffer.subarray(dataStart, dataEnd);
  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return zlib.inflateRawSync(compressed);
  throw new Error(`ZIP entry ${entry.name} uses unsupported compression method ${entry.compressionMethod}.`);
}

function countTraceEvents(buffer: Buffer, entry: ZipEntryMetadata) {
  const data = readZipEntryData(buffer, entry);
  if (entry.uncompressedSize > 0 && data.length < entry.uncompressedSize) {
    throw new Error(`ZIP trace entry ${entry.name} is truncated.`);
  }
  const text = data.toString("utf-8");
  let events = 0;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(`Trace event line ${index + 1} is not valid JSON.`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Trace event line ${index + 1} must be a JSON object.`);
    }
    events += 1;
  }
  return events;
}

function validateHarArtifact(filePath: string) {
  const parsed = readJson(filePath);
  const log = parsed?.log;
  if (!log || typeof log !== "object" || Array.isArray(log)) {
    throw new Error("HAR artifact must contain a log object.");
  }
  if (!Array.isArray(log.entries)) {
    throw new Error("HAR artifact log.entries must be an array.");
  }
  const version = typeof log.version === "string" && log.version ? log.version : "unknown";
  return { format: `har:${version}`, entries: log.entries.length };
}

function validateVideoArtifact(filePath: string) {
  const header = readFileHeader(filePath, 32);
  const ext = path.extname(filePath).toLowerCase();
  const isWebm = header.length >= 4
    && header[0] === 0x1a
    && header[1] === 0x45
    && header[2] === 0xdf
    && header[3] === 0xa3;
  const isIsoBmff = header.length >= 12 && header.toString("ascii", 4, 8) === "ftyp";
  if (isWebm) return { format: "webm" };
  if (isIsoBmff) return { format: ext === ".mov" ? "mov" : "mp4" };
  throw new Error(`Expected WebM/MP4/MOV container signature for browser video artifact${ext ? ` (${ext})` : ""}.`);
}

function validateAccessibilitySnapshotArtifact(filePath: string) {
  const text = fs.readFileSync(filePath, "utf-8");
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Accessibility snapshot artifact is empty.");
  const roleLines = lines.filter(line => /^-\s+[a-z][a-z0-9_-]*(\s|$)/i.test(line));
  if (!roleLines.length) throw new Error("Accessibility snapshot artifact does not contain any role/name lines.");
  return { format: "text:accessibility-snapshot", entries: roleLines.length };
}

export function verifyBrowserEvidenceArtifactMetadata(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
): TestAgentArtifactVerificationItem[] {
  return manifestFiles.flatMap((item, index) => {
    const type = item.type;
    if (type !== "browser_trace" && type !== "browser_har" && type !== "browser_video" && type !== "browser_accessibility_snapshot") return [];
    const verificationType = type === "browser_trace"
      ? "browser_trace_zip"
      : type === "browser_har"
        ? "browser_har_metadata"
        : type === "browser_video"
          ? "browser_video_container"
          : "browser_accessibility_snapshot_text";
    const integrity = integrityItems[index];
    if (integrity?.status !== "passed") {
      return [browserEvidenceMetadataItem(item, verificationType, "skipped", {}, "Artifact integrity did not pass, so browser artifact metadata could not be checked.")];
    }

    try {
      const filePath = resolveArtifactPath(manifestPath || item.path, item.path);
      const metadata = type === "browser_trace"
        ? validateZipArtifact(filePath)
        : type === "browser_har"
          ? validateHarArtifact(filePath)
          : type === "browser_video"
            ? validateVideoArtifact(filePath)
            : validateAccessibilitySnapshotArtifact(filePath);
      return [browserEvidenceMetadataItem(item, verificationType, "passed", metadata)];
    } catch (error: any) {
      return [browserEvidenceMetadataItem(item, verificationType, "failed", {}, error.message || String(error))];
    }
  });
}

export function semanticItem(
  reportItem: TestAgentArtifactManifestItem | undefined,
  verdictItem: TestAgentArtifactManifestItem | undefined,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "verdict_consistency",
    title: "TestAgent report/verdict semantic consistency",
    path: [reportItem?.path, verdictItem?.path].filter(Boolean).join(" <> "),
    status,
    ...(error ? { error } : {}),
  };
}

export function readJsonForSemantic(manifestPath: string, item: TestAgentArtifactManifestItem) {
  return readJson(resolveArtifactPath(manifestPath || item.path, item.path));
}

export function hasVerdictArtifactReference(report: any) {
  const files = report?.metadata?.artifactFiles || {};
  return typeof files.verdictJsonPath === "string" && files.verdictJsonPath.trim().length > 0;
}

export function sameJson(left: any, right: any) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function statusCoverageKeys<T extends RequiredCheckCoverageItem | AcceptanceCoverageItem>(
  items: T[] | undefined,
  status: T["status"],
  key: keyof T,
) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item.status === status)
    .map(item => String(item[key] || ""))
    .filter(Boolean)
    .sort();
}

export function compareStringList(label: string, expected: string[], actual: string[], errors: string[]) {
  if (expected.length !== actual.length || expected.some((value, index) => value !== actual[index])) {
    errors.push(`${label} mismatch: expected [${expected.join(", ")}], got [${actual.join(", ")}].`);
  }
}

export function expectEqual(label: string, actual: any, expected: any, errors: string[]) {
  if (!sameJson(actual, expected)) {
    errors.push(`${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

export function coverageStatusCounts(items: Array<{ status: string }> | undefined) {
  const counts = { verified: 0, not_verified: 0, unknown: 0 };
  for (const item of Array.isArray(items) ? items : []) {
    if (item.status === "verified" || item.status === "not_verified" || item.status === "unknown") counts[item.status] += 1;
  }
  return counts;
}

export function acceptanceMatchStrengthCounts(items: Array<{ matchStrength?: string }> | undefined) {
  const counts = { direct: 0, token: 0, fallback: 0, none: 0 };
  for (const item of Array.isArray(items) ? items : []) {
    const strength = item.matchStrength || "none";
    if (strength === "direct" || strength === "token" || strength === "fallback" || strength === "none") counts[strength] += 1;
  }
  return counts;
}

export function acceptanceEvidenceSourceCounts(items: Array<{ evidenceSource?: string }> | undefined) {
  const counts = { matched_evidence: 0, single_criterion_report_status: 0, none: 0 };
  for (const item of Array.isArray(items) ? items : []) {
    const source = item.evidenceSource || "none";
    if (source === "matched_evidence" || source === "single_criterion_report_status" || source === "none") counts[source] += 1;
  }
  return counts;
}

export function browserNetworkErrorCount(report: TestAgentReport) {
  return (Array.isArray(report?.browserNetworkSummary) ? report.browserNetworkSummary : [])
    .reduce((sum, item: any) => sum + Number(item?.errorCount || 0), 0);
}

export function browserInteractionCount(report: TestAgentReport, key: "actionCount" | "failedActions" | "assertionCount" | "failedAssertions") {
  return (Array.isArray(report?.browserInteractionSummary) ? report.browserInteractionSummary : [])
    .reduce((sum, item: any) => sum + Number(item?.[key] || 0), 0);
}

export function verifyBrowserAuthenticationEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  let hasMinimalExistingSession = false;
  for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
    const label = `report.browserResults[${resultIndex}]`;
    if (result.authentication) {
      errors.push(...browserAuthenticationEvidenceErrors(result.authentication, `${label}.authentication`));
    }
    if (result.contextOptions?.storageState) {
      errors.push(...browserAuthenticationEvidenceErrors({
        credentialEnvNames: [],
        storageState: result.contextOptions.storageState,
      }, `${label}.contextOptions`));
      if (!result.authentication?.storageState) {
        errors.push(`${label}.contextOptions.storageState exists without matching authentication evidence.`);
      } else {
        expectEqual(
          `${label}.authentication.storageState`,
          result.authentication.storageState,
          result.contextOptions.storageState,
          errors,
        );
      }
    }
    const authenticationEvidence = [
      ...(result.authentication ? [result.authentication] : []),
      ...(result.browserSessions || []).flatMap(session => session.authentication ? [session.authentication] : []),
    ];
    for (const [sessionIndex, session] of (result.browserSessions || []).entries()) {
      if (session.authentication) {
        errors.push(...browserAuthenticationEvidenceErrors(
          session.authentication,
          `${label}.browserSessions[${sessionIndex}].authentication`,
        ));
      }
    }
    if (authenticationEvidence.some(item => item.sensitiveArtifactsSuppressed)) {
      const forbidden = [
        ...(result.browserArtifacts || []),
        ...(result.browserSessions || []).flatMap(session => session.browserArtifacts || []),
      ].filter(item => item.type === "trace" || item.type === "har" || item.type === "video");
      if (forbidden.length) {
        errors.push(`${label} contains trace/HAR/video artifacts even though authentication evidence says sensitive artifacts were suppressed.`);
      }
    }
    const minimalExisting = result.authentication?.mode === "existing_session"
      && result.authentication.existingSession?.evidencePolicy === "minimal";
    if (minimalExisting) {
      hasMinimalExistingSession = true;
      const existing = result.authentication!.existingSession!;
      if (result.status === "passed" && (!existing.tabContextChecked || !existing.createdNewTab)) {
        errors.push(`${label} passed without proving tab context inspection and creation of a new tab.`);
      }
      for (const key of ["finalUrl", "title", "pageTextPreview", "consoleLogPath", "dialogLogPath", "popupLogPath", "networkLogPath"] as const) {
        if (result[key]) errors.push(`${label}.${key} must be suppressed for minimal existing-session evidence.`);
      }
      for (const key of ["screenshots", "pageSnapshots", "browserArtifacts", "consoleMessages", "dialogMessages", "popupMessages", "networkRequests"] as const) {
        const items = result[key] as any[] | undefined;
        if (Array.isArray(items) && items.length) errors.push(`${label}.${key} must be empty for minimal existing-session evidence.`);
      }
      for (const [stepIndex, step] of (result.steps || []).entries()) {
        if (step.detail && step.detail !== "authenticated browser step executed; raw detail suppressed") {
          errors.push(`${label}.steps[${stepIndex}].detail was not suppressed.`);
        }
        if (step.error && step.error !== "Authenticated browser step failed; raw provider detail suppressed.") {
          errors.push(`${label}.steps[${stepIndex}].error was not suppressed.`);
        }
      }
    }
  }
  if (hasMinimalExistingSession) {
    for (const [recordIndex, record] of (report.browserToolCalls || []).entries()) {
      const input = record.input;
      const keys = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input) : [];
      if (!input || !Array.isArray((input as any).inputKeys) || keys.some(key => key !== "inputKeys" && key !== "action")) {
        errors.push(`report.browserToolCalls[${recordIndex}].input contains more than suppressed metadata.`);
      }
      if (record.outputPreview && record.outputPreview !== "[suppressed for existing authenticated browser session]") {
        errors.push(`report.browserToolCalls[${recordIndex}].outputPreview was not suppressed.`);
      }
      if (record.error && record.error !== "Browser tool call failed; raw provider error suppressed.") {
        errors.push(`report.browserToolCalls[${recordIndex}].error was not suppressed.`);
      }
    }
  }
  if (report?.metadata?.browserAuthenticationSummary) {
    expectEqual(
      "report.metadata.browserAuthenticationSummary",
      report.metadata.browserAuthenticationSummary,
      buildBrowserAuthenticationSummary(report?.browserResults || []),
      errors,
    );
  }
}

export function verifyBrowserRecoveryEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  let hasRecoveryEvidence = false;
  for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
    if (!result.recovery) continue;
    hasRecoveryEvidence = true;
    const label = `report.browserResults[${resultIndex}].recovery`;
    errors.push(...browserRecoveryEvidenceErrors(result.recovery, label));
    const existingProvider = result.authentication?.existingSession?.provider;
    if (existingProvider) {
      for (const [eventIndex, event] of result.recovery.events.entries()) {
        if (event.provider !== existingProvider) {
          errors.push(`${label}.events[${eventIndex}].provider does not match the authenticated browser provider.`);
        }
      }
    }
  }
  if (hasRecoveryEvidence && !report.browserRecoverySummary) {
    errors.push("report.browserRecoverySummary is missing even though browser recovery evidence exists.");
  }
  if (report.browserRecoverySummary) {
    errors.push(...browserRecoverySummaryErrors(
      report.browserRecoverySummary,
      report.browserResults || [],
      "report.browserRecoverySummary",
    ));
  }
}

export function verifyBrowserActionEffectEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  let hasActionEffects = false;
  for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
    const effects = result.actionEffects || [];
    if (!effects.length) continue;
    hasActionEffects = true;
    const label = `report.browserResults[${resultIndex}]`;
    errors.push(...browserActionEffectResultErrors(result, label));
    for (const [effectIndex, effect] of effects.entries()) {
      if (effect.provider !== result.provider) {
        errors.push(`${label}.actionEffects[${effectIndex}].provider does not match the browser result provider.`);
      }
    }
    const minimalExisting = result.authentication?.mode === "existing_session"
      && result.authentication.existingSession?.evidencePolicy === "minimal";
    if (minimalExisting && effects.some(effect =>
      !effect.detailSuppressed
      || Object.keys(effect.before || {}).length > 0
      || Object.keys(effect.after || {}).length > 0
    )) {
      errors.push(`${label}.actionEffects retained detail under the minimal existing-session evidence policy.`);
    }
  }
  if (hasActionEffects && !report.browserActionEffectSummary) {
    errors.push("report.browserActionEffectSummary is missing even though browser action-effect evidence exists.");
  }
  if (report.browserActionEffectSummary) {
    errors.push(...browserActionEffectSummaryErrors(
      report.browserActionEffectSummary,
      report.browserResults || [],
      "report.browserActionEffectSummary",
    ));
  }
}

export function verifyAdversarialEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  const summary = report.adversarialEvidenceSummary;
  errors.push(...adversarialEvidenceSummaryErrors(
    summary,
    report.httpResults || [],
    report.browserResults || [],
    report.originalUserGoal || "",
    report.acceptanceCriteria || [],
    "report.adversarialEvidenceSummary",
  ));
  const requiredByCheck = (report.requiredChecks || [])
    .some(check => /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "")));
  if (requiredByCheck && summary?.required !== true) {
    errors.push("report.adversarialEvidenceSummary.required must be true when requiredChecks includes an adversarial check.");
  }
  if (report.status === "passed" && !["verified", "waived"].includes(String(summary?.status || ""))) {
    errors.push("A passed report requires verified adversarial evidence or an explicit waiver.");
  }
  if (summary?.status === "failed" && report.status !== "failed") {
    errors.push("Failed adversarial evidence requires a failed report.");
  }
  if (summary?.status === "missing" && summary.required && report.status === "passed") {
    errors.push("Missing required adversarial evidence cannot produce a passed report.");
  }
}

export function verifyAcceptanceEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  errors.push(...acceptanceEvidenceGateSummaryErrors(
    report.acceptanceEvidenceGateSummary,
    report.acceptanceCoverage || [],
    "report.acceptanceEvidenceGateSummary",
  ));
  if (report.status === "passed" && report.acceptanceEvidenceGateSummary?.canAccept !== true) {
    errors.push("A passed report requires criterion-linked acceptance evidence or no acceptance criteria.");
  }
}

export function verifyHttpConcurrencyConsistency(report: TestAgentReport, errors: string[]) {
  let hasConcurrency = false;
  for (const [index, result] of (report.httpResults || []).entries()) {
    if (!result.concurrency) continue;
    hasConcurrency = true;
    const label = `report.httpResults[${index}].concurrency`;
    errors.push(...httpConcurrencyEvidenceErrors(result.concurrency, label));
    const expectedStatus = httpConcurrencyResultStatus(result.concurrency);
    if (result.status !== expectedStatus) {
      errors.push(`report.httpResults[${index}].status must be ${expectedStatus} for its concurrent HTTP evidence.`);
    }
    if (result.status === "passed") {
      if (!result.concurrency.overlapObserved) {
        errors.push(`${label} belongs to a passed result but does not prove overlapping requests.`);
      }
      if (result.concurrency.failed || result.concurrency.blocked) {
        errors.push(`${label} belongs to a passed result but contains failed or blocked requests.`);
      }
      if (result.concurrency.aggregateAssertions.some(assertion => assertion.status !== "passed")) {
        errors.push(`${label} belongs to a passed result but contains non-passing aggregate assertions.`);
      }
    }
  }
  if (hasConcurrency && !report.httpConcurrencySummary) {
    errors.push("report.httpConcurrencySummary is missing even though concurrent HTTP evidence exists.");
  }
  if (report.httpConcurrencySummary) {
    errors.push(...httpConcurrencySummaryErrors(
      report.httpConcurrencySummary,
      report.httpResults || [],
      "report.httpConcurrencySummary",
    ));
  }
}
