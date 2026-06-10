-- Issue #157: flags configuráveis de fluxo de atendimento por unidade.
-- Cada unidade pode customizar regras operacionais (sinal obrigatório,
-- finalização sem pagamento, cancelamento pelo cliente, antecedência do
-- lembrete). Defaults preservam comportamento atual (zero impacto em prod).

ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS requer_sinal_pra_iniciar BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS permite_finalizar_sem_pagamento BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS cliente_pode_cancelar_apos_confirmar BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS lembrete_confirmacao_horas SMALLINT NOT NULL DEFAULT 24
    CHECK (lembrete_confirmacao_horas BETWEEN 1 AND 168);

COMMENT ON COLUMN unidades.requer_sinal_pra_iniciar IS
    'Bloqueia transição CONFIRMADO→EM_ANDAMENTO se cobra_sinal=true e sinal_pago=false';
COMMENT ON COLUMN unidades.permite_finalizar_sem_pagamento IS
    'Quando false, finalizar exige valorFinal > 0';
COMMENT ON COLUMN unidades.cliente_pode_cancelar_apos_confirmar IS
    'Quando false, perfil CLIENTE não pode cancelar após status CONFIRMADO';
COMMENT ON COLUMN unidades.lembrete_confirmacao_horas IS
    'Horas antes do agendamento pra disparar lembrete automático (1-168)';
