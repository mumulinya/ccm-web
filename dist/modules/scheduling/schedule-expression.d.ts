export declare const DEFAULT_CRON_TIMEZONE = "Asia/Shanghai";
export declare function pad2(value: number): string;
export declare function normalizeCronTimezone(value: any): string;
export declare function zonedDateParts(date: Date, timezone: string): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    weekday: number;
};
export declare function dateKeyInTimezone(date?: Date, timezone?: string): string;
export declare function zonedDateTimeToDate(input: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
}, timezone?: string): Date;
export declare function minuteKey(date: Date, timezone?: string): string;
export declare function validateCronExpression(expression: string): void;
export declare function matchesCron(expression: string, date: Date, timezone?: string): boolean;
export declare function computeNextRun(expression: string, from?: Date, timezone?: string): string;
