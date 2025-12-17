-- Adiciona campos necessários para emissão de NFS-e na tabela clinicas
ALTER TABLE clinicas
    ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20),
    ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20),
    ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);

COMMENT ON COLUMN clinicas.inscricao_municipal IS 'Inscrição Municipal da clínica (obrigatório para NFS-e)';
COMMENT ON COLUMN clinicas.inscricao_estadual IS 'Inscrição Estadual da clínica (opcional)';
COMMENT ON COLUMN clinicas.complemento IS 'Complemento do endereço da clínica';

