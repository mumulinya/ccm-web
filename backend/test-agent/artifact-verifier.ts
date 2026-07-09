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

function verifyBrowserEvidenceArtifactMetadata(
  manifestPath: string,
  manifestFiles: TestAgentArtifactManifestItem[],
  integrityItems: TestAgentArtifactVerificationItem[],
): TestAgentArtifactVerificationItem[] {
  return manifestFiles.flatMap((item, index) => {
    const type = item.type;
    if (type !== "browser_trace" && type !== "browser_har" && type !== "browser_video") return [];
    const verificationType = type === "browser_trace"
      ? "browser_trace_zip"
      : type === "browser_har"
        ? "browser_har_metadata"
        : "browser_video_container";
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
          : validateVideoArtifact(filePath);
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

function browserNetworkErrorCount(report: TestAgentReport) {
  return (Array.isArray(report?.browserNetworkSummary) ? report.browserNetworkSummary : [])
    .reduce((sum, item: any) => sum + Number(item?.errorCount || 0), 0);
}

function browserInteractionCount(report: TestAgentReport, key: "actionCount" | "failedActions" | "assertionCount" | "failedAssertions") {
  return (Array.isArray(report?.browserInteractionSummary) ? report.browserInteractionSummary : [])
    .reduce((sum, item: any) => sum + Number(item?.[key] || 0), 0);
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
  expectEqual("manifest.status", manifest.status, report?.status, errors);
  expectEqual("verdict.reportId", verdict?.reportId, report?.id, errors);
  expectEqual("verdict.workOrderId", verdict?.workOrderId, report?.workOrderId, errors);
  expectEqual("verdict.taskId", verdict?.taskId, report?.taskId, errors);
  expectEqual("verdict.groupId", verdict?.groupId, report?.groupId, errors);
  expectEqual("verdict.status", verdict?.status, report?.status, errors);
  expectEqual("verdict.recommendation", verdict?.recommendation, report?.recommendation, errors);
  expectEqual("verdict.summary", verdict?.summary, report?.summary, errors);
  expectEqual("verdict.canAccept", verdict?.canAccept, report?.status === "passed" && report?.recommendation === "accept", errors);
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

  const artifactFiles = (report?.metadata?.artifactFiles || {}) as Record<string, string>;
  if (artifactFiles.reportJsonPath) expectEqual("verdict.artifacts.reportJsonPath", verdict?.artifacts?.reportJsonPath, artifactFiles.reportJsonPath, errors);
  if (artifactFiles.verdictJsonPath) expectEqual("verdict.artifacts.verdictJsonPath", verdict?.artifacts?.verdictJsonPath, artifactFiles.verdictJsonPath, errors);
  if (artifactFiles.manifestPath) expectEqual("verdict.artifacts.manifestPath", verdict?.artifacts?.manifestPath, artifactFiles.manifestPath, errors);

  if (errors.length) return [semanticItem(reportItem, verdictItem, "failed", errors.join(" "))];
  return [semanticItem(reportItem, verdictItem, "passed")];
}

export function verifyTestAgentArtifactManifest(manifest: TestAgentArtifactManifest, manifestPath = ""): TestAgentArtifactVerification {
  const resolvedManifestPath = manifestPath ? path.resolve(manifestPath) : "";
  const manifestFiles = manifest.files || [];
  const items = manifestFiles.map(item => verifyManifestItem(resolvedManifestPath || item.path, item));
  items.push(...verifyScreenshotMetadata(resolvedManifestPath, manifestFiles, items));
  items.push(...verifyBrowserEvidenceArtifactMetadata(resolvedManifestPath, manifestFiles, items));
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
