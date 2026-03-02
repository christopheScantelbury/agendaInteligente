-- Adiciona campo de observação/referência no cadastro de clientes
ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS observacao VARCHAR(500);

COMMENT ON COLUMN clientes.observacao IS 'Observações e referências do cliente';
