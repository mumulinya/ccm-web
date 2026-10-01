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
exports.addVisibleFileSizes = addVisibleFileSizes;
const fs = __importStar(require("fs"));
// Only stat the already filtered, paged entries. Resolve each path through
// the caller's existing scope checks; never follow a newly substituted link.
// Size is a read-planning hint, not a checksum or reusable content evidence.
async function addVisibleFileSizes(items, resolvePath) {
    return Promise.all(items.map(async (item) => {
        if (item.type !== 'file')
            return item;
        try {
            const stat = await fs.promises.lstat(resolvePath(item.path));
            if (stat.isFile() && Number.isSafeInteger(stat.size) && stat.size >= 0)
                return { ...item, size_bytes: stat.size };
        }
        catch {
            // A disappearing or newly inaccessible file must not break the listing
            // or gain a fabricated zero size. The read tool revalidates it later.
        }
        return item;
    }));
}
//# sourceMappingURL=workspace-file-metadata.js.map