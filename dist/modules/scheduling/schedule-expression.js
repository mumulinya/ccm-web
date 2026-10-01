"use strict";
// Schedule expression and timezone helpers for AutomationDefinition.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CRON_TIMEZONE = void 0;
exports.pad2 = pad2;
exports.normalizeCronTimezone = normalizeCronTimezone;
exports.zonedDateParts = zonedDateParts;
exports.dateKeyInTimezone = dateKeyInTimezone;
exports.zonedDateTimeToDate = zonedDateTimeToDate;
exports.minuteKey = minuteKey;
exports.validateCronExpression = validateCronExpression;
exports.matchesCron = matchesCron;
exports.computeNextRun = computeNextRun;
exports.DEFAULT_CRON_TIMEZONE = "Asia/Shanghai";
function pad2(value) {
    return String(value).padStart(2, "0");
}
function normalizeCronTimezone(value) {
    const timezone = String(value || exports.DEFAULT_CRON_TIMEZONE).trim() || exports.DEFAULT_CRON_TIMEZONE;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
        return timezone;
    }
    catch {
        throw new Error(`无效时区：${timezone}`);
    }
}
function zonedDateParts(date, timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: normalizeCronTimezone(timezone), year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const weekday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[values.weekday] ?? 0;
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), weekday };
}
function dateKeyInTimezone(date = new Date(), timezone = exports.DEFAULT_CRON_TIMEZONE) {
    const parts = zonedDateParts(date, timezone);
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}
function zonedDateTimeToDate(input, timezone = exports.DEFAULT_CRON_TIMEZONE) {
    const normalizedTimezone = normalizeCronTimezone(timezone);
    const targetUtc = Date.UTC(input.year, input.month - 1, input.day, input.hour || 0, input.minute || 0, 0, 0);
    let candidate = targetUtc;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const actual = zonedDateParts(new Date(candidate), normalizedTimezone);
        const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0, 0);
        const adjustment = targetUtc - actualUtc;
        if (adjustment === 0)
            break;
        candidate += adjustment;
    }
    return new Date(candidate);
}
function minuteKey(date, timezone = exports.DEFAULT_CRON_TIMEZONE) {
    const parts = zonedDateParts(date, timezone);
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
}
function startOfNextMinute(date) {
    const next = new Date(date);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
    return next;
}
function parseCronNumber(raw, min, max, label) {
    if (!/^\d+$/.test(raw))
        throw new Error(`${label} 字段包含无效值: ${raw}`);
    const value = Number(raw);
    if (value < min || value > max)
        throw new Error(`${label} 字段超出范围: ${raw}`);
    return value;
}
function expandCronField(raw, min, max, label, weekday = false) {
    const value = String(raw || "").trim();
    if (!value)
        throw new Error(`${label} 字段不能为空`);
    const values = new Set();
    for (const item of value.split(",")) {
        const part = item.trim();
        if (!part)
            throw new Error(`${label} 字段包含空片段`);
        const pieces = part.split("/");
        if (pieces.length > 2)
            throw new Error(`${label} 字段步长格式错误: ${part}`);
        const rangePart = pieces[0] || "*";
        const step = pieces[1] == null ? 1 : parseCronNumber(pieces[1], 1, max - min + 1, label);
        let start = min;
        let end = max;
        if (rangePart !== "*" && rangePart !== "?") {
            if (rangePart.includes("-")) {
                const [left, right] = rangePart.split("-");
                start = parseCronNumber(left, min, max, label);
                end = parseCronNumber(right, min, max, label);
                if (start > end)
                    throw new Error(`${label} 字段范围错误: ${rangePart}`);
            }
            else {
                start = parseCronNumber(rangePart, min, max, label);
                end = start;
            }
        }
        for (let current = start; current <= end; current += step) {
            values.add(weekday && current === 7 ? 0 : current);
        }
    }
    return values;
}
function parseCronExpression(expression) {
    const parts = String(expression || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length !== 5) {
        throw new Error("Cron 表达式需要 5 段：分 时 日 月 周");
    }
    return {
        minute: expandCronField(parts[0], 0, 59, "分钟"),
        hour: expandCronField(parts[1], 0, 23, "小时"),
        day: expandCronField(parts[2], 1, 31, "日期"),
        month: expandCronField(parts[3], 1, 12, "月份"),
        weekday: expandCronField(parts[4], 0, 7, "星期", true),
    };
}
function validateCronExpression(expression) {
    parseCronExpression(expression);
}
function matchesCron(expression, date, timezone = exports.DEFAULT_CRON_TIMEZONE) {
    const cron = parseCronExpression(expression);
    const parts = zonedDateParts(date, timezone);
    return cron.minute.has(parts.minute)
        && cron.hour.has(parts.hour)
        && cron.day.has(parts.day)
        && cron.month.has(parts.month)
        && cron.weekday.has(parts.weekday);
}
function computeNextRun(expression, from = new Date(), timezone = exports.DEFAULT_CRON_TIMEZONE) {
    try {
        let cursor = startOfNextMinute(from);
        const maxMinutes = 366 * 24 * 60;
        for (let i = 0; i < maxMinutes; i++) {
            if (matchesCron(expression, cursor, timezone))
                return cursor.toISOString();
            cursor.setMinutes(cursor.getMinutes() + 1);
        }
    }
    catch {
        return null;
    }
    return null;
}
//# sourceMappingURL=schedule-expression.js.map