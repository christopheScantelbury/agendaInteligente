-- Adicionar categoria de empresa na tabela clinicas
ALTER TABLE clinicas 
    ADD COLUMN IF NOT EXISTS categoria_empresa VARCHAR(50);

-- Adicionar senha na tabela clientes para autenticação
ALTER TABLE clientes 
    ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- Adicionar campo ativo em clientes (se não existir)
ALTER TABLE clientes 
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- Índice para busca por email em clientes (para login)
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email) WHERE email IS NOT NULL;

-- Comentários
COMMENT ON COLUMN clinicas.categoria_empresa IS 'Categoria do negócio: ACADEMIA, CONSULTORIO_MEDICO, etc.';
COMMENT ON COLUMN clientes.senha IS 'Senha criptografada para autenticação do cliente';
COMMENT ON COLUMN clientes.ativo IS 'Indica se o cliente está ativo no sistema';

