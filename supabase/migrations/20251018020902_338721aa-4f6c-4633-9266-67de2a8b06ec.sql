-- Tabela de sensores físicos instalados
CREATE TABLE public.sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sensor_type TEXT NOT NULL CHECK (sensor_type IN ('meteorological', 'structural', 'camera_iot', 'corrosion', 'vibration')),
  line_code TEXT,
  region CHAR(1) CHECK (region IN ('A', 'B', 'C')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  installed_at TIMESTAMPTZ DEFAULT now(),
  last_maintenance TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  tenant_id UUID REFERENCES public.tenant(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de leituras de sensores (time-series)
CREATE TABLE public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  temperature NUMERIC(5, 2),
  humidity NUMERIC(5, 2),
  wind_speed NUMERIC(5, 2),
  corrosion_level NUMERIC(5, 2),
  vibration_level NUMERIC(5, 2),
  luminosity NUMERIC(8, 2),
  status TEXT CHECK (status IN ('normal', 'warning', 'critical')),
  metadata JSONB DEFAULT '{}'
);

-- Tabela de câmeras instaladas
CREATE TABLE public.cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  camera_type TEXT CHECK (camera_type IN ('fixed', 'ptz', 'thermal', 'drone')),
  line_code TEXT,
  region CHAR(1) CHECK (region IN ('A', 'B', 'C')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance')),
  stream_url TEXT,
  thumbnail_url TEXT,
  installed_at TIMESTAMPTZ DEFAULT now(),
  last_snapshot TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  tenant_id UUID REFERENCES public.tenant(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de gravações históricas
CREATE TABLE public.camera_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  file_url TEXT,
  thumbnail_url TEXT,
  event_type TEXT CHECK (event_type IN ('scheduled', 'motion', 'alert', 'manual')),
  metadata JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX idx_sensor_readings_sensor_id ON public.sensor_readings(sensor_id);
CREATE INDEX idx_sensor_readings_timestamp ON public.sensor_readings(timestamp DESC);
CREATE INDEX idx_sensors_line_code ON public.sensors(line_code);
CREATE INDEX idx_sensors_region ON public.sensors(region);
CREATE INDEX idx_cameras_line_code ON public.cameras(line_code);
CREATE INDEX idx_cameras_region ON public.cameras(region);
CREATE INDEX idx_camera_recordings_camera_id ON public.camera_recordings(camera_id);
CREATE INDEX idx_camera_recordings_start_time ON public.camera_recordings(start_time DESC);

-- RLS Policies
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sensors"
ON public.sensors FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sensors"
ON public.sensors FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sensors"
ON public.sensors FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read sensor readings"
ON public.sensor_readings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sensor readings"
ON public.sensor_readings FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read cameras"
ON public.cameras FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cameras"
ON public.cameras FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cameras"
ON public.cameras FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read recordings"
ON public.camera_recordings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert recordings"
ON public.camera_recordings FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sensors_updated_at
BEFORE UPDATE ON public.sensors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cameras_updated_at
BEFORE UPDATE ON public.cameras
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();