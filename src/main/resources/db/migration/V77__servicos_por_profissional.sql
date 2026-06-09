-- Issue #155: serviços de um mesmo agendamento podem ter profissional/horário próprios.
-- Estratégia minimamente invasiva: adicionar atendente_id/data_hora_inicio/data_hora_fim
-- (todos nullable) em agendamento_servicos. NULL significa "herda do agendamento" (compat).
--
-- O Agendamento mantém atendente_id NOT NULL (responsável principal) e
-- dataHoraInicio/Fim como agregados (min/max dos itens) — sem quebrar API legada.

ALTER TABLE agendamento_servicos
    ADD COLUMN IF NOT EXISTS atendente_id BIGINT;

ALTER TABLE agendamento_servicos
    ADD COLUMN IF NOT EXISTS data_hora_inicio TIMESTAMP;

ALTER TABLE agendamento_servicos
    ADD COLUMN IF NOT EXISTS data_hora_fim TIMESTAMP;

-- FK opcional pro atendente do item. ON DELETE SET NULL: se o atendente sair,
-- o item volta a herdar do agendamento. ON UPDATE CASCADE preserva a referência.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_agendamento_servico_atendente'
    ) THEN
        ALTER TABLE agendamento_servicos
            ADD CONSTRAINT fk_agendamento_servico_atendente
            FOREIGN KEY (atendente_id) REFERENCES atendentes(id)
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Índice pra consulta de agendamentos por atendente do item (DayMode timeline,
-- comissões). Já existe idx em agendamentos.atendente_id, mas o item pode divergir.
CREATE INDEX IF NOT EXISTS idx_agendamento_servico_atendente
    ON agendamento_servicos(atendente_id) WHERE atendente_id IS NOT NULL;

COMMENT ON COLUMN agendamento_servicos.atendente_id IS
    'Profissional responsável pelo item. NULL = herda atendente_id do agendamento';
COMMENT ON COLUMN agendamento_servicos.data_hora_inicio IS
    'Início específico do item. NULL = herda dataHoraInicio do agendamento';
COMMENT ON COLUMN agendamento_servicos.data_hora_fim IS
    'Fim específico do item. NULL = herda dataHoraFim do agendamento';
