-- Dados fiscais adicionais por unidade necessários para emissão de NFS-e Nacional.
-- razao_social pode diferir da empresa em casos de filiais com CNPJ próprio.
-- inscricao_estadual é opcional (alguns municípios pedem).
-- regime_tributario alimenta o XML de RPS: MEI, SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL.
ALTER TABLE unidades
    ADD COLUMN razao_social VARCHAR(200),
    ADD COLUMN inscricao_estadual VARCHAR(20),
    ADD COLUMN regime_tributario VARCHAR(30);
