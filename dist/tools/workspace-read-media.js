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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transientWorkspaceBlocks = transientWorkspaceBlocks;
exports.readWorkspaceImage = readWorkspaceImage;
exports.readWorkspacePdf = readWorkspacePdf;
exports.readWorkspaceNotebook = readWorkspaceNotebook;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const canvas_1 = require("@napi-rs/canvas");
const context_budget_1 = require("../system/context-budget");
const cc_tool_result_limits_1 = require("./cc-tool-result-limits");
const transient_model_content_1 = require("../system/transient-model-content");
const IMAGE_INPUT_LIMIT = 12 * 1024 * 1024;
const IMAGE_TARGET_BYTES = Math.floor(3.75 * 1024 * 1024);
const IMAGE_MAX_EDGE = 2000;
const PDF_INPUT_LIMIT = 25 * 1024 * 1024;
const PDF_INLINE_PAGE_LIMIT = 10;
const PDF_RANGE_PAGE_LIMIT = 20;
const NOTEBOOK_INPUT_LIMIT = 25 * 1024 * 1024;
function hash(value) {
    return crypto.createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}
function attachTransient(value, blocks) {
    return (0, transient_model_content_1.attachTransientModelBlocks)(value, blocks);
}
function transientWorkspaceBlocks(value) {
    return (0, transient_model_content_1.transientModelBlocks)(value);
}
function imageMime(extension) {
    if ([".jpg", ".jpeg"].includes(extension))
        return "image/jpeg";
    if (extension === ".gif")
        return "image/gif";
    if (extension === ".webp")
        return "image/webp";
    return "image/png";
}
async function boundedImage(file) {
    const original = await fs.promises.readFile(file);
    if (original.length > IMAGE_INPUT_LIMIT)
        throw new Error("图片超过12MB安全读取上限");
    const extension = path.extname(file).toLowerCase();
    const metadata = await (0, sharp_1.default)(original, { animated: extension === ".gif" }).metadata();
    let output = Buffer.from(original);
    let mimeType = imageMime(extension);
    const needsResize = Number(metadata.width || 0) > IMAGE_MAX_EDGE || Number(metadata.height || 0) > IMAGE_MAX_EDGE || original.length > IMAGE_TARGET_BYTES;
    if (needsResize) {
        let quality = 88;
        do {
            output = await (0, sharp_1.default)(original, { animated: false })
                .rotate()
                .resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
                .jpeg({ quality, mozjpeg: true })
                .toBuffer();
            mimeType = "image/jpeg";
            quality -= 10;
        } while (output.length > IMAGE_TARGET_BYTES && quality >= 48);
    }
    if (output.length > IMAGE_TARGET_BYTES)
        throw new Error("图片压缩后仍超过视觉模型安全容量");
    const display = await (0, sharp_1.default)(output).metadata();
    return {
        original,
        output,
        mimeType,
        dimensions: {
            originalWidth: Number(metadata.width || 0),
            originalHeight: Number(metadata.height || 0),
            displayWidth: Number(display.width || 0),
            displayHeight: Number(display.height || 0),
        },
    };
}
async function readWorkspaceImage(file, relativePath) {
    const image = await boundedImage(file);
    const result = {
        schema: "ccm-workspace-read-result-v3",
        toolContractVersion: 3,
        type: "image",
        path: relativePath,
        mime_type: image.mimeType,
        original_size: image.original.length,
        display_size: image.output.length,
        dimensions: image.dimensions,
        checksum: hash(image.original),
        truncated: false,
        safeReceipt: { kind: "image", path: relativePath, checksum: hash(image.original), itemCount: 1, truncated: false, contentStored: false },
    };
    return attachTransient(result, [{ type: "image", mimeType: image.mimeType, data: image.output, label: relativePath }]);
}
function parsePageRange(value, totalPages) {
    const raw = String(value || "").trim();
    if (!raw) {
        if (totalPages > PDF_INLINE_PAGE_LIMIT)
            throw new Error(`PDF共${totalPages}页，请使用pages指定范围；单次最多${PDF_RANGE_PAGE_LIMIT}页`);
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const match = raw.match(/^(\d+)(?:-(\d+))?$/);
    if (!match)
        throw new Error("PDF页码格式无效，请使用1-5、3或10-20");
    const first = Number(match[1]);
    const last = Number(match[2] || match[1]);
    if (first < 1 || last < first || last > totalPages)
        throw new Error(`PDF页码超出范围，文件共${totalPages}页`);
    if (last - first + 1 > PDF_RANGE_PAGE_LIMIT)
        throw new Error(`PDF单次最多读取${PDF_RANGE_PAGE_LIMIT}页`);
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}
async function loadPdfJs() {
    const dynamicImport = new Function("specifier", "return import(specifier)");
    return dynamicImport("pdfjs-dist/legacy/build/pdf.mjs");
}
async function readWorkspacePdf(file, relativePath, pagesValue) {
    const source = await fs.promises.readFile(file);
    if (source.length > PDF_INPUT_LIMIT)
        throw new Error("PDF超过25MB安全读取上限");
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(source), disableWorker: true, isEvalSupported: false });
    const document = await loadingTask.promise;
    try {
        const selectedPages = parsePageRange(pagesValue, document.numPages);
        const pageRows = [];
        const blocks = [];
        for (const pageNumber of selectedPages) {
            const page = await document.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const text = (textContent.items || []).map((item) => String(item?.str || "")).join(" ").replace(/\s+/g, " ").trim();
            const viewport = page.getViewport({ scale: 1.5 });
            const maxScale = Math.min(1, IMAGE_MAX_EDGE / Math.max(viewport.width, viewport.height));
            const renderViewport = maxScale < 1 ? page.getViewport({ scale: 1.5 * maxScale }) : viewport;
            const canvas = (0, canvas_1.createCanvas)(Math.max(1, Math.ceil(renderViewport.width)), Math.max(1, Math.ceil(renderViewport.height)));
            const context = canvas.getContext("2d");
            await page.render({ canvasContext: context, viewport: renderViewport }).promise;
            let image = canvas.toBuffer("image/jpeg", 82);
            if (image.length > IMAGE_TARGET_BYTES)
                image = await (0, sharp_1.default)(image).resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside" }).jpeg({ quality: 68 }).toBuffer();
            blocks.push({ type: "image", mimeType: "image/jpeg", data: image, label: `${relativePath} 第${pageNumber}页` });
            pageRows.push({ page: pageNumber, text, imageAvailable: true });
        }
        const extractedText = pageRows.map(row => `# Page ${row.page}\n${row.text}`).join("\n\n");
        if ((0, context_budget_1.estimateTextTokens)(extractedText) > cc_tool_result_limits_1.CC_ALIGNED_FILE_READ_MAX_TOKENS)
            throw new Error("PDF选定页文字超过25000 Token，请缩小pages范围");
        const result = {
            schema: "ccm-workspace-read-result-v3",
            toolContractVersion: 3,
            type: "pdf",
            path: relativePath,
            total_pages: document.numPages,
            selected_pages: selectedPages,
            pages: pageRows,
            checksum: hash(source),
            truncated: selectedPages.length < document.numPages,
            safeReceipt: { kind: "pdf", path: relativePath, checksum: hash(source), pageCount: selectedPages.length, truncated: selectedPages.length < document.numPages, contentStored: false },
        };
        return attachTransient(result, blocks);
    }
    finally {
        await document.destroy();
    }
}
function sanitizeNotebookOutput(output) {
    const outputType = String(output?.output_type || "unknown");
    if (outputType === "stream")
        return { output_type: outputType, name: String(output?.name || ""), text: Array.isArray(output?.text) ? output.text.join("") : String(output?.text || "") };
    if (["execute_result", "display_data"].includes(outputType)) {
        const data = output?.data && typeof output.data === "object" ? output.data : {};
        return {
            output_type: outputType,
            execution_count: output?.execution_count ?? null,
            data: {
                ...(data["text/plain"] !== undefined ? { "text/plain": Array.isArray(data["text/plain"]) ? data["text/plain"].join("") : String(data["text/plain"]) } : {}),
                ...(data["text/markdown"] !== undefined ? { "text/markdown": Array.isArray(data["text/markdown"]) ? data["text/markdown"].join("") : String(data["text/markdown"]) } : {}),
            },
            image_types: Object.keys(data).filter(key => /^image\/(?:png|jpeg|gif|webp)$/i.test(key)),
        };
    }
    if (outputType === "error")
        return { output_type: outputType, ename: String(output?.ename || ""), evalue: String(output?.evalue || ""), traceback: (Array.isArray(output?.traceback) ? output.traceback : []).map(String).slice(0, 40) };
    return { output_type: outputType };
}
async function readWorkspaceNotebook(file, relativePath, args) {
    const raw = await fs.promises.readFile(file);
    if (raw.length > NOTEBOOK_INPUT_LIMIT)
        throw new Error("Notebook超过25MB安全读取上限");
    let notebook;
    try {
        notebook = JSON.parse(raw.toString("utf-8"));
    }
    catch {
        throw new Error("Notebook格式无效");
    }
    if (!Array.isArray(notebook?.cells))
        throw new Error("Notebook缺少cells数组");
    const offset = Math.max(0, Number(args?.cell_offset || 0) || 0);
    const limit = Math.max(1, Math.min(200, Number(args?.cell_limit || notebook.cells.length || 1) || 1));
    const sourceCells = notebook.cells.slice(offset, offset + limit);
    const selected = sourceCells.map((cell, index) => ({
        index: offset + index,
        id: String(cell?.id || ""),
        cell_type: String(cell?.cell_type || "unknown"),
        execution_count: cell?.execution_count ?? null,
        source: Array.isArray(cell?.source) ? cell.source.join("") : String(cell?.source || ""),
        outputs: (Array.isArray(cell?.outputs) ? cell.outputs : []).map(sanitizeNotebookOutput),
    }));
    if ((0, context_budget_1.estimateTextTokens)(JSON.stringify(selected)) > cc_tool_result_limits_1.CC_ALIGNED_FILE_READ_MAX_TOKENS)
        throw new Error("Notebook选定单元格超过25000 Token，请缩小cell_limit");
    const checksum = hash(raw);
    const blocks = [];
    let imageBytes = 0;
    for (let cellIndex = 0; cellIndex < sourceCells.length && blocks.length < 8; cellIndex += 1) {
        for (const output of Array.isArray(sourceCells[cellIndex]?.outputs) ? sourceCells[cellIndex].outputs : []) {
            const data = output?.data && typeof output.data === "object" ? output.data : {};
            for (const mimeType of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
                const encoded = Array.isArray(data[mimeType]) ? data[mimeType].join("") : String(data[mimeType] || "");
                if (!encoded || blocks.length >= 8)
                    continue;
                let decoded;
                try {
                    decoded = Buffer.from(encoded, "base64");
                }
                catch {
                    continue;
                }
                if (!decoded.length || decoded.length > IMAGE_INPUT_LIMIT || imageBytes + decoded.length > 8 * 1024 * 1024)
                    continue;
                let visual = decoded;
                let visualMime = mimeType;
                const metadata = await (0, sharp_1.default)(decoded, { animated: mimeType === "image/gif" }).metadata();
                if (decoded.length > IMAGE_TARGET_BYTES || Number(metadata.width || 0) > IMAGE_MAX_EDGE || Number(metadata.height || 0) > IMAGE_MAX_EDGE) {
                    visual = await (0, sharp_1.default)(decoded).rotate().resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
                    visualMime = "image/jpeg";
                }
                imageBytes += visual.length;
                blocks.push({ type: "image", mimeType: visualMime, data: visual, label: `${relativePath} 单元格 ${offset + cellIndex + 1}` });
            }
        }
    }
    const result = {
        schema: "ccm-workspace-read-result-v3",
        toolContractVersion: 3,
        type: "notebook",
        path: relativePath,
        metadata: { nbformat: notebook.nbformat, nbformat_minor: notebook.nbformat_minor, kernel: notebook?.metadata?.kernelspec?.name || "", language: notebook?.metadata?.language_info?.name || "" },
        total_cells: notebook.cells.length,
        offset,
        cells: selected,
        next_cursor: offset + selected.length < notebook.cells.length ? String(offset + selected.length) : "",
        truncated: offset + selected.length < notebook.cells.length,
        checksum,
        safeReceipt: { kind: "notebook", path: relativePath, checksum, itemCount: selected.length, truncated: offset + selected.length < notebook.cells.length, contentStored: false },
    };
    return attachTransient(result, blocks);
}
//# sourceMappingURL=workspace-read-media.js.map