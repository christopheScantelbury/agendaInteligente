ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS lembrete_confirmacao_enviado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lembrete_24h_enviado         BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_agendamentos_lembrete ON agendamentos (data_hora_inicio, lembrete_24h_enviado)
  WHERE status NOT IN ('CANCELADO', 'NO_SHOW', 'CONCLUIDO');
