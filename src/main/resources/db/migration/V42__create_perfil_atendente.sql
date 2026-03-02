-- Normaliza perfis legados de atendente para SECRETARIA e garante existência do perfil.
DO $$
DECLARE
    v_secretaria_id BIGINT;
BEGIN
    -- Se já existir SECRETARIA, reaponta usuários de legados e remove duplicados.
    SELECT p.id
      INTO v_secretaria_id
      FROM perfis p
     WHERE UPPER(p.nome) = 'SECRETARIA'
     ORDER BY p.id
     LIMIT 1;

    IF v_secretaria_id IS NOT NULL THEN
        UPDATE usuarios
           SET perfil_id = v_secretaria_id
         WHERE perfil_id IN (
               SELECT id FROM perfis
                WHERE nome IN ('ATENDENTE', 'Atendente')
                  AND id <> v_secretaria_id
         );

        DELETE FROM perfis
         WHERE nome IN ('ATENDENTE', 'Atendente')
           AND id <> v_secretaria_id;
    ELSE
        -- Se SECRETARIA não existir, usa o ATENDENTE/Atendente mais recente como base.
        SELECT p.id
          INTO v_secretaria_id
          FROM perfis p
         WHERE p.nome IN ('ATENDENTE', 'Atendente')
         ORDER BY p.id DESC
         LIMIT 1;

        IF v_secretaria_id IS NOT NULL THEN
            UPDATE perfis
               SET nome = 'SECRETARIA',
                   descricao = 'Perfil de secretaria que atende e agenda clientes, sem realizar procedimentos',
                   sistema = TRUE,
                   ativo = TRUE,
                   atendente = TRUE,
                   cliente = FALSE,
                   gerente = FALSE,
                   permissoes_granulares = '{
                     "/": "EDITAR",
                     "/agendamentos": "EDITAR",
                     "/clientes": "VISUALIZAR"
                   }',
                   data_atualizacao = NOW()
             WHERE id = v_secretaria_id;

            UPDATE usuarios
               SET perfil_id = v_secretaria_id
             WHERE perfil_id IN (
                   SELECT id FROM perfis
                    WHERE nome IN ('ATENDENTE', 'Atendente')
                      AND id <> v_secretaria_id
             );

            DELETE FROM perfis
             WHERE nome IN ('ATENDENTE', 'Atendente')
               AND id <> v_secretaria_id;
        END IF;
    END IF;
END $$;

-- Se ainda não existir (base sem legado), cria SECRETARIA do zero.
INSERT INTO perfis (
    nome,
    descricao,
    sistema,
    ativo,
    atendente,
    cliente,
    gerente,
    permissoes_granulares,
    data_criacao,
    data_atualizacao
)
VALUES (
    'SECRETARIA',
    'Perfil de secretaria que atende e agenda clientes, sem realizar procedimentos',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    '{
      "/": "EDITAR",
      "/agendamentos": "EDITAR",
      "/clientes": "VISUALIZAR"
    }',
    NOW(),
    NOW()
)
ON CONFLICT (nome) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    sistema = EXCLUDED.sistema,
    ativo = EXCLUDED.ativo,
    atendente = EXCLUDED.atendente,
    cliente = EXCLUDED.cliente,
    gerente = EXCLUDED.gerente,
    permissoes_granulares = EXCLUDED.permissoes_granulares,
    data_atualizacao = NOW();

-- Garante a existência/atualização do perfil PROFISSIONAL com foco em execução de procedimentos.
INSERT INTO perfis (
    nome,
    descricao,
    sistema,
    ativo,
    atendente,
    cliente,
    gerente,
    permissoes_granulares,
    data_criacao,
    data_atualizacao
)
VALUES (
    'PROFISSIONAL',
    'Perfil profissional que apenas realiza procedimentos',
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    '{
      "/": "VISUALIZAR",
      "/agendamentos": "VISUALIZAR",
      "/servicos": "VISUALIZAR"
    }',
    NOW(),
    NOW()
)
ON CONFLICT (nome) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    sistema = EXCLUDED.sistema,
    ativo = EXCLUDED.ativo,
    atendente = EXCLUDED.atendente,
    cliente = EXCLUDED.cliente,
    gerente = EXCLUDED.gerente,
    permissoes_granulares = EXCLUDED.permissoes_granulares,
    data_atualizacao = NOW();
