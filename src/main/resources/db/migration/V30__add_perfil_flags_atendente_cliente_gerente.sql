-- Flags para identificar o tipo do perfil (permite usar qualquer nome no perfil)
ALTER TABLE perfis
    ADD COLUMN IF NOT EXISTS atendente BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cliente BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS gerente BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN perfis.atendente IS 'Indica se este perfil é de atendente/profissional (presta serviços)';
COMMENT ON COLUMN perfis.cliente IS 'Indica se este perfil é de cliente';
COMMENT ON COLUMN perfis.gerente IS 'Indica se este perfil é de gerente';

-- Atualizar perfis do sistema existentes
UPDATE perfis SET gerente = TRUE WHERE nome = 'GERENTE';
UPDATE perfis SET atendente = TRUE WHERE nome IN ('PROFISSIONAL', 'ATENDENTE');
UPDATE perfis SET cliente = TRUE WHERE nome = 'CLIENTE';
