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
exports.EXTENSIONS_ROOT = void 0;
exports.extensionHash = extensionHash;
exports.readExtensionState = readExtensionState;
exports.mutateExtensionState = mutateExtensionState;
exports.extensionMemberEnabled = extensionMemberEnabled;
exports.extensionMemberAllowed = extensionMemberAllowed;
exports.assertExtensionMemberEditable = assertExtensionMemberEditable;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const runtime_paths_1 = require("../core/runtime-paths");
const crypto = __importStar(require("crypto"));
const atomic_json_file_1 = require("../core/atomic-json-file");
exports.EXTENSIONS_ROOT = path.join(runtime_paths_1.CCM_DIR, "extensions");
function extensionHash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}
function readExtensionState() {
    return (0, atomic_json_file_1.readJsonWithBackup)(path.join(exports.EXTENSIONS_ROOT, "installations.json"), { version: 1, items: [], disabled: [] });
}
function mutateExtensionState(change) {
    fs.mkdirSync(exports.EXTENSIONS_ROOT, { recursive: true });
    return (0, atomic_json_file_1.withFileLock)(path.join(exports.EXTENSIONS_ROOT, "state"), () => {
        const state = readExtensionState();
        const result = change(state);
        (0, atomic_json_file_1.writeJsonAtomic)(path.join(exports.EXTENSIONS_ROOT, "installations.json"), state);
        return result;
    });
}
function extensionMemberEnabled(kind, name) {
    const state = readExtensionState();
    if (state.disabled.includes(`${kind}:${name}`))
        return false;
    const owners = state.items.filter(item => item.state !== "removed" && item.members.some(member => member.owned && member.kind === kind && member.name === name));
    return !owners.length || owners.some(item => item.enabled);
}
function extensionMemberAllowed(kind, name) {
    const state = readExtensionState();
    if (state.disabled.includes(`${kind}:${name}`))
        return false;
    const owners = state.items.filter(item => item.state !== "removed" && item.members.some(member => member.owned && member.kind === kind && member.name === name));
    return !owners.length || owners.some(item => item.state === "active" && item.enabled);
}
function assertExtensionMemberEditable(kind, name) {
    const owner = readExtensionState().items.find(item => item.state !== "removed"
        && item.members.some(member => member.owned && member.kind === kind && member.name === name));
    if (owner)
        throw Object.assign(new Error(`请在扩展中心整包管理“${owner.name}”`), { code: "EXTENSION_MEMBER_MANAGED", statusCode: 409 });
}
//# sourceMappingURL=extension-state.js.map