// Behavior-freeze split from work-order.ts (part 1/3).
import * as path from "path";
import { buildAdversarialBrowserProbeChecks } from "./browser-probe-templates";
import {
  browserActionValueEnvName,
  browserActionSupportsEnvironmentValue,
  isValidBrowserEnvironmentName,
} from "./browser/authentication";
import { normalizeBrowserAuthenticationConfig } from "./browser/existing-session";
import { hasMultiSessionBrowserScenario, validateMultiSessionBrowserScenario } from "./browser/multi-session";
import { MAX_BROWSER_STABILITY_RUNS } from "./browser/stability-summary";
import { BROWSER_ACTION_EFFECT_SIGNALS } from "./browser/action-effects";
import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  BrowserSessionComparisonStepSpec,
  BrowserSessionLeafStepSpec,
  BrowserSessionSpec,
  BrowserSessionStepSpec,
  HttpAssertionSpec,
  HttpCheckSpec,
  HttpConcurrencyAssertionSpec,
  HttpConcurrencySpec,
  NormalizedTestAgentProjectTarget,
  NormalizedTestAgentWorkOrder,
  TestAgentOptions,
  TestAgentProjectTarget,
  TestAgentWorkOrder,
  WorkOrderIssue,
} from "./types";
import {
  MAX_HTTP_CONCURRENT_REQUESTS,
  MIN_HTTP_CONCURRENT_REQUESTS,
} from "./http-concurrency";
import { asArray, defaultArtifactDir, isLikelyProductionTestAgentUrl, makeRunId, resolveUrl, resolveWorkDir, stringifyEnv, validateTestAgentUrl, validateTestAgentWorkDir } from "./utils";

export const DEFAULT_OPTIONS: Required<TestAgentOptions> = {
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
  requireAdversarialProbe: true,
  adversarialProbeWaiver: "",
};

export function text(value: any) {
  return String(value || "").trim();
}

export const BROWSER_ACTION_TYPES = new Set([
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

export const BROWSER_ACTION_ALIASES: Record<string, BrowserActionSpec["type"]> = {
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

export const BROWSER_ASSERTION_TYPES = new Set([
  "visible",
  "notVisible",
  "present",
  "notPresent",
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
  "ariaExpanded",
  "ariaCollapsed",
  "ariaPressed",
  "ariaNotPressed",
  "ariaSelected",
  "ariaNotSelected",
  "ariaInvalid",
  "ariaValid",
  "ariaRequired",
  "ariaNotRequired",
  "inViewport",
  "pageNotBlank",
  "noHorizontalOverflow",
  "onlineState",
  "browserOnline",
  "browserOffline",
  "cookieExists",
  "cookieValueEquals",
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

export const BROWSER_ASSERTION_ALIASES: Record<string, BrowserAssertionSpec["type"]> = {
  hidden: "notVisible",
  not_visible: "notVisible",
  present: "present",
  exists: "present",
  element_exists: "present",
  dom_present: "present",
  attached: "present",
  not_present: "notPresent",
  absent: "notPresent",
  missing: "notPresent",
  removed: "notPresent",
  deleted: "notPresent",
  element_absent: "notPresent",
  element_missing: "notPresent",
  element_removed: "notPresent",
  dom_absent: "notPresent",
  detached: "notPresent",
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
  aria_expanded: "ariaExpanded",
  expanded: "ariaExpanded",
  is_expanded: "ariaExpanded",
  aria_collapsed: "ariaCollapsed",
  collapsed: "ariaCollapsed",
  not_expanded: "ariaCollapsed",
  aria_pressed: "ariaPressed",
  pressed: "ariaPressed",
  button_pressed: "ariaPressed",
  aria_not_pressed: "ariaNotPressed",
  not_pressed: "ariaNotPressed",
  unpressed: "ariaNotPressed",
  aria_selected: "ariaSelected",
  aria_option_selected: "ariaSelected",
  option_selected: "ariaSelected",
  aria_not_selected: "ariaNotSelected",
  aria_option_not_selected: "ariaNotSelected",
  option_not_selected: "ariaNotSelected",
  aria_invalid: "ariaInvalid",
  invalid_state: "ariaInvalid",
  field_invalid: "ariaInvalid",
  aria_valid: "ariaValid",
  valid_state: "ariaValid",
  field_valid: "ariaValid",
  aria_required: "ariaRequired",
  required_state: "ariaRequired",
  field_required: "ariaRequired",
  aria_not_required: "ariaNotRequired",
  not_required: "ariaNotRequired",
  field_not_required: "ariaNotRequired",
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
  cookie_value_equals: "cookieValueEquals",
  cookie_equals: "cookieValueEquals",
  cookie_is: "cookieValueEquals",
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

export const HTTP_ASSERTION_TYPES = new Set([
  "status",
  "contentTypeIncludes",
  "textIncludes",
  "textNotIncludes",
  "jsonPathEquals",
  "jsonPathIncludes",
]);

export const HTTP_ASSERTION_ALIASES: Record<string, HttpAssertionSpec["type"]> = {
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

export const HTTP_CONCURRENCY_ASSERTION_TYPES = new Set([
  "responseCount",
  "statusCount",
  "jsonPathUniqueCount",
  "jsonPathAllEqual",
]);

export const HTTP_CONCURRENCY_ASSERTION_ALIASES: Record<string, HttpConcurrencyAssertionSpec["type"]> = {
  response_count: "responseCount",
  completed_count: "responseCount",
  status_count: "statusCount",
  json_path_unique_count: "jsonPathUniqueCount",
  unique_json_path_count: "jsonPathUniqueCount",
  json_path_all_equal: "jsonPathAllEqual",
  all_json_path_equal: "jsonPathAllEqual",
};

export function normalizedType<T extends string>(rawType: any, aliases: Record<string, T>) {
  const raw = text(rawType);
  return aliases[raw] || raw;
}

export function optionalNumber(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function optionalBoolean(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const raw = text(value).toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes" || raw === "y") return true;
  if (raw === "false" || raw === "0" || raw === "no" || raw === "n") return false;
  return undefined;
}

export function optionalNumberList(value: any): number | number[] | undefined {
  if (Array.isArray(value)) {
    const values = value.map(item => Number(item)).filter(item => Number.isFinite(item));
    return values.length ? values : undefined;
  }
  return optionalNumber(value);
}

export function coordinate(value: any): [number, number] | undefined {
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

export function normalizeBrowserApps(value: any) {
  return asArray(value).map(app => ({
    displayName: text(app?.displayName || app?.display_name || app?.name) || undefined,
    bundleId: text(app?.bundleId || app?.bundle_id) || undefined,
    bundle_id: text(app?.bundle_id || app?.bundleId) || undefined,
  })).filter(app => app.displayName || app.bundleId || app.bundle_id);
}

export function normalizeBrowserUploadFiles(raw: any) {
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

export function normalizeStringList(value: any) {
  return asArray(value).map(item => text(item)).filter(Boolean);
}

export function browserScrollDirection(raw: any) {
  const explicit = text(raw?.direction).toLowerCase();
  if (explicit === "up" || explicit === "down" || explicit === "left" || explicit === "right") return explicit;
  const actionName = text(raw?.type || raw?.action || raw?.kind).toLowerCase().replace(/[\s-]+/g, "_");
  if (actionName.includes("up")) return "up";
  if (actionName.includes("left")) return "left";
  if (actionName.includes("right")) return "right";
  if (actionName.includes("down")) return "down";
  return raw?.direction;
}

export function normalizeBrowserStorageArea(raw: any, type: string) {
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

export function normalizeBrowserGeolocation(value: any) {
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

export function normalizeBrowserActionKey(raw: any, type: string) {
  if (type === "setCookie" || type === "clearCookies") {
    return text(raw.key || raw.cookieName || raw.cookie_name || raw.cookie || raw.name) || undefined;
  }
  if (type === "setLocalStorage" || type === "setSessionStorage" || type === "clearStorage") {
    return text(raw.key || raw.storageKey || raw.storage_key) || undefined;
  }
  return text(raw.key || raw.key_text || raw.keyText) || undefined;
}

export function normalizeSameSite(value: any) {
  const raw = text(value).toLowerCase();
  if (!raw) return undefined;
  if (raw === "strict") return "Strict";
  if (raw === "lax") return "Lax";
  if (raw === "none" || raw === "no_restriction" || raw === "no-restriction") return "None";
  return text(value) || undefined;
}
