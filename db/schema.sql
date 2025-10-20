-- >>> SMARTLINE-EROSION: schema
CREATE TABLE IF NOT EXISTS rain_obs (
  ts TIMESTAMP NOT NULL,
  station_id TEXT,
  p_mm REAL,
  i30_mm_h REAL,
  qc_flag TEXT,
  lon REAL,
  lat REAL
);
CREATE INDEX IF NOT EXISTS rain_obs_ts_idx ON rain_obs(ts);

CREATE TABLE IF NOT EXISTS rain_grid (
  ts TIMESTAMP NOT NULL,
  source TEXT,
  accum_mm REAL,
  i30_proxy REAL,
  raster_path TEXT,
  bbox TEXT
);
CREATE INDEX IF NOT EXISTS rain_grid_ts_idx ON rain_grid(ts);

CREATE TABLE IF NOT EXISTS forecast_grid (
  run TIMESTAMP NOT NULL,
  ts  TIMESTAMP NOT NULL,
  model TEXT,
  accum_mm REAL,
  i30_proxy REAL,
  raster_path TEXT,
  bbox TEXT
);
CREATE INDEX IF NOT EXISTS forecast_grid_ts_idx ON forecast_grid(ts);

CREATE TABLE IF NOT EXISTS risk_tiles (
  ts TIMESTAMP NOT NULL,
  horizon TEXT,
  risk_0_100 REAL,
  a_rusle REAL,
  twi REAL,
  spi REAL,
  raster_path TEXT,
  bbox TEXT
);
-- <<< SMARTLINE-EROSION: schema
