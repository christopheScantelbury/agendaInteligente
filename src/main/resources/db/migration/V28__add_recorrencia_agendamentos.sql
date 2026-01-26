-- Migration V28: Adicionar suporte a agendamentos recorrentes
-- Esta migration adiciona campos para suportar agendamentos recorrentes

-- Adicionar colunas de recorrência
ALTER TABLE agendamentos 
    ADD COLUMN IF NOT EXISTS agendamento_recorrente BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS agendamento_original_id BIGINT,
    ADD COLUMN IF NOT EXISTS serie_recorrencia_id VARCHAR(100);

-- Criar índices para melhor performance em consultas de recorrência
CREATE INDEX IF NOT EXISTS idx_agendamentos_recorrente ON agendamentos(agendamento_recorrente);
CREATE INDEX IF NOT EXISTS idx_agendamentos_original_id ON agendamentos(agendamento_original_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_serie_id ON agendamentos(serie_recorrencia_id);

-- Adicionar foreign key para agendamento_original_id (self-reference)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_agendamentos_original'
        AND table_name = 'agendamentos'
    ) THEN
        ALTER TABLE agendamentos
            ADD CONSTRAINT fk_agendamentos_original 
            FOREIGN KEY (agendamento_original_id) REFERENCES agendamentos(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Comentários
COMMENT ON COLUMN agendamentos.agendamento_recorrente IS 'Indica se este agendamento faz parte de uma série recorrente';
COMMENT ON COLUMN agendamentos.agendamento_original_id IS 'ID do primeiro agendamento da série (null se for o original)';
COMMENT ON COLUMN agendamentos.serie_recorrencia_id IS 'ID único para identificar todos os agendamentos da mesma série recorrente';
