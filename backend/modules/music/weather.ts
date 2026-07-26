import { isIP } from "node:net";

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;

type WeatherSource = "gps" | "configured" | "ip";

type WeatherLocation = {
  latitude: number;
  longitude: number;
  label: string;
  source: WeatherSource;
};

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

const weatherCache = new Map<string, { expiresAt: number; value: CurrentWeatherResult }>();

function finiteCoordinate(value: unknown, min: number, max: number) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function normalizeWeatherCoordinates(lat: unknown, lon: unknown) {
  const latitude = finiteCoordinate(lat, -90, 90);
  const longitude = finiteCoordinate(lon, -180, 180);
  if (latitude === null && longitude === null) return null;
  if (latitude === null || longitude === null) throw new Error("天气定位参数不完整");
  return { latitude, longitude };
}

export function weatherConditionFromWmo(code: unknown) {
  const value = Number(code);
  if (value === 0) return "晴";
  if (value === 1) return "大部晴朗";
  if (value === 2) return "局部多云";
  if (value === 3) return "阴";
  if (value === 45 || value === 48) return "雾";
  if ([51, 53, 55].includes(value)) return "毛毛雨";
  if ([56, 57].includes(value)) return "冻毛毛雨";
  if (value === 61) return "小雨";
  if (value === 63) return "中雨";
  if (value === 65) return "大雨";
  if ([66, 67].includes(value)) return "冻雨";
  if (value === 71) return "小雪";
  if (value === 73) return "中雪";
  if (value === 75) return "大雪";
  if (value === 77) return "米雪";
  if (value === 80) return "小阵雨";
  if (value === 81) return "阵雨";
  if (value === 82) return "强阵雨";
  if (value === 85) return "小阵雪";
  if (value === 86) return "强阵雪";
  if (value === 95) return "雷雨";
  if ([96, 99].includes(value)) return "雷雨伴冰雹";
  return "天气未知";
}

function roundedTemperature(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("天气服务未返回有效温度");
  return Math.round(parsed * 10) / 10;
}

async function fetchJson(url: string, timeoutMs: number) {
  const response = await fetch(url, {
    headers: { "User-Agent": "CCM-Weather/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`天气上游请求失败 (${response.status})`);
  return response.json();
}

export function normalizePublicClientIp(value: unknown) {
  const candidate = String(value || "").split(",")[0].trim().replace(/^::ffff:/, "");
  if (!isIP(candidate)) return "";
  if (candidate === "::1" || /^f[cd]/i.test(candidate) || /^fe[89ab]/i.test(candidate)) return "";
  if (isIP(candidate) === 4) {
    const [a, b] = candidate.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "";
  }
  return candidate;
}

async function detectIpLocation(clientIp = ""): Promise<WeatherLocation> {
  const suffix = clientIp ? `/${encodeURIComponent(clientIp)}` : "";
  try {
    const data: any = await fetchJson(`https://ipwho.is${suffix}?lang=zh`, 4500);
    const latitude = finiteCoordinate(data?.latitude, -90, 90);
    const longitude = finiteCoordinate(data?.longitude, -180, 180);
    if (data?.success !== false && latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
        label: String(data?.city || data?.region || "IP 近似位置"),
        source: "ip",
      };
    }
  } catch (error: any) {
    console.warn("[Music Weather] HTTPS IP location failed:", error?.message || error);
  }

  const legacyIp = clientIp ? `/${encodeURIComponent(clientIp)}` : "";
  const data: any = await fetchJson(`http://ip-api.com/json${legacyIp}?lang=zh-CN`, 3500);
  const latitude = finiteCoordinate(data?.lat, -90, 90);
  const longitude = finiteCoordinate(data?.lon, -180, 180);
  if (data?.status !== "success" || latitude === null || longitude === null) {
    throw new Error("无法确定服务器 IP 近似位置");
  }
  return {
    latitude,
    longitude,
    label: String(data?.city || data?.regionName || "IP 近似位置"),
    source: "ip",
  };
}

async function resolveConfiguredLocation(name: string): Promise<WeatherLocation> {
  const params = new URLSearchParams({
    name,
    count: "1",
    language: "zh",
    format: "json",
  });
  const data: any = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`, 5500);
  const item = Array.isArray(data?.results) ? data.results[0] : null;
  const latitude = finiteCoordinate(item?.latitude, -90, 90);
  const longitude = finiteCoordinate(item?.longitude, -180, 180);
  if (!item || latitude === null || longitude === null) throw new Error(`没有找到天气城市：${name}`);
  const label = [item.name, item.admin1].map((value) => String(value || "").trim()).filter(Boolean);
  return {
    latitude,
    longitude,
    label: [...new Set(label)].join(" · ") || name,
    source: "configured",
  };
}

async function fetchOpenMeteoWeather(location: WeatherLocation): Promise<CurrentWeatherResult> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,apparent_temperature,weather_code",
    temperature_unit: "celsius",
    timezone: "auto",
  });
  const data: any = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`, 6500);
  const current = data?.current;
  const temperature = roundedTemperature(current?.temperature_2m);
  const apparent = Number(current?.apparent_temperature);
  const weatherCode = Number(current?.weather_code);
  if (!Number.isFinite(weatherCode)) throw new Error("天气服务未返回有效天气码");
  const condition = weatherConditionFromWmo(weatherCode);
  return {
    weather: `${condition} ${temperature}°C`,
    condition,
    temperature,
    apparentTemperature: Number.isFinite(apparent) ? Math.round(apparent * 10) / 10 : null,
    weatherCode,
    location: location.label,
    source: location.source,
    accuracy: location.source === "gps" ? "precise" : location.source === "configured" ? "city" : "approximate",
    observedAt: String(current?.time || new Date().toISOString()),
  };
}

export async function resolveCurrentWeather(lat: unknown, lon: unknown, clientIp = "", configuredLocation = "") {
  const coordinates = normalizeWeatherCoordinates(lat, lon);
  const location: WeatherLocation = coordinates
    ? { ...coordinates, label: "当前位置", source: "gps" }
    : String(configuredLocation || "").trim()
      ? await resolveConfiguredLocation(String(configuredLocation).trim())
      : await detectIpLocation(normalizePublicClientIp(clientIp));
  const cacheKey = `${location.source}:${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await fetchOpenMeteoWeather(location);
  weatherCache.set(cacheKey, { expiresAt: Date.now() + WEATHER_CACHE_TTL_MS, value });
  return value;
}

export function runMusicWeatherSelfTest() {
  const checks = {
    acceptsZeroCoordinates: normalizeWeatherCoordinates(0, 0)?.latitude === 0,
    rejectsPartialCoordinates: false,
    mapsClear: weatherConditionFromWmo(0) === "晴",
    mapsHeavyRain: weatherConditionFromWmo(65) === "大雨",
    mapsThunderHail: weatherConditionFromWmo(99) === "雷雨伴冰雹",
    rejectsPrivateIp: normalizePublicClientIp("192.168.1.2") === "",
    acceptsForwardedPublicIp: normalizePublicClientIp("8.8.8.8, 10.0.0.1") === "8.8.8.8",
  };
  try {
    normalizeWeatherCoordinates(31.2, undefined);
  } catch {
    checks.rejectsPartialCoordinates = true;
  }
  return { pass: Object.values(checks).every(Boolean), checks };
}
