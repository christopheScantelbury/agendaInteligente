-- Garantir perfil ADMIN com permissão EDITAR em todas as telas (para admin@agendainteligente.com)
-- O usuário admin usa perfil_sistema = 'ADMIN' e o sistema resolve o perfil pelo nome na tabela perfis.
-- Sem alterar código: apenas criar/atualizar o perfil ADMIN com permissoes_granulares completas.

INSERT INTO perfis (nome, descricao, sistema, ativo, permissoes_granulares, data_criacao, data_atualizacao)
VALUES (
    'ADMIN',
    'Administrador com acesso total ao sistema',
    TRUE,
    TRUE,
    '{
      "/": "EDITAR",
      "/clientes": "EDITAR",
      "/empresas": "EDITAR",
      "/unidades": "EDITAR",
      "/servicos": "EDITAR",
      "/usuarios": "EDITAR",
      "/perfis": "EDITAR",
      "/agendamentos": "EDITAR",
      "/notificacoes": "EDITAR"
    }',
    NOW(),
    NOW()
)
ON CONFLICT (nome) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    permissoes_granulares = EXCLUDED.permissoes_granulares,
    data_atualizacao = NOW();
