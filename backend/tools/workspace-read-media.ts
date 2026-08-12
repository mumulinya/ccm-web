import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { createCanvas } from "@napi-rs/canvas";
import { estimateTextTokens } from "../system/context-budget";
import { CC_ALIGNED_FILE_READ_MAX_TOKENS } from "./cc-tool-result-limits";
import { attachTransientModelBlocks, transientModelBlocks, type TransientModelBlock } from "../system/transient-model-content";

export type TransientWorkspaceBlock = TransientModelBlock;

const IMAGE_INPUT_LIMIT = 12 * 1024 * 1024;
const IMAGE_TARGET_BYTES = Math.floor(3.75 * 1024 * 1024);
const IMAGE_MAX_EDGE = 2000;
const PDF_INPUT_LIMIT = 25 * 1024 * 1024;
const PDF_INLINE_PAGE_LIMIT = 10;
const PDF_RANGE_PAGE_LIMIT = 20;
const NOTEBOOK_INPUT_LIMIT = 25 * 1024 * 1024;

function hash(value: Buffer | string | object) {
  return crypto.createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function attachTransient<T extends object>(value: T, blocks: TransientWorkspaceBlock[]) {
  return attachTransientModelBlocks(value, blocks);
}

export function transientWorkspaceBlocks(value: any): TransientWorkspaceBlock[] {
  return transientModelBlocks(value);
}

function imageMime(extension: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function boundedImage(file: string) {
  const original = await fs.promises.readFile(file);
  if (original.length > IMAGE_INPUT_LIMIT) throw new Error("图片超过12MB安全读取上限");
  const extension = path.extname(file).toLowerCase();
  const metadata = await sharp(original, { animated: extension === ".gif" }).metadata();
  let output: Buffer = Buffer.from(original);
  let mimeType = imageMime(extension);
  const needsResize = Number(metadata.width || 0) > IMAGE_MAX_EDGE || Number(metadata.height || 0) > IMAGE_MAX_EDGE || original.length > IMAGE_TARGET_BYTES;
  if (needsResize) {
    let quality = 88;
    do {
      output = await sharp(original, { animated: false })
        .rotate()
        .resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      mimeType = "image/jpeg";
      quality -= 10;
    } while (output.length > IMAGE_TARGET_BYTES && quality >= 48);
  }
  if (output.length > IMAGE_TARGET_BYTES) throw new Error("图片压缩后仍超过视觉模型安全容量");
  const display = await sharp(output).metadata();
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

export async function readWorkspaceImage(file: string, relativePath: string) {
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

function parsePageRange(value: any, totalPages: number) {
  const raw = String(value || "").trim();
  if (!raw) {
    if (totalPages > PDF_INLINE_PAGE_LIMIT) throw new Error(`PDF共${totalPages}页，请使用pages指定范围；单次最多${PDF_RANGE_PAGE_LIMIT}页`);
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const match = raw.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error("PDF页码格式无效，请使用1-5、3或10-20");
  const first = Number(match[1]);
  const last = Number(match[2] || match[1]);
  if (first < 1 || last < first || last > totalPages) throw new Error(`PDF页码超出范围，文件共${totalPages}页`);
  if (last - first + 1 > PDF_RANGE_PAGE_LIMIT) throw new Error(`PDF单次最多读取${PDF_RANGE_PAGE_LIMIT}页`);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

async function loadPdfJs() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
  return dynamicImport("pdfjs-dist/legacy/build/pdf.mjs");
}

export async function readWorkspacePdf(file: string, relativePath: string, pagesValue: any) {
  const source = await fs.promises.readFile(file);
  if (source.length > PDF_INPUT_LIMIT) throw new Error("PDF超过25MB安全读取上限");
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(source), disableWorker: true, isEvalSupported: false });
  const document = await loadingTask.promise;
  try {
    const selectedPages = parsePageRange(pagesValue, document.numPages);
    const pageRows: Array<{ page: number; text: string; imageAvailable: boolean }> = [];
    const blocks: TransientWorkspaceBlock[] = [];
    for (const pageNumber of selectedPages) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = (textContent.items || []).map((item: any) => String(item?.str || "")).join(" ").replace(/\s+/g, " ").trim();
      const viewport = page.getViewport({ scale: 1.5 });
      const maxScale = Math.min(1, IMAGE_MAX_EDGE / Math.max(viewport.width, viewport.height));
      const renderViewport = maxScale < 1 ? page.getViewport({ scale: 1.5 * maxScale }) : viewport;
      const canvas = createCanvas(Math.max(1, Math.ceil(renderViewport.width)), Math.max(1, Math.ceil(renderViewport.height)));
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context as any, viewport: renderViewport }).promise;
      let image = canvas.toBuffer("image/jpeg", 82);
      if (image.length > IMAGE_TARGET_BYTES) image = await sharp(image).resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside" }).jpeg({ quality: 68 }).toBuffer();
      blocks.push({ type: "image", mimeType: "image/jpeg", data: image, label: `${relativePath} 第${pageNumber}页` });
      pageRows.push({ page: pageNumber, text, imageAvailable: true });
    }
    const extractedText = pageRows.map(row => `# Page ${row.page}\n${row.text}`).join("\n\n");
    if (estimateTextTokens(extractedText) > CC_ALIGNED_FILE_READ_MAX_TOKENS) throw new Error("PDF选定页文字超过25000 Token，请缩小pages范围");
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
  } finally {
    await document.destroy();
  }
}

function sanitizeNotebookOutput(output: any) {
  const outputType = String(output?.output_type || "unknown");
  if (outputType === "stream") return { output_type: outputType, name: String(output?.name || ""), text: Array.isArray(output?.text) ? output.text.join("") : String(output?.text || "") };
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
  if (outputType === "error") return { output_type: outputType, ename: String(output?.ename || ""), evalue: String(output?.evalue || ""), traceback: (Array.isArray(output?.traceback) ? output.traceback : []).map(String).slice(0, 40) };
  return { output_type: outputType };
}

export async function readWorkspaceNotebook(file: string, relativePath: string, args: any) {
  const raw = await fs.promises.readFile(file);
  if (raw.length > NOTEBOOK_INPUT_LIMIT) throw new Error("Notebook超过25MB安全读取上限");
  let notebook: any;
  try { notebook = JSON.parse(raw.toString("utf-8")); } catch { throw new Error("Notebook格式无效"); }
  if (!Array.isArray(notebook?.cells)) throw new Error("Notebook缺少cells数组");
  const offset = Math.max(0, Number(args?.cell_offset || 0) || 0);
  const limit = Math.max(1, Math.min(200, Number(args?.cell_limit || notebook.cells.length || 1) || 1));
  const sourceCells = notebook.cells.slice(offset, offset + limit);
  const selected = sourceCells.map((cell: any, index: number) => ({
    index: offset + index,
    id: String(cell?.id || ""),
    cell_type: String(cell?.cell_type || "unknown"),
    execution_count: cell?.execution_count ?? null,
    source: Array.isArray(cell?.source) ? cell.source.join("") : String(cell?.source || ""),
    outputs: (Array.isArray(cell?.outputs) ? cell.outputs : []).map(sanitizeNotebookOutput),
  }));
  if (estimateTextTokens(JSON.stringify(selected)) > CC_ALIGNED_FILE_READ_MAX_TOKENS) throw new Error("Notebook选定单元格超过25000 Token，请缩小cell_limit");
  const checksum = hash(raw);
  const blocks: TransientWorkspaceBlock[] = [];
  let imageBytes = 0;
  for (let cellIndex = 0; cellIndex < sourceCells.length && blocks.length < 8; cellIndex += 1) {
    for (const output of Array.isArray(sourceCells[cellIndex]?.outputs) ? sourceCells[cellIndex].outputs : []) {
      const data = output?.data && typeof output.data === "object" ? output.data : {};
      for (const mimeType of ["image/png", "image/jpeg", "image/gif", "image/webp"] as const) {
        const encoded = Array.isArray(data[mimeType]) ? data[mimeType].join("") : String(data[mimeType] || "");
        if (!encoded || blocks.length >= 8) continue;
        let decoded: Buffer;
        try { decoded = Buffer.from(encoded, "base64"); } catch { continue; }
        if (!decoded.length || decoded.length > IMAGE_INPUT_LIMIT || imageBytes + decoded.length > 8 * 1024 * 1024) continue;
        let visual = decoded;
        let visualMime: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = mimeType;
        const metadata = await sharp(decoded, { animated: mimeType === "image/gif" }).metadata();
        if (decoded.length > IMAGE_TARGET_BYTES || Number(metadata.width || 0) > IMAGE_MAX_EDGE || Number(metadata.height || 0) > IMAGE_MAX_EDGE) {
          visual = await sharp(decoded).rotate().resize({ width: IMAGE_MAX_EDGE, height: IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
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
