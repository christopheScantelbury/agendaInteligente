-- Regras de comissão. servico_id NULL = regra padrão do profissional.
CREATE TABLE IF NOT EXISTS comissao_regras (
    id                BIGSERIAL PRIMARY KEY,
    atendente_id      BIGINT         NOT NULL REFERENCES atendentes(id) ON DELETE CASCADE,
    servico_id        BIGINT         REFERENCES servicos(id) ON DELETE CASCADE,
    tipo              VARCHAR(20)    NOT NULL,
    valor             NUMERIC(12, 4) NOT NULL,
    admin_unico_id    BIGINT,
    data_criacao      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_comissao_tipo CHECK (tipo IN ('PERCENTUAL', 'FIXO')),
    CONSTRAINT uk_comissao_regra UNIQUE (atendente_id, servico_id)
);

CREATE INDEX IF NOT EXISTS idx_comissao_regras_atendente ON comissao_regras(atendente_id);

-- Lote de pagamento de comissão para um profissional
CREATE TABLE IF NOT EXISTS comissao_pagamentos (
    id              BIGSERIAL PRIMARY KEY,
    atendente_id    BIGINT         NOT NULL REFERENCES atendentes(id),
    valor_total     NUMERIC(12, 2) NOT NULL,
    data_pagamento  DATE           NOT NULL DEFAULT CURRENT_DATE,
    pago_por_id     BIGINT         REFERENCES usuarios(id),
    forma_pagamento VARCHAR(40),
    observacao      VARCHAR(500),
    admin_unico_id  BIGINT,
    data_criacao    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comissao_pagamentos_atendente ON comissao_pagamentos(atendente_id);

-- Lançamento individual de comissão (1 por serviço de agendamento concluído)
CREATE TABLE IF NOT EXISTS comissao_lancamentos (
    id                       BIGSERIAL PRIMARY KEY,
    atendente_id             BIGINT         NOT NULL REFERENCES atendentes(id),
    agendamento_id           BIGINT         NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    agendamento_servico_id   BIGINT         REFERENCES agendamento_servicos(id) ON DELETE CASCADE,
    valor_base               NUMERIC(12, 2) NOT NULL,
    tipo_aplicado            VARCHAR(20)    NOT NULL,
    valor_regra              NUMERIC(12, 4) NOT NULL,
    valor_comissao           NUMERIC(12, 2) NOT NULL,
    status                   VARCHAR(20)    NOT NULL DEFAULT 'PENDENTE',
    pagamento_id             BIGINT         REFERENCES comissao_pagamentos(id) ON DELETE SET NULL,
    data_calculo             TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_comissao_status CHECK (status IN ('PENDENTE','PAGA')),
    CONSTRAINT uk_lancamento_servico UNIQUE (agendamento_servico_id)
);

CREATE INDEX IF NOT EXISTS idx_comissao_lanc_atendente ON comissao_lancamentos(atendente_id);
CREATE INDEX IF NOT EXISTS idx_comissao_lanc_status ON comissao_lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_comissao_lanc_pagamento ON comissao_lancamentos(pagamento_id);
