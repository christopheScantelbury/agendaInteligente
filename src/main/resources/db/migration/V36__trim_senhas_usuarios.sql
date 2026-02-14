-- Remove espaços em branco no início/fim das senhas (evita falha de login por hash inválido).
-- Problema: hashes com leading/trailing space fazem BCrypt falhar na verificação.

UPDATE usuarios
SET senha = TRIM(senha)
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
