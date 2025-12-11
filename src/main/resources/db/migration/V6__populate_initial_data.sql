-- Popular dados iniciais do sistema

-- Inserir Clínica de exemplo
INSERT INTO clinicas (nome, razao_social, cnpj, endereco, numero, bairro, cep, cidade, uf, telefone, email, ativo, data_criacao, data_atualizacao)
VALUES (
    'Clínica Saúde Total',
    'Clínica Saúde Total LTDA',
    '12345678000190',
    'Av. Getúlio Vargas',
    '1234',
    'Centro',
    '69020120',
    'Manaus',
    'AM',
    '(92) 3234-5678',
    'contato@clinicasaudetotal.com.br',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (cnpj) DO NOTHING;

-- Inserir Unidades
INSERT INTO unidades (clinica_id, nome, descricao, endereco, numero, bairro, cep, cidade, uf, telefone, email, ativo, data_criacao, data_atualizacao)
SELECT 
    c.id,
    'Unidade Centro',
    'Unidade principal no centro de Manaus',
    'Av. Getúlio Vargas',
    '1234',
    'Centro',
    '69020120',
    'Manaus',
    'AM',
    '(92) 3234-5678',
    'centro@clinicasaudetotal.com.br',
    TRUE,
    NOW(),
    NOW()
FROM clinicas c WHERE c.cnpj = '12345678000190'
ON CONFLICT DO NOTHING;

INSERT INTO unidades (clinica_id, nome, descricao, endereco, numero, bairro, cep, cidade, uf, telefone, email, ativo, data_criacao, data_atualizacao)
SELECT 
    c.id,
    'Unidade Zona Norte',
    'Unidade na zona norte de Manaus',
    'Av. Noel Nutels',
    '5678',
    'Cidade Nova',
    '69090100',
    'Manaus',
    'AM',
    '(92) 3234-5679',
    'zonanorte@clinicasaudetotal.com.br',
    TRUE,
    NOW(),
    NOW()
FROM clinicas c WHERE c.cnpj = '12345678000190'
ON CONFLICT DO NOTHING;

-- Inserir Serviços
INSERT INTO servicos (nome, descricao, valor, duracao_minutos, ativo, data_criacao, data_atualizacao)
VALUES 
    ('Consulta Médica Geral', 'Consulta médica geral com clínico', 150.00, 30, TRUE, NOW(), NOW()),
    ('Consulta Cardiológica', 'Consulta com cardiologista', 250.00, 45, TRUE, NOW(), NOW()),
    ('Consulta Dermatológica', 'Consulta com dermatologista', 200.00, 30, TRUE, NOW(), NOW()),
    ('Exame de Sangue', 'Coleta de sangue para exames laboratoriais', 80.00, 15, TRUE, NOW(), NOW()),
    ('Eletrocardiograma', 'Exame de eletrocardiograma', 120.00, 20, TRUE, NOW(), NOW()),
    ('Ultrassonografia', 'Exame de ultrassonografia', 180.00, 30, TRUE, NOW(), NOW()),
    ('Fisioterapia', 'Sessão de fisioterapia', 100.00, 60, TRUE, NOW(), NOW()),
    ('Consulta Odontológica', 'Consulta com dentista', 120.00, 45, TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Inserir Usuários adicionais
INSERT INTO usuarios (email, senha, nome, ativo, perfil, data_criacao, data_atualizacao)
VALUES 
    ('atendente1@clinicasaudetotal.com.br', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O', 'Maria Silva', TRUE, 'ATENDENTE', NOW(), NOW()),
    ('atendente2@clinicasaudetotal.com.br', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O', 'João Santos', TRUE, 'ATENDENTE', NOW(), NOW()),
    ('gerente@clinicasaudetotal.com.br', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O', 'Ana Costa', TRUE, 'GERENTE', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Inserir Atendentes vinculados às unidades
INSERT INTO atendentes (unidade_id, usuario_id, cpf, telefone, ativo, data_criacao, data_atualizacao)
SELECT 
    u.id,
    us.id,
    '12345678901',
    '(92) 99999-1111',
    TRUE,
    NOW(),
    NOW()
FROM unidades u, usuarios us
WHERE u.nome = 'Unidade Centro' AND us.email = 'atendente1@clinicasaudetotal.com.br'
ON CONFLICT (usuario_id) DO NOTHING;

INSERT INTO atendentes (unidade_id, usuario_id, cpf, telefone, ativo, data_criacao, data_atualizacao)
SELECT 
    u.id,
    us.id,
    '98765432100',
    '(92) 99999-2222',
    TRUE,
    NOW(),
    NOW()
FROM unidades u, usuarios us
WHERE u.nome = 'Unidade Zona Norte' AND us.email = 'atendente2@clinicasaudetotal.com.br'
ON CONFLICT (usuario_id) DO NOTHING;

-- Vincular serviços aos atendentes
INSERT INTO atendente_servicos (atendente_id, servico_id)
SELECT a.id, s.id
FROM atendentes a, servicos s
WHERE a.cpf = '12345678901' 
  AND s.nome IN ('Consulta Médica Geral', 'Exame de Sangue', 'Eletrocardiograma')
ON CONFLICT DO NOTHING;

INSERT INTO atendente_servicos (atendente_id, servico_id)
SELECT a.id, s.id
FROM atendentes a, servicos s
WHERE a.cpf = '98765432100' 
  AND s.nome IN ('Consulta Cardiológica', 'Ultrassonografia', 'Fisioterapia')
ON CONFLICT DO NOTHING;

-- Inserir Clientes de exemplo
INSERT INTO clientes (nome, cpf_cnpj, email, telefone, endereco, numero, bairro, cep, cidade, uf, data_criacao, data_atualizacao)
VALUES 
    ('José da Silva', '12345678901', 'jose.silva@email.com', '(92) 98888-1111', 'Rua das Flores', '100', 'Centro', '69020100', 'Manaus', 'AM', NOW(), NOW()),
    ('Maria Oliveira', '98765432100', 'maria.oliveira@email.com', '(92) 98888-2222', 'Av. Constantino Nery', '200', 'Centro', '69020110', 'Manaus', 'AM', NOW(), NOW()),
    ('Pedro Costa', '11122233344', 'pedro.costa@email.com', '(92) 98888-3333', 'Rua 10 de Julho', '300', 'Centro', '69020120', 'Manaus', 'AM', NOW(), NOW())
ON CONFLICT (cpf_cnpj) DO NOTHING;

