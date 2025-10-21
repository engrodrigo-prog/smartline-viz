import 'dotenv/config'
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 8080),
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',').map(s=>s.trim()),
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'change_me',
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  REDIS_URL: process.env.REDIS_URL,
  FIRMS_WFS_BASE: process.env.FIRMS_WFS_BASE ?? 'https://firms.modaps.eosdis.nasa.gov/mapserver/wfs/South_America',
  // Use WFS key; if absent, fall back to general FIRMS API key
  FIRMS_WFS_KEY: process.env.FIRMS_WFS_KEY ?? process.env.FIRMS_API_KEY,
  FIRMS_DEFAULT_TYPENAMES: (process.env.FIRMS_DEFAULT_TYPENAMES ?? 'ms:fires_noaa20_24hrs,ms:fires_noaa21_24hrs,ms:fires_npp_24hrs,ms:fires_modis_24hrs').split(',').map((s) => s.trim()).filter(Boolean),
  FIRMS_DEFAULT_COUNT: Number(process.env.FIRMS_DEFAULT_COUNT ?? 5000),
  FIRMS_CACHE_TTL_SEC: Number(process.env.FIRMS_CACHE_TTL_SEC ?? 600),
  POINTCLOUD_DATA_DIR: process.env.POINTCLOUD_DATA_DIR ?? 'apps/api/.data/pointclouds',
  POINTCLOUD_MAX_POINTS_PER_PLAN: Number(process.env.POINTCLOUD_MAX_POINTS_PER_PLAN ?? 200000),
  POINTCLOUD_PROFILE_STEP_M: Number(process.env.POINTCLOUD_PROFILE_STEP_M ?? 0.5),
  POINTCLOUD_CORRIDOR_BUFFER_M: Number(process.env.POINTCLOUD_CORRIDOR_BUFFER_M ?? 25),
  MEDIA_DATA_DIR: process.env.MEDIA_DATA_DIR ?? 'apps/api/.data/media',
  VIDEO_FRAME_INTERVAL_S: (() => {
    const raw = Number(process.env.VIDEO_FRAME_INTERVAL_S ?? 1);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  })(),
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'notificacoes@smartline.local',
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  OPENWEATHER_ONECALL_URL: process.env.OPENWEATHER_ONECALL_URL ?? 'https://api.openweathermap.org/data/2.5/onecall',
  OPENMETEO_BASE_URL: process.env.OPENMETEO_BASE_URL ?? 'https://api.open-meteo.com/v1/forecast',
  WEATHER_CACHE_TTL_SEC: Number(process.env.WEATHER_CACHE_TTL_SEC ?? 300),
  QUEIMADAS_LINE_BUFFER_M: Number(process.env.QUEIMADAS_LINE_BUFFER_M ?? 200),
  QUEIMADAS_CONE_HALF_ANGLE_DEG: Number(process.env.QUEIMADAS_CONE_HALF_ANGLE_DEG ?? 30),
}
