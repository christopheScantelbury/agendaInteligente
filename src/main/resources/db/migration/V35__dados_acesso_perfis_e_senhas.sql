-- Fonte da verdade conforme DADOS_ACESSO.md
-- Garante: (1) perfis ADMIN, GERENTE, Atendente, Cliente existem; (2) todos os 9 usuários com senha 123456 e ativos.
-- Hash BCrypt para "123456" (mesmo da V27): $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- ========== 1. PERFIS DO SISTEMA ==========
INSERT INTO perfis (nome, descricao, sistema, ativo, atendente, cliente, gerente, permissoes_granulares, data_criacao, data_atualizacao)
VALUES (
    'ADMIN',
    'Administrador com acesso total ao sistema',
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
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

INSERT INTO perfis (nome, descricao, sistema, ativo, atendente, cliente, gerente, permissoes_granulares, data_criacao, data_atualizacao)
VALUES (
    'GERENTE',
    'Gerente de unidade ou empresa',
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    '{
      "/": "EDITAR",
      "/clientes": "EDITAR",
      "/unidades": "EDITAR",
      "/servicos": "EDITAR",
      "/usuarios": "EDITAR",
      "/perfis": "VISUALIZAR",
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

INSERT INTO perfis (nome, descricao, sistema, ativo, atendente, cliente, gerente, permissoes_granulares, data_criacao, data_atualizacao)
VALUES (
    'Atendente',
    'Profissional/atendente que realiza agendamentos e atende clientes na unidade',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    '{
      "/": "EDITAR",
      "/agendamentos": "EDITAR",
      "/clientes": "VISUALIZAR",
      "/servicos": "VISUALIZAR"
    }',
    NOW(),
    NOW()
)
ON CONFLICT (nome) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    permissoes_granulares = EXCLUDED.permissoes_granulares,
    data_atualizacao = NOW();

INSERT INTO perfis (nome, descricao, sistema, ativo, atendente, cliente, gerente, permissoes_granulares, data_criacao, data_atualizacao)
VALUES (
    'Cliente',
    'Cliente que agenda e visualiza seus agendamentos',
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    FALSE,
    '{
      "/cliente/agendar": "EDITAR",
      "/cliente/meus-agendamentos": "VISUALIZAR"
    }',
    NOW(),
    NOW()
)
ON CONFLICT (nome) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    permissoes_granulares = EXCLUDED.permissoes_granulares,
    data_atualizacao = NOW();

-- ========== 2. SENHA 123456 PARA TODOS OS USUÁRIOS DO DADOS_ACESSO ==========
UPDATE usuarios
SET senha = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    ativo = TRUE
WHERE email IN (
    'admin@agendainteligente.com',
    'charles@forfit.com',
    'alef@salaoalef.com',
    'maria@forfit.com',
    'maria@salaoalef.com',
    'cliente1@forfit.com',
    'cliente2@forfit.com',
    'cliente1@salaoalef.com',
    'cliente2@salaoalef.com'
);

-- ========== 3. ADMIN: perfil_sistema ADMIN e perfil_id NULL (login e GET /perfis/meu) ==========
UPDATE usuarios
SET perfil_sistema = 'ADMIN',
    perfil_id = NULL
WHERE email = 'admin@agendainteligente.com';

-- ========== 4. GERENTES: perfil_sistema GERENTE (perfil_id pode ser NULL; sistema usa nome) ==========
UPDATE usuarios
SET perfil_sistema = 'GERENTE'
WHERE email IN ('charles@forfit.com', 'alef@salaoalef.com');

-- ========== 5. ATENDENTES (Marias): perfil_sistema PROFISSIONAL e perfil_id = Atendente ==========
UPDATE usuarios u
SET perfil_sistema = 'PROFISSIONAL',
    perfil_id = (SELECT id FROM perfis WHERE nome = 'Atendente' LIMIT 1)
WHERE u.email IN ('maria@forfit.com', 'maria@salaoalef.com');

-- ========== 6. CLIENTES: perfil_sistema CLIENTE e perfil_id = Cliente ==========
UPDATE usuarios u
SET perfil_sistema = 'CLIENTE',
    perfil_id = (SELECT id FROM perfis WHERE nome = 'Cliente' LIMIT 1)
WHERE u.email IN (
    'cliente1@forfit.com',
    'cliente2@forfit.com',
    'cliente1@salaoalef.com',
    'cliente2@salaoalef.com'
);
