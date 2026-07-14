import * as fs from "fs";
import * as path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { credentialStoreStatus } from "../../core/credential-store";
import { sendJson } from "../../core/utils";

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
      if (version) return version;
    } catch {}
  }
  return "unknown";
}

export function handleSystemSettingsApi(pathname: string, req: IncomingMessage, res: ServerResponse) {
  if (pathname !== "/api/system/settings-status" || req.method !== "GET") return false;
  const credentials = credentialStoreStatus();
  return sendJson(res, {
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
