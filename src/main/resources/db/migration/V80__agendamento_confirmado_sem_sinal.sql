-- Issue #163: marca explícita "confirmado sem sinal" — quando o gestor escolheu
-- confirmar o agendamento mesmo sabendo que o cliente não pagou sinal.
-- Permite esconder o botão "Receber Sinal" após essa decisão (não tentar voltar
-- atrás cobrando sinal de um agendamento já liberado).

ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS confirmado_sem_sinal BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN agendamentos.confirmado_sem_sinal IS
    'TRUE quando gestor confirmou agendamento via modal "Confirmar mesmo assim?" sem sinal pago. Usado pra esconder o botão Receber Sinal depois.';
