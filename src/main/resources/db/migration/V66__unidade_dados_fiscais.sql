-- Dados fiscais adicionais por unidade necessários para emissão de NFS-e Nacional.
-- razao_social pode diferir da empresa em casos de filiais com CNPJ próprio.
-- inscricao_estadual é opcional (alguns municípios pedem).
-- regime_tributario alimenta o XML de RPS: MEI, SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL.
--
-- Statements separados com IF NOT EXISTS — V65 anterior pode ter rodado parcialmente
-- no Railway antes de ser revertida. Esta migration é idempotente: se a coluna já
-- existir, não falha. Cobre o caso de schema_history apontar V65 como aplicada mas
-- só algumas (ou nenhuma) colunas terem sido criadas.
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS razao_social VARCHAR(200);
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20);
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(30);
