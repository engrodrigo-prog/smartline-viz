import { Hono } from "hono";
import NodeCache from "node-cache";

import { env } from "../env.js";

const ttl = Number.isFinite(env.WEATHER_CACHE_TTL_SEC) ? env.WEATHER_CACHE_TTL_SEC : 300;
const cache = new NodeCache({ stdTTL: ttl, checkperiod: Math.max(30, Math.floor(ttl / 2)) });

const normalizeGrid = (value: number) => Math.round(value * 4) / 4;

const buildCacheKey = (lat: number, lon: number) => `${normalizeGrid(lat).toFixed(2)}_${normalizeGrid(lon).toFixed(2)}`;

const WEATHER_FIELDS = ["current", "hourly"] as const;

type WeatherPayload = {
  current?: { wind_speed?: number; wind_deg?: number; dt?: number };
  hourly?: Array<{ wind_speed?: number; wind_deg?: number; dt?: number }>;
};

const fetchWeather = async (lat: number, lon: number): Promise<WeatherPayload> => {
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

export const getWindData = async (lat: number, lon: number) => {
  const key = buildCacheKey(lat, lon);
  const cached = cache.get<WeatherPayload>(key);
  if (cached) {
    return { ...cached, cached: true };
  }

  const fresh = await fetchWeather(lat, lon);
  cache.set(key, fresh);
  return { ...fresh, cached: false };
};

const weatherRoutes = new Hono();

weatherRoutes.get("/wind", async (c) => {
  const latParam = c.req.query("lat");
  const lonParam = c.req.query("lon");

  if (!latParam || !lonParam) {
    return c.json({ error: "Informe lat e lon" }, 400);
  }

  const lat = Number(latParam);
  const lon = Number(lonParam);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return c.json({ error: "lat/lon inválidos" }, 400);
  }

  try {
    const data = await getWindData(lat, lon);
    const payload: Record<string, unknown> = { cached: data.cached };
    WEATHER_FIELDS.forEach((field) => {
      if (data[field]) payload[field] = data[field];
    });
    return c.json(payload);
  } catch (error: any) {
    return c.json({ error: error?.message ?? "Falha ao consultar vento" }, 502);
  }
});

export default weatherRoutes;
