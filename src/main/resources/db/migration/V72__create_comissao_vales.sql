-- #142: Vales/Adiantamentos de Comissao
-- Vale = adiantamento financeiro ao profissional, descontado depois
-- em um ComissaoPagamento. Status PENDENTE -> DESCONTADO quando vinculado.

CREATE TABLE IF NOT EXISTS comissao_vales (
    id              BIGSERIAL PRIMARY KEY,
    atendente_id    BIGINT         NOT NULL REFERENCES atendentes(id) ON DELETE CASCADE,
    valor           NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
    data_vale       DATE           NOT NULL DEFAULT CURRENT_DATE,
    observacao      VARCHAR(500),
    status          VARCHAR(20)    NOT NULL DEFAULT 'PENDENTE',
    pagamento_id    BIGINT         REFERENCES comissao_pagamentos(id) ON DELETE SET NULL,
    criado_por_id   BIGINT         REFERENCES usuarios(id),
    admin_unico_id  BIGINT,
    data_criacao    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_descontado TIMESTAMP,
    CONSTRAINT chk_vale_status CHECK (status IN ('PENDENTE','DESCONTADO'))
);

CREATE INDEX IF NOT EXISTS idx_comissao_vales_atendente
    ON comissao_vales(atendente_id);
CREATE INDEX IF NOT EXISTS idx_comissao_vales_atendente_status
    ON comissao_vales(atendente_id, status);
CREATE INDEX IF NOT EXISTS idx_comissao_vales_pagamento
    ON comissao_vales(pagamento_id);

-- #141: pagamento agora tem 3 valores derivados
-- valor_bruto: soma das comissoes lancadas
-- valor_vales: soma dos vales descontados
-- valor_total = valor_bruto - valor_vales (mantem semantica anterior)

ALTER TABLE comissao_pagamentos
    ADD COLUMN IF NOT EXISTS valor_bruto NUMERIC(12, 2);
ALTER TABLE comissao_pagamentos
    ADD COLUMN IF NOT EXISTS valor_vales NUMERIC(12, 2) DEFAULT 0;

-- Backfill: registros antigos consideram que nao havia vales
UPDATE comissao_pagamentos
    SET valor_bruto = valor_total, valor_vales = 0
    WHERE valor_bruto IS NULL;
