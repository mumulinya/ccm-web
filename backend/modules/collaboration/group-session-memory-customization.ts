import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";

const SESSION_MEMORY_SECTIONS = [
  ["# Session Title", "_A short and distinctive 5-10 word descriptive title for the session. Super info dense, no filler_"],
  ["# Current State", "_What is actively being worked on right now? Pending tasks not yet completed. Immediate next steps._"],
  ["# Task specification", "_What did the user ask to build? Any design decisions or other explanatory context_"],
  ["# Files and Functions", "_What are the important files? In short, what do they contain and why are they relevant?_"],
  ["# Workflow", "_What bash commands are usually run and in what order? How to interpret their output if not obvious?_"],
  ["# Errors & Corrections", "_Errors encountered and how they were fixed. What did the user correct? What approaches failed and should not be tried again?_"],
  ["# Codebase and System Documentation", "_What are the important system components? How do they work/fit together?_"],
  ["# Learnings", "_What has worked well? What has not? What to avoid? Do not duplicate items from other sections_"],
  ["# Key results", "_If the user asked a specific output such as an answer to a question, a table, or other document, repeat the exact result here_"],
  ["# Worklog", "_Step by step, what was attempted, done? Very terse summary for each step_"],
] as const;

export const GROUP_SESSION_MEMORY_MODEL_TEMPLATE = SESSION_MEMORY_SECTIONS
  .map(([header, description]) => `${header}\n${description}\n`)
  .join("\n");

const SESSION_MEMORY_CUSTOM_PROMPT_MAX_CHARS = 32_000;
const SESSION_MEMORY_CUSTOM_PROMPT_GLOBAL_FILE = path.join(CCM_DIR, "session-memory", "config", "prompt.md");
const SESSION_MEMORY_CUSTOM_TEMPLATE_MAX_CHARS = 48_000;
const SESSION_MEMORY_CUSTOM_TEMPLATE_GLOBAL_FILE = path.join(CCM_DIR, "session-memory", "config", "template.md");

function hashText(value: any, length = 32) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}

function safeSessionMemoryCustomizationScopeId(scopeId: string) {
  const value = String(scopeId || "").trim();
  if (!value || !value.includes("--gcs_")) throw new Error("session_memory_custom_prompt_exact_session_required");
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 240);
}

function sessionMemoryCustomPromptFile(scopeId = "") {
  if (!String(scopeId || "").trim()) return SESSION_MEMORY_CUSTOM_PROMPT_GLOBAL_FILE;
  return path.join(CCM_DIR, "group-session-memory", safeSessionMemoryCustomizationScopeId(scopeId), "config", "prompt.md");
}

function sessionMemoryCustomTemplateFile(scopeId = "") {
  if (!String(scopeId || "").trim()) return SESSION_MEMORY_CUSTOM_TEMPLATE_GLOBAL_FILE;
  return path.join(CCM_DIR, "group-session-memory", safeSessionMemoryCustomizationScopeId(scopeId), "config", "template.md");
}

export function parseGroupSessionMemoryTemplate(content: any) {
  const template = String(content ?? "").replace(/\r\n/g, "\n").trim();
  if (!template) throw new Error("session_memory_custom_template_empty");
  if (template.length > SESSION_MEMORY_CUSTOM_TEMPLATE_MAX_CHARS) throw new Error("session_memory_custom_template_too_large");
  if (/\u0000/.test(template)) throw new Error("session_memory_custom_template_invalid_nul");
  const lines = template.split("\n");
  const sections: Array<readonly [string, string]> = [];
  let sawSection = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = String(lines[index] || "").trimEnd();
    if (/^#{2,6}\s+/.test(line)) throw new Error("session_memory_custom_template_nested_headers_unsupported");
    if (!/^#\s+\S/.test(line)) {
      if (!sawSection && line.trim()) throw new Error("session_memory_custom_template_preamble_invalid");
      continue;
    }
    sawSection = true;
    const description = String(lines[index + 1] || "").trimEnd();
    if (!/^_[^\r\n]+_$/.test(description)) throw new Error("session_memory_custom_template_description_invalid");
    sections.push([line, description] as const);
  }
  if (!sections.length || sections.length > 20) throw new Error("session_memory_custom_template_section_count_invalid");
  if (new Set(sections.map(([header]) => header.toLowerCase())).size !== sections.length) {
    throw new Error("session_memory_custom_template_duplicate_headers");
  }
  return { template, sections, sectionCount: sections.length, checksum: hashText(template, 32) };
}

export function validateGroupSessionMemoryCustomPrompt(content: any) {
  const value = String(content ?? "").replace(/\r\n/g, "\n").trim();
  if (value.length > SESSION_MEMORY_CUSTOM_PROMPT_MAX_CHARS) throw new Error("session_memory_custom_prompt_too_large");
  if (/\u0000/.test(value)) throw new Error("session_memory_custom_prompt_invalid_nul");
  return value;
}

function readSessionMemoryCustomPromptFile(file: string) {
  try {
    if (!fs.existsSync(file)) return { present: false, content: "", file, checksum: "" };
    const content = validateGroupSessionMemoryCustomPrompt(fs.readFileSync(file, "utf-8"));
    return { present: !!content, content, file, checksum: content ? hashText(content, 32) : "" };
  } catch (error: any) {
    return { present: false, content: "", file, checksum: "", error: String(error?.message || error) };
  }
}

export function readGroupSessionMemoryCustomPromptProfile(scopeId = "") {
  const globalPrompt = readSessionMemoryCustomPromptFile(sessionMemoryCustomPromptFile());
  const exactPrompt = String(scopeId || "").trim()
    ? readSessionMemoryCustomPromptFile(sessionMemoryCustomPromptFile(scopeId))
    : { present: false, content: "", file: "", checksum: "" };
  const resolved = exactPrompt.present ? exactPrompt : globalPrompt.present ? globalPrompt : null;
  return {
    schema: "ccm-group-session-memory-custom-prompt-profile-v1",
    scopeId: String(scopeId || ""),
    maxChars: SESSION_MEMORY_CUSTOM_PROMPT_MAX_CHARS,
    source: resolved === exactPrompt ? "exact_session" : resolved === globalPrompt ? "global" : "default",
    configured: !!resolved,
    content: resolved?.content || "",
    checksum: resolved?.checksum || "",
    file: resolved?.file || "",
    global: globalPrompt,
    exactSession: exactPrompt,
  };
}

export function saveGroupSessionMemoryCustomPrompt(scopeId: string, content: any, options: any = {}) {
  const targetScopeId = String(scopeId || "").trim();
  const file = sessionMemoryCustomPromptFile(targetScopeId);
  const reset = options.reset === true;
  const normalized = reset ? "" : validateGroupSessionMemoryCustomPrompt(content);
  if (!reset && !normalized) throw new Error("session_memory_custom_prompt_empty_use_reset");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (reset) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } else {
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.tmp`;
    fs.writeFileSync(temp, `${normalized}\n`, "utf-8");
    fs.renameSync(temp, file);
  }
  return readGroupSessionMemoryCustomPromptProfile(targetScopeId);
}

function readSessionMemoryCustomTemplateFile(file: string) {
  try {
    if (!fs.existsSync(file)) return { present: false, content: "", file, checksum: "", sectionCount: 0 };
    const parsed = parseGroupSessionMemoryTemplate(fs.readFileSync(file, "utf-8"));
    return { present: true, content: parsed.template, file, checksum: parsed.checksum, sectionCount: parsed.sectionCount };
  } catch (error: any) {
    return { present: false, content: "", file, checksum: "", sectionCount: 0, error: String(error?.message || error) };
  }
}

export function readGroupSessionMemoryCustomTemplateProfile(scopeId = "") {
  const globalTemplate = readSessionMemoryCustomTemplateFile(sessionMemoryCustomTemplateFile());
  const exactTemplate = String(scopeId || "").trim()
    ? readSessionMemoryCustomTemplateFile(sessionMemoryCustomTemplateFile(scopeId))
    : { present: false, content: "", file: "", checksum: "", sectionCount: 0 };
  const resolved = exactTemplate.present ? exactTemplate : globalTemplate.present ? globalTemplate : null;
  const fallback = parseGroupSessionMemoryTemplate(GROUP_SESSION_MEMORY_MODEL_TEMPLATE);
  return {
    schema: "ccm-group-session-memory-custom-template-profile-v1",
    scopeId: String(scopeId || ""),
    maxChars: SESSION_MEMORY_CUSTOM_TEMPLATE_MAX_CHARS,
    source: resolved === exactTemplate ? "exact_session" : resolved === globalTemplate ? "global" : "default",
    configured: !!resolved,
    content: resolved?.content || fallback.template,
    checksum: resolved?.checksum || fallback.checksum,
    sectionCount: resolved?.sectionCount || fallback.sectionCount,
    file: resolved?.file || "",
    global: globalTemplate,
    exactSession: exactTemplate,
  };
}

export function saveGroupSessionMemoryCustomTemplate(scopeId: string, content: any, options: any = {}) {
  const targetScopeId = String(scopeId || "").trim();
  const file = sessionMemoryCustomTemplateFile(targetScopeId);
  const reset = options.reset === true;
  const parsed = reset ? null : parseGroupSessionMemoryTemplate(content);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (reset) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } else {
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.tmp`;
    fs.writeFileSync(temp, `${parsed!.template}\n`, "utf-8");
    fs.renameSync(temp, file);
  }
  return readGroupSessionMemoryCustomTemplateProfile(targetScopeId);
}

export function inspectGroupSessionMemoryTemplateState(scopeId: string, content: any) {
  const profile = readGroupSessionMemoryCustomTemplateProfile(scopeId);
  const normalizedContent = String(content ?? "").replace(/\r\n/g, "\n").trim();
  const templateOnly = !!normalizedContent && normalizedContent === profile.content.trim();
  return {
    schema: "ccm-group-session-memory-template-state-v1",
    scopeId: String(scopeId || ""),
    checked: true,
    templateOnly,
    source: profile.source,
    checksum: profile.checksum,
    sectionCount: profile.sectionCount,
  };
}
