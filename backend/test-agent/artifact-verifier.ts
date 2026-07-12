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

function verifyScreenshotMetadata(
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

function verifyBrowserEvidenceArtifactMetadata(
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

function semanticItem(
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

function readJsonForSemantic(manifestPath: string, item: TestAgentArtifactManifestItem) {
  return readJson(resolveArtifactPath(manifestPath || item.path, item.path));
}

function hasVerdictArtifactReference(report: any) {
  const files = report?.metadata?.artifactFiles || {};
  return typeof files.verdictJsonPath === "string" && files.verdictJsonPath.trim().length > 0;
}

function sameJson(left: any, right: any) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function statusCoverageKeys<T extends RequiredCheckCoverageItem | AcceptanceCoverageItem>(
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

function compareStringList(label: string, expected: string[], actual: string[], errors: string[]) {
  if (expected.length !== actual.length || expected.some((value, index) => value !== actual[index])) {
    errors.push(`${label} mismatch: expected [${expected.join(", ")}], got [${actual.join(", ")}].`);
  }
}

function expectEqual(label: string, actual: any, expected: any, errors: string[]) {
  if (!sameJson(actual, expected)) {
    errors.push(`${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function coverageStatusCounts(items: Array<{ status: string }> | undefined) {
  const counts = { verified: 0, not_verified: 0, unknown: 0 };
  for (const item of Array.isArray(items) ? items : []) {
    if (item.status === "verified" || item.status === "not_verified" || item.status === "unknown") counts[item.status] += 1;
  }
  return counts;
}

function acceptanceMatchStrengthCounts(items: Array<{ matchStrength?: string }> | undefined) {
  const counts = { direct: 0, token: 0, fallback: 0, none: 0 };
  for (const item of Array.isArray(items) ? items : []) {
    const strength = item.matchStrength || "none";
    if (strength === "direct" || strength === "token" || strength === "fallback" || strength === "none") counts[strength] += 1;
  }
  return counts;
}

function acceptanceEvidenceSourceCounts(items: Array<{ evidenceSource?: string }> | undefined) {
  const counts = { matched_evidence: 0, single_criterion_report_status: 0, none: 0 };
  for (const item of Array.isArray(items) ? items : []) {
    const source = item.evidenceSource || "none";
    if (source === "matched_evidence" || source === "single_criterion_report_status" || source === "none") counts[source] += 1;
  }
  return counts;
}

function browserNetworkErrorCount(report: TestAgentReport) {
  return (Array.isArray(report?.browserNetworkSummary) ? report.browserNetworkSummary : [])
    .reduce((sum, item: any) => sum + Number(item?.errorCount || 0), 0);
}

function browserInteractionCount(report: TestAgentReport, key: "actionCount" | "failedActions" | "assertionCount" | "failedAssertions") {
  return (Array.isArray(report?.browserInteractionSummary) ? report.browserInteractionSummary : [])
    .reduce((sum, item: any) => sum + Number(item?.[key] || 0), 0);
}

function verifyBrowserAuthenticationEvidenceConsistency(report: TestAgentReport, errors: string[]) {
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

function verifyBrowserRecoveryEvidenceConsistency(report: TestAgentReport, errors: string[]) {
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

function verifyBrowserActionEffectEvidenceConsistency(report: TestAgentReport, errors: string[]) {
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

function verifyAdversarialEvidenceConsistency(report: TestAgentReport, errors: string[]) {
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

function verifyAcceptanceEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  errors.push(...acceptanceEvidenceGateSummaryErrors(
    report.acceptanceEvidenceGateSummary,
    report.acceptanceCoverage || [],
    "report.acceptanceEvidenceGateSummary",
  ));
  if (report.status === "passed" && report.acceptanceEvidenceGateSummary?.canAccept !== true) {
    errors.push("A passed report requires criterion-linked acceptance evidence or no acceptance criteria.");
  }
}

function verifyHttpConcurrencyConsistency(report: TestAgentReport, errors: string[]) {
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

function verifyHttpPageResourceConsistency(report: TestAgentReport, errors: string[]) {
  for (const [index, result] of (report.httpResults || []).entries()) {
    errors.push(...httpPageResourceEvidenceErrors(result, `report.httpResults[${index}]`));
  }
}

function verifyBrowserSessionEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
    const sessions = result.browserSessions || [];
    if (!sessions.length) continue;
    const label = `report.browserResults[${resultIndex}]`;
    if (sessions.length < 2) errors.push(`${label}.browserSessions must contain at least two sessions.`);
    const names = sessions.map(session => String(session.name || "").trim());
    const normalizedNames = names.map(name => name.toLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) errors.push(`${label}.browserSessions contains duplicate session names.`);
    expectEqual(`${label}.context.multiSession`, result.context?.multiSession, true, errors);
    expectEqual(`${label}.context.sessionCount`, result.context?.sessionCount, sessions.length, errors);
    const contextSessionNames = Array.isArray(result.context?.sessionNames) ? result.context.sessionNames.map(String) : [];
    compareStringList(`${label}.context.sessionNames`, [...names].sort(), contextSessionNames.sort(), errors);
    const parallelGroups = new Map<string, Set<string>>();
    for (const step of result.steps) {
      const group = /(?:^|;\s*)parallelGroup=(\d+)(?:;|$)/.exec(String(step.detail || ""))?.[1];
      if (!group) continue;
      const session = /^session:([^:]+):/.exec(step.name)?.[1] || "";
      if (!parallelGroups.has(group)) parallelGroups.set(group, new Set<string>());
      if (session) parallelGroups.get(group)!.add(session.toLowerCase());
    }
    if (result.context?.parallelGroupCount !== undefined || parallelGroups.size) {
      expectEqual(`${label}.context.parallelGroupCount`, result.context?.parallelGroupCount, parallelGroups.size, errors);
      for (const [group, groupSessions] of parallelGroups) {
        if (groupSessions.size < 2) errors.push(`${label} parallel group ${group} does not contain steps from at least two sessions.`);
      }
    }

    const comparisons = result.browserSessionComparisons || [];
    const comparisonSteps = result.steps.filter(step => /(?:^|;\s*)compareSessions=([^;]+)(?:;|$)/.test(String(step.detail || "")));
    if (result.context?.comparisonCount !== undefined || comparisons.length || comparisonSteps.length) {
      expectEqual(`${label}.context.comparisonCount`, result.context?.comparisonCount, comparisons.length, errors);
      expectEqual(`${label}.browserSessionComparisons.length`, comparisons.length, comparisonSteps.length, errors);
      for (const [comparisonIndex, comparison] of comparisons.entries()) {
        const comparisonLabel = `${label}.browserSessionComparisons[${comparisonIndex}]`;
        const comparisonStep = comparisonSteps[comparisonIndex];
        const left = String(comparison.leftSession || "").trim();
        const right = String(comparison.rightSession || "").trim();
        if (!normalizedNames.includes(left.toLowerCase())) errors.push(`${comparisonLabel}.leftSession references unknown session ${JSON.stringify(left)}.`);
        if (!normalizedNames.includes(right.toLowerCase())) errors.push(`${comparisonLabel}.rightSession references unknown session ${JSON.stringify(right)}.`);
        if (left && right && left.toLowerCase() === right.toLowerCase()) errors.push(`${comparisonLabel} must compare two distinct sessions.`);
        if (!["equals", "notEquals", "includes"].includes(String(comparison.operator || ""))) errors.push(`${comparisonLabel}.operator is invalid.`);
        if (!["passed", "failed"].includes(String(comparison.status || ""))) errors.push(`${comparisonLabel}.status is invalid.`);
        for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "leftValue", "left_value", "rightValue", "right_value", "actual", "expected"]) {
          if (Object.prototype.hasOwnProperty.call(comparison as any, key)) errors.push(`${comparisonLabel}.${key} must not contain raw compared values.`);
        }
        for (const side of ["left", "right"] as const) {
          const summary = comparison[side];
          if (!summary) continue;
          if (!/^[a-f0-9]{64}$/i.test(String(summary.sha256 || ""))) errors.push(`${comparisonLabel}.${side}.sha256 is not a SHA-256 digest.`);
          if (!Number.isFinite(Number(summary.serializedBytes)) || Number(summary.serializedBytes) < 0) errors.push(`${comparisonLabel}.${side}.serializedBytes must be non-negative.`);
          for (const key of ["value", "values", "rawValue", "raw_value", "rawValues", "raw_values", "actual", "expected"]) {
            if (Object.prototype.hasOwnProperty.call(summary as any, key)) errors.push(`${comparisonLabel}.${side}.${key} must not contain raw compared values.`);
          }
        }
        if (comparison.status === "passed" && (!comparison.left || !comparison.right)) {
          errors.push(`${comparisonLabel} passed without both comparison value summaries.`);
        }
        if (comparison.status === "passed" && comparison.operator === "equals" && comparison.left?.sha256 !== comparison.right?.sha256) {
          errors.push(`${comparisonLabel} passed equals comparison has different value digests.`);
        }
        if (comparison.status === "passed" && comparison.operator === "notEquals" && comparison.left?.sha256 === comparison.right?.sha256) {
          errors.push(`${comparisonLabel} passed notEquals comparison has identical value digests.`);
        }
        if (comparisonStep) {
          const comparedSessions = /(?:^|;\s*)compareSessions=([^,;]+),([^;]+)(?:;|$)/.exec(String(comparisonStep.detail || ""));
          const operator = /(?:^|;\s*)operator=([^;]+)(?:;|$)/.exec(String(comparisonStep.detail || ""))?.[1];
          if (!comparedSessions || comparedSessions[1].trim().toLowerCase() !== left.toLowerCase() || comparedSessions[2].trim().toLowerCase() !== right.toLowerCase()) {
            errors.push(`${comparisonLabel} does not match its comparison step session pair.`);
          }
          if (operator !== comparison.operator) errors.push(`${comparisonLabel} does not match its comparison step operator.`);
          if (comparisonStep.status !== comparison.status) errors.push(`${comparisonLabel} does not match its comparison step status.`);
        }
      }
    }

    const screenshots = new Set((result.screenshots || []).map(String));
    const pageSnapshots = new Set((result.pageSnapshots || []).map(String));
    const artifactPaths = new Set((result.browserArtifacts || []).map(item => String(item.path || "")));
    for (const session of sessions) {
      for (const screenshot of session.screenshots || []) {
        if (!screenshots.has(String(screenshot))) errors.push(`${label} session ${JSON.stringify(session.name)} screenshot is missing from the browser result aggregate: ${screenshot}.`);
      }
      for (const snapshot of session.pageSnapshots || []) {
        if (!pageSnapshots.has(String(snapshot))) errors.push(`${label} session ${JSON.stringify(session.name)} page snapshot is missing from the browser result aggregate: ${snapshot}.`);
      }
      for (const artifact of session.browserArtifacts || []) {
        if (!artifactPaths.has(String(artifact.path || ""))) errors.push(`${label} session ${JSON.stringify(session.name)} browser artifact is missing from the browser result aggregate: ${artifact.path}.`);
      }
      if (!result.steps.some(step => step.name.startsWith(`session:${session.name}:`))) {
        errors.push(`${label} session ${JSON.stringify(session.name)} has no session-prefixed execution step.`);
      }
    }
  }
}

function verifyBrowserStabilityEvidenceConsistency(report: TestAgentReport, errors: string[]) {
  const groups = new Map<string, Array<{ index: number; result: TestAgentReport["browserResults"][number]; run: number; runs: number }>>();
  for (const [index, result] of (report?.browserResults || []).entries()) {
    const hasSignal = result.context?.browserStability === true
      || result.context?.stabilityGroupId !== undefined
      || result.context?.stabilityRun !== undefined
      || Number(result.context?.stabilityRuns || 0) > 1;
    if (!hasSignal) continue;
    const metadata = browserStabilityMetadata(result);
    if (!metadata) {
      errors.push(`report.browserResults[${index}] has invalid browser stability metadata.`);
      continue;
    }
    const group = groups.get(metadata.groupId) || [];
    group.push({ index, result, run: metadata.run, runs: metadata.runs });
    groups.set(metadata.groupId, group);
  }

  for (const [groupId, entries] of groups) {
    const label = `browser stability group ${JSON.stringify(groupId)}`;
    const expectedRuns = entries[0]?.runs || 0;
    if (entries.some(entry => entry.runs !== expectedRuns)) errors.push(`${label} has inconsistent stabilityRuns values.`);
    const runs = entries.map(entry => entry.run).sort((a, b) => a - b);
    if (new Set(runs).size !== runs.length) errors.push(`${label} contains duplicate stabilityRun values.`);
    if (runs.some(run => run < 1 || run > expectedRuns)) errors.push(`${label} contains a stabilityRun outside 1..${expectedRuns}.`);
    if (entries.length !== expectedRuns) errors.push(`${label} expected ${expectedRuns} results but found ${entries.length}.`);
    const first = entries[0]?.result;
    for (const entry of entries.slice(1)) {
      if (entry.result.project !== first?.project) errors.push(`${label} mixes projects.`);
      if (entry.result.name !== first?.name) errors.push(`${label} mixes browser check names.`);
      if (entry.result.provider !== first?.provider) errors.push(`${label} mixes browser providers.`);
      if (entry.result.probeType !== first?.probeType) errors.push(`${label} mixes probe types.`);
    }
    const artifactPaths = entries.flatMap(entry => [
      ...(entry.result.screenshots || []),
      ...(entry.result.pageSnapshots || []),
      entry.result.consoleLogPath || "",
      entry.result.dialogLogPath || "",
      entry.result.popupLogPath || "",
      entry.result.networkLogPath || "",
      ...(entry.result.browserArtifacts || []).map(artifact => artifact.path),
    ].filter(Boolean).map(String));
    if (new Set(artifactPaths).size !== artifactPaths.length) {
      errors.push(`${label} reuses an artifact path across stability runs.`);
    }
  }
}

function verifyBrowserCheckExecutionCoverageConsistency(report: TestAgentReport, errors: string[]) {
  const plan = report?.metadata?.browserCheckExecutionPlan;
  const hasExecutionIdentity = (report?.browserResults || []).some(result => result.execution);
  if (!plan) {
    if (hasExecutionIdentity || report?.browserCheckExecutionCoverage) {
      errors.push("Browser execution evidence exists without metadata.browserCheckExecutionPlan.");
    }
    return;
  }
  errors.push(...browserCheckExecutionEvidenceErrors({
    plan,
    results: report?.browserResults || [],
    summary: report?.browserCheckExecutionCoverage,
    reportStatus: report?.status,
  }));
}

function verifyBrowserEvidenceTemporalIntegrityConsistency(report: TestAgentReport, errors: string[]) {
  errors.push(...browserEvidenceTemporalIntegrityErrors(report));
}

function verifyBrowserResourceLifecycleConsistency(report: TestAgentReport, errors: string[]) {
  errors.push(...browserResourceLifecycleErrors(report));
}

function verifyBrowserToolEvidenceLineageConsistency(report: TestAgentReport, errors: string[]) {
  const hasSignal = report?.browserToolEvidenceLineage
    || (report?.browserResults || []).some(result => (result.browserToolCallIds || []).length)
    || (report?.browserToolCalls || []).some(record => record.browserExecution);
  if (!hasSignal) return;
  errors.push(...browserToolEvidenceLineageErrors({
    browserResults: report?.browserResults || [],
    browserToolCalls: report?.browserToolCalls || [],
    summary: report?.browserToolEvidenceLineage,
    reportStatus: report?.status,
  }));
}

function verifyBrowserToolCallTimeoutConsistency(report: TestAgentReport, errors: string[]) {
  const hasSignal = report?.browserToolCallTimeoutSummary
    || (report?.browserToolCalls || []).some(record =>
      record.timeoutMs !== undefined || record.timedOut !== undefined || record.abortRequested !== undefined
    );
  if (!hasSignal) return;
  errors.push(...browserToolCallTimeoutEvidenceErrors({
    browserResults: report?.browserResults || [],
    browserToolCalls: report?.browserToolCalls || [],
    summary: report?.browserToolCallTimeoutSummary,
    reportStatus: report?.status,
  }));
}

function verifyReportVerdictConsistency(
  manifest: TestAgentArtifactManifest,
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
): TestAgentArtifactVerificationItem[] {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  const verdictIndex = manifestFiles.findIndex(item => item.type === "verdict_json");
  const reportItem = reportIndex >= 0 ? manifestFiles[reportIndex] : undefined;
  const verdictItem = verdictIndex >= 0 ? manifestFiles[verdictIndex] : undefined;

  if (!reportItem && !verdictItem) return [];
  if (!reportItem && verdictItem) {
    return [semanticItem(reportItem, verdictItem, "failed", "Manifest includes verdict_json but no report_json to verify it against.")];
  }
  if (reportItem && !verdictItem) {
    const reportIntegrity = integrityItems[reportIndex];
    if (reportIntegrity?.status !== "passed") {
      return [semanticItem(reportItem, verdictItem, "skipped", "Report artifact integrity did not pass, so verdict consistency could not be checked.")];
    }
    try {
      const report = readJsonForSemantic(manifestPath, reportItem);
      if (hasVerdictArtifactReference(report)) {
        return [semanticItem(reportItem, verdictItem, "failed", "Report metadata references verdictJsonPath, but manifest has no verdict_json entry.")];
      }
      return [semanticItem(reportItem, verdictItem, "skipped", "Manifest has no verdict_json entry; treating as a legacy report without a verdict artifact.")];
    } catch (error: any) {
      return [semanticItem(reportItem, verdictItem, "failed", `Unable to read report_json for verdict consistency: ${error.message || String(error)}`)];
    }
  }

  const reportIntegrity = integrityItems[reportIndex];
  const verdictIntegrity = integrityItems[verdictIndex];
  if (reportIntegrity?.status !== "passed" || verdictIntegrity?.status !== "passed") {
    return [semanticItem(reportItem, verdictItem, "skipped", "Report or verdict artifact integrity did not pass, so semantic consistency could not be checked.")];
  }

  let report: TestAgentReport;
  let verdict: TestAgentVerdict;
  try {
    report = readJsonForSemantic(manifestPath, reportItem!) as TestAgentReport;
    verdict = readJsonForSemantic(manifestPath, verdictItem!) as TestAgentVerdict;
  } catch (error: any) {
    return [semanticItem(reportItem, verdictItem, "failed", `Unable to read report/verdict JSON: ${error.message || String(error)}`)];
  }

  const errors: string[] = [];
  expectEqual("report.schema", report?.schema, "ccm-test-agent-report-v1", errors);
  expectEqual("verdict.schema", verdict?.schema, "ccm-test-agent-verdict-v1", errors);
  expectEqual("manifest.reportId", manifest.reportId, report?.id, errors);
  expectEqual("manifest.workOrderId", manifest.workOrderId, report?.workOrderId, errors);
  expectEqual("manifest.taskId", manifest.taskId, report?.taskId, errors);
  expectEqual("manifest.groupId", manifest.groupId, report?.groupId, errors);
  expectEqual("manifest.originalUserGoal", manifest.originalUserGoal, report?.originalUserGoal, errors);
  expectEqual("manifest.acceptanceCriteria", manifest.acceptanceCriteria, report?.acceptanceCriteria, errors);
  expectEqual("manifest.status", manifest.status, report?.status, errors);
  expectEqual("verdict.reportId", verdict?.reportId, report?.id, errors);
  expectEqual("verdict.workOrderId", verdict?.workOrderId, report?.workOrderId, errors);
  expectEqual("verdict.taskId", verdict?.taskId, report?.taskId, errors);
  expectEqual("verdict.groupId", verdict?.groupId, report?.groupId, errors);
  expectEqual("verdict.status", verdict?.status, report?.status, errors);
  expectEqual("verdict.recommendation", verdict?.recommendation, report?.recommendation, errors);
  expectEqual("verdict.summary", verdict?.summary, report?.summary, errors);
  expectEqual(
    "verdict.canAccept",
    verdict?.canAccept,
    report?.status === "passed"
      && report?.recommendation === "accept"
      && ["verified", "waived"].includes(String(report?.adversarialEvidenceSummary?.status || ""))
      && (!report?.browserCheckExecutionCoverage || report.browserCheckExecutionCoverage.status === "complete")
      && report?.browserEvidenceTemporalIntegrity?.status === "complete"
      && report?.browserResourceLifecycleSummary?.status === "complete"
      && (!report?.browserToolEvidenceLineage || report.browserToolEvidenceLineage.status === "complete")
      && report?.acceptanceEvidenceGateSummary?.canAccept === true,
    errors,
  );
  expectEqual("verdict.needsRework", verdict?.needsRework, report?.recommendation === "rework", errors);
  expectEqual("verdict.needsHuman", verdict?.needsHuman, report?.recommendation === "need_human", errors);

  const expectedFailedRequired = statusCoverageKeys(report?.requiredCheckCoverage, "not_verified", "check");
  const expectedUnknownRequired = statusCoverageKeys(report?.requiredCheckCoverage, "unknown", "check");
  const actualFailedRequired = statusCoverageKeys(verdict?.failedRequiredChecks, "not_verified", "check");
  const actualUnknownRequired = statusCoverageKeys(verdict?.unknownRequiredChecks, "unknown", "check");
  compareStringList("verdict.failedRequiredChecks", expectedFailedRequired, actualFailedRequired, errors);
  compareStringList("verdict.unknownRequiredChecks", expectedUnknownRequired, actualUnknownRequired, errors);

  const expectedFailedAcceptance = statusCoverageKeys(report?.acceptanceCoverage, "not_verified", "criterion");
  const expectedUnknownAcceptance = statusCoverageKeys(report?.acceptanceCoverage, "unknown", "criterion");
  const actualFailedAcceptance = statusCoverageKeys(verdict?.failedAcceptanceCriteria, "not_verified", "criterion");
  const actualUnknownAcceptance = statusCoverageKeys(verdict?.unknownAcceptanceCriteria, "unknown", "criterion");
  compareStringList("verdict.failedAcceptanceCriteria", expectedFailedAcceptance, actualFailedAcceptance, errors);
  compareStringList("verdict.unknownAcceptanceCriteria", expectedUnknownAcceptance, actualUnknownAcceptance, errors);
  expectEqual("verdict.acceptanceSummary.total", verdict?.acceptanceSummary?.total, (report?.acceptanceCoverage || []).length, errors);
  expectEqual("verdict.acceptanceSummary.statusCounts", verdict?.acceptanceSummary?.statusCounts, coverageStatusCounts(report?.acceptanceCoverage), errors);
  expectEqual("verdict.acceptanceSummary.matchStrengthCounts", verdict?.acceptanceSummary?.matchStrengthCounts, acceptanceMatchStrengthCounts(report?.acceptanceCoverage), errors);
  expectEqual("verdict.acceptanceSummary.evidenceSourceCounts", verdict?.acceptanceSummary?.evidenceSourceCounts, acceptanceEvidenceSourceCounts(report?.acceptanceCoverage), errors);
  const expectedAcceptanceGate = buildAcceptanceEvidenceGateSummary(report?.acceptanceCoverage || []);
  expectEqual("report.acceptanceEvidenceGateSummary", report?.acceptanceEvidenceGateSummary, expectedAcceptanceGate, errors);
  expectEqual("verdict.acceptanceEvidenceGateSummary", verdict?.acceptanceEvidenceGateSummary, expectedAcceptanceGate, errors);
  expectEqual("verdict.evidenceSummary.acceptanceMatchedEvidence", verdict?.evidenceSummary?.acceptanceMatchedEvidence, expectedAcceptanceGate.matchedEvidence, errors);
  expectEqual("verdict.evidenceSummary.acceptanceFallbackEvidence", verdict?.evidenceSummary?.acceptanceFallbackEvidence, expectedAcceptanceGate.fallbackEvidence, errors);
  expectEqual("verdict.evidenceSummary.acceptanceMissingEvidence", verdict?.evidenceSummary?.acceptanceMissingEvidence, expectedAcceptanceGate.missingEvidence, errors);
  if (report?.httpConcurrencySummary || verdict?.httpConcurrencySummary || (report?.httpResults || []).some(result => result.concurrency)) {
    const expectedHttpConcurrencySummary = buildHttpConcurrencySummary(report?.httpResults || []);
    expectEqual("report.httpConcurrencySummary", report?.httpConcurrencySummary || null, expectedHttpConcurrencySummary, errors);
    expectEqual("verdict.httpConcurrencySummary", verdict?.httpConcurrencySummary || null, expectedHttpConcurrencySummary, errors);
    expectEqual("verdict.evidenceSummary.httpConcurrencyChecks", verdict?.evidenceSummary?.httpConcurrencyChecks, expectedHttpConcurrencySummary.checks, errors);
    expectEqual("verdict.evidenceSummary.httpConcurrentRequests", verdict?.evidenceSummary?.httpConcurrentRequests, expectedHttpConcurrencySummary.requests, errors);
    expectEqual("verdict.evidenceSummary.httpConcurrentFailed", verdict?.evidenceSummary?.httpConcurrentFailed, expectedHttpConcurrencySummary.failed, errors);
    expectEqual("verdict.evidenceSummary.httpConcurrentBlocked", verdict?.evidenceSummary?.httpConcurrentBlocked, expectedHttpConcurrencySummary.blocked, errors);
  }

  if (Array.isArray(report?.browserNetworkSummary) || Array.isArray(verdict?.browserNetworkSummary)) {
    expectEqual("verdict.browserNetworkSummary", verdict?.browserNetworkSummary || [], report?.browserNetworkSummary || [], errors);
    expectEqual("verdict.evidenceSummary.browserNetworkErrors", verdict?.evidenceSummary?.browserNetworkErrors, browserNetworkErrorCount(report), errors);
  }
  if (Array.isArray(report?.browserInteractionSummary) || Array.isArray(verdict?.browserInteractionSummary)) {
    expectEqual("verdict.browserInteractionSummary", verdict?.browserInteractionSummary || [], report?.browserInteractionSummary || [], errors);
    expectEqual("verdict.evidenceSummary.browserActions", verdict?.evidenceSummary?.browserActions, browserInteractionCount(report, "actionCount"), errors);
    expectEqual("verdict.evidenceSummary.browserFailedActions", verdict?.evidenceSummary?.browserFailedActions, browserInteractionCount(report, "failedActions"), errors);
    expectEqual("verdict.evidenceSummary.browserAssertions", verdict?.evidenceSummary?.browserAssertions, browserInteractionCount(report, "assertionCount"), errors);
    expectEqual("verdict.evidenceSummary.browserFailedAssertions", verdict?.evidenceSummary?.browserFailedAssertions, browserInteractionCount(report, "failedAssertions"), errors);
  }
  if (report?.browserFlowSummary || verdict?.browserFlowSummary) {
    expectEqual("verdict.browserFlowSummary", verdict?.browserFlowSummary || null, report?.browserFlowSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserAcceptanceFlows", verdict?.evidenceSummary?.browserAcceptanceFlows, report?.browserFlowSummary?.total || 0, errors);
    expectEqual("verdict.evidenceSummary.browserFailedAcceptanceFlows", verdict?.evidenceSummary?.browserFailedAcceptanceFlows, (report?.browserFlowSummary?.statusCounts?.failed || 0) + (report?.browserFlowSummary?.statusCounts?.blocked || 0), errors);
  }
  if (report?.browserMultiSessionSummary || verdict?.browserMultiSessionSummary) {
    const expectedMultiSessionSummary = buildBrowserMultiSessionSummary(report?.browserResults || []);
    expectEqual("report.browserMultiSessionSummary", report?.browserMultiSessionSummary || null, expectedMultiSessionSummary, errors);
    expectEqual("verdict.browserMultiSessionSummary", verdict?.browserMultiSessionSummary || null, report?.browserMultiSessionSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserMultiSessionScenarios", verdict?.evidenceSummary?.browserMultiSessionScenarios, expectedMultiSessionSummary.total, errors);
    expectEqual("verdict.evidenceSummary.browserMultiSessionSessions", verdict?.evidenceSummary?.browserMultiSessionSessions, expectedMultiSessionSummary.sessionCount, errors);
    expectEqual("verdict.evidenceSummary.browserMultiSessionParallelGroups", verdict?.evidenceSummary?.browserMultiSessionParallelGroups, expectedMultiSessionSummary.parallelGroupCount, errors);
    expectEqual("verdict.evidenceSummary.browserMultiSessionComparisons", verdict?.evidenceSummary?.browserMultiSessionComparisons, expectedMultiSessionSummary.comparisonCount, errors);
    expectEqual("verdict.evidenceSummary.browserFailedSessionComparisons", verdict?.evidenceSummary?.browserFailedSessionComparisons, expectedMultiSessionSummary.failedComparisonCount, errors);
    expectEqual("verdict.evidenceSummary.browserFailedMultiSessionScenarios", verdict?.evidenceSummary?.browserFailedMultiSessionScenarios, expectedMultiSessionSummary.statusCounts.failed + expectedMultiSessionSummary.statusCounts.blocked, errors);
  }
  if (report?.browserStabilitySummary || verdict?.browserStabilitySummary) {
    const expectedStabilitySummary = buildBrowserStabilitySummary(report?.browserResults || []);
    expectEqual("report.browserStabilitySummary", report?.browserStabilitySummary || null, expectedStabilitySummary, errors);
    expectEqual("verdict.browserStabilitySummary", verdict?.browserStabilitySummary || null, report?.browserStabilitySummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserStabilityGroups", verdict?.evidenceSummary?.browserStabilityGroups, expectedStabilitySummary.total, errors);
    expectEqual("verdict.evidenceSummary.browserFlakyStabilityGroups", verdict?.evidenceSummary?.browserFlakyStabilityGroups, expectedStabilitySummary.statusCounts.flaky, errors);
    expectEqual("verdict.evidenceSummary.browserStabilityRuns", verdict?.evidenceSummary?.browserStabilityRuns, expectedStabilitySummary.runCount, errors);
    expectEqual("verdict.evidenceSummary.browserFailedStabilityRuns", verdict?.evidenceSummary?.browserFailedStabilityRuns, expectedStabilitySummary.failedRunCount, errors);
  }
  if (report?.browserCheckExecutionCoverage || verdict?.browserCheckExecutionCoverage) {
    const plan = report?.metadata?.browserCheckExecutionPlan;
    const expectedCoverage = plan
      ? buildBrowserCheckExecutionCoverage(plan, report?.browserResults || [])
      : undefined;
    expectEqual("report.browserCheckExecutionCoverage", report?.browserCheckExecutionCoverage || null, expectedCoverage || null, errors);
    expectEqual("verdict.browserCheckExecutionCoverage", verdict?.browserCheckExecutionCoverage || null, report?.browserCheckExecutionCoverage || null, errors);
    expectEqual("verdict.evidenceSummary.browserPlannedChecks", verdict?.evidenceSummary?.browserPlannedChecks, expectedCoverage?.plannedCheckCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserExpectedRuns", verdict?.evidenceSummary?.browserExpectedRuns, expectedCoverage?.expectedRunCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserCoveredRuns", verdict?.evidenceSummary?.browserCoveredRuns, expectedCoverage?.coveredRunCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserMissingRuns", verdict?.evidenceSummary?.browserMissingRuns, expectedCoverage?.missingRunCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserDuplicateResults", verdict?.evidenceSummary?.browserDuplicateResults, expectedCoverage?.duplicateResultCount || 0, errors);
    expectEqual("verdict.evidenceSummary.browserInvalidResults", verdict?.evidenceSummary?.browserInvalidResults, expectedCoverage?.invalidResultCount || 0, errors);
  }
  if (report?.browserEvidenceTemporalIntegrity || verdict?.browserEvidenceTemporalIntegrity) {
    const expectedTemporal = buildBrowserEvidenceTemporalIntegrity({
      startedAt: report?.startedAt || "",
      finishedAt: report?.finishedAt || "",
      durationMs: Number(report?.durationMs),
      plan: report?.metadata?.browserCheckExecutionPlan,
      browserResults: report?.browserResults || [],
      browserToolCalls: report?.browserToolCalls || [],
    });
    expectEqual("report.browserEvidenceTemporalIntegrity", report?.browserEvidenceTemporalIntegrity || null, expectedTemporal, errors);
    expectEqual("verdict.browserEvidenceTemporalIntegrity", verdict?.browserEvidenceTemporalIntegrity || null, report?.browserEvidenceTemporalIntegrity || null, errors);
    expectEqual("verdict.evidenceSummary.browserTemporalInvalidItems", verdict?.evidenceSummary?.browserTemporalInvalidItems, expectedTemporal.invalidItemCount, errors);
    expectEqual("verdict.evidenceSummary.browserTemporalPlanMismatches", verdict?.evidenceSummary?.browserTemporalPlanMismatches, expectedTemporal.planMismatchCount, errors);
    expectEqual(
      "verdict.evidenceSummary.browserTemporalWindowViolations",
      verdict?.evidenceSummary?.browserTemporalWindowViolations,
      expectedTemporal.outsideReportWindowCount + expectedTemporal.outsideResultWindowCount,
      errors,
    );
  }
  if (report?.browserResourceLifecycleSummary || verdict?.browserResourceLifecycleSummary) {
    const expectedLifecycle = buildBrowserResourceLifecycleSummary({
      events: report?.browserResourceLifecycleEvents || [],
      plan: report?.metadata?.browserCheckExecutionPlan,
      reportStartedAt: report?.startedAt || "",
      reportFinishedAt: report?.finishedAt || "",
    });
    expectEqual("report.browserResourceLifecycleSummary", report?.browserResourceLifecycleSummary || null, expectedLifecycle, errors);
    expectEqual("verdict.browserResourceLifecycleSummary", verdict?.browserResourceLifecycleSummary || null, report?.browserResourceLifecycleSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserOwnedResources", verdict?.evidenceSummary?.browserOwnedResources, expectedLifecycle.ownedResourceCount, errors);
    expectEqual("verdict.evidenceSummary.browserReleasedResources", verdict?.evidenceSummary?.browserReleasedResources, expectedLifecycle.releasedResourceCount, errors);
    expectEqual("verdict.evidenceSummary.browserOpenResources", verdict?.evidenceSummary?.browserOpenResources, expectedLifecycle.openResourceCount, errors);
    expectEqual("verdict.evidenceSummary.browserCleanupFailures", verdict?.evidenceSummary?.browserCleanupFailures, expectedLifecycle.cleanupFailureCount, errors);
  }
  if (report?.browserToolEvidenceLineage || verdict?.browserToolEvidenceLineage) {
    const expectedLineage = buildBrowserToolEvidenceLineage(report?.browserResults || [], report?.browserToolCalls || []);
    expectEqual("report.browserToolEvidenceLineage", report?.browserToolEvidenceLineage || null, expectedLineage, errors);
    expectEqual("verdict.browserToolEvidenceLineage", verdict?.browserToolEvidenceLineage || null, report?.browserToolEvidenceLineage || null, errors);
    expectEqual("verdict.evidenceSummary.browserToolLinkedResults", verdict?.evidenceSummary?.browserToolLinkedResults, expectedLineage.linkedResultCount, errors);
    expectEqual("verdict.evidenceSummary.browserToolUnlinkedResults", verdict?.evidenceSummary?.browserToolUnlinkedResults, expectedLineage.unlinkedRequiredResultCount, errors);
    expectEqual("verdict.evidenceSummary.browserToolLinkedCalls", verdict?.evidenceSummary?.browserToolLinkedCalls, expectedLineage.linkedToolCallCount, errors);
    expectEqual("verdict.evidenceSummary.browserToolOrphanCalls", verdict?.evidenceSummary?.browserToolOrphanCalls, expectedLineage.orphanScopedToolCallCount, errors);
    expectEqual("verdict.evidenceSummary.browserToolUnscopedCalls", verdict?.evidenceSummary?.browserToolUnscopedCalls, expectedLineage.unscopedToolCallCount, errors);
    expectEqual(
      "verdict.evidenceSummary.browserToolInvalidLinks",
      verdict?.evidenceSummary?.browserToolInvalidLinks,
      expectedLineage.missingToolCallReferenceCount + expectedLineage.foreignToolCallReferenceCount + expectedLineage.duplicateToolCallReferenceCount + expectedLineage.duplicateToolCallRecordCount,
      errors,
    );
  }
  if (report?.browserToolCallTimeoutSummary || verdict?.browserToolCallTimeoutSummary) {
    const expectedTimeoutSummary = buildBrowserToolCallTimeoutSummary(report?.browserToolCalls || []);
    expectEqual("report.browserToolCallTimeoutSummary", report?.browserToolCallTimeoutSummary || null, expectedTimeoutSummary, errors);
    expectEqual("verdict.browserToolCallTimeoutSummary", verdict?.browserToolCallTimeoutSummary || null, report?.browserToolCallTimeoutSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserToolTimedOutCalls", verdict?.evidenceSummary?.browserToolTimedOutCalls, expectedTimeoutSummary.timedOutCalls, errors);
    expectEqual("verdict.evidenceSummary.browserToolAbortRequestedCalls", verdict?.evidenceSummary?.browserToolAbortRequestedCalls, expectedTimeoutSummary.abortRequestedCalls, errors);
  }
  if (
    report?.browserRecoverySummary
    || verdict?.browserRecoverySummary
    || (report?.browserResults || []).some(result => result.recovery)
  ) {
    const expectedRecoverySummary = buildBrowserRecoverySummary(report?.browserResults || []);
    expectEqual("report.browserRecoverySummary", report?.browserRecoverySummary || null, expectedRecoverySummary, errors);
    expectEqual("verdict.browserRecoverySummary", verdict?.browserRecoverySummary || null, report?.browserRecoverySummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserRecoveryAttempts", verdict?.evidenceSummary?.browserRecoveryAttempts, expectedRecoverySummary.attempted, errors);
    expectEqual("verdict.evidenceSummary.browserRecoveredOperations", verdict?.evidenceSummary?.browserRecoveredOperations, expectedRecoverySummary.recovered, errors);
    expectEqual("verdict.evidenceSummary.browserFailedRecoveries", verdict?.evidenceSummary?.browserFailedRecoveries, expectedRecoverySummary.failed, errors);
    expectEqual("verdict.evidenceSummary.browserUnsafeRetriesPrevented", verdict?.evidenceSummary?.browserUnsafeRetriesPrevented, expectedRecoverySummary.notRetried, errors);
  }
  if (
    report?.browserActionEffectSummary
    || verdict?.browserActionEffectSummary
    || (report?.browserResults || []).some(result => (result.actionEffects || []).length)
  ) {
    const expectedActionEffectSummary = buildBrowserActionEffectSummary(report?.browserResults || []);
    expectEqual("report.browserActionEffectSummary", report?.browserActionEffectSummary || null, expectedActionEffectSummary, errors);
    expectEqual("verdict.browserActionEffectSummary", verdict?.browserActionEffectSummary || null, report?.browserActionEffectSummary || null, errors);
    expectEqual("verdict.evidenceSummary.browserActionEffectChecks", verdict?.evidenceSummary?.browserActionEffectChecks, expectedActionEffectSummary.checks, errors);
    expectEqual("verdict.evidenceSummary.browserActionEffects", verdict?.evidenceSummary?.browserActionEffects, expectedActionEffectSummary.actions, errors);
    expectEqual("verdict.evidenceSummary.browserFailedActionEffects", verdict?.evidenceSummary?.browserFailedActionEffects, expectedActionEffectSummary.failed, errors);
    expectEqual("verdict.evidenceSummary.browserCrossSessionActionEffects", verdict?.evidenceSummary?.browserCrossSessionActionEffects, expectedActionEffectSummary.crossSession, errors);
  }
  if (report?.adversarialEvidenceSummary || verdict?.adversarialEvidenceSummary) {
    const expectedAdversarialSummary = buildAdversarialEvidenceSummary({
      required: report?.adversarialEvidenceSummary?.required === true,
      waiverReason: report?.adversarialEvidenceSummary?.waiverReason,
      originalUserGoal: report?.originalUserGoal || "",
      acceptanceCriteria: report?.acceptanceCriteria || [],
      httpResults: report?.httpResults || [],
      browserResults: report?.browserResults || [],
    });
    expectEqual("report.adversarialEvidenceSummary", report?.adversarialEvidenceSummary || null, expectedAdversarialSummary, errors);
    expectEqual("verdict.adversarialEvidenceSummary", verdict?.adversarialEvidenceSummary || null, report?.adversarialEvidenceSummary || null, errors);
    expectEqual("verdict.evidenceSummary.adversarialProbes", verdict?.evidenceSummary?.adversarialProbes, expectedAdversarialSummary.total, errors);
    expectEqual("verdict.evidenceSummary.adversarialPassed", verdict?.evidenceSummary?.adversarialPassed, expectedAdversarialSummary.passed, errors);
    expectEqual("verdict.evidenceSummary.adversarialFailed", verdict?.evidenceSummary?.adversarialFailed, expectedAdversarialSummary.failed, errors);
    expectEqual("verdict.evidenceSummary.adversarialBlocked", verdict?.evidenceSummary?.adversarialBlocked, expectedAdversarialSummary.blocked, errors);
    expectEqual("verdict.evidenceSummary.adversarialRelevant", verdict?.evidenceSummary?.adversarialRelevant, expectedAdversarialSummary.relevant, errors);
    expectEqual("verdict.evidenceSummary.adversarialUnlinked", verdict?.evidenceSummary?.adversarialUnlinked, expectedAdversarialSummary.unlinked, errors);
    expectEqual("verdict.evidenceSummary.adversarialPassedRelevant", verdict?.evidenceSummary?.adversarialPassedRelevant, expectedAdversarialSummary.passedRelevant, errors);
  }
  if (report?.browserProviderSummary || verdict?.browserProviderSummary) {
    expectEqual("verdict.browserProviderSummary", verdict?.browserProviderSummary || null, report?.browserProviderSummary || null, errors);
  }
  if (Array.isArray(report?.browserProviderGaps) || Array.isArray(verdict?.browserProviderGaps)) {
    expectEqual("verdict.browserProviderGaps", verdict?.browserProviderGaps || [], report?.browserProviderGaps || [], errors);
    expectEqual("verdict.evidenceSummary.browserProviderGaps", verdict?.evidenceSummary?.browserProviderGaps, (report?.browserProviderGaps || []).length, errors);
  }
  verifyBrowserSessionEvidenceConsistency(report, errors);
  verifyBrowserStabilityEvidenceConsistency(report, errors);
  verifyBrowserCheckExecutionCoverageConsistency(report, errors);
  verifyBrowserEvidenceTemporalIntegrityConsistency(report, errors);
  verifyBrowserResourceLifecycleConsistency(report, errors);
  verifyBrowserToolEvidenceLineageConsistency(report, errors);
  verifyBrowserToolCallTimeoutConsistency(report, errors);
  verifyBrowserAuthenticationEvidenceConsistency(report, errors);
  verifyBrowserRecoveryEvidenceConsistency(report, errors);
  verifyBrowserActionEffectEvidenceConsistency(report, errors);
  verifyAdversarialEvidenceConsistency(report, errors);
  verifyAcceptanceEvidenceConsistency(report, errors);
  verifyHttpPageResourceConsistency(report, errors);
  verifyHttpConcurrencyConsistency(report, errors);

  const artifactFiles = (report?.metadata?.artifactFiles || {}) as Record<string, string>;
  if (artifactFiles.reportJsonPath) expectEqual("verdict.artifacts.reportJsonPath", verdict?.artifacts?.reportJsonPath, artifactFiles.reportJsonPath, errors);
  if (artifactFiles.verdictJsonPath) expectEqual("verdict.artifacts.verdictJsonPath", verdict?.artifacts?.verdictJsonPath, artifactFiles.verdictJsonPath, errors);
  if (artifactFiles.manifestPath) expectEqual("verdict.artifacts.manifestPath", verdict?.artifacts?.manifestPath, artifactFiles.manifestPath, errors);

  if (errors.length) return [semanticItem(reportItem, verdictItem, "failed", errors.join(" "))];
  return [semanticItem(reportItem, verdictItem, "passed")];
}

function recoveryEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_recovery_evidence",
    title: "Browser session recovery evidence safety",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserExecutionCoverageEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_execution_coverage_evidence",
    title: "Browser check execution coverage integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserTemporalEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_temporal_evidence",
    title: "Browser evidence run provenance and temporal integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserResourceLifecycleEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_resource_lifecycle_evidence",
    title: "Browser resource lifecycle and cleanup integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserToolLineageEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_tool_lineage_evidence",
    title: "Browser tool-call evidence lineage integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function browserToolTimeoutEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_tool_timeout_evidence",
    title: "Browser tool-call timeout evidence integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function verifyReportBrowserToolTimeout(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserToolTimeoutEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser tool timeout evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserToolCallTimeoutConsistency(report, errors);
    return [browserToolTimeoutEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserToolTimeoutEvidenceItem(reportItem, "failed", `Unable to verify browser tool timeout evidence: ${error.message || String(error)}`)];
  }
}

function verifyReportBrowserToolLineage(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserToolLineageEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser tool evidence lineage could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserToolEvidenceLineageConsistency(report, errors);
    const transcriptItem = manifestFiles.find(item => item.type === "browser_tool_transcript");
    if ((report.browserToolCalls || []).length && !transcriptItem) {
      errors.push("Browser tool calls exist without a transcript artifact.");
    }
    if (transcriptItem) {
      const transcriptPath = resolveArtifactPath(manifestPath, transcriptItem.path);
      const transcriptRecords = fs.readFileSync(transcriptPath, "utf-8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, index) => {
          try {
            return JSON.parse(line);
          } catch {
            errors.push(`Browser tool transcript line ${index + 1} is not valid JSON.`);
            return null;
          }
        })
        .filter(Boolean);
      if (!sameJson(transcriptRecords, report.browserToolCalls || [])) {
        errors.push("Browser tool transcript records do not match report.browserToolCalls.");
      }
    }
    return [browserToolLineageEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserToolLineageEvidenceItem(reportItem, "failed", `Unable to verify browser tool evidence lineage: ${error.message || String(error)}`)];
  }
}

function verifyReportBrowserExecutionCoverage(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserExecutionCoverageEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser execution coverage could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserCheckExecutionCoverageConsistency(report, errors);
    return [browserExecutionCoverageEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserExecutionCoverageEvidenceItem(reportItem, "failed", `Unable to read browser execution coverage: ${error.message || String(error)}`)];
  }
}

function verifyReportBrowserTemporalEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserTemporalEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser temporal evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserEvidenceTemporalIntegrityConsistency(report, errors);
    return [browserTemporalEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserTemporalEvidenceItem(reportItem, "failed", `Unable to verify browser temporal evidence: ${error.message || String(error)}`)];
  }
}

function verifyReportBrowserResourceLifecycleEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [browserResourceLifecycleEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser resource lifecycle evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserResourceLifecycleConsistency(report, errors);
    return [browserResourceLifecycleEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [browserResourceLifecycleEvidenceItem(reportItem, "failed", `Unable to verify browser resource lifecycle evidence: ${error.message || String(error)}`)];
  }
}

function verifyReportRecoveryEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [recoveryEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser recovery evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserRecoveryEvidenceConsistency(report, errors);
    return [recoveryEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [recoveryEvidenceItem(reportItem, "failed", `Unable to read browser recovery evidence: ${error.message || String(error)}`)];
  }
}

function authenticationEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_authentication_evidence",
    title: "Browser authentication evidence safety",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function verifyReportAuthenticationEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [authenticationEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser authentication evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserAuthenticationEvidenceConsistency(report, errors);
    const hasMinimalExistingSession = (report.browserResults || []).some(result =>
      result.authentication?.mode === "existing_session"
      && result.authentication.existingSession?.evidencePolicy === "minimal"
    );
    const transcriptItem = manifestFiles.find(item => item.type === "browser_tool_transcript");
    if (hasMinimalExistingSession && report.browserToolCalls.length && !transcriptItem) {
      errors.push("Minimal existing-session browser tool calls exist without a transcript artifact.");
    }
    if (hasMinimalExistingSession && transcriptItem) {
      const transcriptPath = resolveArtifactPath(manifestPath, transcriptItem.path);
      const transcriptRecords = fs.readFileSync(transcriptPath, "utf-8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, index) => {
          try {
            return JSON.parse(line);
          } catch {
            errors.push(`Browser tool transcript line ${index + 1} is not valid JSON.`);
            return null;
          }
        })
        .filter(Boolean);
      if (!sameJson(transcriptRecords, report.browserToolCalls || [])) {
        errors.push("Browser tool transcript records do not match report.browserToolCalls.");
      }
    }
    return [authenticationEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [authenticationEvidenceItem(reportItem, "failed", `Unable to read browser authentication evidence: ${error.message || String(error)}`)];
  }
}

function actionEffectEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "browser_action_effect_evidence",
    title: "Browser action-effect evidence integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function verifyReportActionEffectEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [actionEffectEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so browser action-effect evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyBrowserActionEffectEvidenceConsistency(report, errors);
    return [actionEffectEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [actionEffectEvidenceItem(reportItem, "failed", `Unable to read browser action-effect evidence: ${error.message || String(error)}`)];
  }
}

function adversarialEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "adversarial_evidence",
    title: "Adversarial evidence gate integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function verifyReportAdversarialEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [adversarialEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so adversarial evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyAdversarialEvidenceConsistency(report, errors);
    return [adversarialEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [adversarialEvidenceItem(reportItem, "failed", `Unable to read adversarial evidence: ${error.message || String(error)}`)];
  }
}

function acceptanceEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "acceptance_evidence",
    title: "Required acceptance evidence gate integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function verifyReportAcceptanceEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [acceptanceEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so acceptance evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const errors: string[] = [];
    verifyAcceptanceEvidenceConsistency(report, errors);
    return [acceptanceEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [acceptanceEvidenceItem(reportItem, "failed", `Unable to read acceptance evidence: ${error.message || String(error)}`)];
  }
}

function httpConcurrencyEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "http_concurrency_evidence",
    title: "Concurrent HTTP evidence integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function httpPageResourceEvidenceItem(
  reportItem: TestAgentArtifactManifestItem,
  status: TestAgentArtifactVerificationItem["status"],
  error?: string,
): TestAgentArtifactVerificationItem {
  return {
    type: "http_page_resource_evidence",
    title: "HTTP page subresource evidence integrity",
    path: reportItem.path,
    status,
    ...(error ? { error } : {}),
  };
}

function verifyReportHttpPageResourceEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [httpPageResourceEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so HTTP page resources could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    if (!(report.httpResults || []).some(result => result.context?.pageResourceProbe === true)) {
      return [] as TestAgentArtifactVerificationItem[];
    }
    const errors: string[] = [];
    verifyHttpPageResourceConsistency(report, errors);
    return [httpPageResourceEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [httpPageResourceEvidenceItem(reportItem, "failed", `Unable to read HTTP page resource evidence: ${error.message || String(error)}`)];
  }
}

function verifyReportHttpConcurrencyEvidence(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
) {
  const reportIndex = manifestFiles.findIndex(item => item.type === "report_json");
  if (reportIndex < 0) return [] as TestAgentArtifactVerificationItem[];
  const reportItem = manifestFiles[reportIndex];
  if (integrityItems[reportIndex]?.status !== "passed") {
    return [httpConcurrencyEvidenceItem(reportItem, "skipped", "Report artifact integrity did not pass, so concurrent HTTP evidence could not be checked.")];
  }
  try {
    const report = readJsonForSemantic(manifestPath, reportItem) as TestAgentReport;
    const hasConcurrency = (report.httpResults || []).some(result => result.concurrency)
      || Number(report.httpConcurrencySummary?.checks || 0) > 0;
    if (!hasConcurrency) return [] as TestAgentArtifactVerificationItem[];
    const errors: string[] = [];
    verifyHttpConcurrencyConsistency(report, errors);
    return [httpConcurrencyEvidenceItem(reportItem, errors.length ? "failed" : "passed", errors.join(" "))];
  } catch (error: any) {
    return [httpConcurrencyEvidenceItem(reportItem, "failed", `Unable to read concurrent HTTP evidence: ${error.message || String(error)}`)];
  }
}

export function verifyTestAgentArtifactManifest(manifest: TestAgentArtifactManifest, manifestPath = ""): TestAgentArtifactVerification {
  const resolvedManifestPath = manifestPath ? path.resolve(manifestPath) : "";
  const manifestFiles = manifest.files || [];
  const items = manifestFiles.map(item => verifyManifestItem(resolvedManifestPath || item.path, item));
  items.push(...verifyScreenshotMetadata(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyBrowserEvidenceArtifactMetadata(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportAuthenticationEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportRecoveryEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportActionEffectEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserExecutionCoverage(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserTemporalEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserResourceLifecycleEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserToolLineage(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportBrowserToolTimeout(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportAdversarialEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportAcceptanceEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportHttpPageResourceEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportHttpConcurrencyEvidence(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyReportVerdictConsistency(manifest, resolvedManifestPath, manifestFiles, items));
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
