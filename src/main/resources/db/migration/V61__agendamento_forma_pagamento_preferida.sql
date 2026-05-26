-- #85: forma de pagamento escolhida pelo CLIENTE no momento do agendamento.
-- Diferente de Pagamento.tipoPagamento (que é efetivado depois). Esta é só a intenção.

ALTER TABLE agendamentos
    ADD COLUMN forma_pagamento_preferida VARCHAR(20);

-- Backfill: gambiarra anterior gravava em observacoes "Forma de pagamento preferida: X"
UPDATE agendamentos
   SET forma_pagamento_preferida = (
       CASE
           WHEN observacoes LIKE '%Forma de pagamento preferida: PIX%' THEN 'PIX'
           WHEN observacoes LIKE '%Forma de pagamento preferida: CARTAO%' THEN 'CARTAO'
           WHEN observacoes LIKE '%Forma de pagamento preferida: NO_LOCAL%' THEN 'NO_LOCAL'
           ELSE NULL
       END
   )
 WHERE observacoes LIKE '%Forma de pagamento preferida:%';

-- Limpa o trecho do observacoes pra evitar duplicação visual
UPDATE agendamentos
   SET observacoes = REGEXP_REPLACE(observacoes, 'Forma de pagamento preferida: [A-Z_]+', '', 'g')
 WHERE observacoes LIKE '%Forma de pagamento preferida:%';
