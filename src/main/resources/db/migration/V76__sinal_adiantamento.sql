-- Sinal/Adiantamento de agendamento
-- A unidade pode exigir um percentual do valor total como sinal (entrada) para
-- confirmar agendamento. Útil em serviços de duração longa ou alto valor.

-- Configuração por unidade
ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS cobra_sinal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS percentual_sinal NUMERIC(5, 2) DEFAULT 30.00
    CHECK (percentual_sinal IS NULL OR (percentual_sinal >= 0 AND percentual_sinal <= 100));

COMMENT ON COLUMN unidades.cobra_sinal IS
    'Se TRUE, agendamentos nesta unidade pedem sinal antes de virar CONFIRMADO';
COMMENT ON COLUMN unidades.percentual_sinal IS
    'Percentual do valor total cobrado como sinal (0–100). Default 30%';

-- Sinal pago no agendamento
ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS valor_sinal NUMERIC(12, 2);
ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS sinal_pago BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS sinal_data_pagamento TIMESTAMP;
ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS sinal_forma_pagamento VARCHAR(40);

COMMENT ON COLUMN agendamentos.valor_sinal IS
    'Valor do sinal pago. NULL = sem sinal. Diferente de valor_final (final do atendimento)';
COMMENT ON COLUMN agendamentos.sinal_pago IS
    'TRUE quando o cliente pagou o sinal — pode confirmar o agendamento';

CREATE INDEX IF NOT EXISTS idx_agendamentos_sinal_pago
    ON agendamentos(sinal_pago) WHERE sinal_pago = TRUE;
