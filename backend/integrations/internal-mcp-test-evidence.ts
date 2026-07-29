import * as fs from "fs";
import { resolveTestAgentArtifactForTask } from "../test-agent/artifact-retention";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_BYTES = 512 * 1024;

function bareMimeType(value: string) {
  return String(value || "application/octet-stream").split(";", 1)[0].trim();
}

export function readInternalMcpTestEvidenceContent(taskId: string, input: any = {}, options: { rootDir?: string } = {}) {
  const runId = String(input?.run_id || input?.runId || "").trim();
  const artifactId = String(input?.artifact_id || input?.artifactId || "").trim();
  if (!runId || !artifactId) throw new Error("读取 TestAgent 证据需要 run_id 和 artifact_id");
  const artifact = resolveTestAgentArtifactForTask({ taskId, runId, artifactId, rootDir: options.rootDir });
  if (!artifact) throw new Error("TestAgent 证据不存在、已过期或不属于当前任务");
  const stat = fs.statSync(artifact.file_path);
  const metadata = {
    success: true,
    task_id: taskId,
    run_id: runId,
    artifact_id: artifactId,
    file_name: artifact.file_name,
    mime_type: artifact.mime_type,
    preview_kind: artifact.preview_kind,
    size_bytes: stat.size,
  };
  if (artifact.preview_kind === "image") {
    if (stat.size > MAX_IMAGE_BYTES) throw new Error("截图证据超过 MCP 单次读取上限");
    return {
      content: [
        { type: "text", text: JSON.stringify(metadata) },
        { type: "image", data: fs.readFileSync(artifact.file_path).toString("base64"), mimeType: bareMimeType(artifact.mime_type) },
      ],
    };
  }
  if (artifact.preview_kind === "text") {
    if (stat.size > MAX_TEXT_BYTES) throw new Error("文本证据超过 MCP 单次读取上限，请先使用证据目录选择更小的条目");
    return {
      content: [
        { type: "text", text: JSON.stringify(metadata) },
        { type: "text", text: fs.readFileSync(artifact.file_path, "utf-8") },
      ],
    };
  }
  throw new Error("该证据类型只能下载，不能注入主 Agent 上下文");
}
