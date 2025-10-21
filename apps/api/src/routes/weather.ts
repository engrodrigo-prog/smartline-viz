import { Hono } from "hono";
import NodeCache from "node-cache";

import { env } from "../env.js";

const ttl = Number.isFinite(env.WEATHER_CACHE_TTL_SEC) ? env.WEATHER_CACHE_TTL_SEC : 300;
const cache = new NodeCache({ stdTTL: ttl, checkperiod: Math.max(30, Math.floor(ttl / 2)) });

const normalizeGrid = (value: number) => Math.round(value * 4) / 4;

const buildCacheKey = (lat: number, lon: number, height?: number) =>
  `${normalizeGrid(lat).toFixed(2)}_${normalizeGrid(lon).toFixed(2)}_${height ? Math.round(height) : 10}`;

const WEATHER_FIELDS = ["current", "hourly"] as const;

type WeatherPayload = {
  current?: { wind_speed?: number; wind_deg?: number; dt?: number };
  hourly?: Array<{ wind_speed?: number; wind_deg?: number; dt?: number }>;
};

const fetchWeatherOpenWeather = async (lat: number, lon: number): Promise<WeatherPayload> => {
  if (!env.OPENWEATHER_API_KEY) {
    throw new Error("OPENWEATHER_API_KEY não configurada");
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    exclude: "minutely,daily,alerts",
    units: "metric",
    appid: env.OPENWEATHER_API_KEY
  });

  const url = `${env.OPENWEATHER_ONECALL_URL}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenWeather retornou ${response.status}`);
  }

  const json = await response.json();
  const payload: WeatherPayload = {};

  if (json.current) {
    payload.current = {
      wind_speed: Number(json.current.wind_speed ?? 0),
      wind_deg: Number(json.current.wind_deg ?? 0),
      dt: Number(json.current.dt ?? Date.now() / 1000)
    };
  }

  if (Array.isArray(json.hourly)) {
    payload.hourly = json.hourly.slice(0, 24).map((item: any) => ({
      wind_speed: Number(item.wind_speed ?? 0),
      wind_deg: Number(item.wind_deg ?? 0),
      dt: Number(item.dt ?? 0)
    }));
  }

  return payload;
};

const pickLevel = (height?: number) => (height && height >= 50 ? 100 : 10);

const fetchWeatherOpenMeteo = async (lat: number, lon: number, height?: number): Promise<WeatherPayload> => {
  const level = pickLevel(height);
  const hourly = [
    `windspeed_${level}m`,
    `winddirection_${level}m`,
    `windgusts_10m`
  ];
  const current = [
    `windspeed_${level}m`,
    `winddirection_${level}m`,
    `windgusts_10m`
  ];

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: hourly.join(","),
    current: current.join(","),
    timezone: "UTC"
  });

  const url = `${env.OPENMETEO_BASE_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo retornou ${res.status}`);
  }
  const json = await res.json();

  const payload: WeatherPayload = {};

  // current
  if (json.current) {
    const ws = json.current[`windspeed_${level}m`];
    const wd = json.current[`winddirection_${level}m`];
    const dt = json.current?.time ? Math.floor(Date.parse(json.current.time) / 1000) : Math.floor(Date.now() / 1000);
    payload.current = {
      wind_speed: Number(ws ?? 0),
      wind_deg: Number(wd ?? 0),
      dt
    };
  }

  // hourly — map time array
  if (json.hourly?.time && Array.isArray(json.hourly.time)) {
    const times: string[] = json.hourly.time;
    const wsArr: number[] = json.hourly[`windspeed_${level}m`] ?? [];
    const wdArr: number[] = json.hourly[`winddirection_${level}m`] ?? [];
    payload.hourly = times.slice(0, 24).map((t: string, i: number) => ({
      wind_speed: Number(wsArr[i] ?? 0),
      wind_deg: Number(wdArr[i] ?? 0),
      dt: Math.floor(Date.parse(t) / 1000)
    }));
  }

  return payload;
};

export const getWindData = async (lat: number, lon: number, height?: number) => {
  const key = buildCacheKey(lat, lon, height);
  const cached = cache.get<WeatherPayload>(key);
  if (cached) {
    return { ...cached, cached: true };
  }

  let fresh: WeatherPayload | null = null;
  // Try OpenWeather first if API key is set
  if (env.OPENWEATHER_API_KEY) {
    try {
      fresh = await fetchWeatherOpenWeather(lat, lon);
    } catch (err) {
      // fall through to Open-Meteo
    }
  }

  if (!fresh) {
    // Open-Meteo is free and does not require API key
    fresh = await fetchWeatherOpenMeteo(lat, lon, height);
  }

  cache.set(key, fresh);
  return { ...fresh, cached: false };
};

const weatherRoutes = new Hono();

weatherRoutes.get("/wind", async (c) => {
  const latParam = c.req.query("lat");
  const lonParam = c.req.query("lon");
  const heightParam = c.req.query("height");

  if (!latParam || !lonParam) {
    return c.json({ error: "Informe lat e lon" }, 400);
  }

  const lat = Number(latParam);
  const lon = Number(lonParam);
  const height = heightParam ? Number(heightParam) : undefined;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return c.json({ error: "lat/lon inválidos" }, 400);
  }

  try {
    const data = await getWindData(lat, lon, height);
    const payload: Record<string, unknown> = { cached: (data as any).cached };
    WEATHER_FIELDS.forEach((field) => {
      if ((data as any)[field]) payload[field] = (data as any)[field];
    });
    return c.json(payload);
  } catch (error: any) {
    return c.json({ error: error?.message ?? "Falha ao consultar vento" }, 502);
  }
});

export default weatherRoutes;
