-- Permitir cadastro de cliente sem CPF/CNPJ e sem data de nascimento
ALTER TABLE clientes
    ALTER COLUMN cpf_cnpj DROP NOT NULL,
    ALTER COLUMN data_nascimento DROP NOT NULL;

COMMENT ON COLUMN clientes.cpf_cnpj IS 'CPF/CNPJ do cliente (opcional, único quando informado)';
COMMENT ON COLUMN clientes.data_nascimento IS 'Data de nascimento do cliente (opcional)';
