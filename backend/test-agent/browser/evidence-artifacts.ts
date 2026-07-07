import * as fs from "fs";
import * as path from "path";
import { BrowserEvidenceArtifact } from "../types";
import { compactText, ensureDir, safeSegment } from "../utils";

interface BrowserEvidenceArtifactInput {
  artifactDir: string;
  projectName: string;
  checkName: string;
  index: number;
  captures: any[];
  source: string;
}

interface DiscoveredArtifact {
  type: BrowserEvidenceArtifact["type"];
  title: string;
  value: any;
  key: string;
  mediaType?: string;
}

const PATH_KEY_TYPES: Record<string, BrowserEvidenceArtifact["type"]> = {
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

const EXTENSION_TYPES: Record<string, BrowserEvidenceArtifact["type"]> = {
  ".zip": "trace",
  ".trace": "trace",
  ".har": "har",
  ".webm": "video",
  ".mp4": "video",
  ".mov": "video",
  ".json": "metadata",
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

function normalizedKey(key: string) {
  return key.toLowerCase().replace(/[\s-]+/g, "_");
}

function artifactBase(input: BrowserEvidenceArtifactInput, captureIndex: number, type: string) {
  return `${safeSegment(input.projectName)}-${safeSegment(input.checkName)}-${input.index + 1}-${captureIndex + 1}-${safeSegment(type)}`;
}

function parseJsonString(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/^[{[]/.test(trimmed)) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

function typeForPath(filePath: string, fallback: BrowserEvidenceArtifact["type"] | "" = "") {
  const ext = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "";
  return EXTENSION_TYPES[ext] || fallback;
}

function extensionForType(type: BrowserEvidenceArtifact["type"], mediaType = "") {
  if (/har|json/i.test(mediaType)) return ".har";
  if (/zip|trace/i.test(mediaType)) return ".zip";
  if (/webm/i.test(mediaType)) return ".webm";
  if (/mp4/i.test(mediaType)) return ".mp4";
  if (type === "trace") return ".zip";
  if (type === "har") return ".har";
  if (type === "video") return ".webm";
  if (type === "metadata") return ".json";
  return ".bin";
}

function dataUrlPayload(value: string) {
  const match = value.trim().match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;
  return {
    mediaType: match[1],
    bytes: Buffer.from(match[2].replace(/\s+/g, ""), "base64"),
  };
}

function base64Payload(value: string, type: BrowserEvidenceArtifact["type"]) {
  const trimmed = value.trim();
  if (trimmed.length < 24 || !/^[a-z0-9+/=\s]+$/i.test(trimmed)) return null;
  return {
    mediaType: type === "video" ? "video/webm" : type === "har" ? "application/json" : "application/octet-stream",
    bytes: Buffer.from(trimmed.replace(/\s+/g, ""), "base64"),
  };
}

function discoverArtifacts(value: any, key = "", depth = 0): DiscoveredArtifact[] {
  if (depth > 5 || value === undefined || value === null) return [];
  const normalized = normalizedKey(key);
  const hintedType = PATH_KEY_TYPES[normalized];
  if (typeof value === "string") {
    const parsed = parseJsonString(value);
    if (parsed) return discoverArtifacts(parsed, key, depth + 1);

    const dataPayload = dataUrlPayload(value);
    if (dataPayload && hintedType) {
      return [{ type: hintedType, title: key || hintedType, value, key, mediaType: dataPayload.mediaType }];
    }

    if (hintedType && value.trim()) return [{ type: hintedType, title: key || hintedType, value, key }];
    const extType = typeForPath(value);
    if (extType) return [{ type: extType as BrowserEvidenceArtifact["type"], title: key || extType, value, key }];
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

function resolveExistingPath(candidate: string, artifactDir: string) {
  if (!candidate || /^(https?:|blob:|data:)/i.test(candidate)) return "";
  if (/[\r\n{}[\]]/.test(candidate) || candidate.length > 700) return "";
  const options = [
    path.resolve(candidate),
    path.resolve(artifactDir, candidate),
  ];
  return options.find(item => fs.existsSync(item) && fs.statSync(item).isFile()) || "";
}

function copyArtifact(input: BrowserEvidenceArtifactInput, captureIndex: number, discovered: DiscoveredArtifact, sourcePath: string) {
  const artifactDir = ensureDir(path.join(input.artifactDir, "browser-artifacts"));
  const ext = path.extname(sourcePath) || extensionForType(discovered.type, discovered.mediaType);
  const targetPath = path.join(artifactDir, `${artifactBase(input, captureIndex, discovered.type)}${ext}`);
  const resolvedTarget = path.resolve(targetPath);
  if (path.resolve(sourcePath) !== resolvedTarget) fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function writePayloadArtifact(input: BrowserEvidenceArtifactInput, captureIndex: number, discovered: DiscoveredArtifact, bytes: Buffer, mediaType: string) {
  const artifactDir = ensureDir(path.join(input.artifactDir, "browser-artifacts"));
  const targetPath = path.join(artifactDir, `${artifactBase(input, captureIndex, discovered.type)}${extensionForType(discovered.type, mediaType)}`);
  fs.writeFileSync(targetPath, bytes);
  return targetPath;
}

function writeMetadataArtifact(input: BrowserEvidenceArtifactInput, captureIndex: number, discovered: DiscoveredArtifact) {
  const artifactDir = ensureDir(path.join(input.artifactDir, "browser-artifacts"));
  const targetPath = path.join(artifactDir, `${artifactBase(input, captureIndex, discovered.type)}.json`);
  fs.writeFileSync(targetPath, `${JSON.stringify({
    schema: "ccm-test-agent-browser-evidence-artifact-v1",
    type: discovered.type,
    key: discovered.key,
    source: input.source,
    capturedAt: new Date().toISOString(),
    valuePreview: compactText(typeof discovered.value === "string" ? discovered.value : JSON.stringify(discovered.value), 5000),
  }, null, 2)}\n`, "utf-8");
  return targetPath;
}

function asArtifact(input: BrowserEvidenceArtifactInput, captureIndex: number, discovered: DiscoveredArtifact): BrowserEvidenceArtifact | null {
  const rawValue = typeof discovered.value === "string" ? discovered.value.trim() : "";
  const dataPayload = rawValue ? dataUrlPayload(rawValue) : null;
  const b64Payload = rawValue && discovered.type !== "other" ? base64Payload(rawValue, discovered.type) : null;
  let artifactPath = "";
  let mediaType = discovered.mediaType || dataPayload?.mediaType || b64Payload?.mediaType || "";
  try {
    if (dataPayload) artifactPath = writePayloadArtifact(input, captureIndex, discovered, dataPayload.bytes, dataPayload.mediaType);
    else if (b64Payload) artifactPath = writePayloadArtifact(input, captureIndex, discovered, b64Payload.bytes, b64Payload.mediaType);
    else {
      const resolved = resolveExistingPath(rawValue, input.artifactDir);
      if (resolved) {
        const inferredType = typeForPath(resolved, discovered.type);
        if (!inferredType) return null;
        artifactPath = copyArtifact(input, captureIndex, { ...discovered, type: inferredType as BrowserEvidenceArtifact["type"] }, resolved);
      } else if (discovered.type === "metadata") {
        artifactPath = writeMetadataArtifact(input, captureIndex, discovered);
        mediaType = mediaType || "application/json";
      }
    }
  } catch {
    return null;
  }
  if (!artifactPath) return null;
  return {
    type: discovered.type,
    title: `${discovered.type}: ${discovered.title}`,
    path: artifactPath,
    source: input.source,
    ...(mediaType ? { mediaType } : {}),
  };
}

export function writeBrowserEvidenceArtifacts(input: BrowserEvidenceArtifactInput): BrowserEvidenceArtifact[] {
  const artifacts: BrowserEvidenceArtifact[] = [];
  const seen = new Set<string>();
  input.captures.forEach((capture, captureIndex) => {
    for (const discovered of discoverArtifacts(capture)) {
      const artifact = asArtifact(input, captureIndex, discovered);
      if (!artifact) continue;
      const key = `${artifact.type}:${path.resolve(artifact.path)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      artifacts.push(artifact);
    }
  });
  return artifacts;
}
