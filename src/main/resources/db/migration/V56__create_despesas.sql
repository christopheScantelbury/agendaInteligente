-- Categorias de despesa (customizáveis por admin_unico)
CREATE TABLE IF NOT EXISTS categorias_despesa (
    id              BIGSERIAL PRIMARY KEY,
    nome            VARCHAR(80)  NOT NULL,
    cor             VARCHAR(7),
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE,
    admin_unico_id  BIGINT,
    data_criacao    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_categoria_despesa_nome_admin UNIQUE (nome, admin_unico_id)
);

CREATE INDEX IF NOT EXISTS idx_categorias_despesa_admin ON categorias_despesa(admin_unico_id);

-- Despesas (fixas e variáveis)
CREATE TABLE IF NOT EXISTS despesas (
    id                      BIGSERIAL PRIMARY KEY,
    nome                    VARCHAR(200)   NOT NULL,
    descricao               VARCHAR(1000),
    valor                   NUMERIC(12, 2) NOT NULL,
    data_competencia        DATE           NOT NULL,
    data_vencimento         DATE           NOT NULL,
    data_pagamento          DATE,
    categoria_id            BIGINT         NOT NULL REFERENCES categorias_despesa(id),
    unidade_id              BIGINT         NOT NULL REFERENCES unidades(id),
    admin_unico_id          BIGINT,
    fornecedor              VARCHAR(200),
    forma_pagamento         VARCHAR(40),
    status                  VARCHAR(20)    NOT NULL DEFAULT 'RASCUNHO',
    recorrencia             VARCHAR(20)    NOT NULL DEFAULT 'NENHUMA',
    despesa_origem_id       BIGINT         REFERENCES despesas(id) ON DELETE SET NULL,
    reembolsavel            BOOLEAN        NOT NULL DEFAULT FALSE,
    centro_custo            VARCHAR(80),
    criado_por_id           BIGINT         REFERENCES usuarios(id),
    atualizado_por_id       BIGINT         REFERENCES usuarios(id),
    aprovado_por_id         BIGINT         REFERENCES usuarios(id),
    pago_por_id             BIGINT         REFERENCES usuarios(id),
    data_criacao            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_despesa_status CHECK (status IN ('RASCUNHO','APROVADA','PAGA','CANCELADA')),
    CONSTRAINT chk_despesa_recorrencia CHECK (recorrencia IN ('NENHUMA','MENSAL','TRIMESTRAL','ANUAL'))
);

CREATE INDEX IF NOT EXISTS idx_despesas_unidade ON despesas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_despesas_admin ON despesas(admin_unico_id);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_competencia ON despesas(data_competencia);
CREATE INDEX IF NOT EXISTS idx_despesas_vencimento ON despesas(data_vencimento);

-- Auditoria das ações em despesas
CREATE TABLE IF NOT EXISTS despesa_auditoria (
    id               BIGSERIAL PRIMARY KEY,
    despesa_id       BIGINT       NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
    usuario_id       BIGINT       REFERENCES usuarios(id),
    acao             VARCHAR(40)  NOT NULL,
    status_anterior  VARCHAR(20),
    status_novo      VARCHAR(20),
    observacao       VARCHAR(500),
    data_acao        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_despesa_auditoria_despesa ON despesa_auditoria(despesa_id);

-- Categorias padrão (sem admin_unico — visíveis para todos)
INSERT INTO categorias_despesa (nome, cor, admin_unico_id) VALUES
    ('Aluguel',          '#EF4444', NULL),
    ('Energia',          '#F59E0B', NULL),
    ('Água',             '#3B82F6', NULL),
    ('Internet',         '#8B5CF6', NULL),
    ('Marketing',        '#EC4899', NULL),
    ('Salários',         '#10B981', NULL),
    ('Comissões',        '#14B8A6', NULL),
    ('Material/Estoque', '#F97316', NULL),
    ('Impostos',         '#6B7280', NULL),
    ('Outros',           '#64748B', NULL)
ON CONFLICT DO NOTHING;
