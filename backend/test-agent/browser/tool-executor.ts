import * as fs from "fs";
import * as path from "path";
import {
  BrowserToolCallRecord,
  TestAgentBrowserToolExecutor,
} from "../types";
import { compactText, ensureDir, makeRunId, nowIso } from "../utils";

export interface RecordingBrowserToolExecutor {
  executor: TestAgentBrowserToolExecutor;
  getRecords: () => BrowserToolCallRecord[];
  transcriptPath: string;
}

function previewOutput(output: any) {
  if (output === undefined) return "";
  if (typeof output === "string") return compactText(output, 2000);
  try {
    return compactText(JSON.stringify(output), 2000);
  } catch {
    return compactText(String(output), 2000);
  }
}

export function createRecordingBrowserToolExecutor(input: TestAgentBrowserToolExecutor, artifactDir: string): RecordingBrowserToolExecutor {
  const records: BrowserToolCallRecord[] = [];
  const transcriptDir = ensureDir(path.join(artifactDir, "browser-tools"));
  const transcriptPath = path.join(transcriptDir, "tool-calls.jsonl");
  const appendRecord = (record: BrowserToolCallRecord) => {
    records.push(record);
    fs.appendFileSync(transcriptPath, `${JSON.stringify(record)}\n`, "utf-8");
  };
  return {
    transcriptPath,
    getRecords: () => records.slice(),
    executor: {
      listTools: input.listTools ? () => input.listTools!() : undefined,
      callTool: async (toolName: string, toolInput: Record<string, any>) => {
        const startedAt = nowIso();
        const started = Date.now();
        const id = makeRunId("browser-tool-call");
        try {
          const output = await input.callTool(toolName, toolInput);
          appendRecord({
            id,
            toolName,
            input: toolInput,
            status: "passed",
            startedAt,
            finishedAt: nowIso(),
            durationMs: Date.now() - started,
            outputPreview: previewOutput(output),
          });
          return output;
        } catch (error: any) {
          appendRecord({
            id,
            toolName,
            input: toolInput,
            status: "failed",
            startedAt,
            finishedAt: nowIso(),
            durationMs: Date.now() - started,
            error: error.message || String(error),
          });
          throw error;
        }
      },
    },
  };
}

export function createStaticBrowserToolExecutor(input: {
  tools: string[];
  responses?: Record<string, any>;
  onCall?: (toolName: string, toolInput: Record<string, any>) => any | Promise<any>;
}): TestAgentBrowserToolExecutor {
  return {
    listTools: () => input.tools,
    callTool: async (toolName, toolInput) => {
      if (input.onCall) return input.onCall(toolName, toolInput);
      if (Object.prototype.hasOwnProperty.call(input.responses || {}, toolName)) return input.responses![toolName];
      return { ok: true, toolName, input: toolInput };
    },
  };
}
