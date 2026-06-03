-- #143: suporte a despesas parceladas
-- Cada parcela e uma Despesa propria (linkada via despesa_origem_id),
-- mas precisamos saber qual numero/total pra exibicao.

ALTER TABLE despesas
    ADD COLUMN IF NOT EXISTS numero_parcela INTEGER;
ALTER TABLE despesas
    ADD COLUMN IF NOT EXISTS total_parcelas INTEGER;

-- Indice para listar parcelas de uma despesa-origem rapidamente
CREATE INDEX IF NOT EXISTS idx_despesas_origem_numero
    ON despesas(despesa_origem_id, numero_parcela);

COMMENT ON COLUMN despesas.numero_parcela IS '#143: posicao desta parcela (1..N). NULL se nao for parcelada.';
COMMENT ON COLUMN despesas.total_parcelas IS '#143: total de parcelas geradas (igual em todas as parcelas filhas).';
