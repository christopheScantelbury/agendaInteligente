-- Dados iniciais para desenvolvimento

-- Inserir serviços de exemplo
INSERT INTO servicos (nome, descricao, valor, duracao_minutos, ativo, data_criacao, data_atualizacao)
VALUES 
    ('Consulta Médica', 'Consulta médica geral', 150.00, 30, TRUE, NOW(), NOW()),
    ('Exame de Sangue', 'Coleta de sangue para exames laboratoriais', 80.00, 15, TRUE, NOW(), NOW()),
    ('Consulta Odontológica', 'Consulta com dentista', 120.00, 45, TRUE, NOW(), NOW()),
    ('Fisioterapia', 'Sessão de fisioterapia', 100.00, 60, TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;

