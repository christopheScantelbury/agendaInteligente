-- Tornar data_nascimento opcional para clientes
ALTER TABLE clientes
    ALTER COLUMN data_nascimento DROP NOT NULL;

COMMENT ON COLUMN clientes.data_nascimento IS 'Data de nascimento do cliente (opcional)';
