import * as path from "path";
import { buildAdversarialBrowserProbeChecks } from "./browser-probe-templates";
import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  HttpAssertionSpec,
  HttpCheckSpec,
  NormalizedTestAgentProjectTarget,
  NormalizedTestAgentWorkOrder,
  TestAgentOptions,
  TestAgentProjectTarget,
  TestAgentWorkOrder,
  WorkOrderIssue,
} from "./types";
import { asArray, defaultArtifactDir, makeRunId, resolveWorkDir, stringifyEnv } from "./utils";

const DEFAULT_OPTIONS: Required<TestAgentOptions> = {
  artifactDir: "",
  commandTimeoutMs: 120_000,
  browserTimeoutMs: 60_000,
  httpTimeoutMs: 15_000,
  startupTimeoutMs: 30_000,
  maxOutputChars: 16_000,
  maxHttpResourceChecks: 12,
  failOnConsoleError: true,
  failOnHttpResourceError: true,
  verificationOnly: true,
  browserProvider: "auto",
  autoDiscoverVerificationCommands: true,
  collectBrowserArtifacts: true,
  collectBrowserVideo: false,
};

function text(value: any) {
  return String(value || "").trim();
}

const BROWSER_ACTION_TYPES = new Set([
  "goto",
  "click",
  "doubleClick",
  "rightClick",
  "fill",
  "selectOption",
  "check",
  "uncheck",
  "uploadFile",
  "dragTo",
  "setClipboard",
  "setCookie",
  "clearCookies",
  "setLocalStorage",
  "setSessionStorage",
  "clearStorage",
  "setOffline",
  "setOnline",
  "hover",
  "focus",
  "typeText",
  "press",
  "scroll",
  "openApplication",
  "requestAccess",
  "reload",
  "goBack",
  "goForward",
  "waitForSelector",
  "waitForText",
  "waitForUrl",
  "waitForTimeout",
  "evaluate",
]);

const BROWSER_ACTION_ALIASES: Record<string, BrowserActionSpec["type"]> = {
  navigate: "goto",
  navigation: "goto",
  open: "goto",
  double_click: "doubleClick",
  doubleclick: "doubleClick",
  dblclick: "doubleClick",
  dbl_click: "doubleClick",
  right_click: "rightClick",
  context_click: "rightClick",
  context_menu: "rightClick",
  rightclick: "rightClick",
  type: "fill",
  input: "fill",
  enter_text: "fill",
  select_option: "selectOption",
  upload: "uploadFile",
  upload_file: "uploadFile",
  attach_file: "uploadFile",
  set_input_files: "uploadFile",
  file_upload: "uploadFile",
  drag: "dragTo",
  drag_to: "dragTo",
  drag_and_drop: "dragTo",
  drop: "dragTo",
  move_to: "dragTo",
  set_clipboard: "setClipboard",
  write_clipboard: "setClipboard",
  clipboard_set: "setClipboard",
  clipboard_write: "setClipboard",
  copy_to_clipboard: "setClipboard",
  set_cookie: "setCookie",
  cookie_set: "setCookie",
  write_cookie: "setCookie",
  seed_cookie: "setCookie",
  clear_cookie: "clearCookies",
  clear_cookies: "clearCookies",
  clear_browser_cookies: "clearCookies",
  remove_cookie: "clearCookies",
  remove_cookies: "clearCookies",
  delete_cookie: "clearCookies",
  delete_cookies: "clearCookies",
  set_local_storage: "setLocalStorage",
  local_storage_set: "setLocalStorage",
  write_local_storage: "setLocalStorage",
  seed_local_storage: "setLocalStorage",
  set_session_storage: "setSessionStorage",
  session_storage_set: "setSessionStorage",
  write_session_storage: "setSessionStorage",
  seed_session_storage: "setSessionStorage",
  clear_storage: "clearStorage",
  clear_browser_storage: "clearStorage",
  clear_local_storage: "clearStorage",
  remove_local_storage: "clearStorage",
  delete_local_storage: "clearStorage",
  clear_session_storage: "clearStorage",
  remove_session_storage: "clearStorage",
  delete_session_storage: "clearStorage",
  set_offline: "setOffline",
  go_offline: "setOffline",
  browser_offline: "setOffline",
  network_offline: "setOffline",
  offline_mode: "setOffline",
  set_online: "setOnline",
  go_online: "setOnline",
  browser_online: "setOnline",
  network_online: "setOnline",
  online_mode: "setOnline",
  focus_element: "focus",
  set_focus: "focus",
  focus_field: "focus",
  type_text: "typeText",
  type_keys: "typeText",
  type_chars: "typeText",
  keyboard_type: "typeText",
  keyboard_input: "typeText",
  press_text: "typeText",
  scroll_down: "scroll",
  scroll_up: "scroll",
  scroll_left: "scroll",
  scroll_right: "scroll",
  wheel: "scroll",
  mouse_wheel: "scroll",
  press_key: "press",
  key: "press",
  hotkey: "press",
  shortcut: "press",
  keyboard_shortcut: "press",
  key_combo: "press",
  key_combination: "press",
  wait: "waitForTimeout",
  wait_for_timeout: "waitForTimeout",
  wait_for_selector: "waitForSelector",
  wait_for_text: "waitForText",
  wait_for_url: "waitForUrl",
  wait_for_navigation: "waitForUrl",
  wait_for_route: "waitForUrl",
  open_application: "openApplication",
  request_access: "requestAccess",
  refresh: "reload",
  reload_page: "reload",
  go_back: "goBack",
  back: "goBack",
  go_forward: "goForward",
  forward: "goForward",
};

const BROWSER_ASSERTION_TYPES = new Set([
  "visible",
  "notVisible",
  "focused",
  "notFocused",
  "enabled",
  "disabled",
  "checked",
  "notChecked",
  "selectedValue",
  "selectedTextIncludes",
  "inputValueEquals",
  "inputValueIncludes",
  "attributeEquals",
  "attributeIncludes",
  "computedStyleEquals",
  "computedStyleIncludes",
  "elementCountEquals",
  "elementCountAtLeast",
  "elementCountAtMost",
  "dialogAppeared",
  "dialogMessageIncludes",
  "dialogTypeEquals",
  "popupOpened",
  "popupUrlIncludes",
  "popupTextIncludes",
  "popupTitleIncludes",
  "tableRowIncludes",
  "tableCellTextIncludes",
  "tableCellTextEquals",
  "clipboardTextEquals",
  "clipboardTextIncludes",
  "elementScreenshotNotBlank",
  "textOrder",
  "text",
  "urlEquals",
  "urlIncludes",
  "urlNotIncludes",
  "titleEquals",
  "titleIncludes",
  "titleNotIncludes",
  "elementTextIncludes",
  "accessibleNameEquals",
  "accessibleNameIncludes",
  "accessibleDescriptionEquals",
  "accessibleDescriptionIncludes",
  "ariaSnapshotIncludes",
  "inViewport",
  "pageNotBlank",
  "noHorizontalOverflow",
  "onlineState",
  "browserOnline",
  "browserOffline",
  "cookieExists",
  "cookieValueIncludes",
  "networkNoErrors",
  "networkRequest",
  "networkRequestIncludes",
  "networkRequestNot",
  "networkRequestNotIncludes",
  "networkResponse",
  "networkResponseIncludes",
  "networkResponseNot",
  "networkResponseNotIncludes",
  "downloadedFile",
  "consoleIncludes",
  "consoleNotIncludes",
  "consoleNoErrors",
  "consoleNoWarnings",
  "jsTruthy",
  "jsEquals",
  "localStorageEquals",
  "localStorageIncludes",
  "sessionStorageEquals",
  "sessionStorageIncludes",
]);

const BROWSER_ASSERTION_ALIASES: Record<string, BrowserAssertionSpec["type"]> = {
  hidden: "notVisible",
  not_visible: "notVisible",
  focused: "focused",
  has_focus: "focused",
  is_focused: "focused",
  not_focused: "notFocused",
  blurred: "notFocused",
  does_not_have_focus: "notFocused",
  is_enabled: "enabled",
  enabled: "enabled",
  can_click: "enabled",
  clickable: "enabled",
  is_disabled: "disabled",
  disabled: "disabled",
  not_enabled: "disabled",
  cannot_click: "disabled",
  is_checked: "checked",
  checked: "checked",
  checkbox_checked: "checked",
  is_not_checked: "notChecked",
  not_checked: "notChecked",
  unchecked: "notChecked",
  checkbox_unchecked: "notChecked",
  selected_value: "selectedValue",
  select_value: "selectedValue",
  selected_text_includes: "selectedTextIncludes",
  selected_label_includes: "selectedTextIncludes",
  input_value_equals: "inputValueEquals",
  input_equals: "inputValueEquals",
  value_equals: "inputValueEquals",
  field_value_equals: "inputValueEquals",
  input_value_includes: "inputValueIncludes",
  input_includes: "inputValueIncludes",
  value_includes: "inputValueIncludes",
  field_value_includes: "inputValueIncludes",
  attribute_equals: "attributeEquals",
  attr_equals: "attributeEquals",
  attribute_value_equals: "attributeEquals",
  aria_equals: "attributeEquals",
  attribute_includes: "attributeIncludes",
  attr_includes: "attributeIncludes",
  attribute_value_includes: "attributeIncludes",
  aria_includes: "attributeIncludes",
  computed_style_equals: "computedStyleEquals",
  computed_style: "computedStyleEquals",
  style_equals: "computedStyleEquals",
  css_equals: "computedStyleEquals",
  css_property_equals: "computedStyleEquals",
  computed_style_includes: "computedStyleIncludes",
  style_includes: "computedStyleIncludes",
  css_includes: "computedStyleIncludes",
  css_property_includes: "computedStyleIncludes",
  element_count_equals: "elementCountEquals",
  element_count: "elementCountEquals",
  count_equals: "elementCountEquals",
  count_is: "elementCountEquals",
  element_count_at_least: "elementCountAtLeast",
  count_at_least: "elementCountAtLeast",
  min_count: "elementCountAtLeast",
  minimum_count: "elementCountAtLeast",
  element_count_at_most: "elementCountAtMost",
  count_at_most: "elementCountAtMost",
  max_count: "elementCountAtMost",
  maximum_count: "elementCountAtMost",
  dialog_appeared: "dialogAppeared",
  dialog_shown: "dialogAppeared",
  dialog_present: "dialogAppeared",
  alert_appeared: "dialogAppeared",
  alert_shown: "dialogAppeared",
  confirm_appeared: "dialogAppeared",
  prompt_appeared: "dialogAppeared",
  dialog_message_includes: "dialogMessageIncludes",
  dialog_text_includes: "dialogMessageIncludes",
  alert_message_includes: "dialogMessageIncludes",
  alert_text_includes: "dialogMessageIncludes",
  confirm_message_includes: "dialogMessageIncludes",
  prompt_message_includes: "dialogMessageIncludes",
  dialog_type_equals: "dialogTypeEquals",
  dialog_type: "dialogTypeEquals",
  alert_type: "dialogTypeEquals",
  popup_opened: "popupOpened",
  popup_appeared: "popupOpened",
  popup_shown: "popupOpened",
  new_page_opened: "popupOpened",
  new_tab_opened: "popupOpened",
  popup_url_includes: "popupUrlIncludes",
  popup_url_contains: "popupUrlIncludes",
  popup_text_includes: "popupTextIncludes",
  popup_text_contains: "popupTextIncludes",
  popup_title_includes: "popupTitleIncludes",
  popup_title_contains: "popupTitleIncludes",
  table_row_includes: "tableRowIncludes",
  table_row_contains: "tableRowIncludes",
  table_has_row: "tableRowIncludes",
  row_includes: "tableRowIncludes",
  row_contains: "tableRowIncludes",
  table_cell_text_includes: "tableCellTextIncludes",
  table_cell_includes: "tableCellTextIncludes",
  table_cell_contains: "tableCellTextIncludes",
  cell_text_includes: "tableCellTextIncludes",
  cell_contains: "tableCellTextIncludes",
  table_cell_text_equals: "tableCellTextEquals",
  table_cell_equals: "tableCellTextEquals",
  cell_text_equals: "tableCellTextEquals",
  cell_equals: "tableCellTextEquals",
  clipboard_text_equals: "clipboardTextEquals",
  clipboard_equals: "clipboardTextEquals",
  clipboard_value_equals: "clipboardTextEquals",
  clipboard_text_includes: "clipboardTextIncludes",
  clipboard_includes: "clipboardTextIncludes",
  clipboard_contains: "clipboardTextIncludes",
  element_screenshot_not_blank: "elementScreenshotNotBlank",
  element_not_blank: "elementScreenshotNotBlank",
  region_not_blank: "elementScreenshotNotBlank",
  visual_not_blank: "elementScreenshotNotBlank",
  screenshot_region_not_blank: "elementScreenshotNotBlank",
  text_order: "textOrder",
  text_sequence: "textOrder",
  element_text_order: "textOrder",
  list_order: "textOrder",
  order_includes: "textOrder",
  sequence_in_order: "textOrder",
  contains_text: "text",
  text_includes: "text",
  url_equals: "urlEquals",
  url_is: "urlEquals",
  url_exact: "urlEquals",
  exact_url: "urlEquals",
  url_includes: "urlIncludes",
  url_contains: "urlIncludes",
  url_not_includes: "urlNotIncludes",
  url_not_contains: "urlNotIncludes",
  url_excludes: "urlNotIncludes",
  not_url_includes: "urlNotIncludes",
  title_equals: "titleEquals",
  title_is: "titleEquals",
  title_exact: "titleEquals",
  exact_title: "titleEquals",
  title_includes: "titleIncludes",
  title_contains: "titleIncludes",
  title_not_includes: "titleNotIncludes",
  title_not_contains: "titleNotIncludes",
  title_excludes: "titleNotIncludes",
  not_title_includes: "titleNotIncludes",
  element_text_includes: "elementTextIncludes",
  accessible_name_equals: "accessibleNameEquals",
  accessible_name_is: "accessibleNameEquals",
  accessible_name: "accessibleNameEquals",
  aria_name_equals: "accessibleNameEquals",
  aria_name: "accessibleNameEquals",
  accessible_name_includes: "accessibleNameIncludes",
  accessible_name_contains: "accessibleNameIncludes",
  aria_name_includes: "accessibleNameIncludes",
  aria_name_contains: "accessibleNameIncludes",
  accessible_description_equals: "accessibleDescriptionEquals",
  accessible_description_is: "accessibleDescriptionEquals",
  aria_description_equals: "accessibleDescriptionEquals",
  accessible_description_includes: "accessibleDescriptionIncludes",
  accessible_description_contains: "accessibleDescriptionIncludes",
  aria_description_includes: "accessibleDescriptionIncludes",
  aria_description_contains: "accessibleDescriptionIncludes",
  aria_snapshot_includes: "ariaSnapshotIncludes",
  aria_snapshot_contains: "ariaSnapshotIncludes",
  accessibility_snapshot_includes: "ariaSnapshotIncludes",
  accessibility_snapshot_contains: "ariaSnapshotIncludes",
  in_viewport: "inViewport",
  within_viewport: "inViewport",
  visible_in_viewport: "inViewport",
  element_in_viewport: "inViewport",
  page_not_blank: "pageNotBlank",
  not_blank: "pageNotBlank",
  non_empty_page: "pageNotBlank",
  no_horizontal_overflow: "noHorizontalOverflow",
  no_x_overflow: "noHorizontalOverflow",
  responsive_no_overflow: "noHorizontalOverflow",
  no_overflow_x: "noHorizontalOverflow",
  online_state: "onlineState",
  browser_online_state: "onlineState",
  navigator_online: "onlineState",
  navigator_online_state: "onlineState",
  is_online: "browserOnline",
  online: "browserOnline",
  browser_online: "browserOnline",
  network_online: "browserOnline",
  is_offline: "browserOffline",
  offline: "browserOffline",
  browser_offline: "browserOffline",
  network_offline: "browserOffline",
  cookie_exists: "cookieExists",
  has_cookie: "cookieExists",
  cookie_present: "cookieExists",
  cookie_value_includes: "cookieValueIncludes",
  cookie_includes: "cookieValueIncludes",
  cookie_contains: "cookieValueIncludes",
  no_network_errors: "networkNoErrors",
  network_no_errors: "networkNoErrors",
  network_request: "networkRequest",
  browser_network_request: "networkRequest",
  request: "networkRequest",
  network_request_includes: "networkRequestIncludes",
  request_includes: "networkRequestIncludes",
  network_request_not: "networkRequestNot",
  browser_network_request_not: "networkRequestNot",
  no_network_request: "networkRequestNot",
  request_not: "networkRequestNot",
  network_request_absent: "networkRequestNot",
  request_absent: "networkRequestNot",
  network_request_not_includes: "networkRequestNotIncludes",
  request_not_includes: "networkRequestNotIncludes",
  network_response: "networkResponse",
  browser_network_response: "networkResponse",
  response: "networkResponse",
  network_response_includes: "networkResponseIncludes",
  response_includes: "networkResponseIncludes",
  network_response_not: "networkResponseNot",
  browser_network_response_not: "networkResponseNot",
  no_network_response: "networkResponseNot",
  response_not: "networkResponseNot",
  network_response_absent: "networkResponseNot",
  response_absent: "networkResponseNot",
  network_response_not_includes: "networkResponseNotIncludes",
  response_not_includes: "networkResponseNotIncludes",
  downloaded_file: "downloadedFile",
  download: "downloadedFile",
  browser_download: "downloadedFile",
  file_download: "downloadedFile",
  console_includes: "consoleIncludes",
  console_contains: "consoleIncludes",
  console_message_includes: "consoleIncludes",
  console_message_contains: "consoleIncludes",
  console_has_message: "consoleIncludes",
  console_not_includes: "consoleNotIncludes",
  console_not_contains: "consoleNotIncludes",
  console_message_not_includes: "consoleNotIncludes",
  console_message_not_contains: "consoleNotIncludes",
  no_console_message: "consoleNotIncludes",
  no_console_errors: "consoleNoErrors",
  console_no_errors: "consoleNoErrors",
  no_console_warnings: "consoleNoWarnings",
  no_console_warning: "consoleNoWarnings",
  console_no_warnings: "consoleNoWarnings",
  console_no_warning: "consoleNoWarnings",
  no_console_warns: "consoleNoWarnings",
  console_no_warns: "consoleNoWarnings",
  js_truthy: "jsTruthy",
  javascript_truthy: "jsTruthy",
  js_equals: "jsEquals",
  javascript_equals: "jsEquals",
  local_storage_equals: "localStorageEquals",
  local_storage_includes: "localStorageIncludes",
  session_storage_equals: "sessionStorageEquals",
  session_storage_includes: "sessionStorageIncludes",
};

const HTTP_ASSERTION_TYPES = new Set([
  "status",
  "contentTypeIncludes",
  "textIncludes",
  "textNotIncludes",
  "jsonPathEquals",
  "jsonPathIncludes",
]);

const HTTP_ASSERTION_ALIASES: Record<string, HttpAssertionSpec["type"]> = {
  status_code: "status",
  expect_status: "status",
  expected_status: "status",
  content_type: "contentTypeIncludes",
  content_type_includes: "contentTypeIncludes",
  contains_text: "textIncludes",
  text_includes: "textIncludes",
  response_contains: "textIncludes",
  not_contains_text: "textNotIncludes",
  text_not_includes: "textNotIncludes",
  json_equals: "jsonPathEquals",
  json_path_equals: "jsonPathEquals",
  json_includes: "jsonPathIncludes",
  json_path_includes: "jsonPathIncludes",
};

function normalizedType<T extends string>(rawType: any, aliases: Record<string, T>) {
  const raw = text(rawType);
  return aliases[raw] || raw;
}

function optionalNumber(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function optionalBoolean(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const raw = text(value).toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes" || raw === "y") return true;
  if (raw === "false" || raw === "0" || raw === "no" || raw === "n") return false;
  return undefined;
}

function optionalNumberList(value: any): number | number[] | undefined {
  if (Array.isArray(value)) {
    const values = value.map(item => Number(item)).filter(item => Number.isFinite(item));
    return values.length ? values : undefined;
  }
  return optionalNumber(value);
}

function coordinate(value: any): [number, number] | undefined {
  if (Array.isArray(value) && value.length === 2) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : undefined;
  }
  if (value && typeof value === "object") {
    const x = Number(value.x);
    const y = Number(value.y);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : undefined;
  }
  return undefined;
}

function normalizeBrowserApps(value: any) {
  return asArray(value).map(app => ({
    displayName: text(app?.displayName || app?.display_name || app?.name) || undefined,
    bundleId: text(app?.bundleId || app?.bundle_id) || undefined,
    bundle_id: text(app?.bundle_id || app?.bundleId) || undefined,
  })).filter(app => app.displayName || app.bundleId || app.bundle_id);
}

function normalizeBrowserUploadFiles(raw: any) {
  const fileItems = asArray(raw.files || raw.fileList || raw.file_list || raw.uploads).map(file => {
    if (typeof file === "string") {
      return {
        filePath: text(file) || undefined,
        file_path: text(file) || undefined,
        path: text(file) || undefined,
      };
    }
    return {
      filePath: text(file?.filePath || file?.file_path || file?.path) || undefined,
      file_path: text(file?.file_path || file?.filePath || file?.path) || undefined,
      path: text(file?.path || file?.filePath || file?.file_path) || undefined,
      fileName: text(file?.fileName || file?.file_name || file?.filename || file?.name) || undefined,
      file_name: text(file?.file_name || file?.fileName || file?.filename || file?.name) || undefined,
      filename: text(file?.filename || file?.fileName || file?.file_name || file?.name) || undefined,
      fileContent: file?.fileContent === undefined && file?.file_content === undefined && file?.content === undefined ? undefined : String(file.fileContent ?? file.file_content ?? file.content),
      file_content: file?.file_content === undefined && file?.fileContent === undefined && file?.content === undefined ? undefined : String(file.file_content ?? file.fileContent ?? file.content),
      content: file?.content === undefined && file?.fileContent === undefined && file?.file_content === undefined ? undefined : String(file.content ?? file.fileContent ?? file.file_content),
      mediaType: text(file?.mediaType || file?.media_type || file?.mimeType || file?.mime_type) || undefined,
      media_type: text(file?.media_type || file?.mediaType || file?.mimeType || file?.mime_type) || undefined,
    };
  }).filter(file => file.filePath || file.file_path || file.path || file.fileContent !== undefined || file.file_content !== undefined || file.content !== undefined);
  return fileItems.length ? fileItems : undefined;
}

function normalizeStringList(value: any) {
  return asArray(value).map(item => text(item)).filter(Boolean);
}

function browserScrollDirection(raw: any) {
  const explicit = text(raw?.direction).toLowerCase();
  if (explicit === "up" || explicit === "down" || explicit === "left" || explicit === "right") return explicit;
  const actionName = text(raw?.type || raw?.action || raw?.kind).toLowerCase().replace(/[\s-]+/g, "_");
  if (actionName.includes("up")) return "up";
  if (actionName.includes("left")) return "left";
  if (actionName.includes("right")) return "right";
  if (actionName.includes("down")) return "down";
  return raw?.direction;
}

function normalizeBrowserStorageArea(raw: any, type: string) {
  if (type === "setLocalStorage") return "localStorage";
  if (type === "setSessionStorage") return "sessionStorage";
  const explicit = text(raw.storage || raw.storageArea || raw.storage_area || raw.scope || raw.area).toLowerCase();
  if (explicit === "local" || explicit === "localstorage" || explicit === "local_storage") return "localStorage";
  if (explicit === "session" || explicit === "sessionstorage" || explicit === "session_storage") return "sessionStorage";
  if (explicit === "both" || explicit === "all") return "both";
  const actionName = text(raw?.type || raw?.action || raw?.kind).toLowerCase().replace(/[\s-]+/g, "_");
  if (actionName.includes("session_storage")) return "sessionStorage";
  if (actionName.includes("local_storage")) return "localStorage";
  return explicit || undefined;
}

function normalizeBrowserGeolocation(value: any) {
  if (!value || typeof value !== "object") return undefined;
  const latitude = optionalNumber(value.latitude ?? value.lat);
  const longitude = optionalNumber(value.longitude ?? value.lng ?? value.lon);
  const accuracy = optionalNumber(value.accuracy);
  if (latitude === undefined || longitude === undefined) return undefined;
  return {
    latitude,
    longitude,
    ...(accuracy !== undefined ? { accuracy } : {}),
  };
}

function normalizeBrowserActionKey(raw: any, type: string) {
  if (type === "setCookie" || type === "clearCookies") {
    return text(raw.key || raw.cookieName || raw.cookie_name || raw.cookie || raw.name) || undefined;
  }
  if (type === "setLocalStorage" || type === "setSessionStorage" || type === "clearStorage") {
    return text(raw.key || raw.storageKey || raw.storage_key) || undefined;
  }
  return text(raw.key || raw.key_text || raw.keyText) || undefined;
}

function normalizeSameSite(value: any) {
  const raw = text(value).toLowerCase();
  if (!raw) return undefined;
  if (raw === "strict") return "Strict";
  if (raw === "lax") return "Lax";
  if (raw === "none" || raw === "no_restriction" || raw === "no-restriction") return "None";
  return text(value) || undefined;
}

function normalizeBrowserAction(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserActionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_action", message: `Browser action ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.action || raw.kind, BROWSER_ACTION_ALIASES);
  if (!BROWSER_ACTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_browser_action_type", message: `Browser action ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  const normalized: BrowserActionSpec = {
    ...raw,
    type: type as BrowserActionSpec["type"],
    selector: text(raw.selector || raw.css || raw.locator) || undefined,
    locator: text(raw.locator || raw.selector || raw.css) || undefined,
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value === undefined ? undefined : String(raw.value),
    storage: normalizeBrowserStorageArea(raw, type) || undefined,
    storageArea: normalizeBrowserStorageArea(raw, type) || undefined,
    storage_area: normalizeBrowserStorageArea(raw, type) || undefined,
    keys: normalizeStringList(raw.keys || raw.storageKeys || raw.storage_keys || raw.cookieNames || raw.cookie_names || raw.cookies),
    attribute: text(raw.attribute || raw.attr || raw.attributeName || raw.attribute_name || raw.key) || undefined,
    attributeName: text(raw.attributeName || raw.attribute_name || raw.attribute || raw.attr || raw.key) || undefined,
    attribute_name: text(raw.attribute_name || raw.attributeName || raw.attribute || raw.attr || raw.key) || undefined,
    url: text(raw.url || raw.href) || undefined,
    key: normalizeBrowserActionKey(raw, type),
    domain: text(raw.domain || raw.cookieDomain || raw.cookie_domain) || undefined,
    cookiePath: text(raw.cookiePath || raw.cookie_path || raw.cookie_pathname || raw.cookiePathname || (type === "setCookie" || type === "clearCookies" ? raw.path : "")) || undefined,
    cookie_path: text(raw.cookie_path || raw.cookiePath || raw.cookie_pathname || raw.cookiePathname || (type === "setCookie" || type === "clearCookies" ? raw.path : "")) || undefined,
    expires: optionalNumber(raw.expires ?? raw.expiry ?? raw.expiration),
    httpOnly: optionalBoolean(raw.httpOnly ?? raw.http_only),
    http_only: optionalBoolean(raw.http_only ?? raw.httpOnly),
    secure: optionalBoolean(raw.secure),
    sameSite: normalizeSameSite(raw.sameSite || raw.same_site),
    same_site: normalizeSameSite(raw.same_site || raw.sameSite),
    filePath: text(raw.filePath || raw.file_path || raw.path) || undefined,
    file_path: text(raw.file_path || raw.filePath || raw.path) || undefined,
    path: text(raw.path || raw.filePath || raw.file_path) || undefined,
    fileName: text(raw.fileName || raw.file_name || raw.filename || raw.name) || undefined,
    file_name: text(raw.file_name || raw.fileName || raw.filename || raw.name) || undefined,
    filename: text(raw.filename || raw.fileName || raw.file_name || raw.name) || undefined,
    fileContent: raw.fileContent === undefined && raw.file_content === undefined && raw.content === undefined ? undefined : String(raw.fileContent ?? raw.file_content ?? raw.content),
    file_content: raw.file_content === undefined && raw.fileContent === undefined && raw.content === undefined ? undefined : String(raw.file_content ?? raw.fileContent ?? raw.content),
    content: raw.content === undefined && raw.fileContent === undefined && raw.file_content === undefined ? undefined : String(raw.content ?? raw.fileContent ?? raw.file_content),
    mediaType: text(raw.mediaType || raw.media_type || raw.mimeType || raw.mime_type) || undefined,
    media_type: text(raw.media_type || raw.mediaType || raw.mimeType || raw.mime_type) || undefined,
    filePaths: normalizeStringList(raw.filePaths || raw.file_paths),
    file_paths: normalizeStringList(raw.file_paths || raw.filePaths),
    files: normalizeBrowserUploadFiles(raw),
    testId: text(raw.testId || raw.test_id || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    test_id: text(raw.test_id || raw.testId || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    dataTestId: text(raw.dataTestId || raw.data_testid || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    data_testid: text(raw.data_testid || raw.dataTestId || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    label: text(raw.label || raw.ariaLabel || raw.aria_label) || undefined,
    placeholder: text(raw.placeholder) || undefined,
    role: text(raw.role) || undefined,
    name: text(raw.name || raw.accessibleName || raw.accessible_name) || undefined,
    altText: text(raw.altText || raw.alt_text || raw.alt) || undefined,
    alt_text: text(raw.alt_text || raw.altText || raw.alt) || undefined,
    title: text(raw.title) || undefined,
    exact: raw.exact === undefined ? undefined : raw.exact !== false,
    destinationSelector: text(raw.destinationSelector || raw.destination_selector || raw.toSelector || raw.to_selector || raw.dropSelector || raw.drop_selector) || undefined,
    destination_selector: text(raw.destination_selector || raw.destinationSelector || raw.toSelector || raw.to_selector || raw.dropSelector || raw.drop_selector) || undefined,
    destinationLocator: text(raw.destinationLocator || raw.destination_locator || raw.toLocator || raw.to_locator || raw.dropLocator || raw.drop_locator || raw.destinationSelector || raw.destination_selector) || undefined,
    destination_locator: text(raw.destination_locator || raw.destinationLocator || raw.toLocator || raw.to_locator || raw.dropLocator || raw.drop_locator || raw.destinationSelector || raw.destination_selector) || undefined,
    destinationTestId: text(raw.destinationTestId || raw.destination_test_id || raw.destinationDataTestId || raw.destination_data_testid || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
    destination_test_id: text(raw.destination_test_id || raw.destinationTestId || raw.destinationDataTestId || raw.destination_data_testid || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
    destinationDataTestId: text(raw.destinationDataTestId || raw.destination_data_testid || raw.destinationTestId || raw.destination_test_id || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
    destination_data_testid: text(raw.destination_data_testid || raw.destinationDataTestId || raw.destinationTestId || raw.destination_test_id || raw.toTestId || raw.to_test_id || raw.dropTestId || raw.drop_test_id) || undefined,
    destinationLabel: text(raw.destinationLabel || raw.destination_label || raw.toLabel || raw.to_label || raw.dropLabel || raw.drop_label) || undefined,
    destination_label: text(raw.destination_label || raw.destinationLabel || raw.toLabel || raw.to_label || raw.dropLabel || raw.drop_label) || undefined,
    destinationPlaceholder: text(raw.destinationPlaceholder || raw.destination_placeholder || raw.toPlaceholder || raw.to_placeholder || raw.dropPlaceholder || raw.drop_placeholder) || undefined,
    destination_placeholder: text(raw.destination_placeholder || raw.destinationPlaceholder || raw.toPlaceholder || raw.to_placeholder || raw.dropPlaceholder || raw.drop_placeholder) || undefined,
    destinationRole: text(raw.destinationRole || raw.destination_role || raw.toRole || raw.to_role || raw.dropRole || raw.drop_role) || undefined,
    destination_role: text(raw.destination_role || raw.destinationRole || raw.toRole || raw.to_role || raw.dropRole || raw.drop_role) || undefined,
    destinationName: text(raw.destinationName || raw.destination_name || raw.toName || raw.to_name || raw.dropName || raw.drop_name) || undefined,
    destination_name: text(raw.destination_name || raw.destinationName || raw.toName || raw.to_name || raw.dropName || raw.drop_name) || undefined,
    destinationText: text(raw.destinationText || raw.destination_text || raw.toText || raw.to_text || raw.dropText || raw.drop_text) || undefined,
    destination_text: text(raw.destination_text || raw.destinationText || raw.toText || raw.to_text || raw.dropText || raw.drop_text) || undefined,
    destinationAltText: text(raw.destinationAltText || raw.destination_alt_text || raw.toAltText || raw.to_alt_text || raw.dropAltText || raw.drop_alt_text) || undefined,
    destination_alt_text: text(raw.destination_alt_text || raw.destinationAltText || raw.toAltText || raw.to_alt_text || raw.dropAltText || raw.drop_alt_text) || undefined,
    destinationTitle: text(raw.destinationTitle || raw.destination_title || raw.toTitle || raw.to_title || raw.dropTitle || raw.drop_title) || undefined,
    destination_title: text(raw.destination_title || raw.destinationTitle || raw.toTitle || raw.to_title || raw.dropTitle || raw.drop_title) || undefined,
    destinationExact: raw.destinationExact === undefined && raw.destination_exact === undefined ? undefined : raw.destinationExact !== false && raw.destination_exact !== false,
    destination_exact: raw.destination_exact === undefined && raw.destinationExact === undefined ? undefined : raw.destination_exact !== false && raw.destinationExact !== false,
    coordinate: coordinate(raw.coordinate || raw.coords || raw.point),
    startCoordinate: coordinate(raw.startCoordinate || raw.start_coordinate),
    start_coordinate: coordinate(raw.start_coordinate || raw.startCoordinate),
    direction: browserScrollDirection(raw) as BrowserActionSpec["direction"],
    amount: optionalNumber(raw.amount ?? raw.delta ?? raw.pixels ?? raw.value),
    delay: optionalNumber(raw.delay ?? raw.delayMs ?? raw.delay_ms),
    delayMs: optionalNumber(raw.delayMs ?? raw.delay_ms ?? raw.delay),
    delay_ms: optionalNumber(raw.delay_ms ?? raw.delayMs ?? raw.delay),
    duration: optionalNumber(raw.duration),
    region: raw.region,
    bundleId: text(raw.bundleId || raw.bundle_id) || undefined,
    bundle_id: text(raw.bundle_id || raw.bundleId) || undefined,
    apps: normalizeBrowserApps(raw.apps),
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
    waitUntil: raw.waitUntil || raw.wait_until,
  };
  return normalized;
}

function normalizeBrowserAssertion(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): BrowserAssertionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_assertion", message: `Browser assertion ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.assertion || raw.kind, BROWSER_ASSERTION_ALIASES);
  if (!BROWSER_ASSERTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_browser_assertion_type", message: `Browser assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  return {
    ...raw,
    type: type as BrowserAssertionSpec["type"],
    selector: text(raw.selector || raw.css || raw.locator) || undefined,
    locator: text(raw.locator || raw.selector || raw.css) || undefined,
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value === undefined ? undefined : String(raw.value),
    url: text(raw.url || raw.href) || undefined,
    urlIncludes: text(raw.urlIncludes || raw.url_includes || raw.path) || undefined,
    url_includes: text(raw.url_includes || raw.urlIncludes || raw.path) || undefined,
    method: text(raw.method || raw.httpMethod || raw.http_method).toUpperCase() || undefined,
    httpMethod: text(raw.httpMethod || raw.http_method || raw.method).toUpperCase() || undefined,
    http_method: text(raw.http_method || raw.httpMethod || raw.method).toUpperCase() || undefined,
    status: optionalNumberList(raw.status ?? raw.statusCode ?? raw.status_code),
    statusCode: optionalNumberList(raw.statusCode ?? raw.status_code ?? raw.status),
    status_code: optionalNumberList(raw.status_code ?? raw.statusCode ?? raw.status),
    resourceType: text(raw.resourceType || raw.resource_type) || undefined,
    resource_type: text(raw.resource_type || raw.resourceType) || undefined,
    headerName: text(raw.headerName || raw.header_name || raw.header) || undefined,
    header_name: text(raw.header_name || raw.headerName || raw.header) || undefined,
    headerIncludes: text(raw.headerIncludes || raw.header_includes) || undefined,
    header_includes: text(raw.header_includes || raw.headerIncludes) || undefined,
    headerValueIncludes: text(raw.headerValueIncludes || raw.header_value_includes || raw.headerValue || raw.header_value) || undefined,
    header_value_includes: text(raw.header_value_includes || raw.headerValueIncludes || raw.headerValue || raw.header_value) || undefined,
    bodyIncludes: text(raw.bodyIncludes || raw.body_includes || raw.bodyContains || raw.body_contains) || undefined,
    body_includes: text(raw.body_includes || raw.bodyIncludes || raw.bodyContains || raw.body_contains) || undefined,
    bodyJsonPath: text(raw.bodyJsonPath || raw.body_json_path || raw.jsonPath || raw.json_path) || undefined,
    body_json_path: text(raw.body_json_path || raw.bodyJsonPath || raw.jsonPath || raw.json_path) || undefined,
    bodyJsonEquals: raw.bodyJsonEquals ?? raw.body_json_equals ?? raw.bodyJsonValue ?? raw.body_json_value,
    body_json_equals: raw.body_json_equals ?? raw.bodyJsonEquals ?? raw.bodyJsonValue ?? raw.body_json_value,
    bodyJsonIncludes: text(raw.bodyJsonIncludes || raw.body_json_includes) || undefined,
    body_json_includes: text(raw.body_json_includes || raw.bodyJsonIncludes) || undefined,
    property: text(raw.property || raw.styleProperty || raw.style_property || raw.cssProperty || raw.css_property) || undefined,
    styleProperty: text(raw.styleProperty || raw.style_property || raw.cssProperty || raw.css_property || raw.property) || undefined,
    style_property: text(raw.style_property || raw.styleProperty || raw.cssProperty || raw.css_property || raw.property) || undefined,
    cssProperty: text(raw.cssProperty || raw.css_property || raw.styleProperty || raw.style_property || raw.property) || undefined,
    css_property: text(raw.css_property || raw.cssProperty || raw.styleProperty || raw.style_property || raw.property) || undefined,
    fileName: text(raw.fileName || raw.file_name || raw.filename || raw.downloadName || raw.download_name) || undefined,
    file_name: text(raw.file_name || raw.fileName || raw.filename || raw.downloadName || raw.download_name) || undefined,
    filename: text(raw.filename || raw.fileName || raw.file_name || raw.downloadName || raw.download_name) || undefined,
    fileNameIncludes: text(raw.fileNameIncludes || raw.file_name_includes || raw.filenameIncludes || raw.filename_includes) || undefined,
    file_name_includes: text(raw.file_name_includes || raw.fileNameIncludes || raw.filenameIncludes || raw.filename_includes) || undefined,
    filenameIncludes: text(raw.filenameIncludes || raw.filename_includes || raw.fileNameIncludes || raw.file_name_includes) || undefined,
    filename_includes: text(raw.filename_includes || raw.filenameIncludes || raw.fileNameIncludes || raw.file_name_includes) || undefined,
    contentIncludes: text(raw.contentIncludes || raw.content_includes || raw.bodyIncludes || raw.body_includes) || undefined,
    content_includes: text(raw.content_includes || raw.contentIncludes || raw.bodyIncludes || raw.body_includes) || undefined,
    minBytes: optionalNumber(raw.minBytes || raw.min_bytes || raw.sizeBytes || raw.size_bytes),
    min_bytes: optionalNumber(raw.min_bytes || raw.minBytes || raw.sizeBytes || raw.size_bytes),
    count: optionalNumber(raw.count ?? raw.expectedCount ?? raw.expected_count),
    expectedCount: optionalNumber(raw.expectedCount ?? raw.expected_count ?? raw.count),
    expected_count: optionalNumber(raw.expected_count ?? raw.expectedCount ?? raw.count),
    minCount: optionalNumber(raw.minCount ?? raw.min_count ?? raw.count),
    min_count: optionalNumber(raw.min_count ?? raw.minCount ?? raw.count),
    maxCount: optionalNumber(raw.maxCount ?? raw.max_count ?? raw.count),
    max_count: optionalNumber(raw.max_count ?? raw.maxCount ?? raw.count),
    minUniqueColors: optionalNumber(raw.minUniqueColors ?? raw.min_unique_colors),
    min_unique_colors: optionalNumber(raw.min_unique_colors ?? raw.minUniqueColors),
    minNonWhitePixels: optionalNumber(raw.minNonWhitePixels ?? raw.min_non_white_pixels),
    min_non_white_pixels: optionalNumber(raw.min_non_white_pixels ?? raw.minNonWhitePixels),
    message: raw.message === undefined ? undefined : String(raw.message),
    messageIncludes: text(raw.messageIncludes || raw.message_includes || raw.messageContains || raw.message_contains) || undefined,
    message_includes: text(raw.message_includes || raw.messageIncludes || raw.messageContains || raw.message_contains) || undefined,
    accessibleName: text(raw.accessibleName || raw.accessible_name || raw.ariaName || raw.aria_name) || undefined,
    accessible_name: text(raw.accessible_name || raw.accessibleName || raw.ariaName || raw.aria_name) || undefined,
    accessibleDescription: text(raw.accessibleDescription || raw.accessible_description || raw.ariaDescription || raw.aria_description) || undefined,
    accessible_description: text(raw.accessible_description || raw.accessibleDescription || raw.ariaDescription || raw.aria_description) || undefined,
    description: text(raw.description || raw.accessibleDescription || raw.accessible_description || raw.ariaDescription || raw.aria_description) || undefined,
    descriptionIncludes: text(raw.descriptionIncludes || raw.description_includes || raw.descriptionContains || raw.description_contains) || undefined,
    description_includes: text(raw.description_includes || raw.descriptionIncludes || raw.descriptionContains || raw.description_contains) || undefined,
    snapshotIncludes: text(raw.snapshotIncludes || raw.snapshot_includes || raw.ariaSnapshotIncludes || raw.aria_snapshot_includes) || undefined,
    snapshot_includes: text(raw.snapshot_includes || raw.snapshotIncludes || raw.ariaSnapshotIncludes || raw.aria_snapshot_includes) || undefined,
    dialogType: text(raw.dialogType || raw.dialog_type || raw.expectedDialogType || raw.expected_dialog_type || raw.alertType || raw.alert_type) || undefined,
    dialog_type: text(raw.dialog_type || raw.dialogType || raw.expectedDialogType || raw.expected_dialog_type || raw.alertType || raw.alert_type) || undefined,
    tableSelector: text(raw.tableSelector || raw.table_selector || raw.table || raw.tableCss || raw.table_css) || undefined,
    table_selector: text(raw.table_selector || raw.tableSelector || raw.table || raw.tableCss || raw.table_css) || undefined,
    tableLocator: text(raw.tableLocator || raw.table_locator || raw.tableSelector || raw.table_selector || raw.table) || undefined,
    table_locator: text(raw.table_locator || raw.tableLocator || raw.tableSelector || raw.table_selector || raw.table) || undefined,
    rowText: text(raw.rowText || raw.row_text || raw.row || raw.rowContains || raw.row_contains) || undefined,
    row_text: text(raw.row_text || raw.rowText || raw.row || raw.rowContains || raw.row_contains) || undefined,
    rowIndex: optionalNumber(raw.rowIndex ?? raw.row_index),
    row_index: optionalNumber(raw.row_index ?? raw.rowIndex),
    rowNumber: optionalNumber(raw.rowNumber ?? raw.row_number),
    row_number: optionalNumber(raw.row_number ?? raw.rowNumber),
    columnName: text(raw.columnName || raw.column_name || raw.columnHeader || raw.column_header || raw.header) || undefined,
    column_name: text(raw.column_name || raw.columnName || raw.columnHeader || raw.column_header || raw.header) || undefined,
    columnHeader: text(raw.columnHeader || raw.column_header || raw.columnName || raw.column_name || raw.header) || undefined,
    column_header: text(raw.column_header || raw.columnHeader || raw.columnName || raw.column_name || raw.header) || undefined,
    columnIndex: optionalNumber(raw.columnIndex ?? raw.column_index),
    column_index: optionalNumber(raw.column_index ?? raw.columnIndex),
    columnNumber: optionalNumber(raw.columnNumber ?? raw.column_number),
    column_number: optionalNumber(raw.column_number ?? raw.columnNumber),
    texts: normalizeStringList(raw.texts || raw.expectedTexts || raw.expected_texts),
    values: normalizeStringList(raw.values),
    expectedTexts: normalizeStringList(raw.expectedTexts || raw.expected_texts || raw.texts),
    expected_texts: normalizeStringList(raw.expected_texts || raw.expectedTexts || raw.texts),
    key: text(raw.key || raw.storageKey || raw.storage_key) || undefined,
    expression: text(raw.expression || raw.js || raw.javascript) || undefined,
    testId: text(raw.testId || raw.test_id || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    test_id: text(raw.test_id || raw.testId || raw.dataTestId || raw.data_testid || raw.dataTestid) || undefined,
    dataTestId: text(raw.dataTestId || raw.data_testid || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    data_testid: text(raw.data_testid || raw.dataTestId || raw.dataTestid || raw.testId || raw.test_id) || undefined,
    label: text(raw.label || raw.ariaLabel || raw.aria_label) || undefined,
    placeholder: text(raw.placeholder) || undefined,
    role: text(raw.role) || undefined,
    name: text(raw.name || raw.accessibleName || raw.accessible_name) || undefined,
    altText: text(raw.altText || raw.alt_text || raw.alt) || undefined,
    alt_text: text(raw.alt_text || raw.altText || raw.alt) || undefined,
    title: text(raw.title) || undefined,
    exact: raw.exact === undefined ? undefined : raw.exact !== false,
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
    settleMs: optionalNumber(raw.settleMs || raw.settle_ms),
    settle_ms: optionalNumber(raw.settle_ms || raw.settleMs),
  };
}

function normalizeHeaders(raw: any) {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined && value !== null) out[key] = String(value);
  }
  return out;
}

function normalizeHttpAssertion(raw: any, issues: WorkOrderIssue[], project: string, checkName: string, index: number): HttpAssertionSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_http_assertion", message: `HTTP assertion ${index + 1} in "${checkName}" must be an object.`, project });
    return null;
  }
  const type = normalizedType(raw.type || raw.assertion || raw.kind, HTTP_ASSERTION_ALIASES);
  if (!HTTP_ASSERTION_TYPES.has(type)) {
    issues.push({ severity: "error", code: "invalid_http_assertion_type", message: `HTTP assertion ${index + 1} in "${checkName}" has unsupported type "${type || "(missing)"}".`, project });
    return null;
  }
  return {
    ...raw,
    type: type as HttpAssertionSpec["type"],
    status: optionalNumberList(raw.status ?? raw.statusCode ?? raw.status_code ?? raw.expectedStatus ?? raw.expected_status),
    statusCode: optionalNumberList(raw.statusCode ?? raw.status_code ?? raw.status),
    status_code: optionalNumberList(raw.status_code ?? raw.statusCode ?? raw.status),
    text: raw.text === undefined ? undefined : String(raw.text),
    value: raw.value,
    path: text(raw.path || raw.jsonPath || raw.json_path) || undefined,
  };
}

function normalizeHttpCheck(raw: any, issues: WorkOrderIssue[], project: string, index: number, forceAdversarial = false): HttpCheckSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_http_check", message: `HTTP check ${index + 1} must be an object.`, project });
    return null;
  }
  const checkName = text(raw.name || raw.title) || `HTTP check ${index + 1}`;
  const url = text(raw.url || raw.targetUrl || raw.target_url || raw.path);
  if (!url) {
    issues.push({ severity: "error", code: "invalid_http_check_url", message: `HTTP check "${checkName}" must include url/path.`, project });
    return null;
  }
  const assertions = asArray(raw.assertions || raw.expectations)
    .map((assertion, assertionIndex) => normalizeHttpAssertion(assertion, issues, project, checkName, assertionIndex))
    .filter(Boolean) as HttpAssertionSpec[];
  if (!assertions.length && (raw.expectStatus !== undefined || raw.expect_status !== undefined || raw.expectedStatus !== undefined || raw.expected_status !== undefined)) {
    assertions.push({
      type: "status",
      status: raw.expectStatus ?? raw.expect_status ?? raw.expectedStatus ?? raw.expected_status,
    });
  }
  if (!assertions.length && (raw.responseContains !== undefined || raw.response_contains !== undefined)) {
    assertions.push({
      type: "textIncludes",
      text: String(raw.responseContains ?? raw.response_contains),
    });
  }
  return {
    name: checkName,
    url,
    method: text(raw.method || raw.httpMethod || raw.http_method || "GET").toUpperCase(),
    headers: normalizeHeaders(raw.headers),
    body: raw.body === undefined ? undefined : typeof raw.body === "string" ? raw.body : JSON.stringify(raw.body),
    json: raw.json,
    assertions,
    adversarial: forceAdversarial || raw.adversarial === true || raw.probe === true,
    probeType: text(raw.probeType || raw.probe_type || raw.kind || raw.category) || undefined,
    probe_type: text(raw.probe_type || raw.probeType || raw.kind || raw.category) || undefined,
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
  };
}

function normalizeBrowserCheck(raw: any, issues: WorkOrderIssue[], project: string, index: number, forceAdversarial = false): BrowserCheckSpec | null {
  if (!raw || typeof raw !== "object") {
    issues.push({ severity: "error", code: "invalid_browser_check", message: `Browser check ${index + 1} must be an object.`, project });
    return null;
  }
  const checkName = text(raw.name || raw.title) || `browser check ${index + 1}`;
  const actions = asArray(raw.actions || raw.steps)
    .map((action, actionIndex) => normalizeBrowserAction(action, issues, project, checkName, actionIndex))
    .filter(Boolean) as BrowserActionSpec[];
  const assertions = asArray(raw.assertions || raw.expectations)
    .map((assertion, assertionIndex) => normalizeBrowserAssertion(assertion, issues, project, checkName, assertionIndex))
    .filter(Boolean) as BrowserAssertionSpec[];
  const rawViewport = raw.viewport && typeof raw.viewport === "object" ? raw.viewport : {};
  const viewportWidth = optionalNumber(raw.viewportWidth || raw.viewport_width || raw.width || rawViewport.width);
  const viewportHeight = optionalNumber(raw.viewportHeight || raw.viewport_height || raw.height || rawViewport.height);
  const deviceScaleFactor = optionalNumber(raw.deviceScaleFactor || raw.device_scale_factor || rawViewport.deviceScaleFactor || rawViewport.device_scale_factor);
  const rawContext = raw.context && typeof raw.context === "object" ? raw.context : {};
  const locale = text(raw.locale || raw.browserLocale || raw.browser_locale || rawContext.locale) || undefined;
  const timezoneId = text(raw.timezoneId || raw.timezone_id || raw.timeZoneId || raw.time_zone_id || raw.timezone || rawContext.timezoneId || rawContext.timezone_id || rawContext.timezone) || undefined;
  const colorScheme = text(raw.colorScheme || raw.color_scheme || raw.theme || rawContext.colorScheme || rawContext.color_scheme) || undefined;
  const reducedMotion = text(raw.reducedMotion || raw.reduced_motion || raw.motion || rawContext.reducedMotion || rawContext.reduced_motion) || undefined;
  const permissions = normalizeStringList(raw.permissions || raw.browserPermissions || raw.browser_permissions || rawContext.permissions);
  const geolocation = normalizeBrowserGeolocation(raw.geolocation || raw.geo || raw.location || rawContext.geolocation || rawContext.geo || rawContext.location);
  return {
    name: checkName,
    url: text(raw.url || raw.targetUrl || raw.target_url) || undefined,
    actions,
    assertions,
    screenshot: raw.screenshot === undefined ? undefined : raw.screenshot !== false,
    ...(viewportWidth || viewportHeight ? { viewport: { ...(viewportWidth ? { width: viewportWidth } : {}), ...(viewportHeight ? { height: viewportHeight } : {}) } } : {}),
    viewportWidth,
    viewport_width: viewportWidth,
    viewportHeight,
    viewport_height: viewportHeight,
    isMobile: raw.isMobile === undefined && raw.is_mobile === undefined ? undefined : raw.isMobile === true || raw.is_mobile === true,
    is_mobile: raw.is_mobile === undefined && raw.isMobile === undefined ? undefined : raw.is_mobile === true || raw.isMobile === true,
    deviceScaleFactor,
    device_scale_factor: deviceScaleFactor,
    userAgent: text(raw.userAgent || raw.user_agent) || undefined,
    user_agent: text(raw.user_agent || raw.userAgent) || undefined,
    locale,
    timezoneId,
    timezone_id: timezoneId,
    colorScheme,
    color_scheme: colorScheme,
    reducedMotion,
    reduced_motion: reducedMotion,
    permissions,
    geolocation,
    adversarial: forceAdversarial || raw.adversarial === true || raw.probe === true,
    probeType: text(raw.probeType || raw.probe_type || raw.kind || raw.category) || undefined,
    probe_type: text(raw.probe_type || raw.probeType || raw.kind || raw.category) || undefined,
    timeoutMs: optionalNumber(raw.timeoutMs || raw.timeout_ms),
    timeout_ms: optionalNumber(raw.timeout_ms || raw.timeoutMs),
  };
}

function normalizeProject(raw: TestAgentProjectTarget, index: number, globalStartupTimeoutMs: number, issues: WorkOrderIssue[]): NormalizedTestAgentProjectTarget {
  const name = text(raw?.name) || `project-${index + 1}`;
  const workDir = resolveWorkDir(text(raw?.workDir || raw?.work_dir || process.cwd()));
  const runCommand = text(raw?.runCommand || raw?.run_command);
  const devServerCommand = text(raw?.devServerCommand || raw?.dev_server_command || runCommand);
  const targetUrl = text(raw?.targetUrl || raw?.target_url);
  const startupUrl = text(raw?.startupUrl || raw?.startup_url || targetUrl);
  const generatedAdversarialBrowserChecks = buildAdversarialBrowserProbeChecks({
    project: name,
    templates: asArray((raw as any)?.adversarialBrowserProbeTemplates || (raw as any)?.adversarial_browser_probe_templates),
    issues,
  });
  return {
    name,
    workDir,
    runCommand,
    devServerCommand,
    targetUrl,
    startupUrl,
    startupTimeoutMs: Number(raw?.startupTimeoutMs || raw?.startup_timeout_ms || globalStartupTimeoutMs || DEFAULT_OPTIONS.startupTimeoutMs),
    env: stringifyEnv(raw?.env),
    changedFiles: asArray(raw?.changedFiles || raw?.changed_files).map(String).filter(Boolean),
    verificationCommands: asArray(raw?.verificationCommands || raw?.verification_commands).map(String).map(item => item.trim()).filter(Boolean),
    httpChecks: asArray((raw as any)?.httpChecks || (raw as any)?.http_checks || (raw as any)?.apiChecks || (raw as any)?.api_checks)
      .map((check, checkIndex) => normalizeHttpCheck(check, issues, name, checkIndex))
      .filter(Boolean) as HttpCheckSpec[],
    adversarialHttpChecks: asArray((raw as any)?.adversarialHttpChecks || (raw as any)?.adversarial_http_checks || (raw as any)?.adversarialApiChecks || (raw as any)?.adversarial_api_checks)
      .map((check, checkIndex) => normalizeHttpCheck(check, issues, name, checkIndex, true))
      .filter(Boolean) as HttpCheckSpec[],
    adversarialBrowserChecks: asArray((raw as any)?.adversarialBrowserChecks || (raw as any)?.adversarial_browser_checks)
      .concat(generatedAdversarialBrowserChecks)
      .map((check, checkIndex) => normalizeBrowserCheck(check, issues, name, checkIndex, true))
      .filter(Boolean) as BrowserCheckSpec[],
    browserChecks: asArray(raw?.browserChecks || raw?.browser_checks)
      .map((check, checkIndex) => normalizeBrowserCheck(check, issues, name, checkIndex))
      .filter(Boolean) as BrowserCheckSpec[],
    agentSummary: text(raw?.agentSummary || raw?.agent_summary),
    risks: asArray(raw?.risks).map(String).filter(Boolean),
  };
}

export function normalizeTestAgentWorkOrder(input: TestAgentWorkOrder, overrides: Partial<TestAgentOptions> = {}) {
  const issues: WorkOrderIssue[] = [];
  const runId = text(input?.id) || makeRunId("test-agent-work-order");
  const options: Required<TestAgentOptions> = {
    ...DEFAULT_OPTIONS,
    ...(input?.options || {}),
    ...(overrides || {}),
  };
  options.artifactDir = path.resolve(text(options.artifactDir) || defaultArtifactDir(runId));
  options.commandTimeoutMs = Math.max(1_000, Number(options.commandTimeoutMs || DEFAULT_OPTIONS.commandTimeoutMs));
  options.browserTimeoutMs = Math.max(1_000, Number(options.browserTimeoutMs || DEFAULT_OPTIONS.browserTimeoutMs));
  options.httpTimeoutMs = Math.max(1_000, Number(options.httpTimeoutMs || DEFAULT_OPTIONS.httpTimeoutMs));
  options.startupTimeoutMs = Math.max(1_000, Number(options.startupTimeoutMs || DEFAULT_OPTIONS.startupTimeoutMs));
  options.maxOutputChars = Math.max(1_000, Number(options.maxOutputChars || DEFAULT_OPTIONS.maxOutputChars));
  options.maxHttpResourceChecks = Math.max(0, Number(options.maxHttpResourceChecks || DEFAULT_OPTIONS.maxHttpResourceChecks));
  options.failOnConsoleError = options.failOnConsoleError !== false;
  options.failOnHttpResourceError = options.failOnHttpResourceError !== false;
  options.verificationOnly = options.verificationOnly !== false;
  options.autoDiscoverVerificationCommands = options.autoDiscoverVerificationCommands !== false;
  options.collectBrowserArtifacts = options.collectBrowserArtifacts !== false;
  options.collectBrowserVideo = options.collectBrowserVideo === true;
  if (!["auto", "playwright", "mcp", "none"].includes(String(options.browserProvider || ""))) options.browserProvider = "auto";

  const projects = asArray(input?.projects).map((item, index) => normalizeProject(item, index, options.startupTimeoutMs, issues));
  if (!projects.length) {
    issues.push({ severity: "error", code: "missing_projects", message: "TestAgent work order must include at least one project target." });
  }
  for (const project of projects) {
    if (!project.workDir) issues.push({ severity: "error", code: "missing_work_dir", message: "Project workDir is required.", project: project.name });
    if (!project.verificationCommands.length && !project.targetUrl && !project.httpChecks.length && !project.adversarialHttpChecks.length && !project.browserChecks.length && !project.adversarialBrowserChecks.length) {
      issues.push({ severity: "warning", code: "no_executable_checks", message: "Project has no verification commands or browser target URL.", project: project.name });
    }
  }

  const requiredChecks = asArray(input?.requiredChecks || input?.required_checks).map(String).filter(Boolean);
  const workOrder: NormalizedTestAgentWorkOrder = {
    schema: "ccm-test-agent-work-order-v1",
    id: runId,
    taskId: text(input?.taskId || input?.task_id),
    groupId: text(input?.groupId || input?.group_id),
    issuedBy: text(input?.issuedBy || input?.issued_by || "group-main-agent"),
    originalUserGoal: text(input?.originalUserGoal || input?.original_user_goal),
    acceptanceCriteria: asArray(input?.acceptanceCriteria || input?.acceptance_criteria).map(String).filter(Boolean),
    requiredChecks,
    projects,
    options,
    metadata: input?.metadata || {},
  };

  if (!workOrder.acceptanceCriteria.length) {
    issues.push({ severity: "warning", code: "missing_acceptance_criteria", message: "No acceptance criteria were provided; report coverage will be weaker." });
  }

  return { workOrder, issues };
}
