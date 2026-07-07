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
exports.createRecordingBrowserToolExecutor = createRecordingBrowserToolExecutor;
exports.createStaticBrowserToolExecutor = createStaticBrowserToolExecutor;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
function previewOutput(output) {
    if (output === undefined)
        return "";
    if (typeof output === "string")
        return (0, utils_1.compactText)(output, 2000);
    try {
        return (0, utils_1.compactText)(JSON.stringify(output), 2000);
    }
    catch {
        return (0, utils_1.compactText)(String(output), 2000);
    }
}
function createRecordingBrowserToolExecutor(input, artifactDir) {
    const records = [];
    const transcriptDir = (0, utils_1.ensureDir)(path.join(artifactDir, "browser-tools"));
    const transcriptPath = path.join(transcriptDir, "tool-calls.jsonl");
    const appendRecord = (record) => {
        records.push(record);
        fs.appendFileSync(transcriptPath, `${JSON.stringify(record)}\n`, "utf-8");
    };
    return {
        transcriptPath,
        getRecords: () => records.slice(),
        executor: {
            listTools: input.listTools ? () => input.listTools() : undefined,
            callTool: async (toolName, toolInput) => {
                const startedAt = (0, utils_1.nowIso)();
                const started = Date.now();
                const id = (0, utils_1.makeRunId)("browser-tool-call");
                try {
                    const output = await input.callTool(toolName, toolInput);
                    appendRecord({
                        id,
                        toolName,
                        input: toolInput,
                        status: "passed",
                        startedAt,
                        finishedAt: (0, utils_1.nowIso)(),
                        durationMs: Date.now() - started,
                        outputPreview: previewOutput(output),
                    });
                    return output;
                }
                catch (error) {
                    appendRecord({
                        id,
                        toolName,
                        input: toolInput,
                        status: "failed",
                        startedAt,
                        finishedAt: (0, utils_1.nowIso)(),
                        durationMs: Date.now() - started,
                        error: error.message || String(error),
                    });
                    throw error;
                }
            },
        },
    };
}
function createStaticBrowserToolExecutor(input) {
    return {
        listTools: () => input.tools,
        callTool: async (toolName, toolInput) => {
            if (input.onCall)
                return input.onCall(toolName, toolInput);
            if (Object.prototype.hasOwnProperty.call(input.responses || {}, toolName))
                return input.responses[toolName];
            return { ok: true, toolName, input: toolInput };
        },
    };
}
