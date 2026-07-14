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
exports.handleSystemSettingsApi = handleSystemSettingsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const credential_store_1 = require("../../core/credential-store");
const utils_1 = require("../../core/utils");
const startedAt = new Date().toISOString();
function readAppVersion() {
    const candidates = [
        path.resolve(process.cwd(), "package.json"),
        path.resolve(__dirname, "../../../../package.json"),
        path.resolve(__dirname, "../../../package.json"),
    ];
    for (const file of candidates) {
        try {
            const version = String(JSON.parse(fs.readFileSync(file, "utf-8"))?.version || "").trim();
            if (version)
                return version;
        }
        catch { }
    }
    return "unknown";
}
function handleSystemSettingsApi(pathname, req, res) {
    if (pathname !== "/api/system/settings-status" || req.method !== "GET")
        return false;
    const credentials = (0, credential_store_1.credentialStoreStatus)();
    return (0, utils_1.sendJson)(res, {
        success: true,
        version: readAppVersion(),
        service: {
            status: "online",
            pid: process.pid,
            startedAt,
            uptimeSeconds: Math.floor(process.uptime()),
        },
        credentials: {
            protected: credentials.protected === true,
            backend: credentials.backend,
            entries: credentials.entries,
        },
    });
}
//# sourceMappingURL=settings.js.map