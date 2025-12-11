-- Inserir usuário administrador padrão
-- Senha: admin123 (deve ser alterada em produção)
-- Hash BCrypt válido gerado com BCryptPasswordEncoder do Spring Security
INSERT INTO usuarios (email, senha, nome, ativo, perfil, data_criacao, data_atualizacao)
VALUES (
    'admin@agendainteligente.com',
    '$2a$10$6pvKqRvGYeYbrwzkDHFXqOjDPdj.PphVqO0yLfKjvv/QDa6ixMO2u', -- admin123 (hash válido)
    'Administrador',
    TRUE,
    'ADMIN',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha;

