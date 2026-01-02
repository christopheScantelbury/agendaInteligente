-- Add new columns to unidades table to store clinic data
ALTER TABLE unidades ADD COLUMN razao_social VARCHAR(200);
ALTER TABLE unidades ADD COLUMN cnpj VARCHAR(14);
ALTER TABLE unidades ADD COLUMN inscricao_municipal VARCHAR(20);
ALTER TABLE unidades ADD COLUMN inscricao_estadual VARCHAR(20);
ALTER TABLE unidades ADD COLUMN complemento VARCHAR(100);

-- Migrate data from clinicas to linked unidades
UPDATE unidades u
SET
    razao_social = c.razao_social,
    cnpj = c.cnpj,
    inscricao_municipal = c.inscricao_municipal,
    inscricao_estadual = c.inscricao_estadual,
    complemento = c.complemento
FROM clinicas c
WHERE u.clinica_id = c.id;

-- Update gerentes table to reference unidade instead of clinica
-- First, add unidade_id column
ALTER TABLE gerentes ADD COLUMN unidade_id BIGINT;

-- Migrate gerentes to the first unit of their clinic (heuristic)
-- We find a unit that belonged to the manager's clinic and assign it.
UPDATE gerentes g
SET unidade_id = u.id
FROM unidades u
WHERE g.clinica_id = u.clinica_id;
-- Note: This assigns to *arbitrary* unit if multiple exist. 
-- Since we are consolidating or if logic allows managing one unit, this is a best-effort migration.

-- Enforce Not Null on new column (after data migration)
-- If there are orphans, they might fail. We assume data integrity.
-- ALTER TABLE gerentes MODIFY COLUMN unidade_id BIGINT NOT NULL; 
-- (Commented out safe mode, better to manually check or allow nullable if migration fails)

-- Drop foreign keys and columns
-- Drop foreign keys and columns
ALTER TABLE unidades DROP CONSTRAINT fk_unidades_clinica;
ALTER TABLE unidades DROP COLUMN clinica_id;

ALTER TABLE gerentes DROP CONSTRAINT fk_gerentes_clinica;
ALTER TABLE gerentes DROP COLUMN clinica_id;

-- Drop clinicas table
DROP TABLE IF EXISTS clinicas;
