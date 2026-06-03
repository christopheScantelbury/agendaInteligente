-- V70: Tornar horario_abertura e horario_fechamento obrigatórios em unidades.
-- Necessário pro fallback automático de slots em HorarioDisponivelService —
-- sem esses campos, cliente não consegue agendar (vide commit f83e351).

-- Passo 1: backfill — qualquer unidade ainda com null ganha defaults razoáveis.
UPDATE unidades SET horario_abertura = TIME '08:00:00' WHERE horario_abertura IS NULL;
UPDATE unidades SET horario_fechamento = TIME '18:00:00' WHERE horario_fechamento IS NULL;

-- Passo 2: NOT NULL constraint
ALTER TABLE unidades ALTER COLUMN horario_abertura SET NOT NULL;
ALTER TABLE unidades ALTER COLUMN horario_fechamento SET NOT NULL;

-- Passo 3: check defensivo — abertura precisa ser estritamente antes de fechamento
ALTER TABLE unidades
    DROP CONSTRAINT IF EXISTS chk_unidades_horario_valido;
ALTER TABLE unidades
    ADD CONSTRAINT chk_unidades_horario_valido
    CHECK (horario_abertura < horario_fechamento);

COMMENT ON COLUMN unidades.horario_abertura IS 'Horário de abertura diária — obrigatório, usado no fallback de slots automáticos';
COMMENT ON COLUMN unidades.horario_fechamento IS 'Horário de fechamento diária — obrigatório, posterior ao horario_abertura';
