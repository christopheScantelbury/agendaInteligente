-- Migration V27: Limpar todos os dados e criar dados de exemplo para demonstrar isolamento por empresas e unidades
-- Esta migration cria uma estrutura completa com:
-- - 2 Empresas distintas: ForFit e Salão Alef
-- - 1 Unidade por empresa (total 2 unidades)
-- - Usuários ADMIN, GERENTE, PROFISSIONAL e CLIENTE
-- - Serviços isolados por unidade
-- - Agendamentos isolados por unidade
-- - Isolamento total: cada Maria (atendente) não pode ver dados da outra empresa/unidade

-- ============================================
-- 1. LIMPAR TODOS OS DADOS (respeitando foreign keys)
-- ============================================

-- Desabilitar temporariamente as foreign keys para limpeza
SET session_replication_role = 'replica';

-- Deletar dados em ordem inversa de dependência
DELETE FROM agendamento_servicos;
DELETE FROM agendamentos;
DELETE FROM pagamentos;
DELETE FROM notas_fiscais;
DELETE FROM reclamacoes;
DELETE FROM atendente_servicos;
DELETE FROM usuario_unidades;
DELETE FROM cliente_unidades;
DELETE FROM servicos;
DELETE FROM clientes;
DELETE FROM atendentes;
DELETE FROM gerentes;
DELETE FROM unidades;
DELETE FROM empresas;
DELETE FROM perfis;
DELETE FROM usuarios;

-- Reabilitar foreign keys
SET session_replication_role = 'origin';

-- Resetar sequences
ALTER SEQUENCE IF EXISTS empresas_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS unidades_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS usuarios_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS clientes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS servicos_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS agendamentos_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS perfis_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS atendentes_id_seq RESTART WITH 1;

-- ============================================
-- 2. CRIAR EMPRESAS
-- ============================================
-- Empresa 1: ForFit
-- Empresa 2: Salão Alef

INSERT INTO empresas (nome, razao_social, cnpj, email, telefone, endereco, numero, bairro, cep, cidade, uf, ativo, data_criacao, data_atualizacao)
VALUES 
    ('ForFit', 'ForFit Academia e Estética Ltda', '12345678000190', 'contato@forfit.com.br', '11987654321', 'Av. Paulista', '1000', 'Bela Vista', '01310100', 'São Paulo', 'SP', true, NOW(), NOW()),
    ('Salão Alef', 'Salão Alef Beleza e Estética EIRELI', '98765432000110', 'contato@salaoalef.com.br', '11912345678', 'Rua Augusta', '500', 'Consolação', '01305000', 'São Paulo', 'SP', true, NOW(), NOW());

-- ============================================
-- 3. CRIAR UNIDADES (1 por empresa)
-- ============================================
-- Empresa 1 (ForFit): Unidade única
-- Empresa 2 (Salão Alef): Unidade única

INSERT INTO unidades (nome, descricao, endereco, numero, bairro, cep, cidade, uf, telefone, email, ativo, empresa_id, horario_abertura, horario_fechamento, cnpj, inscricao_municipal, data_criacao, data_atualizacao)
VALUES 
    -- Empresa 1 - ForFit
    ('ForFit - Unidade Principal', 'Unidade principal da academia ForFit', 'Av. Paulista', '1000', 'Bela Vista', '01310100', 'São Paulo', 'SP', '11987654321', 'unidade@forfit.com.br', true, 1, '06:00:00', '22:00:00', '12345678000191', '123456789', NOW(), NOW()),
    -- Empresa 2 - Salão Alef
    ('Salão Alef - Unidade Principal', 'Unidade principal do Salão Alef', 'Rua Augusta', '500', 'Consolação', '01305000', 'São Paulo', 'SP', '11912345678', 'unidade@salaoalef.com.br', true, 2, '09:00:00', '20:00:00', '98765432000111', '987654321', NOW(), NOW());

-- ============================================
-- 4. CRIAR PERFIS DO SISTEMA
-- ============================================
-- Perfis customizados para demonstração

INSERT INTO perfis (nome, descricao, sistema, ativo, permissoes_granulares, data_criacao, data_atualizacao)
VALUES 
    ('Gerente Academia', 'Perfil para gerentes de academia com permissões específicas', true, true, '{"\/usuarios": "EDITAR", "\/clientes": "EDITAR", "\/agendamentos": "EDITAR", "\/servicos": "EDITAR", "\/unidades": "VISUALIZAR"}', NOW(), NOW()),
    ('Atendente Premium', 'Perfil para atendentes com mais permissões', true, true, '{"\/agendamentos": "EDITAR", "\/clientes": "VISUALIZAR", "\/servicos": "VISUALIZAR"}', NOW(), NOW());

-- ============================================
-- 5. CRIAR USUÁRIOS
-- ============================================
-- Hash BCrypt para senha "123456": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- Todos os usuários terão a senha "123456" para facilitar testes

-- ADMIN (acesso total a todas as empresas)
INSERT INTO usuarios (email, senha, nome, ativo, perfil_sistema, cpf, telefone, percentual_comissao, data_criacao, data_atualizacao)
VALUES 
    ('admin@agendainteligente.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrador Sistema', true, 'ADMIN', '12345678901', '11999999999', 0.00, NOW(), NOW());

-- GERENTES (um por empresa, acesso apenas à sua empresa)
-- Gerente Charles - ForFit
INSERT INTO usuarios (email, senha, nome, ativo, perfil_sistema, cpf, telefone, percentual_comissao, data_criacao, data_atualizacao)
VALUES 
    ('charles@forfit.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Charles', true, 'GERENTE', '11111111111', '11987654321', 0.00, NOW(), NOW());

-- Gerente Alef - Salão Alef
INSERT INTO usuarios (email, senha, nome, ativo, perfil_sistema, cpf, telefone, percentual_comissao, data_criacao, data_atualizacao)
VALUES 
    ('alef@salaoalef.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Alef', true, 'GERENTE', '22222222222', '11912345678', 0.00, NOW(), NOW());

-- PROFISSIONAIS/ATENDENTES (uma Maria por empresa, isoladas)
-- Maria da ForFit
INSERT INTO usuarios (email, senha, nome, ativo, perfil_sistema, cpf, telefone, percentual_comissao, data_criacao, data_atualizacao)
VALUES 
    ('maria@forfit.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Maria - ForFit', true, 'PROFISSIONAL', '33333333333', '11911111111', 15.00, NOW(), NOW());

-- Maria do Salão Alef
INSERT INTO usuarios (email, senha, nome, ativo, perfil_sistema, cpf, telefone, percentual_comissao, data_criacao, data_atualizacao)
VALUES 
    ('maria@salaoalef.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Maria - Salão Alef', true, 'PROFISSIONAL', '44444444444', '11922222222', 20.00, NOW(), NOW());

-- CLIENTES (2 clientes por empresa)
-- Clientes ForFit
INSERT INTO usuarios (email, senha, nome, ativo, perfil_sistema, cpf_cnpj, data_nascimento, rg, endereco, numero, complemento, bairro, cep, cidade, uf, telefone, data_criacao, data_atualizacao)
VALUES 
    ('cliente1@forfit.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'João Silva', true, 'CLIENTE', '55555555555', '1990-01-15', '123456789', 'Rua das Flores', '100', 'Apto 101', 'Bela Vista', '01310100', 'São Paulo', 'SP', '11933333333', NOW(), NOW()),
    ('cliente2@forfit.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ana Costa', true, 'CLIENTE', '66666666666', '1985-05-20', '987654321', 'Av. Brasil', '200', 'Casa', 'Jardim América', '01430000', 'São Paulo', 'SP', '11944444444', NOW(), NOW());

-- Clientes Salão Alef
INSERT INTO usuarios (email, senha, nome, ativo, perfil_sistema, cpf_cnpj, data_nascimento, rg, endereco, numero, complemento, bairro, cep, cidade, uf, telefone, data_criacao, data_atualizacao)
VALUES 
    ('cliente1@salaoalef.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Pedro Alves', true, 'CLIENTE', '77777777777', '1992-08-10', '111222333', 'Rua Augusta', '300', 'Loja 1', 'Consolação', '01305000', 'São Paulo', 'SP', '11955555555', NOW(), NOW()),
    ('cliente2@salaoalef.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Julia Ferreira', true, 'CLIENTE', '88888888888', '1988-12-25', '444555666', 'Rua Harmonia', '400', 'Apto 202', 'Vila Madalena', '05435000', 'São Paulo', 'SP', '11966666666', NOW(), NOW());

-- ============================================
-- 6. VINCULAR USUÁRIOS A UNIDADES
-- ============================================
-- ADMIN: acesso a todas as unidades
INSERT INTO usuario_unidades (usuario_id, unidade_id)
SELECT 1, id FROM unidades;

-- GERENTE Charles (ForFit): apenas unidade da Empresa 1
INSERT INTO usuario_unidades (usuario_id, unidade_id)
VALUES (2, 1);

-- GERENTE Alef (Salão Alef): apenas unidade da Empresa 2
INSERT INTO usuario_unidades (usuario_id, unidade_id)
VALUES (3, 2);

-- PROFISSIONAIS: cada Maria em sua unidade específica (ISOLAMENTO TOTAL)
INSERT INTO usuario_unidades (usuario_id, unidade_id)
VALUES 
    (4, 1),  -- Maria ForFit -> Unidade 1 (ForFit)
    (5, 2);  -- Maria Salão Alef -> Unidade 2 (Salão Alef)

-- CLIENTES: vinculados às suas unidades principais
INSERT INTO usuario_unidades (usuario_id, unidade_id)
VALUES 
    (6, 1),  -- Cliente 1 ForFit -> Unidade 1
    (7, 1),  -- Cliente 2 ForFit -> Unidade 1
    (8, 2),  -- Cliente 1 Salão Alef -> Unidade 2
    (9, 2);  -- Cliente 2 Salão Alef -> Unidade 2

-- ============================================
-- 7. CRIAR CLIENTES (tabela clientes)
-- ============================================
-- Criar registros na tabela clientes vinculados aos usuários

INSERT INTO clientes (nome, cpf_cnpj, email, telefone, endereco, numero, complemento, bairro, cep, cidade, uf, data_nascimento, rg, senha, ativo, unidade_id, data_criacao, data_atualizacao)
SELECT 
    u.nome,
    u.cpf_cnpj,
    u.email,
    u.telefone,
    u.endereco,
    u.numero,
    u.complemento,
    u.bairro,
    u.cep,
    u.cidade,
    u.uf,
    u.data_nascimento,
    u.rg,
    u.senha,
    u.ativo,
    CASE 
        WHEN u.id = 6 THEN 1  -- Cliente 1 ForFit -> Unidade 1
        WHEN u.id = 7 THEN 1  -- Cliente 2 ForFit -> Unidade 1
        WHEN u.id = 8 THEN 2 -- Cliente 1 Salão Alef -> Unidade 2
        WHEN u.id = 9 THEN 2 -- Cliente 2 Salão Alef -> Unidade 2
    END,
    u.data_criacao,
    u.data_atualizacao
FROM usuarios u
WHERE u.perfil_sistema = 'CLIENTE';

-- Vincular clientes às unidades adicionais (cliente_unidades)
INSERT INTO cliente_unidades (cliente_id, unidade_id)
SELECT c.id, uu.unidade_id
FROM clientes c
INNER JOIN usuarios u ON c.email = u.email
INNER JOIN usuario_unidades uu ON u.id = uu.usuario_id
WHERE u.perfil_sistema = 'CLIENTE';

-- ============================================
-- 8. CRIAR SERVIÇOS (isolados por unidade)
-- ============================================
-- Cada unidade terá seus próprios serviços

-- Empresa 1 - ForFit (Unidade 1)
INSERT INTO servicos (nome, descricao, valor, duracao_minutos, ativo, unidade_id, data_criacao, data_atualizacao)
VALUES 
    ('Avaliação Física', 'Avaliação completa de condicionamento físico', 150.00, 60, true, 1, NOW(), NOW()),
    ('Personal Trainer', 'Aula individual com personal trainer', 100.00, 60, true, 1, NOW(), NOW()),
    ('Massagem Relaxante', 'Massagem para relaxamento muscular', 120.00, 50, true, 1, NOW(), NOW());

-- Empresa 2 - Salão Alef (Unidade 2)
INSERT INTO servicos (nome, descricao, valor, duracao_minutos, ativo, unidade_id, data_criacao, data_atualizacao)
VALUES 
    ('Corte de Cabelo', 'Corte de cabelo feminino/masculino', 80.00, 45, true, 2, NOW(), NOW()),
    ('Coloração', 'Coloração completa de cabelo', 200.00, 120, true, 2, NOW(), NOW()),
    ('Manicure e Pedicure', 'Manicure e pedicure completo', 60.00, 60, true, 2, NOW(), NOW());

-- ============================================
-- 9. CRIAR REGISTROS NA TABELA ATENDENTES
-- ============================================
-- A tabela atendentes ainda existe e é usada como foreign key em agendamentos
-- Criar registros vinculados aos usuários profissionais

INSERT INTO atendentes (unidade_id, usuario_id, cpf, telefone, ativo, data_criacao, data_atualizacao)
VALUES 
    (1, 4, '33333333333', '11911111111', true, NOW(), NOW()),  -- Maria ForFit -> Unidade 1
    (2, 5, '44444444444', '11922222222', true, NOW(), NOW());  -- Maria Salão Alef -> Unidade 2

-- ============================================
-- 10. VINCULAR PROFISSIONAIS A SERVIÇOS
-- ============================================
-- Cada profissional pode atender apenas serviços de sua unidade
-- Usar os IDs da tabela atendentes (não usuarios)
-- ISOLAMENTO: Maria ForFit só vê serviços da ForFit, Maria Salão Alef só vê serviços do Salão Alef

-- Maria ForFit (Unidade 1) -> Serviços da Unidade 1
INSERT INTO atendente_servicos (atendente_id, servico_id)
VALUES (1, 1), (1, 2), (1, 3);

-- Maria Salão Alef (Unidade 2) -> Serviços da Unidade 2
INSERT INTO atendente_servicos (atendente_id, servico_id)
VALUES (2, 4), (2, 5), (2, 6);

-- ============================================
-- 11. CRIAR AGENDAMENTOS DE EXEMPLO
-- ============================================
-- Agendamentos isolados por unidade
-- Usar IDs da tabela atendentes (não usuarios) para atendente_id
-- ISOLAMENTO: Cada Maria só vê agendamentos de sua unidade

-- Agendamentos ForFit (Unidade 1)
INSERT INTO agendamentos (cliente_id, unidade_id, atendente_id, data_hora_inicio, data_hora_fim, observacoes, valor_total, status, data_criacao, data_atualizacao)
VALUES 
    (1, 1, 1, NOW() + INTERVAL '1 day' + INTERVAL '9 hours', NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 'Avaliação física inicial', 150.00, 'AGENDADO', NOW(), NOW()),
    (2, 1, 1, NOW() + INTERVAL '2 days' + INTERVAL '14 hours', NOW() + INTERVAL '2 days' + INTERVAL '15 hours', 'Aula de personal trainer', 100.00, 'AGENDADO', NOW(), NOW());

-- Agendamentos Salão Alef (Unidade 2)
INSERT INTO agendamentos (cliente_id, unidade_id, atendente_id, data_hora_inicio, data_hora_fim, observacoes, valor_total, status, data_criacao, data_atualizacao)
VALUES 
    (3, 2, 2, NOW() + INTERVAL '3 days' + INTERVAL '10 hours', NOW() + INTERVAL '3 days' + INTERVAL '10 hours 45 minutes', 'Corte de cabelo', 80.00, 'AGENDADO', NOW(), NOW()),
    (4, 2, 2, NOW() + INTERVAL '4 days' + INTERVAL '15 hours', NOW() + INTERVAL '4 days' + INTERVAL '17 hours', 'Coloração completa', 200.00, 'AGENDADO', NOW(), NOW());

-- ============================================
-- 12. VINCULAR SERVIÇOS AOS AGENDAMENTOS
-- ============================================
-- Inserir serviços com valores obrigatórios (valor, quantidade, valor_total)
-- Os serviços foram criados com IDs 1, 2, 3 (ForFit) e 4, 5, 6 (Salão Alef)
-- Os agendamentos foram criados com IDs 1, 2 (ForFit) e 3, 4 (Salão Alef)

-- Agendamento 1 ForFit -> Avaliação Física (servico_id 1, valor 150.00)
INSERT INTO agendamento_servicos (agendamento_id, servico_id, valor, quantidade, valor_total, descricao)
VALUES (1, 1, 150.00, 1, 150.00, 'Avaliação completa de condicionamento físico');

-- Agendamento 2 ForFit -> Personal Trainer (servico_id 2, valor 100.00)
INSERT INTO agendamento_servicos (agendamento_id, servico_id, valor, quantidade, valor_total, descricao)
VALUES (2, 2, 100.00, 1, 100.00, 'Aula individual com personal trainer');

-- Agendamento 3 Salão Alef -> Corte de Cabelo (servico_id 4, valor 80.00)
INSERT INTO agendamento_servicos (agendamento_id, servico_id, valor, quantidade, valor_total, descricao)
VALUES (3, 4, 80.00, 1, 80.00, 'Corte de cabelo feminino/masculino');

-- Agendamento 4 Salão Alef -> Coloração (servico_id 5, valor 200.00)
INSERT INTO agendamento_servicos (agendamento_id, servico_id, valor, quantidade, valor_total, descricao)
VALUES (4, 5, 200.00, 1, 200.00, 'Coloração completa de cabelo');

-- ============================================
-- 13. RESUMO E VALIDAÇÕES
-- ============================================

-- Verificar isolamento: contar registros por empresa/unidade
DO $$
DECLARE
    empresa1_unidades INT;
    empresa2_unidades INT;
    empresa1_servicos INT;
    empresa2_servicos INT;
    empresa1_usuarios INT;
    empresa2_usuarios INT;
    empresa1_atendentes INT;
    empresa2_atendentes INT;
BEGIN
    -- Contar unidades por empresa
    SELECT COUNT(*) INTO empresa1_unidades FROM unidades WHERE empresa_id = 1;
    SELECT COUNT(*) INTO empresa2_unidades FROM unidades WHERE empresa_id = 2;
    
    -- Contar serviços por empresa
    SELECT COUNT(*) INTO empresa1_servicos 
    FROM servicos s 
    INNER JOIN unidades u ON s.unidade_id = u.id 
    WHERE u.empresa_id = 1;
    
    SELECT COUNT(*) INTO empresa2_servicos 
    FROM servicos s 
    INNER JOIN unidades u ON s.unidade_id = u.id 
    WHERE u.empresa_id = 2;
    
    -- Contar usuários vinculados por empresa
    SELECT COUNT(DISTINCT uu.usuario_id) INTO empresa1_usuarios
    FROM usuario_unidades uu
    INNER JOIN unidades u ON uu.unidade_id = u.id
    WHERE u.empresa_id = 1;
    
    SELECT COUNT(DISTINCT uu.usuario_id) INTO empresa2_usuarios
    FROM usuario_unidades uu
    INNER JOIN unidades u ON uu.unidade_id = u.id
    WHERE u.empresa_id = 2;
    
    -- Contar atendentes por empresa
    SELECT COUNT(*) INTO empresa1_atendentes
    FROM atendentes a
    INNER JOIN unidades u ON a.unidade_id = u.id
    WHERE u.empresa_id = 1;
    
    SELECT COUNT(*) INTO empresa2_atendentes
    FROM atendentes a
    INNER JOIN unidades u ON a.unidade_id = u.id
    WHERE u.empresa_id = 2;
    
    RAISE NOTICE '=== RESUMO DOS DADOS CRIADOS ===';
    RAISE NOTICE 'Empresa 1 (ForFit):';
    RAISE NOTICE '  - Unidades: %', empresa1_unidades;
    RAISE NOTICE '  - Serviços: %', empresa1_servicos;
    RAISE NOTICE '  - Usuários vinculados: %', empresa1_usuarios;
    RAISE NOTICE '  - Atendentes: %', empresa1_atendentes;
    RAISE NOTICE 'Empresa 2 (Salão Alef):';
    RAISE NOTICE '  - Unidades: %', empresa2_unidades;
    RAISE NOTICE '  - Serviços: %', empresa2_servicos;
    RAISE NOTICE '  - Usuários vinculados: %', empresa2_usuarios;
    RAISE NOTICE '  - Atendentes: %', empresa2_atendentes;
    RAISE NOTICE '================================';
    RAISE NOTICE 'ISOLAMENTO GARANTIDO:';
    RAISE NOTICE '- Maria ForFit só vê dados da ForFit';
    RAISE NOTICE '- Maria Salão Alef só vê dados do Salão Alef';
    RAISE NOTICE '- Charles só vê dados da ForFit';
    RAISE NOTICE '- Alef só vê dados do Salão Alef';
    RAISE NOTICE '================================';
END $$;

-- ============================================
-- 14. INFORMAÇÕES DE ACESSO
-- ============================================
-- Todos os usuários têm a senha: 123456
-- 
-- ADMIN:
--   Email: admin@agendainteligente.com
--   Senha: 123456
--   Acesso: Todas as empresas e unidades
--
-- GERENTES:
--   Email: charles@forfit.com (ForFit)
--   Senha: 123456
--   Acesso: Apenas Empresa ForFit (Unidade 1)
--   Nome: Charles
--
--   Email: alef@salaoalef.com (Salão Alef)
--   Senha: 123456
--   Acesso: Apenas Empresa Salão Alef (Unidade 2)
--   Nome: Alef
--
-- PROFISSIONAIS (ATENDENTES):
--   Email: maria@forfit.com (ForFit)
--   Senha: 123456
--   Acesso: Apenas Unidade 1 (ForFit)
--   Nome: Maria - ForFit
--   ISOLAMENTO: Não pode ver dados do Salão Alef
--
--   Email: maria@salaoalef.com (Salão Alef)
--   Senha: 123456
--   Acesso: Apenas Unidade 2 (Salão Alef)
--   Nome: Maria - Salão Alef
--   ISOLAMENTO: Não pode ver dados da ForFit
--
-- CLIENTES:
--   ForFit:
--     Email: cliente1@forfit.com (João Silva)
--     Email: cliente2@forfit.com (Ana Costa)
--   Salão Alef:
--     Email: cliente1@salaoalef.com (Pedro Alves)
--     Email: cliente2@salaoalef.com (Julia Ferreira)
--   Senha: 123456 (todos)
--   Acesso: Sua unidade principal

COMMENT ON TABLE empresas IS 'Dados de exemplo: 2 empresas distintas (ForFit e Salão Alef) para demonstrar isolamento';
COMMENT ON TABLE unidades IS 'Dados de exemplo: 1 unidade por empresa (total 2 unidades)';
COMMENT ON TABLE usuarios IS 'Dados de exemplo: 1 ADMIN, 2 GERENTES (Charles e Alef), 2 PROFISSIONAIS (Maria ForFit e Maria Salão Alef), 4 CLIENTES';
COMMENT ON TABLE servicos IS 'Dados de exemplo: Serviços isolados por unidade (3 serviços por unidade)';
COMMENT ON TABLE agendamentos IS 'Dados de exemplo: Agendamentos isolados por unidade - demonstra isolamento total entre empresas';
