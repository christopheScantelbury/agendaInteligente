-- Vincula serviços ao administrador (tenant owner)
ALTER TABLE servicos
    ADD COLUMN IF NOT EXISTS admin_unico_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_servicos_admin_unico_id ON servicos(admin_unico_id);

-- Backfill com base na unidade do serviço (quando houver vínculo existente)
UPDATE servicos s
SET admin_unico_id = u.admin_unico_id
FROM unidades u
WHERE s.unidade_id = u.id
  AND s.admin_unico_id IS NULL
  AND u.admin_unico_id IS NOT NULL;
