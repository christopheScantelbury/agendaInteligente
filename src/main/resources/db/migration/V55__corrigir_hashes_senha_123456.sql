-- V55: Corrige os hashes BCrypt de todos os usuários demo
-- Problema: o hash em V27/V45 não corresponde à senha "123456"
-- Solução: hashes gerados diretamente pelo BCryptPasswordEncoder da aplicação em produção
-- Todos os usuários abaixo têm senha: 123456

UPDATE usuarios SET senha = '$2a$10$V.PRjqG9/UfDlZm.V8WsxeIp/zV/tKBkH1aiVSu9Z844H4Gfj9fhm'
WHERE email = 'admin@agendainteligente.com';

UPDATE usuarios SET senha = '$2a$10$DGRauXQl9mQ6Ht/eyf6nmussSdMQmibyiQNycOdNNNRPPO.eQMK6i'
WHERE email = 'charles@forfit.com';

UPDATE usuarios SET senha = '$2a$10$qzjAXD2eaDyV8fv0Vgzvpe60Lcwd.ruco21z.igRFYvHUEuL.ETA.'
WHERE email = 'alef@salaoalef.com';

UPDATE usuarios SET senha = '$2a$10$b5y7F41XxajThlo2QjOqnOa4W0ngg0uR/SRFwrOnTZzGs4pAosl0q'
WHERE email = 'maria@forfit.com';

UPDATE usuarios SET senha = '$2a$10$e8qlXPw617nSkRu7JXa9G.ajESmYbqVn5BZdelm5XEc8KcXvJVojq'
WHERE email = 'maria@salaoalef.com';

-- Garantir que todos estão ativos
UPDATE usuarios SET ativo = TRUE
WHERE email IN (
    'admin@agendainteligente.com',
    'charles@forfit.com',
    'alef@salaoalef.com',
    'maria@forfit.com',
    'maria@salaoalef.com'
);
