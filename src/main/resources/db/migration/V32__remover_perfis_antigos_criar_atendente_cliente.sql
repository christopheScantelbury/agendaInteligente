-- Remove perfis antigos (Atendente Premium, Gerente Academia) e cria dois novos: Atendente e Cliente.
-- Vincula os usuários do DADOS_ACESSO aos novos perfis.

-- 1. Desvincular usuários dos perfis que serão removidos (evita FK no delete)
UPDATE usuarios
SET perfil_id = NULL
WHERE perfil_id IN (SELECT id FROM perfis WHERE nome IN ('Atendente Premium', 'Gerente Academia'));

-- 2. Remover perfis antigos
DELETE FROM perfis WHERE nome IN ('Atendente Premium', 'Gerente Academia');

-- 3. Criar perfil Atendente (profissional que atende agendamentos)
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
);

-- 4. Criar perfil Cliente
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
);

-- 5. Vincular atendentes (Marias) ao perfil Atendente
UPDATE usuarios u
SET perfil_id = p.id,
    perfil_sistema = 'PROFISSIONAL'
FROM perfis p
WHERE p.nome = 'Atendente'
  AND u.email IN ('maria@forfit.com', 'maria@salaoalef.com');

-- 6. Vincular clientes ao perfil Cliente
UPDATE usuarios u
SET perfil_id = p.id,
    perfil_sistema = 'CLIENTE'
FROM perfis p
WHERE p.nome = 'Cliente'
  AND u.email IN (
    'cliente1@forfit.com',
    'cliente2@forfit.com',
    'cliente1@salaoalef.com',
    'cliente2@salaoalef.com'
);
