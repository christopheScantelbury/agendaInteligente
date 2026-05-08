ALTER TABLE unidades ADD COLUMN IF NOT EXISTS razao_social VARCHAR(200);
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS cnpj VARCHAR(14);
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20);
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20);
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);

UPDATE unidades u
SET
    razao_social = c.razao_social,
    cnpj = c.cnpj,
    inscricao_municipal = c.inscricao_municipal,
    inscricao_estadual = c.inscricao_estadual,
    complemento = c.complemento
FROM clinicas c
WHERE u.clinica_id = c.id;

ALTER TABLE gerentes ADD COLUMN IF NOT EXISTS unidade_id BIGINT;

UPDATE gerentes g
SET unidade_id = (
    SELECT u.id FROM unidades u
    WHERE u.clinica_id = g.clinica_id
    ORDER BY u.id ASC
    LIMIT 1
)
WHERE g.clinica_id IS NOT NULL AND g.unidade_id IS NULL;

ALTER TABLE unidades DROP CONSTRAINT IF EXISTS fk_unidades_clinica;
ALTER TABLE unidades DROP COLUMN IF EXISTS clinica_id;

ALTER TABLE gerentes DROP CONSTRAINT IF EXISTS fk_gerentes_clinica;
ALTER TABLE gerentes DROP COLUMN IF EXISTS clinica_id;

DROP TABLE IF EXISTS clinicas;
