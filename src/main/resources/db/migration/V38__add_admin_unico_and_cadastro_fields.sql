-- Campos adicionais para cadastro administrativo inicial
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS area_atuacao VARCHAR(120),
    ADD COLUMN IF NOT EXISTS quantidade_unidades INTEGER;

-- Novo perfil de sistema: ADMINISTRADOR (mesmas permissoes do ADMIN)
INSERT INTO perfis (
    nome,
    descricao,
    sistema,
    ativo,
    atendente,
    cliente,
    gerente,
    data_criacao,
    data_atualizacao,
    permissoes_menu,
    permissoes_granulares
)
SELECT
    'ADMINISTRADOR',
    'Administrador para empresa com unidade única',
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    NOW(),
    NOW(),
    p.permissoes_menu,
    p.permissoes_granulares
FROM perfis p
WHERE p.nome = 'ADMIN'
  AND NOT EXISTS (SELECT 1 FROM perfis WHERE nome = 'ADMINISTRADOR');
