-- Criar tabela de reclamações anônimas
CREATE TABLE IF NOT EXISTS reclamacoes (
    id BIGSERIAL PRIMARY KEY,
    mensagem TEXT NOT NULL,
    unidade_id BIGINT,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    data_criacao TIMESTAMP NOT NULL,
    data_leitura TIMESTAMP,
    CONSTRAINT fk_reclamacao_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reclamacoes_unidade_id ON reclamacoes(unidade_id);
CREATE INDEX IF NOT EXISTS idx_reclamacoes_lida ON reclamacoes(lida);
CREATE INDEX IF NOT EXISTS idx_reclamacoes_data_criacao ON reclamacoes(data_criacao DESC);

COMMENT ON TABLE reclamacoes IS 'Tabela para armazenar reclamações anônimas dos clientes';
COMMENT ON COLUMN reclamacoes.mensagem IS 'Mensagem da reclamação';
COMMENT ON COLUMN reclamacoes.unidade_id IS 'ID da unidade relacionada (opcional)';
COMMENT ON COLUMN reclamacoes.lida IS 'Indica se a reclamação foi lida pelo gerente/admin';
COMMENT ON COLUMN reclamacoes.data_criacao IS 'Data e hora de criação da reclamação';
COMMENT ON COLUMN reclamacoes.data_leitura IS 'Data e hora em que a reclamação foi marcada como lida';
