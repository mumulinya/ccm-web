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
exports.persistDispatchNativeSessionEvidence = persistDispatchNativeSessionEvidence;
exports.readDispatchNativeSessionEvidence = readDispatchNativeSessionEvidence;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const native_continuation_1 = require("./native-continuation");
const credential_store_1 = require("../core/credential-store");
function containsPrivateContent(value) {
    if (typeof value === "string")
        return (0, credential_store_1.redactSensitiveText)(value) !== value;
    if (!value || typeof value !== "object")
        return false;
    return Object.entries(value).some(([key, child]) => /(?:prompt|stdout|stderr|raw.?output|hidden.?reasoning|secret.?value|password|authorization|api.?key|credentials|cookie|private.?key)/i.test(key) || containsPrivateContent(child));
}
function persistDispatchNativeSessionEvidence(evidence) {
    if (!evidence || !(0, native_continuation_1.verifyNativeSessionContinuationEvidence)(evidence).valid || !evidence.nativeSessionReusable || containsPrivateContent(evidence))
        return "";
    const checksum = String(evidence.evidenceChecksum || "");
    if (!/^[a-f0-9]{64}$/.test(checksum))
        return "";
    const directory = path.join(utils_1.CCM_DIR, "native-session-evidence");
    fs.mkdirSync(directory, { recursive: true });
    const file = path.join(directory, `${checksum}.json`);
    if (!fs.existsSync(file)) {
        const temporary = `${file}.${process.pid}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify(evidence), { mode: 0o600 });
        fs.renameSync(temporary, file);
    }
    return checksum;
}
function readDispatchNativeSessionEvidence(ref) {
    if (!/^[a-f0-9]{64}$/.test(ref || ""))
        return null;
    try {
        const evidence = JSON.parse(fs.readFileSync(path.join(utils_1.CCM_DIR, "native-session-evidence", `${ref}.json`), "utf8"));
        return evidence.evidenceChecksum === ref && !containsPrivateContent(evidence) && (0, native_continuation_1.verifyNativeSessionContinuationEvidence)(evidence).valid ? evidence : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=dispatch-native-session-evidence.js.map