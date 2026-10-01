type WeatherSource = "gps" | "configured" | "ip";
export type CurrentWeatherResult = {
    weather: string;
    condition: string;
    temperature: number;
    apparentTemperature: number | null;
    weatherCode: number;
    location: string;
    source: WeatherSource;
    accuracy: "precise" | "city" | "approximate";
    observedAt: string;
};
export declare function normalizeWeatherCoordinates(lat: unknown, lon: unknown): {
    latitude: number;
    longitude: number;
};
export declare function weatherConditionFromWmo(code: unknown): "晴" | "大部晴朗" | "局部多云" | "阴" | "雾" | "毛毛雨" | "冻毛毛雨" | "小雨" | "中雨" | "大雨" | "冻雨" | "小雪" | "中雪" | "大雪" | "米雪" | "小阵雨" | "阵雨" | "强阵雨" | "小阵雪" | "强阵雪" | "雷雨" | "雷雨伴冰雹" | "天气未知";
export declare function normalizePublicClientIp(value: unknown): string;
export declare function resolveCurrentWeather(lat: unknown, lon: unknown, clientIp?: string, configuredLocation?: string): Promise<CurrentWeatherResult>;
export declare function runMusicWeatherSelfTest(): {
    pass: boolean;
    checks: {
        acceptsZeroCoordinates: boolean;
        rejectsPartialCoordinates: boolean;
        mapsClear: boolean;
        mapsHeavyRain: boolean;
        mapsThunderHail: boolean;
        rejectsPrivateIp: boolean;
        acceptsForwardedPublicIp: boolean;
    };
};
export {};
