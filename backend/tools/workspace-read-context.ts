import * as crypto from "crypto";

export type WorkspaceReadContextIdentity = {
  scope: "global" | "group" | "project";
  scopeId: string;
  exactSessionId: string;
  generation: number;
};

export type WorkspaceReadRange = {
  offset?: number;
  limit?: number;
  pages?: string;
  cellOffset?: number;
  cellLimit?: number;
  tokenBudget?: number;
};

export type WorkspaceReadEntry = {
  project: string;
  path: string;
  range: WorkspaceReadRange;
  checksum: string;
  mtimeMs: number;
  size: number;
  totalLines?: number;
  from?: number;
  to?: number;
  nextOffset?: number;
};

function stableRange(range: WorkspaceReadRange) {
  return JSON.stringify({
    offset: Number(range.offset || 0),
    limit: Number(range.limit || 0),
    pages: String(range.pages || ""),
    cellOffset: Number(range.cellOffset || 0),
    cellLimit: Number(range.cellLimit || 0),
    tokenBudget: Number(range.tokenBudget || 0),
  });
}

function pathKey(project: string, filePath: string) {
  return `${project}\0${filePath.replace(/\\/g, "/")}`;
}

function entryKey(project: string, filePath: string, range: WorkspaceReadRange) {
  return `${pathKey(project, filePath)}\0${stableRange(range)}`;
}

export class WorkspaceReadContextLedger {
  readonly epoch: string;
  readonly identity: WorkspaceReadContextIdentity;
  private entries = new Map<string, WorkspaceReadEntry>();
  private signatures = new Map<string, string>();
  private inFlight = new Map<string, Promise<any>>();

  constructor(identity: WorkspaceReadContextIdentity) {
    this.identity = { ...identity, generation: Math.max(0, Number(identity.generation || 0)) };
    this.epoch = crypto.createHash("sha256").update(JSON.stringify({ ...this.identity, createdAt: Date.now(), nonce: crypto.randomBytes(8).toString("hex") })).digest("hex").slice(0, 24);
  }

  lookup(project: string, filePath: string, range: WorkspaceReadRange, stat: { mtimeMs: number; size: number }) {
    const base = pathKey(project, filePath);
    const signature = `${Number(stat.mtimeMs || 0)}:${Number(stat.size || 0)}`;
    const previousSignature = this.signatures.get(base);
    if (previousSignature && previousSignature !== signature) this.invalidate(project, filePath);
    this.signatures.set(base, signature);
    const entry = this.entries.get(entryKey(project, filePath, range));
    return entry && entry.mtimeMs === Number(stat.mtimeMs || 0) && entry.size === Number(stat.size || 0) ? entry : null;
  }

  record(entry: WorkspaceReadEntry) {
    const normalized = { ...entry, path: entry.path.replace(/\\/g, "/") };
    this.signatures.set(pathKey(normalized.project, normalized.path), `${Number(normalized.mtimeMs || 0)}:${Number(normalized.size || 0)}`);
    this.entries.set(entryKey(normalized.project, normalized.path, normalized.range), normalized);
  }

  invalidate(project: string, filePath: string) {
    const prefix = `${pathKey(project, filePath)}\0`;
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key);
    this.signatures.delete(pathKey(project, filePath));
  }

  inFlightFor(project: string, filePath: string, range: WorkspaceReadRange) {
    return this.inFlight.get(entryKey(project, filePath, range));
  }

  setInFlight(project: string, filePath: string, range: WorkspaceReadRange, promise: Promise<any>) {
    const key = entryKey(project, filePath, range);
    this.inFlight.set(key, promise);
    promise.finally(() => {
      if (this.inFlight.get(key) === promise) this.inFlight.delete(key);
    }).catch(() => {});
  }
}

export function createWorkspaceReadContextLedger(identity: WorkspaceReadContextIdentity) {
  return new WorkspaceReadContextLedger(identity);
}

