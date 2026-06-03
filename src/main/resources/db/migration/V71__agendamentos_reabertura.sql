-- V71: auditoria de reabertura de atendimento.
-- Quando profissional reabre um agendamento CONCLUIDO ou PROCEDIMENTO_FIM
-- pra corrigir algo (valor, profissional, etc.), precisamos registrar o
-- motivo + quem reabriu + quando. Antes era reabertura silenciosa via
-- PATCH /status, agora vai por endpoint dedicado /reabrir.

ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS motivo_reabertura TEXT;

ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS data_reabertura TIMESTAMP;

ALTER TABLE agendamentos
    ADD COLUMN IF NOT EXISTS reaberto_por VARCHAR(255);

COMMENT ON COLUMN agendamentos.motivo_reabertura IS 'Motivo informado pelo gestor ao reabrir agendamento concluído';
COMMENT ON COLUMN agendamentos.data_reabertura IS 'Quando o gestor reabriu pela última vez';
COMMENT ON COLUMN agendamentos.reaberto_por IS 'Email/identifier do usuário que reabriu';
