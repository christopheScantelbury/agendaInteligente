-- Atualizar clientes existentes com senha e dados completos
-- Senha padrão para todos: cliente123 (hash BCrypt)
-- Hash gerado com BCryptPasswordEncoder: $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O5K

-- Hash BCrypt para senha "cliente123"
-- Usando o mesmo hash dos atendentes por enquanto (senha: 123456)
-- Em produção, cada cliente deve ter sua própria senha única
-- Hash válido para "123456": $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O

-- Atualizar cliente José da Silva
UPDATE clientes 
SET 
    senha = '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O',
    data_nascimento = '1980-05-15',
    rg = '1234567',
    complemento = 'Apto 101',
    ativo = TRUE
WHERE cpf_cnpj = '12345678901';

-- Atualizar cliente Maria Oliveira
UPDATE clientes 
SET 
    senha = '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O',
    data_nascimento = '1985-08-20',
    rg = '7654321',
    complemento = 'Casa',
    ativo = TRUE
WHERE cpf_cnpj = '98765432100';

-- Atualizar cliente Pedro Costa
UPDATE clientes 
SET 
    senha = '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O',
    data_nascimento = '1990-12-10',
    rg = '1122334',
    complemento = 'Bloco B',
    ativo = TRUE
WHERE cpf_cnpj = '11122233344';

-- Adicionar mais clientes de exemplo com dados completos
INSERT INTO clientes (nome, cpf_cnpj, email, telefone, endereco, numero, complemento, bairro, cep, cidade, uf, data_nascimento, rg, senha, ativo, data_criacao, data_atualizacao)
VALUES 
    ('Ana Paula Santos', '55566677788', 'ana.santos@email.com', '(92) 98888-4444', 'Av. Djalma Batista', '500', 'Sala 201', 'Chapada', '69050000', 'Manaus', 'AM', '1992-03-25', '5566778', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O', TRUE, NOW(), NOW()),
    ('Carlos Eduardo Lima', '99988877766', 'carlos.lima@email.com', '(92) 98888-5555', 'Rua Pará', '700', 'Fundos', 'Adrianópolis', '69057000', 'Manaus', 'AM', '1988-07-18', '9988776', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iwy7pX5O', TRUE, NOW(), NOW())
ON CONFLICT (cpf_cnpj) DO NOTHING;

