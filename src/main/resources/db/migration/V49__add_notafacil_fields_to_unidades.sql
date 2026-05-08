-- Campos para integração com NotaFácil (Nota MEI Gateway)
ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS notafacil_api_key  VARCHAR(255),
    ADD COLUMN IF NOT EXISTS municipio_ibge     VARCHAR(7),
    ADD COLUMN IF NOT EXISTS notafacil_ativo    BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN unidades.notafacil_api_key IS 'API key sk_live_... do Nota MEI Gateway para emissão de NFS-e';
COMMENT ON COLUMN unidades.municipio_ibge     IS 'Código IBGE do município (7 dígitos) — usado pelo Nota MEI Gateway para roteamento';
COMMENT ON COLUMN unidades.notafacil_ativo    IS 'Habilita emissão automática de NFS-e via NotaFácil ao concluir agendamento';
