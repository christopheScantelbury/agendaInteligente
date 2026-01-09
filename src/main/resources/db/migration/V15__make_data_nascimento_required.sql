-- Tornar data_nascimento obrigatória na tabela clientes
ALTER TABLE clientes 
    ALTER COLUMN data_nascimento SET NOT NULL;

-- Comentário
COMMENT ON COLUMN clientes.data_nascimento IS 'Data de nascimento do cliente (obrigatória)';


