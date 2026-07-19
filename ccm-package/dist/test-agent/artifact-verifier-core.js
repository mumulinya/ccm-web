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
exports.sha256 = sha256;
exports.readJson = readJson;
exports.resolveArtifactPath = resolveArtifactPath;
exports.verifyManifestItem = verifyManifestItem;
exports.verifyScreenshotMetadata = verifyScreenshotMetadata;
exports.verifyBrowserEvidenceArtifactMetadata = verifyBrowserEvidenceArtifactMetadata;
exports.semanticItem = semanticItem;
exports.readJsonForSemantic = readJsonForSemantic;
exports.hasVerdictArtifactReference = hasVerdictArtifactReference;
exports.sameJson = sameJson;
exports.statusCoverageKeys = statusCoverageKeys;
exports.compareStringList = compareStringList;
exports.expectEqual = expectEqual;
exports.coverageStatusCounts = coverageStatusCounts;
exports.acceptanceMatchStrengthCounts = acceptanceMatchStrengthCounts;
exports.acceptanceEvidenceSourceCounts = acceptanceEvidenceSourceCounts;
exports.browserNetworkErrorCount = browserNetworkErrorCount;
exports.browserInteractionCount = browserInteractionCount;
exports.verifyBrowserAuthenticationEvidenceConsistency = verifyBrowserAuthenticationEvidenceConsistency;
exports.verifyBrowserRecoveryEvidenceConsistency = verifyBrowserRecoveryEvidenceConsistency;
exports.verifyBrowserActionEffectEvidenceConsistency = verifyBrowserActionEffectEvidenceConsistency;
exports.verifyAdversarialEvidenceConsistency = verifyAdversarialEvidenceConsistency;
exports.verifyAcceptanceEvidenceConsistency = verifyAcceptanceEvidenceConsistency;
exports.verifyHttpConcurrencyConsistency = verifyHttpConcurrencyConsistency;
// Behavior-freeze split from artifact-verifier.ts (part 1/3).
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zlib = __importStar(require("zlib"));
const authentication_1 = require("./browser/authentication");
const authentication_summary_1 = require("./browser/authentication-summary");
const recovery_validation_1 = require("./browser/recovery-validation");
const action_effects_1 = require("./browser/action-effects");
const action_effect_summary_1 = require("./browser/action-effect-summary");
const adversarial_summary_1 = require("./adversarial-summary");
const acceptance_gate_1 = require("./acceptance-gate");
const http_concurrency_1 = require("./http-concurrency");
function sha256(filePath) {
    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(filePath));
    return hash.digest("hex");
}
function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
function resolveArtifactPath(manifestPath, filePath) {
    if (path.isAbsolute(filePath))
        return path.resolve(filePath);
    return path.resolve(path.dirname(manifestPath), filePath);
}
function verifyManifestItem(manifestPath, item) {
    const resolvedPath = resolveArtifactPath(manifestPath, item.path);
    const expected = item.integrity || { exists: true };
    const base = {
        type: item.type,
        title: item.title,
        path: item.path,
        expectedSizeBytes: expected.sizeBytes,
        expectedSha256: expected.sha256,
    };
    let stat;
    try {
        stat = fs.statSync(resolvedPath);
    }
    catch (error) {
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
function pngMetadataItem(item, status, image, error) {
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
function pngContentItem(item, status, image, content, error) {
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
function readPngInfo(filePath) {
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
    const idatChunks = [];
    while (offset + 12 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString("ascii", offset + 4, offset + 8);
        const dataOffset = offset + 8;
        const nextOffset = dataOffset + length + 4;
        if (nextOffset > buffer.length)
            throw new Error(`PNG chunk ${type || "(unknown)"} exceeds file length.`);
        if (!sawIhdr && type !== "IHDR")
            throw new Error("PNG IHDR chunk must be first.");
        if (type === "IHDR") {
            if (sawIhdr)
                throw new Error("PNG contains duplicate IHDR chunks.");
            if (length !== 13)
                throw new Error(`PNG IHDR chunk has invalid length ${length}.`);
            width = buffer.readUInt32BE(dataOffset);
            height = buffer.readUInt32BE(dataOffset + 4);
            bitDepth = buffer[dataOffset + 8];
            colorType = buffer[dataOffset + 9];
            if (width <= 0 || height <= 0)
                throw new Error(`PNG dimensions must be positive, got ${width}x${height}.`);
            sawIhdr = true;
        }
        else if (type === "IDAT") {
            sawIdat = true;
            idatChunks.push(buffer.subarray(dataOffset, dataOffset + length));
        }
        else if (type === "IEND") {
            sawIend = true;
            break;
        }
        offset = nextOffset;
    }
    if (!sawIhdr)
        throw new Error("PNG IHDR chunk is missing.");
    if (!sawIdat)
        throw new Error("PNG IDAT chunk is missing.");
    if (!sawIend)
        throw new Error("PNG IEND chunk is missing.");
    return { width, height, bitDepth, colorType, idat: Buffer.concat(idatChunks) };
}
function paethPredictor(left, up, upperLeft) {
    const p = left + up - upperLeft;
    const pa = Math.abs(p - left);
    const pb = Math.abs(p - up);
    const pc = Math.abs(p - upperLeft);
    if (pa <= pb && pa <= pc)
        return left;
    if (pb <= pc)
        return up;
    return upperLeft;
}
function pngChannels(colorType) {
    if (colorType === 0)
        return 1;
    if (colorType === 2)
        return 3;
    if (colorType === 4)
        return 2;
    if (colorType === 6)
        return 4;
    return 0;
}
function pixelKey(row, offset, colorType) {
    if (colorType === 0) {
        const gray = row[offset];
        return `${gray},${gray},${gray},255`;
    }
    if (colorType === 2)
        return `${row[offset]},${row[offset + 1]},${row[offset + 2]},255`;
    if (colorType === 4) {
        const gray = row[offset];
        return `${gray},${gray},${gray},${row[offset + 1]}`;
    }
    return `${row[offset]},${row[offset + 1]},${row[offset + 2]},${row[offset + 3]}`;
}
function analyzePngContent(info) {
    if (info.bitDepth !== 8) {
        return { status: "skipped", error: `PNG blank-image detection supports bit depth 8 only, got ${info.bitDepth}.` };
    }
    const channels = pngChannels(info.colorType);
    if (!channels) {
        return { status: "skipped", error: `PNG blank-image detection does not support color type ${info.colorType}.` };
    }
    const pixelCount = info.width * info.height;
    if (pixelCount < 16) {
        return { status: "skipped", content: { uniqueColors: 1, blank: false }, error: `PNG is ${info.width}x${info.height}; too small for blank-image detection.` };
    }
    const rowBytes = info.width * channels;
    const expectedBytes = info.height * (rowBytes + 1);
    const inflated = zlib.inflateSync(info.idat);
    if (inflated.length < expectedBytes) {
        throw new Error(`PNG pixel data is truncated: expected at least ${expectedBytes} bytes, got ${inflated.length}.`);
    }
    let previous = Buffer.alloc(rowBytes);
    let offset = 0;
    const uniqueColors = new Set();
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
            if (filter === 0)
                row[x] = source[x];
            else if (filter === 1)
                row[x] = (source[x] + left) & 0xff;
            else if (filter === 2)
                row[x] = (source[x] + up) & 0xff;
            else if (filter === 3)
                row[x] = (source[x] + Math.floor((left + up) / 2)) & 0xff;
            else if (filter === 4)
                row[x] = (source[x] + paethPredictor(left, up, upperLeft)) & 0xff;
            else
                throw new Error(`PNG uses unsupported filter type ${filter}.`);
        }
        for (let x = 0; x < rowBytes; x += channels) {
            uniqueColors.add(pixelKey(row, x, info.colorType));
            if (uniqueColors.size > 1) {
                return { status: "passed", content: { uniqueColors: uniqueColors.size, blank: false } };
            }
        }
        previous = row;
    }
    return {
        status: "failed",
        content: { uniqueColors: uniqueColors.size, blank: true },
        error: `Screenshot appears blank or single-color (${uniqueColors.size} unique color across ${info.width}x${info.height}).`,
    };
}
function verifyScreenshotMetadata(manifestPath, manifestFiles, integrityItems) {
    return manifestFiles.flatMap((item, index) => {
        if (item.type !== "screenshot")
            return [];
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
        }
        catch (error) {
            return [
                pngMetadataItem(item, "failed", undefined, error.message || String(error)),
                pngContentItem(item, "skipped", undefined, undefined, "PNG metadata validation failed, so content validation could not run."),
            ];
        }
    });
}
function browserEvidenceMetadataItem(item, type, status, metadata = {}, error) {
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
function readFileHeader(filePath, length = 32) {
    const file = fs.openSync(filePath, "r");
    try {
        const buffer = Buffer.alloc(length);
        const bytes = fs.readSync(file, buffer, 0, length, 0);
        return buffer.subarray(0, bytes);
    }
    finally {
        fs.closeSync(file);
    }
}
function validateZipArtifact(filePath) {
    const header = readFileHeader(filePath, 8);
    if (header.length < 4)
        throw new Error("ZIP artifact is too small.");
    const signature = header.readUInt32LE(0);
    const valid = signature === 0x04034b50 || signature === 0x06054b50 || signature === 0x08074b50;
    if (!valid)
        throw new Error("Expected ZIP signature for browser trace artifact.");
    const zip = readZipDirectoryMetadata(filePath);
    if (zip.entries <= 0)
        throw new Error("Browser trace ZIP must contain at least one entry.");
    if (!zip.traceEventEntry)
        throw new Error("Browser trace ZIP must contain a trace.trace event entry.");
    const events = countTraceEvents(zip.buffer, zip.traceEventEntry);
    if (events <= 0)
        throw new Error("Browser trace event entry must contain at least one JSON event.");
    return { format: "zip:trace", entries: zip.entries, events };
}
function readZipDirectoryMetadata(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 22)
        throw new Error("ZIP artifact is too small for an end-of-central-directory record.");
    const minOffset = Math.max(0, buffer.length - 65_557);
    let eocdOffset = -1;
    for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
        if (buffer.readUInt32LE(offset) === 0x06054b50) {
            eocdOffset = offset;
            break;
        }
    }
    if (eocdOffset < 0)
        throw new Error("ZIP end-of-central-directory record is missing.");
    const entries = buffer.readUInt16LE(eocdOffset + 10);
    const centralDirSize = buffer.readUInt32LE(eocdOffset + 12);
    const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
    if (centralDirOffset + centralDirSize > buffer.length) {
        throw new Error("ZIP central directory exceeds file length.");
    }
    let offset = centralDirOffset;
    const entriesMetadata = [];
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
        if (nameEnd > buffer.length)
            throw new Error(`ZIP central directory entry ${index + 1} name exceeds file length.`);
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
function readZipEntryData(buffer, entry) {
    const offset = entry.localHeaderOffset;
    if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
        throw new Error(`ZIP local header for ${entry.name} is invalid.`);
    }
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const dataStart = offset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > buffer.length)
        throw new Error(`ZIP entry ${entry.name} exceeds file length.`);
    const compressed = buffer.subarray(dataStart, dataEnd);
    if (entry.compressionMethod === 0)
        return compressed;
    if (entry.compressionMethod === 8)
        return zlib.inflateRawSync(compressed);
    throw new Error(`ZIP entry ${entry.name} uses unsupported compression method ${entry.compressionMethod}.`);
}
function countTraceEvents(buffer, entry) {
    const data = readZipEntryData(buffer, entry);
    if (entry.uncompressedSize > 0 && data.length < entry.uncompressedSize) {
        throw new Error(`ZIP trace entry ${entry.name} is truncated.`);
    }
    const text = data.toString("utf-8");
    let events = 0;
    for (const [index, line] of text.split(/\r?\n/).entries()) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        let parsed;
        try {
            parsed = JSON.parse(trimmed);
        }
        catch {
            throw new Error(`Trace event line ${index + 1} is not valid JSON.`);
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error(`Trace event line ${index + 1} must be a JSON object.`);
        }
        events += 1;
    }
    return events;
}
function validateHarArtifact(filePath) {
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
function validateVideoArtifact(filePath) {
    const header = readFileHeader(filePath, 32);
    const ext = path.extname(filePath).toLowerCase();
    const isWebm = header.length >= 4
        && header[0] === 0x1a
        && header[1] === 0x45
        && header[2] === 0xdf
        && header[3] === 0xa3;
    const isIsoBmff = header.length >= 12 && header.toString("ascii", 4, 8) === "ftyp";
    if (isWebm)
        return { format: "webm" };
    if (isIsoBmff)
        return { format: ext === ".mov" ? "mov" : "mp4" };
    throw new Error(`Expected WebM/MP4/MOV container signature for browser video artifact${ext ? ` (${ext})` : ""}.`);
}
function validateAccessibilitySnapshotArtifact(filePath) {
    const text = fs.readFileSync(filePath, "utf-8");
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length)
        throw new Error("Accessibility snapshot artifact is empty.");
    const roleLines = lines.filter(line => /^-\s+[a-z][a-z0-9_-]*(\s|$)/i.test(line));
    if (!roleLines.length)
        throw new Error("Accessibility snapshot artifact does not contain any role/name lines.");
    return { format: "text:accessibility-snapshot", entries: roleLines.length };
}
function verifyBrowserEvidenceArtifactMetadata(manifestPath, manifestFiles, integrityItems) {
    return manifestFiles.flatMap((item, index) => {
        const type = item.type;
        if (type !== "browser_trace" && type !== "browser_har" && type !== "browser_video" && type !== "browser_accessibility_snapshot")
            return [];
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
        }
        catch (error) {
            return [browserEvidenceMetadataItem(item, verificationType, "failed", {}, error.message || String(error))];
        }
    });
}
function semanticItem(reportItem, verdictItem, status, error) {
    return {
        type: "verdict_consistency",
        title: "TestAgent report/verdict semantic consistency",
        path: [reportItem?.path, verdictItem?.path].filter(Boolean).join(" <> "),
        status,
        ...(error ? { error } : {}),
    };
}
function readJsonForSemantic(manifestPath, item) {
    return readJson(resolveArtifactPath(manifestPath || item.path, item.path));
}
function hasVerdictArtifactReference(report) {
    const files = report?.metadata?.artifactFiles || {};
    return typeof files.verdictJsonPath === "string" && files.verdictJsonPath.trim().length > 0;
}
function sameJson(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}
function statusCoverageKeys(items, status, key) {
    return (Array.isArray(items) ? items : [])
        .filter(item => item.status === status)
        .map(item => String(item[key] || ""))
        .filter(Boolean)
        .sort();
}
function compareStringList(label, expected, actual, errors) {
    if (expected.length !== actual.length || expected.some((value, index) => value !== actual[index])) {
        errors.push(`${label} mismatch: expected [${expected.join(", ")}], got [${actual.join(", ")}].`);
    }
}
function expectEqual(label, actual, expected, errors) {
    if (!sameJson(actual, expected)) {
        errors.push(`${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
    }
}
function coverageStatusCounts(items) {
    const counts = { verified: 0, not_verified: 0, unknown: 0 };
    for (const item of Array.isArray(items) ? items : []) {
        if (item.status === "verified" || item.status === "not_verified" || item.status === "unknown")
            counts[item.status] += 1;
    }
    return counts;
}
function acceptanceMatchStrengthCounts(items) {
    const counts = { direct: 0, token: 0, fallback: 0, none: 0 };
    for (const item of Array.isArray(items) ? items : []) {
        const strength = item.matchStrength || "none";
        if (strength === "direct" || strength === "token" || strength === "fallback" || strength === "none")
            counts[strength] += 1;
    }
    return counts;
}
function acceptanceEvidenceSourceCounts(items) {
    const counts = { matched_evidence: 0, single_criterion_report_status: 0, none: 0 };
    for (const item of Array.isArray(items) ? items : []) {
        const source = item.evidenceSource || "none";
        if (source === "matched_evidence" || source === "single_criterion_report_status" || source === "none")
            counts[source] += 1;
    }
    return counts;
}
function browserNetworkErrorCount(report) {
    return (Array.isArray(report?.browserNetworkSummary) ? report.browserNetworkSummary : [])
        .reduce((sum, item) => sum + Number(item?.errorCount || 0), 0);
}
function browserInteractionCount(report, key) {
    return (Array.isArray(report?.browserInteractionSummary) ? report.browserInteractionSummary : [])
        .reduce((sum, item) => sum + Number(item?.[key] || 0), 0);
}
function verifyBrowserAuthenticationEvidenceConsistency(report, errors) {
    let hasMinimalExistingSession = false;
    for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
        const label = `report.browserResults[${resultIndex}]`;
        if (result.authentication) {
            errors.push(...(0, authentication_1.browserAuthenticationEvidenceErrors)(result.authentication, `${label}.authentication`));
        }
        if (result.contextOptions?.storageState) {
            errors.push(...(0, authentication_1.browserAuthenticationEvidenceErrors)({
                credentialEnvNames: [],
                storageState: result.contextOptions.storageState,
            }, `${label}.contextOptions`));
            if (!result.authentication?.storageState) {
                errors.push(`${label}.contextOptions.storageState exists without matching authentication evidence.`);
            }
            else {
                expectEqual(`${label}.authentication.storageState`, result.authentication.storageState, result.contextOptions.storageState, errors);
            }
        }
        const authenticationEvidence = [
            ...(result.authentication ? [result.authentication] : []),
            ...(result.browserSessions || []).flatMap(session => session.authentication ? [session.authentication] : []),
        ];
        for (const [sessionIndex, session] of (result.browserSessions || []).entries()) {
            if (session.authentication) {
                errors.push(...(0, authentication_1.browserAuthenticationEvidenceErrors)(session.authentication, `${label}.browserSessions[${sessionIndex}].authentication`));
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
            const existing = result.authentication.existingSession;
            if (result.status === "passed" && (!existing.tabContextChecked || !existing.createdNewTab)) {
                errors.push(`${label} passed without proving tab context inspection and creation of a new tab.`);
            }
            for (const key of ["finalUrl", "title", "pageTextPreview", "consoleLogPath", "dialogLogPath", "popupLogPath", "networkLogPath"]) {
                if (result[key])
                    errors.push(`${label}.${key} must be suppressed for minimal existing-session evidence.`);
            }
            for (const key of ["screenshots", "pageSnapshots", "browserArtifacts", "consoleMessages", "dialogMessages", "popupMessages", "networkRequests"]) {
                const items = result[key];
                if (Array.isArray(items) && items.length)
                    errors.push(`${label}.${key} must be empty for minimal existing-session evidence.`);
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
            if (!input || !Array.isArray(input.inputKeys) || keys.some(key => key !== "inputKeys" && key !== "action")) {
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
        expectEqual("report.metadata.browserAuthenticationSummary", report.metadata.browserAuthenticationSummary, (0, authentication_summary_1.buildBrowserAuthenticationSummary)(report?.browserResults || []), errors);
    }
}
function verifyBrowserRecoveryEvidenceConsistency(report, errors) {
    let hasRecoveryEvidence = false;
    for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
        if (!result.recovery)
            continue;
        hasRecoveryEvidence = true;
        const label = `report.browserResults[${resultIndex}].recovery`;
        errors.push(...(0, recovery_validation_1.browserRecoveryEvidenceErrors)(result.recovery, label));
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
        errors.push(...(0, recovery_validation_1.browserRecoverySummaryErrors)(report.browserRecoverySummary, report.browserResults || [], "report.browserRecoverySummary"));
    }
}
function verifyBrowserActionEffectEvidenceConsistency(report, errors) {
    let hasActionEffects = false;
    for (const [resultIndex, result] of (report?.browserResults || []).entries()) {
        const effects = result.actionEffects || [];
        if (!effects.length)
            continue;
        hasActionEffects = true;
        const label = `report.browserResults[${resultIndex}]`;
        errors.push(...(0, action_effects_1.browserActionEffectResultErrors)(result, label));
        for (const [effectIndex, effect] of effects.entries()) {
            if (effect.provider !== result.provider) {
                errors.push(`${label}.actionEffects[${effectIndex}].provider does not match the browser result provider.`);
            }
        }
        const minimalExisting = result.authentication?.mode === "existing_session"
            && result.authentication.existingSession?.evidencePolicy === "minimal";
        if (minimalExisting && effects.some(effect => !effect.detailSuppressed
            || Object.keys(effect.before || {}).length > 0
            || Object.keys(effect.after || {}).length > 0)) {
            errors.push(`${label}.actionEffects retained detail under the minimal existing-session evidence policy.`);
        }
    }
    if (hasActionEffects && !report.browserActionEffectSummary) {
        errors.push("report.browserActionEffectSummary is missing even though browser action-effect evidence exists.");
    }
    if (report.browserActionEffectSummary) {
        errors.push(...(0, action_effect_summary_1.browserActionEffectSummaryErrors)(report.browserActionEffectSummary, report.browserResults || [], "report.browserActionEffectSummary"));
    }
}
function verifyAdversarialEvidenceConsistency(report, errors) {
    const summary = report.adversarialEvidenceSummary;
    errors.push(...(0, adversarial_summary_1.adversarialEvidenceSummaryErrors)(summary, report.httpResults || [], report.browserResults || [], report.originalUserGoal || "", report.acceptanceCriteria || [], "report.adversarialEvidenceSummary"));
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
function verifyAcceptanceEvidenceConsistency(report, errors) {
    errors.push(...(0, acceptance_gate_1.acceptanceEvidenceGateSummaryErrors)(report.acceptanceEvidenceGateSummary, report.acceptanceCoverage || [], "report.acceptanceEvidenceGateSummary"));
    if (report.status === "passed" && report.acceptanceEvidenceGateSummary?.canAccept !== true) {
        errors.push("A passed report requires criterion-linked acceptance evidence or no acceptance criteria.");
    }
}
function verifyHttpConcurrencyConsistency(report, errors) {
    let hasConcurrency = false;
    for (const [index, result] of (report.httpResults || []).entries()) {
        if (!result.concurrency)
            continue;
        hasConcurrency = true;
        const label = `report.httpResults[${index}].concurrency`;
        errors.push(...(0, http_concurrency_1.httpConcurrencyEvidenceErrors)(result.concurrency, label));
        const expectedStatus = (0, http_concurrency_1.httpConcurrencyResultStatus)(result.concurrency);
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
        errors.push(...(0, http_concurrency_1.httpConcurrencySummaryErrors)(report.httpConcurrencySummary, report.httpResults || [], "report.httpConcurrencySummary"));
    }
}
//# sourceMappingURL=artifact-verifier-core.js.map