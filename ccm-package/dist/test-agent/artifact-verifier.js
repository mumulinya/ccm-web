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
exports.verifyTestAgentArtifactManifest = verifyTestAgentArtifactManifest;
exports.verifyTestAgentArtifactManifestFile = verifyTestAgentArtifactManifestFile;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
function verifyTestAgentArtifactManifest(manifest, manifestPath = "") {
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
function verifyTestAgentArtifactManifestFile(manifestPath) {
    const manifest = readJson(manifestPath);
    return verifyTestAgentArtifactManifest(manifest, manifestPath);
}
//# sourceMappingURL=artifact-verifier.js.map