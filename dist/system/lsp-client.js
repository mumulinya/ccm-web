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
exports.languageServerManager = exports.LanguageServerManager = exports.StdioLspClient = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
class StdioLspClient extends events_1.EventEmitter {
    config;
    process = null;
    buffer = Buffer.alloc(0);
    sequence = 0;
    pending = new Map();
    stopping = false;
    diagnostics = new Map();
    openedDocuments = new Map();
    capabilities = {};
    constructor(config) {
        super();
        this.config = config;
    }
    async start() {
        if (this.process)
            return;
        this.stopping = false;
        const child = (0, child_process_1.spawn)(this.config.command, this.config.args || [], { cwd: this.config.cwd, stdio: "pipe", windowsHide: true, env: { ...process.env, ...(this.config.env || {}) } });
        this.process = child;
        child.stdout.on("data", chunk => this.consume(Buffer.from(chunk)));
        child.stderr.on("data", chunk => this.emit("stderr", String(chunk).slice(0, 4000)));
        child.on("error", error => this.failAll(error));
        child.on("exit", (code, signal) => {
            this.process = null;
            this.failAll(new Error(`LSP ${this.config.id} exited (${code ?? signal ?? "unknown"})`));
            if (!this.stopping)
                this.emit("crash", { code, signal });
        });
        const rootUri = `file:///${path.resolve(this.config.cwd).replace(/\\/g, "/").replace(/^\//, "")}`;
        const initialized = await this.request("initialize", { processId: process.pid, rootUri, capabilities: { textDocument: { definition: {}, references: {}, implementation: {}, typeDefinition: {}, documentSymbol: {}, callHierarchy: {}, publishDiagnostics: {} }, workspace: { symbol: {}, didChangeWatchedFiles: { dynamicRegistration: true } } }, initializationOptions: this.config.initializationOptions || {} });
        this.capabilities = initialized?.capabilities || {};
        this.notify("initialized", {});
    }
    openDocument(uri, languageId, text, checksum) {
        const current = this.openedDocuments.get(uri);
        if (!current) {
            this.openedDocuments.set(uri, { version: 1, checksum });
            this.notify("textDocument/didOpen", { textDocument: { uri, languageId, version: 1, text } });
            return 1;
        }
        if (current.checksum === checksum)
            return current.version;
        const version = current.version + 1;
        this.openedDocuments.set(uri, { version, checksum });
        this.notify("textDocument/didChange", { textDocument: { uri, version }, contentChanges: [{ text }] });
        return version;
    }
    waitForDiagnostics(uri, timeoutMs = 2_000) {
        if (this.diagnostics.has(uri))
            return Promise.resolve(this.diagnostics.get(uri) || []);
        return new Promise(resolve => {
            const finish = (params) => {
                clearTimeout(timer);
                this.off("diagnostics", onDiagnostics);
                resolve(Array.isArray(params?.diagnostics) ? params.diagnostics : (this.diagnostics.get(uri) || []));
            };
            const onDiagnostics = (params) => { if (String(params?.uri || "") === uri)
                finish(params); };
            const timer = setTimeout(() => finish(), Math.max(100, Math.min(10_000, timeoutMs)));
            this.on("diagnostics", onDiagnostics);
        });
    }
    closeDocument(uri) {
        if (!this.openedDocuments.has(uri))
            return;
        this.openedDocuments.delete(uri);
        this.notify("textDocument/didClose", { textDocument: { uri } });
        this.diagnostics.delete(uri);
    }
    watchedFilesChanged(changes) {
        if (changes.length)
            this.notify("workspace/didChangeWatchedFiles", { changes });
    }
    consume(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        while (true) {
            const headerEnd = this.buffer.indexOf("\r\n\r\n");
            if (headerEnd < 0)
                return;
            const header = this.buffer.subarray(0, headerEnd).toString("ascii");
            const length = Number(header.match(/Content-Length:\s*(\d+)/i)?.[1] || 0);
            if (!length || this.buffer.length < headerEnd + 4 + length)
                return;
            const payload = this.buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString("utf8");
            this.buffer = this.buffer.subarray(headerEnd + 4 + length);
            try {
                this.handle(JSON.parse(payload));
            }
            catch (error) {
                this.emit("protocolError", error);
            }
        }
    }
    handle(message) {
        if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
            const pending = this.pending.get(Number(message.id));
            if (!pending)
                return;
            clearTimeout(pending.timer);
            this.pending.delete(Number(message.id));
            if (message.error)
                pending.reject(new Error(`LSP ${message.error.code}: ${message.error.message}`));
            else
                pending.resolve(message.result);
            return;
        }
        if (message.method === "textDocument/publishDiagnostics") {
            this.diagnostics.set(String(message.params?.uri || ""), Array.isArray(message.params?.diagnostics) ? message.params.diagnostics : []);
            this.emit("diagnostics", message.params);
        }
        else
            this.emit("notification", message);
    }
    write(message) {
        if (!this.process?.stdin.writable)
            throw new Error(`LSP ${this.config.id} 未启动`);
        const body = Buffer.from(JSON.stringify(message));
        this.process.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
        this.process.stdin.write(body);
    }
    request(method, params, timeoutMs = this.config.timeoutMs || 15_000) {
        const id = ++this.sequence;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`LSP请求超时: ${method}`)); }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            try {
                this.write({ jsonrpc: "2.0", id, method, params });
            }
            catch (error) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(error);
            }
        });
    }
    notify(method, params) { this.write({ jsonrpc: "2.0", method, params }); }
    failAll(error) {
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pending.clear();
    }
    async stop() {
        this.stopping = true;
        if (!this.process)
            return;
        try {
            await this.request("shutdown", null, 3000);
        }
        catch { }
        try {
            this.notify("exit", null);
        }
        catch { }
        const child = this.process;
        this.process = null;
        await new Promise(resolve => {
            let settled = false;
            const finish = () => { if (settled)
                return; settled = true; clearTimeout(timer); resolve(); };
            child.once("exit", finish);
            const timer = setTimeout(() => { try {
                child.kill("SIGKILL");
            }
            catch { } setTimeout(finish, 100); }, 3000);
            timer.unref?.();
            try {
                child.kill();
            }
            catch {
                finish();
            }
        });
        this.failAll(new Error("LSP已停止"));
        this.openedDocuments.clear();
        this.capabilities = {};
    }
    identity() { return crypto.createHash("sha256").update(JSON.stringify({ ...this.config, initializationOptions: undefined })).digest("hex"); }
}
exports.StdioLspClient = StdioLspClient;
class LanguageServerManager {
    clients = new Map();
    async start(config) {
        const existing = this.clients.get(config.id);
        if (existing)
            return existing;
        const client = new StdioLspClient(config);
        try {
            await client.start();
            this.clients.set(config.id, client);
            return client;
        }
        catch (error) {
            await client.stop().catch(() => { });
            throw error;
        }
    }
    get(id) { return this.clients.get(id) || null; }
    async stop(id) { const client = this.clients.get(id); if (!client)
        return; this.clients.delete(id); await client.stop(); }
    async stopAll() { await Promise.all([...this.clients.keys()].map(id => this.stop(id))); }
    status() { return [...this.clients.entries()].map(([id, client]) => ({ id, state: "running", identity: client.identity(), diagnostics: [...client.diagnostics.values()].reduce((sum, rows) => sum + rows.length, 0), capabilities: client.capabilities })); }
}
exports.LanguageServerManager = LanguageServerManager;
exports.languageServerManager = new LanguageServerManager();
//# sourceMappingURL=lsp-client.js.map