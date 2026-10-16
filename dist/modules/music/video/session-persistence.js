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
exports.createSessionPersistence = createSessionPersistence;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 所有写入串行原子替换；进度合并，终态立即排入同一写链，GET 不写盘。
function createSessionPersistence(filename, snapshot) {
    let dirty = false, timer, writing = Promise.resolve(), last = 0;
    function flush() {
        clearTimeout(timer);
        timer = undefined;
        if (!dirty)
            return writing;
        dirty = false;
        const json = JSON.stringify(snapshot());
        last = Date.now();
        writing = writing.catch(() => { }).then(async () => {
            await fs.promises.mkdir(path.dirname(filename), { recursive: true });
            const temporary = `${filename}.${process.pid}.tmp`;
            await fs.promises.writeFile(temporary, json, { mode: 0o600 });
            await fs.promises.rename(temporary, filename);
        });
        void writing.catch(() => { dirty = true; if (!timer)
            timer = setTimeout(flush, 1000); });
        return writing;
    }
    return { schedule(terminal = false) { dirty = true; if (terminal)
            void flush();
        else if (!timer)
            timer = setTimeout(flush, Math.max(0, 1000 - (Date.now() - last))); }, flush };
}
//# sourceMappingURL=session-persistence.js.map