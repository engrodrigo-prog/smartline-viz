-- Create weather_cache table for caching OpenWeather API responses
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roi_id TEXT NOT NULL DEFAULT 'default',
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  params_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient cache lookups
CREATE INDEX IF NOT EXISTS idx_weather_cache_roi_ts ON public.weather_cache(roi_id, ts DESC);

-- Enable RLS
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read weather cache
CREATE POLICY "Authenticated users can read weather cache"
  ON public.weather_cache
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Service role can insert weather cache (for edge function)
CREATE POLICY "Service role can insert weather cache"
  ON public.weather_cache
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.weather_cache IS 'Cache de dados meteorológicos da OpenWeather API (10 min de TTL)';
