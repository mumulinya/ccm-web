import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Database from "better-sqlite3";

export type ExternalClaudeProviderConfig = {
  source: "cc-switch" | "external-file";
  providerId: string;
  providerName: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  credentialType: "api_key" | "auth_token";
};

function readJson(file: string): any {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf-8"));
    return value && typeof value === "object" ? value : null;
  } catch { return null; }
}

function text(value: unknown) {
  return String(value || "").trim();
}

function currentCcSwitchClaudeRow() {
  const root = path.join(os.homedir(), ".cc-switch");
  const settings = readJson(path.join(root, "settings.json"));
  const providerId = text(settings?.currentProviderClaude);
  const dbFile = path.join(root, "cc-switch.db");
  if (!fs.existsSync(dbFile)) return null;
  let db: Database.Database | null = null;
  try {
    db = new Database(dbFile, { readonly: true, fileMustExist: true });
    const row = providerId
      ? db.prepare("SELECT id, name, settings_config FROM providers WHERE id = ? AND app_type = 'claude' LIMIT 1").get(providerId)
      : db.prepare("SELECT id, name, settings_config FROM providers WHERE app_type = 'claude' AND is_current = 1 LIMIT 1").get();
    return row && typeof row === "object" ? row as any : null;
  } catch { return null; }
  finally { try { db?.close(); } catch {} }
}

function fromEnvironment(env: any, source: ExternalClaudeProviderConfig["source"], providerId: string, providerName: string) {
  if (!env || typeof env !== "object") return null;
  const apiUrl = text(env.ANTHROPIC_BASE_URL).replace(/\/+$/, "");
  const authToken = text(env.ANTHROPIC_AUTH_TOKEN);
  const apiKey = text(env.ANTHROPIC_API_KEY) || authToken;
  const model = text(
    env.ANTHROPIC_MODEL
    || env.ANTHROPIC_DEFAULT_SONNET_MODEL
    || env.ANTHROPIC_DEFAULT_OPUS_MODEL
    || env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  );
  if (!apiUrl || !apiKey || !model || !/^https?:\/\//i.test(apiUrl)) return null;
  return {
    source,
    providerId,
    providerName,
    apiUrl,
    apiKey,
    model,
    credentialType: authToken ? "auth_token" as const : "api_key" as const,
  };
}

export function loadCcSwitchClaudeProvider(): ExternalClaudeProviderConfig | null {
  const row = currentCcSwitchClaudeRow();
  if (row) {
    try {
      const parsed = JSON.parse(text(row.settings_config) || "{}");
      const provider = fromEnvironment(parsed?.env, "cc-switch", text(row.id), text(row.name) || "CC-Switch Claude Provider");
      if (provider) return provider;
    } catch {}
  }
  const settings = readJson(path.join(os.homedir(), ".claude", "settings.json"));
  return fromEnvironment(settings?.env, "external-file", "external-claude", "外部 Claude 配置");
}
