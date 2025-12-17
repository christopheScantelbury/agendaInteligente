-- Adiciona inscrição municipal à clínica de teste para emissão de NFS-e
-- Usando dados de teste conforme ambiente de homologação
UPDATE clinicas 
SET inscricao_municipal = '12345678'
WHERE cnpj = '12345678000190'
  AND (inscricao_municipal IS NULL OR inscricao_municipal = '');

COMMENT ON COLUMN clinicas.inscricao_municipal IS 'Inscrição Municipal obrigatória para emissão de NFS-e';

