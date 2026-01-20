-- Adicionar campo de comissão aos atendentes
ALTER TABLE atendentes 
    ADD COLUMN IF NOT EXISTS percentual_comissao NUMERIC(5, 2) DEFAULT 0.00;

COMMENT ON COLUMN atendentes.percentual_comissao IS 'Percentual de comissão do atendente (0.00 a 100.00)';
