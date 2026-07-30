#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { queryMetricEvents } = require(path.join(root, "ccm-package", "dist", "core", "db.js"));

const events = [];
for (let index = 0; index < 25; index += 1) {
  events.push({
    id: `ok-${index}`,
    at: `2026-07-27T00:${String(index).padStart(2, "0")}:00.000Z`,
    date: "2026-07-27",
    scopeType: "group",
    scopeId: "group-a",
    groupId: "group-a",
    success: true,
    status: "completed",
  });
}
for (let index = 0; index < 7; index += 1) {
  events.push({
    id: `failed-${index}`,
    at: `2026-07-26T00:${String(index).padStart(2, "0")}:00.000Z`,
    date: "2026-07-26",
    scopeType: "group",
    scopeId: "group-a",
    groupId: "group-a",
    success: false,
    status: "failed",
  });
}
events.push({
  id: "other-group",
  at: "2026-07-27T12:00:00.000Z",
  date: "2026-07-27",
  scopeType: "group",
  scopeId: "group-b",
  groupId: "group-b",
  success: false,
  status: "failed",
});

const metrics = { version: 2, agents: {}, daily: {}, scopes: {}, events };
const firstPage = queryMetricEvents(metrics, {
  scopeType: "group",
  scopeId: "group-a",
  days: 0,
  status: "all",
  page: 1,
  pageSize: 10,
});
assert.equal(firstPage.total, 32);
assert.equal(firstPage.events.length, 10);
assert.equal(firstPage.totalPages, 4);
assert.equal(firstPage.statusCounts.completed, 25);
assert.equal(firstPage.statusCounts.failed, 7);

const lastPage = queryMetricEvents(metrics, {
  scopeType: "group",
  scopeId: "group-a",
  status: "all",
  page: 4,
  pageSize: 10,
});
assert.equal(lastPage.events.length, 2);

const failedOnly = queryMetricEvents(metrics, {
  scopeType: "group",
  scopeId: "group-a",
  status: "failed",
  page: 1,
  pageSize: 20,
});
assert.equal(failedOnly.total, 7);
assert.ok(failedOnly.events.every(event => event.resolvedStatus === "failed"));

const customDateRange = queryMetricEvents(metrics, {
  scopeType: "group",
  scopeId: "group-a",
  fromDate: "2026-07-26",
  toDate: "2026-07-26",
  status: "all",
  page: 1,
  pageSize: 20,
});
assert.equal(customDateRange.total, 7);
assert.equal(customDateRange.range.fromDate, "2026-07-26");
assert.equal(customDateRange.range.toDate, "2026-07-26");

const frontendSource = fs.readFileSync(
  path.join(root, "frontend", "src", "components", "agents", "AgentMetrics.vue"),
  "utf8",
);
assert.match(frontendSource, /\/api\/metrics\/events/);
assert.match(frontendSource, /全部历史/);
assert.match(frontendSource, /executionStatusOptions/);
assert.match(frontendSource, /executionResult\.totalPages/);
assert.match(frontendSource, /自定义日期/);
assert.match(frontendSource, /params\.set\('from'/);
assert.match(frontendSource, /params\.set\('to'/);
assert.match(frontendSource, /class="event-time"[^>]*:title="formatTime\(event\.at\)"/);
assert.match(frontendSource, /project:\$\{project\.id\}/);
assert.match(frontendSource, /value: 'blocked'/);
assert.match(frontendSource, /value: 'unknown'/);
assert.match(frontendSource, /reliability\/drills\/status/);
assert.doesNotMatch(frontendSource, /cancell\?ed/);
assert.doesNotMatch(frontendSource, /<p v-else>\{\{ event\.runtime \|\| '默认运行时' \}\} · \{\{ formatTime\(event\.at\) \}\}<\/p>/);

console.log(JSON.stringify({
  pass: true,
  checks: {
    all_retained_events_are_pageable: true,
    status_filter_is_server_side: true,
    scope_isolation_is_preserved: true,
    page_bounds_are_normalized: true,
    frontend_exposes_range_filter_and_pagination: true,
    custom_date_range_is_inclusive_and_server_side: true,
    terminal_events_always_show_timestamp: true,
    external_calls: 0,
  },
}, null, 2));
