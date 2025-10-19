-- Criar tabela de equipes
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  skill_type TEXT CHECK (skill_type IN ('electrician', 'technician', 'leadership', 'support')),
  supervisor_name VARCHAR(100),
  members_count INTEGER DEFAULT 0,
  tenant_id UUID REFERENCES public.tenant(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de veículos
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate VARCHAR(10) NOT NULL UNIQUE,
  model VARCHAR(100),
  brand VARCHAR(50),
  year INTEGER,
  
  -- Localização em Tempo Real (PostGIS)
  current_location GEOGRAPHY(POINT, 4326),
  last_update TIMESTAMPTZ DEFAULT now(),
  speed_kmh NUMERIC(5, 2),
  heading INTEGER,
  
  -- Equipe Atribuída
  assigned_team_id UUID REFERENCES public.teams(id),
  skill_type TEXT CHECK (skill_type IN ('electrician', 'technician', 'leadership', 'support')),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  fuel_level NUMERIC(5, 2),
  odometer_km INTEGER,
  
  -- Integração Externa
  external_id TEXT,
  integration_source TEXT,
  
  metadata JSONB DEFAULT '{}',
  tenant_id UUID REFERENCES public.tenant(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de histórico de veículos
CREATE TABLE public.vehicle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  speed_kmh NUMERIC(5, 2),
  heading INTEGER,
  event_type TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX idx_vehicles_skill ON public.vehicles(skill_type);
CREATE INDEX idx_vehicles_location ON public.vehicles USING GIST(current_location);
CREATE INDEX idx_vehicles_team ON public.vehicles(assigned_team_id);
CREATE INDEX idx_vehicles_plate ON public.vehicles(plate);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);

CREATE INDEX idx_vehicle_history_vehicle ON public.vehicle_history(vehicle_id);
CREATE INDEX idx_vehicle_history_timestamp ON public.vehicle_history(timestamp DESC);
CREATE INDEX idx_vehicle_history_location ON public.vehicle_history USING GIST(location);

-- Trigger para updated_at
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read teams"
ON public.teams FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read vehicles"
ON public.vehicles FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vehicles"
ON public.vehicles FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vehicles"
ON public.vehicles FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read vehicle history"
ON public.vehicle_history FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vehicle history"
ON public.vehicle_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Atualizar tabela sensors para novos tipos
ALTER TABLE public.sensors 
DROP CONSTRAINT IF EXISTS sensors_sensor_type_check;

ALTER TABLE public.sensors 
ADD CONSTRAINT sensors_sensor_type_check 
CHECK (sensor_type IN (
  'meteorological', 'structural', 'camera_iot', 'corrosion', 'vibration',
  'temperature', 'noise', 'perimeter_alarm', 'presence_camera', 'short_circuit'
));

-- Adicionar campos em sensor_readings
ALTER TABLE public.sensor_readings
ADD COLUMN IF NOT EXISTS noise_level NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS presence_detected BOOLEAN,
ADD COLUMN IF NOT EXISTS intrusion_alert BOOLEAN,
ADD COLUMN IF NOT EXISTS short_circuit_current NUMERIC(8, 2);