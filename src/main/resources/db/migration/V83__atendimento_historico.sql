-- #174: histórico/evolução de atendimentos da cliente (linha do tempo exibida
-- na ficha de anamnese). Cada registro é um atendimento; o mais antigo é a
-- "cliente nova" e os seguintes viram "Atendimento N" na ordem cronológica.
CREATE TABLE IF NOT EXISTS atendimento_historico (
    id                  BIGSERIAL PRIMARY KEY,
    cliente_id          BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    unidade_id          BIGINT REFERENCES unidades(id),
    data                DATE NOT NULL,
    avaliacao_inicial   TEXT,
    procedimento        TEXT,
    orientacoes         TEXT,
    observacoes         TEXT,
    fotos               TEXT,          -- URLs/descrição das fotos, uma por linha
    proxima_manutencao  DATE,
    data_criacao        TIMESTAMP NOT NULL DEFAULT NOW(),
    data_atualizacao    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_atendimento_historico_cliente
    ON atendimento_historico (cliente_id, data);

CREATE INDEX IF NOT EXISTS idx_atendimento_historico_unidade
    ON atendimento_historico (unidade_id);
