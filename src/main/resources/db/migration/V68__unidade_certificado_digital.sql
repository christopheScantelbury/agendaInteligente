-- Certificado digital A1 (PKCS12 .pfx/.p12) necessário pra assinar XML da NFS-e.
-- Storage: base64 do PFX + senha (criptografada idealmente — TODO migrar para AWS KMS
-- quando o stack tiver KMS configurado). Metadata extraída no upload pra evitar parsing
-- repetido (CN, validade).
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS certificado_pfx_base64 TEXT;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS certificado_senha VARCHAR(500);
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS certificado_cn VARCHAR(200);
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS certificado_valido_de DATE;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS certificado_valido_ate DATE;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS certificado_data_upload TIMESTAMP;
