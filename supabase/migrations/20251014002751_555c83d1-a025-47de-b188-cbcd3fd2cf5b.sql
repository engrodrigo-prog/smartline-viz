-- Adicionar campos de empresa, material e tensão à tabela infrastructure
ALTER TABLE infrastructure 
ADD COLUMN IF NOT EXISTS empresa TEXT,
ADD COLUMN IF NOT EXISTS tipo_material TEXT CHECK (tipo_material IN ('Concreto', 'Metálica', 'Madeira')),
ADD COLUMN IF NOT EXISTS tensao_kv TEXT CHECK (tensao_kv IN ('34,5kV', '69kV', '88kV', '138kV', '230kV', '440kV', 'Acima de 440kV')),
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS organization TEXT;

-- Atualizar dados existentes para não quebrar queries
UPDATE infrastructure 
SET empresa = COALESCE(empresa, 'CPFL Piratininga')
WHERE empresa IS NULL;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_infra_empresa ON infrastructure(empresa);
CREATE INDEX IF NOT EXISTS idx_infra_regiao ON infrastructure(regiao);
CREATE INDEX IF NOT EXISTS idx_infra_tensao ON infrastructure(tensao_kv);
CREATE INDEX IF NOT EXISTS idx_infra_material ON infrastructure(tipo_material);
CREATE INDEX IF NOT EXISTS idx_infra_uploaded ON infrastructure(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_infra_org ON infrastructure(organization);

-- Adicionar campos às outras tabelas geodata
ALTER TABLE linhas_transmissao
ADD COLUMN IF NOT EXISTS empresa TEXT,
ADD COLUMN IF NOT EXISTS tipo_material TEXT;

ALTER TABLE estruturas
ADD COLUMN IF NOT EXISTS empresa TEXT,
ADD COLUMN IF NOT EXISTS tipo_material TEXT,
ADD COLUMN IF NOT EXISTS tensao_kv TEXT;

ALTER TABLE eventos_geo
ADD COLUMN IF NOT EXISTS empresa TEXT;

ALTER TABLE geodata_outros
ADD COLUMN IF NOT EXISTS empresa TEXT,
ADD COLUMN IF NOT EXISTS tensao_kv TEXT,
ADD COLUMN IF NOT EXISTS tipo_material TEXT;