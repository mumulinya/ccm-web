import * as fs from "fs";
import * as path from "path";
import { compactText, ensureDir, safeSegment } from "../utils";

interface ScreenshotArtifactInput {
  artifactDir: string;
  projectName: string;
  checkName: string;
  index: number;
  captures: any[];
}

interface ImagePayload {
  extension: "png" | "jpg" | "jpeg" | "webp";
  bytes: Buffer;
}

const PATH_KEYS = new Set(["path", "filePath", "filepath", "screenshotPath", "imagePath", "filename", "file"]);
const IMAGE_KEYS = new Set(["image", "base64", "data", "screenshot", "blob"]);

function artifactBase(input: ScreenshotArtifactInput, captureIndex: number) {
  return `${safeSegment(input.projectName)}-${safeSegment(input.checkName)}-${input.index + 1}-${captureIndex + 1}`;
}

function parseJsonString(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/^[{[]/.test(trimmed)) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

function imagePayloadFromString(value: string, keyHint = ""): ImagePayload | null {
  const trimmed = value.trim();
  const dataUrl = trimmed.match(/^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (dataUrl) {
    return {
      extension: dataUrl[1].toLowerCase() as ImagePayload["extension"],
      bytes: Buffer.from(dataUrl[2].replace(/\s+/g, ""), "base64"),
    };
  }
  if (IMAGE_KEYS.has(keyHint) && trimmed.length > 100 && /^[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return {
      extension: "png",
      bytes: Buffer.from(trimmed.replace(/\s+/g, ""), "base64"),
    };
  }
  return null;
}

function findImagePayload(value: any, keyHint = "", depth = 0): ImagePayload | null {
  if (depth > 4 || value === undefined || value === null) return null;
  if (typeof value === "string") {
    const parsed = parseJsonString(value);
    if (parsed) return findImagePayload(parsed, keyHint, depth + 1);
    return imagePayloadFromString(value, keyHint);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImagePayload(item, keyHint, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const found = findImagePayload(item, key, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function pathLike(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return "";
  if (/^data:image\//i.test(trimmed)) return "";
  if (/[\r\n{}[\]]/.test(trimmed)) return "";
  if (/^(https?:|blob:)/i.test(trimmed)) return trimmed;
  if (/[\\/]/.test(trimmed) || /\.(png|jpe?g|webp|gif)$/i.test(trimmed)) return trimmed;
  return "";
}

function findPathCandidate(value: any, keyHint = "", depth = 0): string {
  if (depth > 4 || value === undefined || value === null) return "";
  if (typeof value === "string") {
    const parsed = parseJsonString(value);
    if (parsed) return findPathCandidate(parsed, keyHint, depth + 1);
    return PATH_KEYS.has(keyHint) || IMAGE_KEYS.has(keyHint) ? pathLike(value) : "";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPathCandidate(item, keyHint, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const found = findPathCandidate(item, key, depth + 1);
      if (found) return found;
    }
  }
  return "";
}

function existingPath(candidate: string, artifactDir: string) {
  if (!candidate || /^(https?:|blob:)/i.test(candidate)) return "";
  const options = [
    path.resolve(candidate),
    path.resolve(artifactDir, candidate),
  ];
  return options.find(item => fs.existsSync(item)) || "";
}

function writeMetadata(filePath: string, capture: any, referencedPath = "") {
  const body = {
    schema: "ccm-test-agent-screenshot-capture-v1",
    referencedPath,
    capturedAt: new Date().toISOString(),
    rawOutput: capture,
  };
  fs.writeFileSync(filePath, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
}

function writeTextFallback(filePath: string, capture: any, referencedPath = "") {
  const text = typeof capture === "string" ? capture : JSON.stringify(capture, null, 2);
  fs.writeFileSync(filePath, [
    "TestAgent MCP screenshot capture metadata",
    referencedPath ? `Referenced path: ${referencedPath}` : "",
    "",
    compactText(text, 10_000),
    "",
  ].filter(line => line !== "").join("\n"), "utf-8");
}

export function writeMcpScreenshotArtifacts(input: ScreenshotArtifactInput): string[] {
  const screenshotDir = ensureDir(path.join(input.artifactDir, "screenshots"));
  const captures = input.captures.length ? input.captures : [];
  const paths: string[] = [];
  for (let i = 0; i < captures.length; i += 1) {
    const capture = captures[i];
    const base = path.join(screenshotDir, artifactBase(input, i));
    const image = findImagePayload(capture);
    if (image && image.bytes.length > 0) {
      const imagePath = `${base}.${image.extension === "jpeg" ? "jpg" : image.extension}`;
      fs.writeFileSync(imagePath, image.bytes);
      paths.push(imagePath);
      continue;
    }

    const candidate = findPathCandidate(capture);
    const resolved = existingPath(candidate, input.artifactDir);
    if (resolved) {
      paths.push(resolved);
      continue;
    }

    const metadataPath = `${base}.capture.json`;
    try {
      writeMetadata(metadataPath, capture, candidate);
    } catch {
      writeTextFallback(`${base}.capture.txt`, capture, candidate);
      paths.push(`${base}.capture.txt`);
      continue;
    }
    paths.push(metadataPath);
  }
  return paths;
}
