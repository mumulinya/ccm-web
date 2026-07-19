// Behavior-freeze split from playwright-provider.ts (part 2/4).
import * as path from "path";
import * as fs from "fs";
import * as zlib from "zlib";
import {
  BrowserAuthenticationEvidence,
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckResult,
  BrowserEvidenceArtifact,
  BrowserCheckSpec,
  BrowserSessionLeafStepSpec,
  BrowserSessionResult,
  BrowserSessionSpec,
  BrowserStepResult,
  BrowserResourceLifecycleRecorder,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { compactText, ensureDir, hasRequiredCheck, nowIso, resolveUrl, safeSegment, validateTestAgentUrl, validateTestAgentWorkDir } from "../utils";
import { BrowserProvider, BrowserProviderContext, blockedBrowserResult } from "./provider-types";
import { browserTargetDetail, buildSemanticLocatorPlan, resolvePlaywrightLocator } from "./semantic-locator";
import { writePlaywrightAccessibilitySnapshotArtifact } from "./accessibility-snapshot-artifacts";
import { writePlaywrightFailureScreenshot } from "./failure-screenshots";
import {
  browserSessionInitialUrl,
  browserSessionScenarioMetadata,
  browserSessionSteps,
  flattenBrowserSessionSteps,
  hasMultiSessionBrowserScenario,
  isBrowserSessionComparisonStep,
  isBrowserSessionLeafStep,
  isBrowserSessionParallelStep,
  MULTI_SESSION_BROWSER_PROBE_TYPE,
  prefixBrowserSessionStep,
  validateMultiSessionBrowserScenario,
} from "./multi-session";
import { runBrowserSessionComparison } from "./session-comparison";
import { browserCheckStabilityRuns, browserStabilityGroupId, withBrowserStabilityMetadata } from "./stability-summary";
import { checksForProject } from "./shared";
import {
  BrowserSecretBinding,
  browserActionSupportsEnvironmentValue,
  browserAuthenticationEnvNames,
  browserCheckAuthenticationActions,
  browserCheckAuthenticationEnvNames,
  browserCheckHasStorageState,
  browserSessionAuthenticationActions,
  browserStorageStatePath,
  buildBrowserAuthenticationEvidence,
  loadBrowserStorageState,
  redactBrowserSensitiveText,
  resolveBrowserActionValue,
  resolveBrowserSecretBindings,
  ResolvedBrowserActionValue,
} from "./authentication";
import {
  browserCheckUsesExistingSession,
} from "./existing-session";
import { withBrowserCheckExecutionIdentity } from "./check-execution-coverage";
import {
  BrowserActionEffectObservation,
  browserActionEffectRequired,
  browserActionEffectSession,
  verifyBrowserActionEffect,
} from "./action-effects";
import {
  browserNetworkAssertionDetail,
  browserNetworkAssertionHasExpectation,
  browserNetworkAssertionIsNegative,
  browserNetworkAssertionSettleMs,
  waitForAbsentBrowserNetworkLine,
  waitForBrowserNetworkLine,
} from "./network-assertions";
import {
  browserConsoleAssertionDetail,
  browserConsoleAssertionHasExpectation,
  browserConsoleAssertionIsNegative,
  browserConsoleAssertionSettleMs,
  waitForAbsentBrowserConsoleLine,
  waitForBrowserConsoleLine,
} from "./console-assertions";
import {
  browserAccessibilityAssertionDetail,
  waitForBrowserAccessibilityAssertion,
} from "./accessibility-assertions";
import {
  browserAriaStateAssertionDetail,
  isBrowserAriaStateAssertion,
  waitForBrowserAriaStateAssertion,
} from "./aria-state-assertions";

import {
  BrowserContextRuntimeOptions,
  BrowserRuntimeSignals,
  CapturedBrowserDialog,
  CapturedBrowserDownload,
  PngPixelStats,
  clipboardExpectedText,
  cookieName,
  delay,
  optionalTableIndex,
  optionalVisualNumber,
  pngChannelCount,
  pngPaeth,
  tableColumnName,
  tableExpectedTexts,
  tableRowText,
  textOrderExpectedTexts,
} from "./playwright-provider-part-01";

function readPngPixelStats(buffer: Buffer): PngPixelStats {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) throw new Error("Invalid PNG signature.");
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;
  const idatChunks: Buffer[] = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + 4;
    if (nextOffset > buffer.length) throw new Error(`PNG chunk ${type || "(unknown)"} exceeds file length.`);
    if (!sawIhdr && type !== "IHDR") throw new Error("PNG IHDR chunk must be first.");
    if (type === "IHDR") {
      if (length !== 13) throw new Error(`PNG IHDR chunk has invalid length ${length}.`);
      width = buffer.readUInt32BE(dataOffset);
      height = buffer.readUInt32BE(dataOffset + 4);
      bitDepth = buffer[dataOffset + 8];
      colorType = buffer[dataOffset + 9];
      interlace = buffer[dataOffset + 12];
      sawIhdr = true;
    } else if (type === "IDAT") {
      sawIdat = true;
      idatChunks.push(buffer.subarray(dataOffset, dataOffset + length));
    } else if (type === "IEND") {
      sawIend = true;
      break;
    }
    offset = nextOffset;
  }
  if (!sawIhdr || !sawIdat || !sawIend) throw new Error("PNG is missing IHDR, IDAT, or IEND chunks.");
  if (width <= 0 || height <= 0) throw new Error(`PNG dimensions must be positive, got ${width}x${height}.`);
  if (bitDepth !== 8) throw new Error(`PNG visual assertion supports bit depth 8 only, got ${bitDepth}.`);
  if (interlace !== 0) throw new Error("PNG visual assertion does not support interlaced images.");
  const channels = pngChannelCount(colorType);
  if (!channels) throw new Error(`PNG visual assertion does not support color type ${colorType}.`);
  const bytesPerPixel = channels;
  const rowBytes = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const expectedBytes = (rowBytes + 1) * height;
  if (inflated.length < expectedBytes) throw new Error(`PNG pixel data is truncated: expected at least ${expectedBytes} bytes, got ${inflated.length}.`);
  let readOffset = 0;
  let previous = Buffer.alloc(rowBytes);
  const uniqueColors = new Set<string>();
  let nonTransparentPixels = 0;
  let nonWhitePixels = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[readOffset];
    readOffset += 1;
    const row = Buffer.from(inflated.subarray(readOffset, readOffset + rowBytes));
    readOffset += rowBytes;
    for (let i = 0; i < rowBytes; i += 1) {
      const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
      const up = previous[i] || 0;
      const upperLeft = i >= bytesPerPixel ? previous[i - bytesPerPixel] || 0 : 0;
      if (filter === 1) row[i] = (row[i] + left) & 0xff;
      else if (filter === 2) row[i] = (row[i] + up) & 0xff;
      else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[i] = (row[i] + pngPaeth(left, up, upperLeft)) & 0xff;
      else if (filter !== 0) throw new Error(`PNG uses unsupported filter type ${filter}.`);
    }
    for (let x = 0; x < rowBytes; x += bytesPerPixel) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;
      if (colorType === 0) {
        r = g = b = row[x];
      } else if (colorType === 2) {
        r = row[x]; g = row[x + 1]; b = row[x + 2];
      } else if (colorType === 4) {
        r = g = b = row[x]; a = row[x + 1];
      } else if (colorType === 6) {
        r = row[x]; g = row[x + 1]; b = row[x + 2]; a = row[x + 3];
      }
      uniqueColors.add(`${r},${g},${b},${a}`);
      if (a > 0) nonTransparentPixels += 1;
      if (a > 0 && !(r >= 250 && g >= 250 && b >= 250)) nonWhitePixels += 1;
    }
    previous = row;
  }
  return { width, height, uniqueColors: uniqueColors.size, nonTransparentPixels, nonWhitePixels };
}

export async function evaluateElementScreenshotNotBlank(page: any, assertion: BrowserAssertionSpec, timeout: number) {
  const locator = resolvePlaywrightLocator(page, assertion).first();
  await locator.waitFor({ state: "visible", timeout });
  const png = await locator.screenshot({ type: "png", timeout });
  const stats = readPngPixelStats(Buffer.isBuffer(png) ? png : Buffer.from(png));
  const minUniqueColors = optionalVisualNumber(assertion.minUniqueColors ?? assertion.min_unique_colors);
  const minNonWhitePixels = optionalVisualNumber(assertion.minNonWhitePixels ?? assertion.min_non_white_pixels) ?? 1;
  const ok = stats.nonWhitePixels >= minNonWhitePixels
    && (minUniqueColors === undefined || stats.uniqueColors >= minUniqueColors);
  return { ok, stats, minUniqueColors, minNonWhitePixels };
}

function textOrderHasExplicitContainer(assertion: BrowserAssertionSpec) {
  return !!(
    assertion.selector
    || assertion.locator
    || assertion.testId
    || assertion.test_id
    || assertion.dataTestId
    || assertion.data_testid
    || assertion.label
    || assertion.placeholder
    || assertion.role
    || assertion.altText
    || assertion.alt_text
    || assertion.title
  );
}

function resolveTextOrderLocator(page: any, assertion: BrowserAssertionSpec) {
  return textOrderHasExplicitContainer(assertion)
    ? resolvePlaywrightLocator(page, assertion).first()
    : page.locator("body").first();
}

function normalizeVisibleText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export async function waitForTextOrder(page: any, assertion: BrowserAssertionSpec, timeout: number) {
  const expected = textOrderExpectedTexts(assertion).map(normalizeVisibleText).filter(Boolean);
  if (expected.length < 2) throw new Error("textOrder requires at least two values in texts/values/expectedTexts.");
  const locator = resolveTextOrderLocator(page, assertion);
  await locator.waitFor({ state: "attached", timeout });
  const deadline = Date.now() + Math.max(1, timeout);
  let lastFoundCount = 0;
  let lastMissingIndex = 0;
  while (Date.now() <= deadline) {
    const text = normalizeVisibleText(await locator.innerText({ timeout: Math.min(1000, timeout) }).catch(async () => String(await locator.textContent({ timeout: Math.min(1000, timeout) }) || "")));
    let cursor = 0;
    let ok = true;
    const positions: number[] = [];
    for (let i = 0; i < expected.length; i += 1) {
      const index = text.indexOf(expected[i], cursor);
      if (index < 0) {
        ok = false;
        lastMissingIndex = i;
        break;
      }
      positions.push(index);
      cursor = index + expected[i].length;
    }
    lastFoundCount = positions.length;
    if (ok) return { ok: true, expectedCount: expected.length, positions };
    await delay(100);
  }
  return { ok: false, expectedCount: expected.length, foundCount: lastFoundCount, missingIndex: lastMissingIndex };
}

function resolvePlaywrightTableLocator(page: any, assertion: BrowserAssertionSpec) {
  const tableLocator = String(assertion.tableLocator || assertion.table_locator || assertion.tableSelector || assertion.table_selector || "").trim();
  if (tableLocator) return page.locator(tableLocator);
  const hasExplicitTarget = assertion.selector
    || assertion.locator
    || assertion.testId
    || assertion.test_id
    || assertion.dataTestId
    || assertion.data_testid
    || assertion.label
    || assertion.placeholder
    || assertion.role
    || assertion.name
    || assertion.altText
    || assertion.alt_text
    || assertion.title;
  if (hasExplicitTarget) return resolvePlaywrightLocator(page, assertion);
  return page.locator("table, [role='table'], [role='grid']").first();
}

function tableAssertionInput(assertion: BrowserAssertionSpec) {
  return {
    type: assertion.type,
    expectedTexts: tableExpectedTexts(assertion),
    rowText: tableRowText(assertion),
    rowIndex: optionalTableIndex(assertion.rowIndex, assertion.row_index),
    rowNumber: optionalTableIndex(assertion.rowNumber, assertion.row_number),
    columnName: tableColumnName(assertion),
    columnIndex: optionalTableIndex(assertion.columnIndex, assertion.column_index),
    columnNumber: optionalTableIndex(assertion.columnNumber, assertion.column_number),
    exact: assertion.exact === true,
  };
}

export async function waitForTableAssertion(page: any, assertion: BrowserAssertionSpec, timeout: number) {
  const locator = resolvePlaywrightTableLocator(page, assertion).first();
  await locator.waitFor({ state: "attached", timeout });
  const input = tableAssertionInput(assertion);
  const deadline = Date.now() + Math.max(1, timeout);
  let lastResult: any = null;
  while (Date.now() <= deadline) {
    lastResult = await locator.evaluate((root: any, current: any) => {
      const win = globalThis as any;
      const normalize = (value: any) => String(value ?? "").replace(/\s+/g, " ").trim();
      const includesOrEquals = (actual: string, expected: string, exact: boolean) => exact ? actual === expected : actual.includes(expected);
      const isRowRoot = root.matches?.("tr,[role='row']");
      const rowElements = (isRowRoot ? [root] : Array.from(root.querySelectorAll?.("tr,[role='row']") || [])) as any[];
      const rows = rowElements.map((row: any, index: number) => {
        const cellElements = Array.from(row.querySelectorAll?.("th,td,[role='cell'],[role='gridcell'],[role='columnheader'],[role='rowheader']") || []) as any[];
        const cells = cellElements.map((cell: any) => normalize(cell.innerText || cell.textContent || ""));
        const headerOnly = cellElements.length > 0 && cellElements.every((cell: any) => {
          const tag = String(cell.tagName || "").toLowerCase();
          const role = String(cell.getAttribute?.("role") || "").toLowerCase();
          return tag === "th" || role === "columnheader";
        });
        return {
          index,
          text: normalize(row.innerText || row.textContent || ""),
          cells: cells.length ? cells : [normalize(row.innerText || row.textContent || "")].filter(Boolean),
          headerOnly,
        };
      }).filter((row: any) => row.text || row.cells.length);

      if (!rows.length) {
        const rootText = normalize(root.innerText || root.textContent || "");
        return { ok: false, reason: rootText ? "No table rows were found under the target." : "Target table has no readable text.", rowCount: 0, headerCount: 0 };
      }

      const headerRow = rows.find((row: any) => row.headerOnly) || rows[0];
      const headers = headerRow?.cells || [];
      const dataRows = rows.filter((row: any) => !row.headerOnly);
      const searchableRows = dataRows.length ? dataRows : rows;
      const expectedTexts = Array.isArray(current.expectedTexts) ? current.expectedTexts.map(normalize).filter(Boolean) : [];

      const rowMatchesLocator = (row: any) => {
        if (current.rowText && !row.text.includes(normalize(current.rowText))) return false;
        return true;
      };

      if (current.type === "tableRowIncludes") {
        if (!expectedTexts.length) return { ok: false, reason: "tableRowIncludes requires text/value/texts/values/expectedTexts.", rowCount: searchableRows.length, headerCount: headers.length };
        const rowIndex = Number.isInteger(current.rowIndex) ? current.rowIndex : Number.isInteger(current.rowNumber) ? current.rowNumber - 1 : undefined;
        const candidates = Number.isInteger(rowIndex)
          ? [searchableRows[rowIndex]].filter(Boolean)
          : searchableRows.filter(rowMatchesLocator);
        if (!candidates.length) {
          return { ok: false, reason: current.rowText ? "No row matched the requested row text." : "No candidate table row was found.", rowCount: searchableRows.length, headerCount: headers.length };
        }
        const matched = candidates.find((row: any) => expectedTexts.every((expected: string) => row.text.includes(expected)));
        return matched
          ? { ok: true, rowCount: searchableRows.length, headerCount: headers.length, matchedRowIndex: matched.index, expectedTextCount: expectedTexts.length }
          : { ok: false, reason: `Candidate rows did not include all ${expectedTexts.length} expected text value(s).`, rowCount: searchableRows.length, headerCount: headers.length };
      }

      if (!expectedTexts.length) return { ok: false, reason: `${current.type} requires text/value.`, rowCount: searchableRows.length, headerCount: headers.length };
      const expected = expectedTexts[0];
      const rowIndex = Number.isInteger(current.rowIndex) ? current.rowIndex : Number.isInteger(current.rowNumber) ? current.rowNumber - 1 : undefined;
      const candidateRows = Number.isInteger(rowIndex)
        ? [searchableRows[rowIndex]].filter(Boolean)
        : current.rowText
          ? searchableRows.filter(rowMatchesLocator)
          : searchableRows.slice(0, 1);
      if (!candidateRows.length) {
        return { ok: false, reason: current.rowText ? "No row matched the requested row text." : "No candidate table row was found.", rowCount: searchableRows.length, headerCount: headers.length };
      }

      let columnIndex = Number.isInteger(current.columnIndex) ? current.columnIndex : Number.isInteger(current.columnNumber) ? current.columnNumber - 1 : undefined;
      if (!Number.isInteger(columnIndex) && current.columnName) {
        const expectedColumn = normalize(current.columnName);
        columnIndex = headers.findIndex((header: string) => includesOrEquals(header, expectedColumn, current.exact));
      }
      if (!Number.isInteger(columnIndex) || columnIndex < 0) {
        return { ok: false, reason: "No table column matched the requested column name/index.", rowCount: searchableRows.length, headerCount: headers.length };
      }

      const actuals = candidateRows.map((row: any) => normalize(row.cells[columnIndex] || ""));
      const matchedIndex = actuals.findIndex((actual: string) => current.type === "tableCellTextEquals" ? actual === expected : actual.includes(expected));
      if (matchedIndex >= 0) {
        return {
          ok: true,
          rowCount: searchableRows.length,
          headerCount: headers.length,
          matchedRowIndex: candidateRows[matchedIndex].index,
          columnIndex,
          actualLength: actuals[matchedIndex].length,
        };
      }
      return {
        ok: false,
        reason: `Cell text did not ${current.type === "tableCellTextEquals" ? "equal" : "include"} the expected value.`,
        rowCount: searchableRows.length,
        headerCount: headers.length,
        columnIndex,
        actualLengths: actuals.map((actual: string) => actual.length),
      };
    }, input);
    if (lastResult?.ok) return lastResult;
    await delay(100);
  }
  return lastResult || { ok: false, reason: "Timed out waiting for table assertion." };
}

export async function writePlaywrightPageSnapshots(
  page: any,
  artifactDir: string,
  projectName: string,
  checkName: string,
  index: number,
  secretBindings: BrowserSecretBinding[] = [],
) {
  if (!page) return [];
  const snapshotDir = ensureDir(path.join(artifactDir, "page-snapshots"));
  const base = `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}`;
  const snapshots: string[] = [];
  try {
    const html = String(await page.content?.() || "");
    if (html) {
      const htmlPath = path.join(snapshotDir, `${base}.html`);
      fs.writeFileSync(htmlPath, redactBrowserSensitiveText(html, secretBindings), "utf-8");
      snapshots.push(htmlPath);
    }
  } catch {}
  try {
    const body = page.locator?.("body");
    const text = body ? String(await body.innerText({ timeout: 1_000 }) || "") : "";
    if (text) {
      const textPath = path.join(snapshotDir, `${base}.txt`);
      fs.writeFileSync(textPath, `${redactBrowserSensitiveText(text, secretBindings)}\n`, "utf-8");
      snapshots.push(textPath);
    }
  } catch {}
  return snapshots;
}

export function writeBrowserTelemetryLogs(input: {
  artifactDir: string;
  projectName: string;
  checkName: string;
  index: number;
  consoleMessages: string[];
  dialogMessages: string[];
  popupMessages?: string[];
  networkRequests: string[];
}) {
  const telemetryDir = ensureDir(path.join(input.artifactDir, "browser-telemetry"));
  const base = `${safeSegment(input.projectName)}-${safeSegment(input.checkName)}-${input.index + 1}`;
  const consoleLogPath = path.join(telemetryDir, `${base}.console.log`);
  const dialogLogPath = path.join(telemetryDir, `${base}.dialogs.log`);
  const popupLogPath = path.join(telemetryDir, `${base}.popups.log`);
  const networkLogPath = path.join(telemetryDir, `${base}.network.log`);
  fs.writeFileSync(consoleLogPath, `${input.consoleMessages.length ? input.consoleMessages.join("\n") : "(none observed)"}\n`, "utf-8");
  fs.writeFileSync(dialogLogPath, `${input.dialogMessages.length ? input.dialogMessages.join("\n") : "(none observed)"}\n`, "utf-8");
  fs.writeFileSync(popupLogPath, `${input.popupMessages?.length ? input.popupMessages.join("\n") : "(none observed)"}\n`, "utf-8");
  fs.writeFileSync(networkLogPath, `${input.networkRequests.length ? input.networkRequests.join("\n") : "(none observed)"}\n`, "utf-8");
  return { consoleLogPath, dialogLogPath, popupLogPath, networkLogPath };
}

export function browserArtifactBase(projectName: string, checkName: string, index: number) {
  return `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}`;
}

export function browserCheckViewport(check: BrowserCheckSpec) {
  const width = Number(check.viewportWidth || check.viewport_width || check.viewport?.width || 1366);
  const height = Number(check.viewportHeight || check.viewport_height || check.viewport?.height || 900);
  const deviceScaleFactor = Number(check.deviceScaleFactor || check.device_scale_factor || 1);
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1366,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : 900,
    isMobile: check.isMobile === true || check.is_mobile === true,
    deviceScaleFactor: Number.isFinite(deviceScaleFactor) && deviceScaleFactor > 0 ? deviceScaleFactor : 1,
  };
}

export function browserCheckContextOptions(check: BrowserCheckSpec): BrowserContextRuntimeOptions {
  const userAgent = String(check.userAgent || check.user_agent || "").trim();
  const locale = String(check.locale || "").trim();
  const timezoneId = String(check.timezoneId || check.timezone_id || "").trim();
  const colorScheme = String(check.colorScheme || check.color_scheme || "").trim();
  const reducedMotion = String(check.reducedMotion || check.reduced_motion || "").trim();
  const permissions = Array.isArray(check.permissions) ? check.permissions.map(item => String(item || "").trim()).filter(Boolean) : [];
  const latitude = Number(check.geolocation?.latitude);
  const longitude = Number(check.geolocation?.longitude);
  const accuracy = Number(check.geolocation?.accuracy);
  const geolocation = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? {
        latitude,
        longitude,
        ...(Number.isFinite(accuracy) ? { accuracy } : {}),
      }
    : undefined;
  return {
    ...(userAgent ? { userAgent } : {}),
    ...(locale ? { locale } : {}),
    ...(timezoneId ? { timezoneId } : {}),
    ...(colorScheme ? { colorScheme } : {}),
    ...(reducedMotion ? { reducedMotion } : {}),
    ...(permissions.length ? { permissions } : {}),
    ...(geolocation ? { geolocation } : {}),
  };
}

export function browserContextEvidenceOptions(options: BrowserContextRuntimeOptions): BrowserCheckResult["contextOptions"] {
  return {
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    ...(options.locale ? { locale: options.locale } : {}),
    ...(options.timezoneId ? { timezoneId: options.timezoneId } : {}),
    ...(options.colorScheme ? { colorScheme: options.colorScheme } : {}),
    ...(options.reducedMotion ? { reducedMotion: options.reducedMotion } : {}),
    ...(options.permissions?.length ? { permissions: options.permissions } : {}),
    ...(options.geolocation ? { geolocation: options.geolocation } : {}),
    ...(options.storageState ? { storageState: options.storageState } : {}),
  };
}

export function browserContextLaunchOptions(options: BrowserContextRuntimeOptions) {
  return {
    ...(options.userAgent ? { userAgent: options.userAgent } : {}),
    ...(options.locale ? { locale: options.locale } : {}),
    ...(options.timezoneId ? { timezoneId: options.timezoneId } : {}),
    ...(options.colorScheme ? { colorScheme: options.colorScheme } : {}),
    ...(options.reducedMotion ? { reducedMotion: options.reducedMotion } : {}),
    ...(options.geolocation ? { geolocation: options.geolocation } : {}),
    ...(options.storageStatePath ? { storageState: options.storageStatePath } : {}),
  };
}

function browserEvidenceArtifact(type: BrowserEvidenceArtifact["type"], title: string, artifactPath: string, source: string, mediaType = ""): BrowserEvidenceArtifact | null {
  if (!artifactPath || !fs.existsSync(artifactPath)) return null;
  return {
    type,
    title,
    path: artifactPath,
    source,
    ...(mediaType ? { mediaType } : {}),
  };
}

export function browserDialogLogLine(record: CapturedBrowserDialog) {
  const parts = [
    `dialog ${record.type || "(unknown)"}`,
    `message=${JSON.stringify(compactText(record.message || "", 500))}`,
    record.defaultValue !== undefined ? `defaultValue=${JSON.stringify(compactText(record.defaultValue, 200))}` : "",
    `accepted=${record.accepted ? "yes" : "no"}`,
    record.error ? `error=${JSON.stringify(compactText(record.error, 500))}` : "",
    `at=${record.occurredAt}`,
  ].filter(Boolean);
  return parts.join(" ");
}

function mediaTypeForDownload(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase();
  if (ext === ".csv") return "text/csv";
  if (ext === ".txt") return "text/plain";
  if (ext === ".json") return "application/json";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".zip") return "application/zip";
  if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

export async function savePlaywrightDownload(download: any, downloadDir: string, artifactBase: string, index: number): Promise<CapturedBrowserDownload> {
  const suggestedFilename = String(download.suggestedFilename?.() || `download-${index + 1}.bin`);
  const downloadUrl = String(download.url?.() || "");
  const fileName = `${artifactBase}-download-${index + 1}-${safeSegment(suggestedFilename) || "download.bin"}`;
  const targetPath = path.join(downloadDir, fileName);
  try {
    await download.saveAs(targetPath);
    const failure = String(await download.failure?.() || "");
    const sizeBytes = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : 0;
    return {
      suggestedFilename,
      path: targetPath,
      url: downloadUrl,
      ...(failure ? { failure } : {}),
      sizeBytes,
      mediaType: mediaTypeForDownload(suggestedFilename),
    };
  } catch (error: any) {
    return {
      suggestedFilename,
      path: targetPath,
      url: downloadUrl,
      failure: error.message || String(error),
      mediaType: mediaTypeForDownload(suggestedFilename),
    };
  }
}

function downloadFileName(assertion: BrowserAssertionSpec) {
  return String(assertion.fileName || assertion.file_name || assertion.filename || "").trim();
}

function downloadFileNameIncludes(assertion: BrowserAssertionSpec) {
  return String(assertion.fileNameIncludes || assertion.file_name_includes || assertion.filenameIncludes || assertion.filename_includes || "").trim();
}

function downloadContentIncludes(assertion: BrowserAssertionSpec) {
  return String(assertion.contentIncludes || assertion.content_includes || "").trim();
}

function downloadMinBytes(assertion: BrowserAssertionSpec) {
  const raw = assertion.minBytes ?? assertion.min_bytes;
  const value = raw === undefined || raw === null ? 0 : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function downloadedFileDetail(assertion: BrowserAssertionSpec) {
  const parts = [
    downloadFileName(assertion) ? `filename=${downloadFileName(assertion)}` : "",
    downloadFileNameIncludes(assertion) ? `filenameIncludes=${downloadFileNameIncludes(assertion)}` : "",
    downloadContentIncludes(assertion) ? `contentIncludes=${downloadContentIncludes(assertion)}` : "",
    downloadMinBytes(assertion) ? `minBytes=${downloadMinBytes(assertion)}` : "",
  ].filter(Boolean);
  return parts.join("; ") || "downloaded file";
}

function downloadedFileMatch(record: CapturedBrowserDownload, assertion: BrowserAssertionSpec) {
  if (record.failure) return { ok: false, reason: `download failed: ${record.failure}` };
  if (!record.path || !fs.existsSync(record.path)) return { ok: false, reason: "download file was not saved" };
  const expectedName = downloadFileName(assertion);
  if (expectedName && record.suggestedFilename !== expectedName) {
    return { ok: false, reason: `filename ${record.suggestedFilename} did not equal ${expectedName}` };
  }
  const expectedNameIncludes = downloadFileNameIncludes(assertion);
  if (expectedNameIncludes && !record.suggestedFilename.includes(expectedNameIncludes)) {
    return { ok: false, reason: `filename ${record.suggestedFilename} did not include ${expectedNameIncludes}` };
  }
  const minBytes = downloadMinBytes(assertion);
  const sizeBytes = record.sizeBytes ?? fs.statSync(record.path).size;
  if (minBytes && sizeBytes < minBytes) return { ok: false, reason: `download size ${sizeBytes} was smaller than ${minBytes}` };
  const expectedContent = downloadContentIncludes(assertion);
  if (expectedContent) {
    const content = fs.readFileSync(record.path).toString("utf-8");
    if (!content.includes(expectedContent)) return { ok: false, reason: `download content did not include ${expectedContent}` };
  }
  return { ok: true, reason: record.path };
}

export async function waitForDownloadedFile(signals: BrowserRuntimeSignals, assertion: BrowserAssertionSpec, timeout: number) {
  const deadline = Date.now() + timeout;
  let lastReasons: string[] = [];
  while (Date.now() <= deadline) {
    for (const record of signals.downloads) {
      const match = downloadedFileMatch(record, assertion);
      if (match.ok) return record;
    }
    lastReasons = signals.downloads.map(record => `${record.suggestedFilename || "(download)"}: ${downloadedFileMatch(record, assertion).reason}`);
    await delay(100);
  }
  const pending = Math.max(0, signals.downloadPromises.length - signals.downloads.length);
  const observed = signals.downloads.length ? ` Observed: ${lastReasons.join(" | ")}` : " No downloads were observed.";
  throw new Error(`Expected downloaded file matching ${downloadedFileDetail(assertion)}.${pending > 0 ? ` Pending downloads: ${pending}.` : ""}${observed}`);
}

export function downloadArtifacts(downloads: CapturedBrowserDownload[]): BrowserEvidenceArtifact[] {
  return downloads
    .filter(download => download.path && fs.existsSync(download.path))
    .map(download => ({
      type: "download" as const,
      title: `Download: ${download.suggestedFilename}`,
      path: download.path,
      source: "playwright:download",
      ...(download.mediaType ? { mediaType: download.mediaType } : {}),
    }));
}

function uploadFilePath(action: BrowserActionSpec) {
  return String(action.filePath || action.file_path || action.path || "").trim();
}

function uploadFileName(action: BrowserActionSpec | NonNullable<BrowserActionSpec["files"]>[number]) {
  return String(action.fileName || action.file_name || action.filename || "upload.txt").trim();
}

function uploadMediaType(action: BrowserActionSpec | NonNullable<BrowserActionSpec["files"]>[number]) {
  return String(action.mediaType || action.media_type || "text/plain").trim();
}

function uploadFileContent(action: BrowserActionSpec | NonNullable<BrowserActionSpec["files"]>[number]) {
  if (action.fileContent !== undefined) return String(action.fileContent);
  if (action.file_content !== undefined) return String(action.file_content);
  if (action.content !== undefined) return String(action.content);
  return "";
}

export function uploadFileActionDetail(action: BrowserActionSpec) {
  const target = browserTargetDetail(action);
  const filePath = uploadFilePath(action);
  const fileNames = uploadFileItems(action).map(item => {
    const itemPath = String(item.filePath || item.file_path || item.path || "").trim();
    return itemPath ? path.basename(itemPath) : uploadFileName(item);
  });
  const fallback = filePath ? path.basename(filePath) : uploadFileName(action);
  return `${target || "file input"}; file=${fileNames.length ? fileNames.join(", ") : fallback}`;
}

function uploadFileItems(action: BrowserActionSpec): Array<NonNullable<BrowserActionSpec["files"]>[number]> {
  const filePaths = Array.isArray(action.filePaths) && action.filePaths.length ? action.filePaths : Array.isArray(action.file_paths) ? action.file_paths : [];
  const files = Array.isArray(action.files) ? action.files : [];
  if (files.length || filePaths.length) {
    return [
      ...filePaths.map(filePath => ({ filePath, file_path: filePath, path: filePath })),
      ...files,
    ];
  }
  return [action];
}

function uploadFilePayloadForItem(project: NormalizedTestAgentProjectTarget, item: NonNullable<BrowserActionSpec["files"]>[number]) {
  const filePath = String(item.filePath || item.file_path || item.path || "").trim();
  if (filePath) {
    const workSafety = validateTestAgentWorkDir(project.workDir || process.cwd());
    if (!workSafety.valid) throw new Error(workSafety.error || "workDir is invalid for uploadFile");
    const root = workSafety.resolved;
    const resolved = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(root, filePath);
    let real = resolved;
    try { real = fs.realpathSync(resolved); } catch { real = resolved; }
    const relative = path.relative(root, real);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Upload file is outside workDir: ${resolved}`);
    }
    if (!fs.existsSync(real) || !fs.statSync(real).isFile()) throw new Error(`Upload file does not exist: ${resolved}`);
    return real;
  }
  const content = uploadFileContent(item);
  if (content === "" && item.fileContent === undefined && item.file_content === undefined && item.content === undefined) {
    throw new Error("uploadFile requires filePath/file_path/path or fileContent/file_content/content.");
  }
  return {
    name: uploadFileName(item),
    mimeType: uploadMediaType(item),
    buffer: Buffer.from(content, "utf-8"),
  };
}

export function uploadFilePayload(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec) {
  const payloads = uploadFileItems(action).map(item => uploadFilePayloadForItem(project, item));
  return payloads.length === 1 ? payloads[0] : payloads;
}

export function originOf(rawUrl: string) {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return "";
  }
}

function pathnameOf(rawUrl: string) {
  try {
    return new URL(rawUrl).pathname.toLowerCase();
  } catch {
    return "";
  }
}

export function responseResourceType(response: any) {
  try {
    return String(response.request?.()?.resourceType?.() || "");
  } catch {
    return "";
  }
}

function isIgnorableHttpResourceError(responseUrl: string, resourceType: string) {
  const pathname = pathnameOf(responseUrl);
  if (pathname === "/favicon.ico" || pathname.endsWith("/favicon.ico")) return true;
  if (resourceType === "other" && pathname.endsWith(".map")) return true;
  return false;
}

export function playwrightNetworkErrorForResponse(input: {
  status: number;
  responseUrl: string;
  resourceType: string;
  monitoredOrigins: Set<string>;
  failOnHttpResourceError: boolean;
}) {
  const kind = input.resourceType || "resource";
  if (input.status >= 500) return `http_error ${input.status} ${kind} ${input.responseUrl}`;
  if (input.status < 400 || !input.failOnHttpResourceError) return "";

  const origin = originOf(input.responseUrl);
  if (!origin || !input.monitoredOrigins.has(origin)) return "";
  if (isIgnorableHttpResourceError(input.responseUrl, input.resourceType)) return "";
  return `http_resource_error ${input.status} ${kind} ${input.responseUrl}`;
}

export async function grantClipboardPermissions(browserContext: any, origins: Set<string>) {
  if (!browserContext?.grantPermissions) return;
  const permissions = ["clipboard-read", "clipboard-write"];
  const originList = Array.from(origins).filter(Boolean);
  if (!originList.length) {
    try { await browserContext.grantPermissions(permissions); } catch {}
    return;
  }
  for (const origin of originList) {
    try { await browserContext.grantPermissions(permissions, { origin }); } catch {}
  }
}

export async function grantBrowserContextPermissions(browserContext: any, origins: Set<string>, permissions: string[]) {
  if (!browserContext?.grantPermissions || !permissions.length) return;
  const originList = Array.from(origins).filter(Boolean);
  if (!originList.length) {
    try { await browserContext.grantPermissions(permissions); } catch {}
    return;
  }
  for (const origin of originList) {
    try { await browserContext.grantPermissions(permissions, { origin }); } catch {}
  }
}

function compactNetworkPayload(value: any, max = 1000) {
  return compactText(value, max).replace(/\s+/g, " ").trim();
}

function redactRequestHeaders(headers: Record<string, any>) {
  const redacted: Record<string, string> = {};
  const sensitive = /^(authorization|cookie|set-cookie|x-api-key|x-auth-token|proxy-authorization)$/i;
  for (const [key, value] of Object.entries(headers || {})) {
    const name = String(key || "").toLowerCase();
    redacted[name] = sensitive.test(name) ? "[redacted]" : compactNetworkPayload(value, 500);
  }
  return redacted;
}

export function requestDetailsLine(request: any, secretBindings: BrowserSecretBinding[] = []) {
  const method = request.method?.() || "GET";
  const requestUrl = request.url?.() || "";
  let headers: Record<string, any> = {};
  let body = "";
  try { headers = request.headers?.() || {}; } catch {}
  try { body = request.postData?.() || ""; } catch {}
  const headersText = JSON.stringify(redactRequestHeaders(headers));
  return redactBrowserSensitiveText(
    `request_details ${method} ${requestUrl} headers=${headersText}${body ? ` body=${compactNetworkPayload(body, 2000)}` : ""}`,
    secretBindings,
  );
}

export async function installPlaywrightNetworkSafetyBoundary(
  browserContext: any,
  page: any,
  onBlocked: (event: { url: string; error: string }) => void = () => {},
) {
  if (browserContext?.newCDPSession && page) {
    const session = await browserContext.newCDPSession(page);
    session.on("Fetch.requestPaused", (event: any) => {
      void (async () => {
        const requestUrl = String(event?.request?.url || "");
        const safety = validateTestAgentUrl(requestUrl);
        if (!safety.valid) {
          try { onBlocked({ url: requestUrl, error: safety.error || "unsafe browser request URL" }); } catch {}
          await session.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" });
          return;
        }
        await session.send("Fetch.continueRequest", { requestId: event.requestId });
      })().catch(async () => {
        try { await session.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" }); } catch {}
      });
    });
    await session.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
    return true;
  }
  if (!browserContext?.route) return false;
  await browserContext.route("**/*", async (route: any) => {
    const requestUrl = String(route.request?.()?.url?.() || "");
    if (/^(?:about|blob|data):/i.test(requestUrl)) {
      await route.continue();
      return;
    }
    const safety = validateTestAgentUrl(requestUrl);
    if (safety.valid) {
      await route.continue();
      return;
    }
    onBlocked({ url: requestUrl, error: safety.error || "unsafe browser request URL" });
    await route.abort("blockedbyclient");
  });
  return true;
}

function shouldCaptureResponseBody(resourceType: string, headers: Record<string, any>) {
  const contentType = String(headers["content-type"] || headers["Content-Type"] || "").toLowerCase();
  return resourceType === "fetch"
    || resourceType === "xhr"
    || contentType.includes("application/json")
    || contentType.startsWith("text/");
}

export async function responseDetailsLine(
  response: any,
  status: number,
  resourceType: string,
  responseUrl: string,
  secretBindings: BrowserSecretBinding[] = [],
) {
  let headers: Record<string, any> = {};
  let body = "";
  try { headers = response.headers?.() || {}; } catch {}
  if (shouldCaptureResponseBody(resourceType, headers)) {
    try { body = await response.text(); } catch {}
  }
  const headersText = JSON.stringify(redactRequestHeaders(headers));
  return redactBrowserSensitiveText(
    `response_details ${status} ${resourceType || "unknown"} ${responseUrl} headers=${headersText}${body ? ` body=${compactNetworkPayload(body, 4000)}` : ""}`,
    secretBindings,
  );
}

export async function finalizePlaywrightBrowserArtifacts(input: {
  browserContext: any;
  page: any;
  traceStarted: boolean;
  tracePath: string;
  harPath: string;
  collectVideo: boolean;
  lifecycle?: BrowserResourceLifecycleRecorder;
  lifecycleResourceId?: string;
}) {
  const artifacts: BrowserEvidenceArtifact[] = [];
  let video: any = null;
  try { video = input.collectVideo ? input.page?.video?.() : null; } catch {}
  if (input.traceStarted) {
    try { await input.browserContext?.tracing?.stop?.({ path: input.tracePath }); } catch {}
  }
  try {
    await input.browserContext?.close?.();
    if (input.lifecycleResourceId) input.lifecycle?.released(input.lifecycleResourceId);
  } catch (error: any) {
    if (input.lifecycleResourceId) input.lifecycle?.cleanupFailed(input.lifecycleResourceId, error.message || String(error));
  }
  const trace = browserEvidenceArtifact("trace", "Playwright trace", input.tracePath, "playwright:tracing", "application/zip");
  const har = browserEvidenceArtifact("har", "Playwright HAR", input.harPath, "playwright:recordHar", "application/json");
  if (trace) artifacts.push(trace);
  if (har) artifacts.push(har);
  if (video) {
    try {
      const videoPath = await video.path();
      const videoArtifact = browserEvidenceArtifact("video", "Playwright video", videoPath, "playwright:recordVideo", "video/webm");
      if (videoArtifact) artifacts.push(videoArtifact);
    } catch {}
  }
  return artifacts;
}

export function dragDestinationTarget(action: BrowserActionSpec): Partial<BrowserActionSpec> {
  return {
    selector: action.destinationSelector || action.destination_selector || action.destinationLocator || action.destination_locator,
    locator: action.destinationLocator || action.destination_locator || action.destinationSelector || action.destination_selector,
    testId: action.destinationTestId || action.destination_test_id || action.destinationDataTestId || action.destination_data_testid,
    test_id: action.destination_test_id || action.destinationTestId || action.destinationDataTestId || action.destination_data_testid,
    dataTestId: action.destinationDataTestId || action.destination_data_testid || action.destinationTestId || action.destination_test_id,
    data_testid: action.destination_data_testid || action.destinationDataTestId || action.destinationTestId || action.destination_test_id,
    label: action.destinationLabel || action.destination_label,
    placeholder: action.destinationPlaceholder || action.destination_placeholder,
    role: action.destinationRole || action.destination_role,
    name: action.destinationName || action.destination_name || action.destinationText || action.destination_text,
    text: action.destinationText || action.destination_text,
    altText: action.destinationAltText || action.destination_alt_text,
    alt_text: action.destination_alt_text || action.destinationAltText,
    title: action.destinationTitle || action.destination_title,
    exact: action.destinationExact === undefined && action.destination_exact === undefined ? action.exact : action.destinationExact !== false && action.destination_exact !== false,
  };
}

export function dragActionDetail(action: BrowserActionSpec) {
  const destination = dragDestinationTarget(action);
  return `${browserTargetDetail(action) || "source"} -> ${browserTargetDetail(destination) || "destination"}`;
}

export function resolvedValueDetail(resolved?: ResolvedBrowserActionValue) {
  if (!resolved?.provided) return "";
  return resolved.source === "environment"
    ? `value source=env:${resolved.envName}; value length=${resolved.value.length}`
    : `value length=${resolved.value.length}`;
}

export function clipboardActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue) {
  const value = resolved?.provided ? resolved.value : clipboardExpectedText(action);
  const source = resolvedValueDetail(resolved);
  return source || (value ? `clipboard text length=${value.length}` : "clipboard text");
}

function cookieActionName(action: BrowserActionSpec) {
  return String(action.key || "").trim();
}

function cookieActionNames(action: BrowserActionSpec) {
  const names = Array.isArray(action.keys) ? action.keys.map(name => String(name || "").trim()).filter(Boolean) : [];
  const single = cookieActionName(action);
  return names.length ? names : single ? [single] : [];
}

function cookieActionValue(action: BrowserActionSpec) {
  return String(action.value ?? action.text ?? action.content ?? "");
}

function cookieActionHasValue(action: BrowserActionSpec) {
  return action.value !== undefined || action.text !== undefined || action.content !== undefined;
}

function cookieActionPath(action: BrowserActionSpec) {
  return String(action.cookiePath || action.cookie_path || "/").trim() || "/";
}

function cookieActionSameSite(action: BrowserActionSpec) {
  const raw = String(action.sameSite || action.same_site || "").trim().toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "lax") return "Lax";
  if (raw === "none") return "None";
  return undefined;
}

function cookieActionBoolean(value: any) {
  return value === undefined ? undefined : value === true || String(value).toLowerCase() === "true";
}

function cookieActionUrl(page: any, project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec) {
  const currentUrl = String(page?.url?.() || "");
  const rawUrl = action.url || (currentUrl && currentUrl !== "about:blank" ? currentUrl : "") || project.targetUrl;
  return resolveUrl(project.targetUrl, rawUrl);
}

export function cookieActionDetail(action: BrowserActionSpec, resolved?: ResolvedBrowserActionValue) {
  const names = cookieActionNames(action);
  if (action.type === "clearCookies") {
    return `${names.length ? `cookie count=${names.length}` : "all cookies"}${action.domain ? `; domain=${action.domain}` : ""}`;
  }
  const valueLength = resolved?.provided ? resolved.value.length : cookieActionValue(action).length;
  const source = resolved?.source === "environment" ? `; value source=env:${resolved.envName}` : "";
  return `cookie=${cookieActionName(action) || "(missing)"}; value length=${valueLength}${source}${action.domain ? `; domain=${action.domain}` : ""}`;
}

export function buildPlaywrightCookie(
  page: any,
  project: NormalizedTestAgentProjectTarget,
  action: BrowserActionSpec,
  resolved?: ResolvedBrowserActionValue,
) {
  const name = cookieActionName(action);
  if (!name) throw new Error("setCookie requires key/cookieName/name.");
  if (!resolved?.provided && !cookieActionHasValue(action)) throw new Error("setCookie requires value/text/content or valueEnv.");
  const cookie: Record<string, any> = {
    name,
    value: resolved?.provided ? resolved.value : cookieActionValue(action),
  };
  const domain = String(action.domain || "").trim();
  if (domain) {
    cookie.domain = domain;
    cookie.path = cookieActionPath(action);
  } else {
    cookie.url = cookieActionUrl(page, project, action);
    if (action.cookiePath || action.cookie_path) cookie.path = cookieActionPath(action);
  }
  const expires = Number(action.expires);
  if (Number.isFinite(expires)) cookie.expires = expires;
  const httpOnly = cookieActionBoolean(action.httpOnly ?? action.http_only);
  if (httpOnly !== undefined) cookie.httpOnly = httpOnly;
  const secure = cookieActionBoolean(action.secure);
  if (secure !== undefined) cookie.secure = secure;
  const sameSite = cookieActionSameSite(action);
  if (sameSite) cookie.sameSite = sameSite;
  return cookie;
}

function sanitizePlaywrightCookie(cookie: any) {
  const sanitized: Record<string, any> = {
    name: String(cookie.name || ""),
    value: String(cookie.value || ""),
    domain: cookie.domain,
    path: cookie.path || "/",
  };
  if (cookie.expires !== undefined) sanitized.expires = cookie.expires;
  if (cookie.httpOnly !== undefined) sanitized.httpOnly = cookie.httpOnly;
  if (cookie.secure !== undefined) sanitized.secure = cookie.secure;
  if (cookie.sameSite !== undefined) sanitized.sameSite = cookie.sameSite;
  return sanitized.name && sanitized.domain ? sanitized : null;
}

export async function clearBrowserCookies(page: any, action: BrowserActionSpec) {
  const names = new Set(cookieActionNames(action));
  const browserContext = page.context();
  if (!names.size) {
    await browserContext.clearCookies();
    return;
  }
  const existing = await browserContext.cookies();
  const kept = existing
    .filter((cookie: any) => cookie && !names.has(String(cookie.name || "")))
    .map(sanitizePlaywrightCookie)
    .filter(Boolean);
  await browserContext.clearCookies();
  if (kept.length) await browserContext.addCookies(kept);
}

export function storageActionValue(action: BrowserActionSpec) {
  return String(action.value ?? action.text ?? action.content ?? "");
}
