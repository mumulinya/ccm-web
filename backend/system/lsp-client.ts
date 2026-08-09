import { EventEmitter } from "events";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import * as crypto from "crypto";
import * as path from "path";

export type LspServerConfig = { id: string; command: string; args?: string[]; cwd: string; languages: string[]; initializationOptions?: any; timeoutMs?: number };

export class StdioLspClient extends EventEmitter {
  private process: ChildProcessWithoutNullStreams | null = null;
  private buffer = Buffer.alloc(0);
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private stopping = false;
  readonly diagnostics = new Map<string, any[]>();
  private openedDocuments = new Map<string, { version: number; checksum: string }>();
  capabilities: any = {};
  constructor(readonly config: LspServerConfig) { super(); }

  async start() {
    if (this.process) return;
    this.stopping = false;
    const child = spawn(this.config.command, this.config.args || [], { cwd: this.config.cwd, stdio: "pipe", windowsHide: true, env: { ...process.env } });
    this.process = child;
    child.stdout.on("data", chunk => this.consume(Buffer.from(chunk)));
    child.stderr.on("data", chunk => this.emit("stderr", String(chunk).slice(0, 4000)));
    child.on("error", error => this.failAll(error));
    child.on("exit", (code, signal) => {
      this.process = null;
      this.failAll(new Error(`LSP ${this.config.id} exited (${code ?? signal ?? "unknown"})`));
      if (!this.stopping) this.emit("crash", { code, signal });
    });
    const rootUri = `file:///${path.resolve(this.config.cwd).replace(/\\/g, "/").replace(/^\//, "")}`;
    const initialized = await this.request("initialize", { processId: process.pid, rootUri, capabilities: { textDocument: { definition: {}, references: {}, implementation: {}, typeDefinition: {}, documentSymbol: {}, callHierarchy: {}, publishDiagnostics: {} }, workspace: { symbol: {}, didChangeWatchedFiles: { dynamicRegistration: true } } }, initializationOptions: this.config.initializationOptions || {} });
    this.capabilities = initialized?.capabilities || {};
    this.notify("initialized", {});
  }

  openDocument(uri: string, languageId: string, text: string, checksum: string) {
    const current = this.openedDocuments.get(uri);
    if (!current) {
      this.openedDocuments.set(uri, { version: 1, checksum });
      this.notify("textDocument/didOpen", { textDocument: { uri, languageId, version: 1, text } });
      return;
    }
    if (current.checksum === checksum) return;
    const version = current.version + 1;
    this.openedDocuments.set(uri, { version, checksum });
    this.notify("textDocument/didChange", { textDocument: { uri, version }, contentChanges: [{ text }] });
  }

  closeDocument(uri: string) {
    if (!this.openedDocuments.has(uri)) return;
    this.openedDocuments.delete(uri);
    this.notify("textDocument/didClose", { textDocument: { uri } });
    this.diagnostics.delete(uri);
  }

  watchedFilesChanged(changes: Array<{ uri: string; type: 1 | 2 | 3 }>) {
    if (changes.length) this.notify("workspace/didChangeWatchedFiles", { changes });
  }

  private consume(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = this.buffer.subarray(0, headerEnd).toString("ascii");
      const length = Number(header.match(/Content-Length:\s*(\d+)/i)?.[1] || 0);
      if (!length || this.buffer.length < headerEnd + 4 + length) return;
      const payload = this.buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString("utf8");
      this.buffer = this.buffer.subarray(headerEnd + 4 + length);
      try { this.handle(JSON.parse(payload)); } catch (error) { this.emit("protocolError", error); }
    }
  }

  private handle(message: any) {
    if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
      const pending = this.pending.get(Number(message.id));
      if (!pending) return;
      clearTimeout(pending.timer); this.pending.delete(Number(message.id));
      if (message.error) pending.reject(new Error(`LSP ${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result);
      return;
    }
    if (message.method === "textDocument/publishDiagnostics") {
      this.diagnostics.set(String(message.params?.uri || ""), Array.isArray(message.params?.diagnostics) ? message.params.diagnostics : []);
      this.emit("diagnostics", message.params);
    } else this.emit("notification", message);
  }

  private write(message: any) {
    if (!this.process?.stdin.writable) throw new Error(`LSP ${this.config.id} 未启动`);
    const body = Buffer.from(JSON.stringify(message));
    this.process.stdin.write(`Content-Length: ${body.length}\r\n\r\n`); this.process.stdin.write(body);
  }

  request(method: string, params: any, timeoutMs = this.config.timeoutMs || 15_000) {
    const id = ++this.sequence;
    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`LSP请求超时: ${method}`)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.write({ jsonrpc: "2.0", id, method, params }); } catch (error: any) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }

  notify(method: string, params: any) { this.write({ jsonrpc: "2.0", method, params }); }

  private failAll(error: Error) {
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }

  async stop() {
    this.stopping = true;
    if (!this.process) return;
    try { await this.request("shutdown", null, 3000); } catch {}
    try { this.notify("exit", null); } catch {}
    const child = this.process; this.process = null;
    await new Promise<void>(resolve => {
      let settled = false;
      const finish = () => { if (settled) return; settled = true; clearTimeout(timer); resolve(); };
      child.once("exit", finish);
      const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} setTimeout(finish, 100); }, 3000);
      timer.unref?.();
      try { child.kill(); } catch { finish(); }
    });
    this.failAll(new Error("LSP已停止"));
    this.openedDocuments.clear();
    this.capabilities = {};
  }

  identity() { return crypto.createHash("sha256").update(JSON.stringify({ ...this.config, initializationOptions: undefined })).digest("hex"); }
}

export class LanguageServerManager {
  private clients = new Map<string, StdioLspClient>();
  async start(config: LspServerConfig) {
    const existing = this.clients.get(config.id);
    if (existing) return existing;
    const client = new StdioLspClient(config);
    try { await client.start(); this.clients.set(config.id, client); return client; }
    catch (error) { await client.stop().catch(() => {}); throw error; }
  }
  get(id: string) { return this.clients.get(id) || null; }
  async stop(id: string) { const client = this.clients.get(id); if (!client) return; this.clients.delete(id); await client.stop(); }
  async stopAll() { await Promise.all([...this.clients.keys()].map(id => this.stop(id))); }
  status() { return [...this.clients.entries()].map(([id, client]) => ({ id, state: "running", identity: client.identity(), diagnostics: [...client.diagnostics.values()].reduce((sum, rows) => sum + rows.length, 0), capabilities: client.capabilities })); }
}

export const languageServerManager = new LanguageServerManager();
