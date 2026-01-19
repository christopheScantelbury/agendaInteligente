-- Adicionar campos de logo e cor do app às unidades
ALTER TABLE unidades 
    ADD COLUMN IF NOT EXISTS logo TEXT,
    ADD COLUMN IF NOT EXISTS cor_app VARCHAR(7);

COMMENT ON COLUMN unidades.logo IS 'Logo da empresa em base64 (comprimida)';
COMMENT ON COLUMN unidades.cor_app IS 'Cor principal do app em formato hexadecimal (ex: #FF5733)';
