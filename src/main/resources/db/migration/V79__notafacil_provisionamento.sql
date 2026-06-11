-- Issue #159: registro do momento em que NotaFácil foi provisionada pra unidade.
-- Permite exibir "Ativo desde DD/MM/YYYY" no card de status.

ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS notafacil_provisionado_em TIMESTAMP;

COMMENT ON COLUMN unidades.notafacil_provisionado_em IS
    'Quando o provisionamento da api_key NotaFácil foi feito via NotaFacilProvisioningService (#159). NULL = manual ou não provisionado.';
