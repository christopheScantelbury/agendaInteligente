-- V69: Refinamento da feature de reclamações.
-- Adiciona contato opcional do reclamante (quando quiser receber resposta),
-- categoria (RECLAMACAO/SUGESTAO/ELOGIO) e status workflow.
-- Tudo nullable / com default — mantém compat com reclamações anônimas existentes.

ALTER TABLE reclamacoes
    ADD COLUMN IF NOT EXISTS nome_reclamante VARCHAR(150);

ALTER TABLE reclamacoes
    ADD COLUMN IF NOT EXISTS email_reclamante VARCHAR(255);

ALTER TABLE reclamacoes
    ADD COLUMN IF NOT EXISTS telefone_reclamante VARCHAR(20);

ALTER TABLE reclamacoes
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(20) NOT NULL DEFAULT 'RECLAMACAO';

ALTER TABLE reclamacoes
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'RECEBIDA';

ALTER TABLE reclamacoes
    ADD COLUMN IF NOT EXISTS resposta TEXT;

ALTER TABLE reclamacoes
    ADD COLUMN IF NOT EXISTS data_resposta TIMESTAMP;

ALTER TABLE reclamacoes
    ADD COLUMN IF NOT EXISTS respondida_por VARCHAR(255);

-- Reclamações antigas viram 'RESOLVIDA' se já estavam lidas, senão 'RECEBIDA'
UPDATE reclamacoes SET status = CASE WHEN lida THEN 'RESOLVIDA' ELSE 'RECEBIDA' END
WHERE status = 'RECEBIDA' AND lida = true;

CREATE INDEX IF NOT EXISTS idx_reclamacoes_status ON reclamacoes(status);
CREATE INDEX IF NOT EXISTS idx_reclamacoes_categoria ON reclamacoes(categoria);

COMMENT ON COLUMN reclamacoes.nome_reclamante IS 'Opcional — nome quando o reclamante quis se identificar';
COMMENT ON COLUMN reclamacoes.email_reclamante IS 'Opcional — habilita resposta por email';
COMMENT ON COLUMN reclamacoes.telefone_reclamante IS 'Opcional — habilita resposta por WhatsApp';
COMMENT ON COLUMN reclamacoes.categoria IS 'RECLAMACAO (default) | SUGESTAO | ELOGIO';
COMMENT ON COLUMN reclamacoes.status IS 'RECEBIDA (default) | EM_ANALISE | RESOLVIDA | ARQUIVADA';
COMMENT ON COLUMN reclamacoes.resposta IS 'Mensagem que o gestor enviou em resposta';
COMMENT ON COLUMN reclamacoes.data_resposta IS 'Quando a resposta foi registrada';
COMMENT ON COLUMN reclamacoes.respondida_por IS 'Email do usuário que respondeu';
