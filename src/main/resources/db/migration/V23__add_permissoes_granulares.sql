-- Adicionar coluna para permissões granulares
ALTER TABLE perfis 
    ADD COLUMN IF NOT EXISTS permissoes_granulares TEXT;

COMMENT ON COLUMN perfis.permissoes_granulares IS 'JSON com Map<menu, tipo> onde tipo pode ser "EDITAR", "VISUALIZAR" ou "SEM_ACESSO"';

-- Migrar permissões existentes para o novo formato granular
-- ADMIN: todos os menus com EDITAR
UPDATE perfis 
SET permissoes_granulares = '{
  "/": "EDITAR",
  "/clientes": "EDITAR",
  "/empresas": "EDITAR",
  "/unidades": "EDITAR",
  "/atendentes": "EDITAR",
  "/servicos": "EDITAR",
  "/usuarios": "EDITAR",
  "/perfis": "EDITAR",
  "/agendamentos": "EDITAR",
  "/notificacoes": "EDITAR"
}'
WHERE nome = 'ADMIN' AND (permissoes_granulares IS NULL OR permissoes_granulares = '');

-- GERENTE: menus com EDITAR (exceto empresas, usuarios e perfis)
UPDATE perfis 
SET permissoes_granulares = '{
  "/": "EDITAR",
  "/clientes": "EDITAR",
  "/unidades": "EDITAR",
  "/atendentes": "EDITAR",
  "/servicos": "EDITAR",
  "/agendamentos": "EDITAR",
  "/notificacoes": "EDITAR"
}'
WHERE nome = 'GERENTE' AND (permissoes_granulares IS NULL OR permissoes_granulares = '');

-- PROFISSIONAL: apenas agendamentos com VISUALIZAR (sem edição)
UPDATE perfis 
SET permissoes_granulares = '{
  "/": "VISUALIZAR",
  "/agendamentos": "VISUALIZAR"
}'
WHERE nome = 'PROFISSIONAL' AND (permissoes_granulares IS NULL OR permissoes_granulares = '');

-- CLIENTE: apenas menus do cliente
UPDATE perfis 
SET permissoes_granulares = '{
  "/cliente/agendar": "EDITAR",
  "/cliente/meus-agendamentos": "VISUALIZAR"
}'
WHERE nome = 'CLIENTE' AND (permissoes_granulares IS NULL OR permissoes_granulares = '');
