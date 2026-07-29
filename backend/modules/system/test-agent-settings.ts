import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";

export type TestAgentSettings = {
  version: 1;
  enabled: boolean;
  updated_at: string;
};

const SETTINGS_FILE = String(process.env.CCM_TEST_AGENT_SETTINGS_FILE || "").trim()
  || path.join(CCM_DIR, "configs", "test-agent-settings.json");

function defaults(): TestAgentSettings {
  return { version: 1, enabled: true, updated_at: "" };
}

export function loadTestAgentSettings(): TestAgentSettings {
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    return {
      version: 1,
      enabled: parsed?.enabled !== false,
      updated_at: String(parsed?.updated_at || ""),
    };
  } catch {
    return defaults();
  }
}

export function saveTestAgentSettings(input: any): TestAgentSettings {
  const next: TestAgentSettings = {
    version: 1,
    enabled: input?.enabled !== false,
    updated_at: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  const temporary = `${SETTINGS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(next, null, 2), "utf-8");
  fs.renameSync(temporary, SETTINGS_FILE);
  return next;
}

export function isTestAgentEnabled() {
  return loadTestAgentSettings().enabled;
}

