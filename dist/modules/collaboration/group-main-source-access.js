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
exports.resolveGroupMainSourceAccess = resolveGroupMainSourceAccess;
exports.runGroupMainSourceAccessSelfTest = runGroupMainSourceAccessSelfTest;
const crypto = __importStar(require("crypto"));
const group_session_lifecycle_head_1 = require("./group-session-lifecycle-head");
function uniqueProjects(values) {
    return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean))).sort();
}
function resolveGroupMainSourceAccess(input) {
    const routableProjects = uniqueProjects(input.routableProjects || []);
    const routable = new Set(routableProjects);
    const authorized = input.authorizedProjects === undefined
        ? routableProjects
        : uniqueProjects(input.authorizedProjects || []).filter(project => routable.has(project));
    const lifecycle = String(input.exactSessionId || "").startsWith("gcs_")
        ? (0, group_session_lifecycle_head_1.readGroupSessionLifecycleHead)(String(input.groupId || ""), String(input.exactSessionId || ""))
        : null;
    const generation = Math.max(0, Number(input.generation || lifecycle?.generation || 0));
    const checksum = crypto.createHash("sha256").update(JSON.stringify({
        groupId: String(input.groupId || ""),
        exactSessionId: String(input.exactSessionId || ""),
        generation,
        allowedProjects: authorized,
        lifecycleChecksum: String(lifecycle?.head_checksum || ""),
    })).digest("hex");
    return {
        allowedProjects: authorized,
        generation,
        lifecycleChecksum: String(lifecycle?.head_checksum || ""),
        checksum,
        contentStored: false,
    };
}
function runGroupMainSourceAccessSelfTest() {
    const access = resolveGroupMainSourceAccess({
        groupId: "test-group",
        exactSessionId: "test-session",
        routableProjects: ["api", "web", "api"],
        authorizedProjects: ["web", "outside"],
        generation: 7,
    });
    return {
        intersectsMembershipAndAuthorization: access.allowedProjects.length === 1 && access.allowedProjects[0] === "web",
        bindsGeneration: access.generation === 7,
        safeReceiptOnly: access.contentStored === false && /^[a-f0-9]{64}$/.test(access.checksum),
    };
}
//# sourceMappingURL=group-main-source-access.js.map