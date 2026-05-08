UPDATE perfis
SET permissoes_granulares = (
    COALESCE(permissoes_granulares::jsonb, '{}'::jsonb) || ('{"' || '/convites-acesso' || '": "EDITAR"}')::jsonb
)::text
WHERE nome = 'ADMIN';

UPDATE perfis
SET permissoes_granulares = (
    COALESCE(permissoes_granulares::jsonb, '{}'::jsonb) || ('{"' || '/convites-cliente' || '": "EDITAR"}')::jsonb
)::text
WHERE nome = 'GERENTE';
