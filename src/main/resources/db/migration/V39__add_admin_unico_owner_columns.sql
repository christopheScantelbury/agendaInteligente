-- Isolamento de dados por ADMINISTRADOR
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS admin_unico_id BIGINT;

ALTER TABLE empresas
    ADD COLUMN IF NOT EXISTS admin_unico_id BIGINT;

ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS admin_unico_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_usuarios_admin_unico_id ON usuarios(admin_unico_id);
CREATE INDEX IF NOT EXISTS idx_empresas_admin_unico_id ON empresas(admin_unico_id);
CREATE INDEX IF NOT EXISTS idx_unidades_admin_unico_id ON unidades(admin_unico_id);

-- Backfill: ADMINISTRADOR é dono de si mesmo
UPDATE usuarios
SET admin_unico_id = id
WHERE perfil_sistema IN ('ADMINISTRADOR', 'ADMIN_UNICO')
  AND admin_unico_id IS NULL;
