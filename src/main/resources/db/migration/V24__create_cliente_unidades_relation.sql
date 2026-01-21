-- Criar tabela de relacionamento many-to-many entre clientes e unidades
CREATE TABLE IF NOT EXISTS cliente_unidades (
    cliente_id BIGINT NOT NULL,
    unidade_id BIGINT NOT NULL,
    PRIMARY KEY (cliente_id, unidade_id),
    CONSTRAINT fk_cliente_unidade_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    CONSTRAINT fk_cliente_unidade_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cliente_unidades_cliente_id ON cliente_unidades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_unidades_unidade_id ON cliente_unidades(unidade_id);

COMMENT ON TABLE cliente_unidades IS 'Tabela de relacionamento many-to-many entre clientes e unidades';
