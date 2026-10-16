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
exports.handleFoliaStatic = handleFoliaStatic;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const server_static_1 = require("../../../server-static");
const embedding_security_1 = require("./embedding-security");
// Folia 的资源和 SPA 回退只落在自己的发布目录。
function handleFoliaStatic(pathname, req, res, publicDir) {
    if (!pathname.startsWith('/music/folia/'))
        return false;
    // 仅 Folia 页面允许同源嵌入；CCM 主页面仍保持原有 frame-ancestors none。
    (0, embedding_security_1.applyFoliaEmbeddingHeaders)(res, path.join(publicDir, 'music', 'folia'));
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return true;
    }
    const root = path.join(publicDir, 'music', 'folia');
    let relative;
    try {
        relative = decodeURIComponent(pathname.slice('/music/folia/'.length));
    }
    catch {
        res.writeHead(400);
        res.end();
        return true;
    }
    let target = path.resolve(root, relative || 'index.html');
    if (!target.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return true;
    }
    if (!fs.existsSync(target) && !path.extname(relative))
        target = path.join(root, 'index.html');
    (0, server_static_1.sendFile)(res, target, req);
    return true;
}
//# sourceMappingURL=static.js.map