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
exports.writeBrowserEvidenceArtifacts = writeBrowserEvidenceArtifacts;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const PATH_KEY_TYPES = {
    trace: "trace",
    tracepath: "trace",
    trace_path: "trace",
    tracefile: "trace",
    trace_file: "trace",
    har: "har",
    harpath: "har",
    har_path: "har",
    harfile: "har",
    har_file: "har",
    video: "video",
    videopath: "video",
    video_path: "video",
    videofile: "video",
    video_file: "video",
    download: "download",
    downloadpath: "download",
    download_path: "download",
    artifact: "other",
    artifactpath: "other",
    artifact_path: "other",
};
const EXTENSION_TYPES = {
    ".zip": "trace",
    ".trace": "trace",
    ".har": "har",
    ".webm": "video",
    ".mp4": "video",
    ".mov": "video",
    ".json": "metadata",
};
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
function normalizedKey(key) {
    return key.toLowerCase().replace(/[\s-]+/g, "_");
}
function artifactBase(input, captureIndex, type) {
    return `${(0, utils_1.safeSegment)(input.projectName)}-${(0, utils_1.safeSegment)(input.checkName)}-${input.index + 1}-${captureIndex + 1}-${(0, utils_1.safeSegment)(type)}`;
}
function parseJsonString(value) {
    const trimmed = value.trim();
    if (!trimmed || !/^[{[]/.test(trimmed))
        return null;
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return null;
    }
}
function typeForPath(filePath, fallback = "") {
    const ext = path.extname(filePath).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext))
        return "";
    return EXTENSION_TYPES[ext] || fallback;
}
function extensionForType(type, mediaType = "") {
    if (/har|json/i.test(mediaType))
        return ".har";
    if (/zip|trace/i.test(mediaType))
        return ".zip";
    if (/webm/i.test(mediaType))
        return ".webm";
    if (/mp4/i.test(mediaType))
        return ".mp4";
    if (type === "trace")
        return ".zip";
    if (type === "har")
        return ".har";
    if (type === "video")
        return ".webm";
    if (type === "metadata")
        return ".json";
    return ".bin";
}
function dataUrlPayload(value) {
    const match = value.trim().match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/i);
    if (!match)
        return null;
    return {
        mediaType: match[1],
        bytes: Buffer.from(match[2].replace(/\s+/g, ""), "base64"),
    };
}
function base64Payload(value, type) {
    const trimmed = value.trim();
    if (trimmed.length < 24 || !/^[a-z0-9+/=\s]+$/i.test(trimmed))
        return null;
    return {
        mediaType: type === "video" ? "video/webm" : type === "har" ? "application/json" : "application/octet-stream",
        bytes: Buffer.from(trimmed.replace(/\s+/g, ""), "base64"),
    };
}
function discoverArtifacts(value, key = "", depth = 0) {
    if (depth > 5 || value === undefined || value === null)
        return [];
    const normalized = normalizedKey(key);
    const hintedType = PATH_KEY_TYPES[normalized];
    if (typeof value === "string") {
        const parsed = parseJsonString(value);
        if (parsed)
            return discoverArtifacts(parsed, key, depth + 1);
        const dataPayload = dataUrlPayload(value);
        if (dataPayload && hintedType) {
            return [{ type: hintedType, title: key || hintedType, value, key, mediaType: dataPayload.mediaType }];
        }
        if (hintedType && value.trim())
            return [{ type: hintedType, title: key || hintedType, value, key }];
        const extType = typeForPath(value);
        if (extType)
            return [{ type: extType, title: key || extType, value, key }];
        return [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((item, index) => discoverArtifacts(item, `${key || "artifact"}_${index + 1}`, depth + 1));
    }
    if (typeof value === "object") {
        return Object.entries(value).flatMap(([childKey, child]) => discoverArtifacts(child, childKey, depth + 1));
    }
    return [];
}
function resolveExistingPath(candidate, artifactDir) {
    if (!candidate || /^(https?:|blob:|data:)/i.test(candidate))
        return "";
    if (/[\r\n{}[\]]/.test(candidate) || candidate.length > 700)
        return "";
    const options = [
        path.resolve(candidate),
        path.resolve(artifactDir, candidate),
    ];
    return options.find(item => fs.existsSync(item) && fs.statSync(item).isFile()) || "";
}
function copyArtifact(input, captureIndex, discovered, sourcePath) {
    const artifactDir = (0, utils_1.ensureDir)(path.join(input.artifactDir, "browser-artifacts"));
    const ext = path.extname(sourcePath) || extensionForType(discovered.type, discovered.mediaType);
    const targetPath = path.join(artifactDir, `${artifactBase(input, captureIndex, discovered.type)}${ext}`);
    const resolvedTarget = path.resolve(targetPath);
    if (path.resolve(sourcePath) !== resolvedTarget)
        fs.copyFileSync(sourcePath, targetPath);
    return targetPath;
}
function writePayloadArtifact(input, captureIndex, discovered, bytes, mediaType) {
    const artifactDir = (0, utils_1.ensureDir)(path.join(input.artifactDir, "browser-artifacts"));
    const targetPath = path.join(artifactDir, `${artifactBase(input, captureIndex, discovered.type)}${extensionForType(discovered.type, mediaType)}`);
    fs.writeFileSync(targetPath, bytes);
    return targetPath;
}
function writeMetadataArtifact(input, captureIndex, discovered) {
    const artifactDir = (0, utils_1.ensureDir)(path.join(input.artifactDir, "browser-artifacts"));
    const targetPath = path.join(artifactDir, `${artifactBase(input, captureIndex, discovered.type)}.json`);
    fs.writeFileSync(targetPath, `${JSON.stringify({
        schema: "ccm-test-agent-browser-evidence-artifact-v1",
        type: discovered.type,
        key: discovered.key,
        source: input.source,
        capturedAt: new Date().toISOString(),
        valuePreview: (0, utils_1.compactText)(typeof discovered.value === "string" ? discovered.value : JSON.stringify(discovered.value), 5000),
    }, null, 2)}\n`, "utf-8");
    return targetPath;
}
function asArtifact(input, captureIndex, discovered) {
    const rawValue = typeof discovered.value === "string" ? discovered.value.trim() : "";
    const dataPayload = rawValue ? dataUrlPayload(rawValue) : null;
    const b64Payload = rawValue && discovered.type !== "other" ? base64Payload(rawValue, discovered.type) : null;
    let artifactPath = "";
    let mediaType = discovered.mediaType || dataPayload?.mediaType || b64Payload?.mediaType || "";
    try {
        if (dataPayload)
            artifactPath = writePayloadArtifact(input, captureIndex, discovered, dataPayload.bytes, dataPayload.mediaType);
        else if (b64Payload)
            artifactPath = writePayloadArtifact(input, captureIndex, discovered, b64Payload.bytes, b64Payload.mediaType);
        else {
            const resolved = resolveExistingPath(rawValue, input.artifactDir);
            if (resolved) {
                const inferredType = typeForPath(resolved, discovered.type);
                if (!inferredType)
                    return null;
                artifactPath = copyArtifact(input, captureIndex, { ...discovered, type: inferredType }, resolved);
            }
            else if (discovered.type === "metadata") {
                artifactPath = writeMetadataArtifact(input, captureIndex, discovered);
                mediaType = mediaType || "application/json";
            }
        }
    }
    catch {
        return null;
    }
    if (!artifactPath)
        return null;
    return {
        type: discovered.type,
        title: `${discovered.type}: ${discovered.title}`,
        path: artifactPath,
        source: input.source,
        ...(mediaType ? { mediaType } : {}),
    };
}
function writeBrowserEvidenceArtifacts(input) {
    const artifacts = [];
    const seen = new Set();
    input.captures.forEach((capture, captureIndex) => {
        for (const discovered of discoverArtifacts(capture)) {
            const artifact = asArtifact(input, captureIndex, discovered);
            if (!artifact)
                continue;
            const key = `${artifact.type}:${path.resolve(artifact.path)}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            artifacts.push(artifact);
        }
    });
    return artifacts;
}
