-- Garante login do admin em produção (main ou ambientes sem V35/V36).
-- Admin deve logar com senha 123456 (conforme DADOS_ACESSO.md).
-- Hash BCrypt para "123456": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

UPDATE usuarios
SET senha = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    perfil_sistema = 'ADMIN',
    perfil_id = NULL,
    ativo = TRUE,
    data_atualizacao = NOW()
WHERE email = 'admin@agendainteligente.com';
