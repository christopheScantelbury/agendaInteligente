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

UPDATE usuarios
SET senha = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    perfil_sistema = 'ADMIN',
    perfil_id = NULL,
    ativo = TRUE,
    data_atualizacao = NOW()
WHERE email = 'admin@agendainteligente.com';

UPDATE usuarios
SET senha = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    ativo = TRUE,
    data_atualizacao = NOW()
WHERE email IN (
    'charles@forfit.com',
    'alef@salaoalef.com',
    'maria@forfit.com',
    'maria@salaoalef.com',
    'cliente1@forfit.com',
    'cliente2@forfit.com',
    'cliente1@salaoalef.com',
    'cliente2@salaoalef.com'
);
