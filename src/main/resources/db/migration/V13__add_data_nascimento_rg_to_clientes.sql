-- Adicionar campos data_nascimento e rg na tabela clientes
ALTER TABLE clientes 
    ADD COLUMN IF NOT EXISTS data_nascimento DATE;

ALTER TABLE clientes 
    ADD COLUMN IF NOT EXISTS rg VARCHAR(20);

-- Comentários
COMMENT ON COLUMN clientes.data_nascimento IS 'Data de nascimento do cliente';
COMMENT ON COLUMN clientes.rg IS 'Registro Geral (RG) do cliente';


