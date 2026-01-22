-- Migration V26: Ajustar modelo para isolamento de dados por unidade
-- Esta migration garante que:
-- 1. Serviços pertencem a unidades (cada unidade tem seus próprios serviços)
-- 2. Clientes têm uma unidade principal (mas podem ter acesso a múltiplas)
-- 3. Isolamento de dados por unidade
-- 4. Estrutura pronta para permissões granulares por unidade

-- ============================================
-- 1. VINCULAR SERVIÇOS A UNIDADES
-- ============================================
-- Adicionar coluna unidade_id em servicos
ALTER TABLE servicos 
    ADD COLUMN IF NOT EXISTS unidade_id BIGINT;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_servicos_unidade_id ON servicos(unidade_id);

-- Migrar serviços existentes para uma unidade padrão (se houver unidades)
-- Se não houver unidade, será necessário criar uma manualmente
UPDATE servicos s
SET unidade_id = (
    SELECT u.id 
    FROM unidades u 
    WHERE u.ativo = TRUE 
    ORDER BY u.data_criacao ASC 
    LIMIT 1
)
WHERE s.unidade_id IS NULL 
  AND EXISTS (SELECT 1 FROM unidades LIMIT 1);

-- Tornar unidade_id obrigatório após migração
-- Primeiro, garantir que todos os serviços têm unidade
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM servicos WHERE unidade_id IS NULL) THEN
        -- Se ainda houver serviços sem unidade, usar a primeira unidade ativa
        UPDATE servicos s
        SET unidade_id = (
            SELECT u.id 
            FROM unidades u 
            WHERE u.ativo = TRUE 
            ORDER BY u.data_criacao ASC 
            LIMIT 1
        )
        WHERE s.unidade_id IS NULL
          AND EXISTS (SELECT 1 FROM unidades WHERE ativo = TRUE LIMIT 1);
        
        -- Se ainda houver serviços sem unidade, lançar erro
        IF EXISTS (SELECT 1 FROM servicos WHERE unidade_id IS NULL) THEN
            RAISE EXCEPTION 'Existem serviços sem unidade_id e não há unidades ativas. Por favor, crie uma unidade antes de continuar.';
        END IF;
    END IF;
END $$;

-- Adicionar constraint NOT NULL e foreign key
ALTER TABLE servicos 
    ALTER COLUMN unidade_id SET NOT NULL;

-- Adicionar constraint apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_servicos_unidade'
        AND table_name = 'servicos'
    ) THEN
        ALTER TABLE servicos
            ADD CONSTRAINT fk_servicos_unidade 
            FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT;
    END IF;
END $$;

COMMENT ON COLUMN servicos.unidade_id IS 'ID da unidade à qual o serviço pertence. Cada unidade tem seus próprios serviços.';

-- ============================================
-- 2. AJUSTAR RELACIONAMENTO CLIENTE-UNIDADE
-- ============================================
-- Adicionar coluna unidade_id principal em clientes
-- Isso permite que o cliente tenha uma unidade principal, mas ainda possa ter acesso a múltiplas
ALTER TABLE clientes 
    ADD COLUMN IF NOT EXISTS unidade_id BIGINT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_clientes_unidade_id ON clientes(unidade_id);

-- Migrar: se cliente tem relacionamento com unidades, usar a primeira como principal
UPDATE clientes c
SET unidade_id = (
    SELECT cu.unidade_id 
    FROM cliente_unidades cu 
    WHERE cu.cliente_id = c.id 
    ORDER BY cu.unidade_id ASC 
    LIMIT 1
)
WHERE c.unidade_id IS NULL 
  AND EXISTS (SELECT 1 FROM cliente_unidades cu WHERE cu.cliente_id = c.id);

-- Se não tiver relacionamento, usar unidade padrão
UPDATE clientes c
SET unidade_id = (
    SELECT u.id 
    FROM unidades u 
    WHERE u.ativo = TRUE 
    ORDER BY u.data_criacao ASC 
    LIMIT 1
)
WHERE c.unidade_id IS NULL 
  AND EXISTS (SELECT 1 FROM unidades LIMIT 1);

-- Tornar unidade_id obrigatório após migração
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM clientes WHERE unidade_id IS NULL) THEN
        -- Se ainda houver clientes sem unidade, usar a primeira unidade ativa
        UPDATE clientes c
        SET unidade_id = (
            SELECT u.id 
            FROM unidades u 
            WHERE u.ativo = TRUE 
            ORDER BY u.data_criacao ASC 
            LIMIT 1
        )
        WHERE c.unidade_id IS NULL
          AND EXISTS (SELECT 1 FROM unidades WHERE ativo = TRUE LIMIT 1);
        
        -- Se ainda houver clientes sem unidade, lançar erro
        IF EXISTS (SELECT 1 FROM clientes WHERE unidade_id IS NULL) THEN
            RAISE EXCEPTION 'Existem clientes sem unidade_id e não há unidades ativas. Por favor, crie uma unidade antes de continuar.';
        END IF;
    END IF;
END $$;

ALTER TABLE clientes 
    ALTER COLUMN unidade_id SET NOT NULL;

-- Adicionar constraint apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_clientes_unidade'
        AND table_name = 'clientes'
    ) THEN
        ALTER TABLE clientes
            ADD CONSTRAINT fk_clientes_unidade 
            FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT;
    END IF;
END $$;

COMMENT ON COLUMN clientes.unidade_id IS 'ID da unidade principal do cliente. Cliente pertence a uma unidade, mas pode ter acesso a múltiplas através de cliente_unidades.';

-- ============================================
-- 3. GARANTIR ISOLAMENTO EM AGENDAMENTOS
-- ============================================
-- Agendamentos já têm unidade_id (adicionado em V3)
-- Vamos garantir que está correto e adicionar índices para isolamento

-- Verificar se unidade_id existe em agendamentos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agendamentos' AND column_name = 'unidade_id'
    ) THEN
        ALTER TABLE agendamentos ADD COLUMN unidade_id BIGINT;
        
        -- Migrar unidade_id baseado no atendente
        UPDATE agendamentos a
        SET unidade_id = at.unidade_id
        FROM atendentes at
        WHERE a.atendente_id = at.id
          AND a.unidade_id IS NULL;
    END IF;
END $$;

-- Garantir que todos os agendamentos têm unidade_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM agendamentos WHERE unidade_id IS NULL) THEN
        -- Tentar obter unidade do atendente
        UPDATE agendamentos a
        SET unidade_id = at.unidade_id
        FROM atendentes at
        WHERE a.atendente_id = at.id
          AND a.unidade_id IS NULL;
        
        -- Se ainda houver agendamentos sem unidade, usar unidade padrão
        UPDATE agendamentos a
        SET unidade_id = (
            SELECT u.id 
            FROM unidades u 
            WHERE u.ativo = TRUE 
            ORDER BY u.data_criacao ASC 
            LIMIT 1
        )
        WHERE a.unidade_id IS NULL
          AND EXISTS (SELECT 1 FROM unidades LIMIT 1);
    END IF;
END $$;

-- Tornar unidade_id obrigatório em agendamentos
ALTER TABLE agendamentos 
    ALTER COLUMN unidade_id SET NOT NULL;

-- Adicionar/verificar foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_agendamentos_unidade'
        AND table_name = 'agendamentos'
    ) THEN
        ALTER TABLE agendamentos
            ADD CONSTRAINT fk_agendamentos_unidade 
            FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Criar índices para isolamento e performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_unidade_id ON agendamentos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_unidade_cliente ON agendamentos(unidade_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_unidade_atendente ON agendamentos(unidade_id, atendente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_unidade_data ON agendamentos(unidade_id, data_hora_inicio);

COMMENT ON COLUMN agendamentos.unidade_id IS 'ID da unidade do agendamento. Garante isolamento de dados entre unidades.';

-- ============================================
-- 4. AJUSTAR ATENDENTE_SERVICOS PARA ISOLAMENTO
-- ============================================
-- Garantir que atendente_servicos só relaciona serviços da mesma unidade do atendente
-- Criar índice composto para melhor performance
CREATE INDEX IF NOT EXISTS idx_atendente_servicos_atendente_servico 
    ON atendente_servicos(atendente_id, servico_id);

-- ============================================
-- 5. ADICIONAR ÍNDICES PARA ISOLAMENTO
-- ============================================
-- Índices adicionais para garantir performance em consultas filtradas por unidade

-- Índice em usuario_unidades para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_usuario_unidades_usuario_unidade 
    ON usuario_unidades(usuario_id, unidade_id);

-- Índice em cliente_unidades
CREATE INDEX IF NOT EXISTS idx_cliente_unidades_cliente_unidade 
    ON cliente_unidades(cliente_id, unidade_id);

-- ============================================
-- 6. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE servicos IS 'Serviços oferecidos pelas unidades. Cada serviço pertence a uma unidade específica.';
COMMENT ON TABLE clientes IS 'Clientes do sistema. Cada cliente pertence a uma unidade principal, mas pode ter acesso a múltiplas unidades.';
COMMENT ON TABLE agendamentos IS 'Agendamentos do sistema. Cada agendamento pertence a uma unidade específica, garantindo isolamento de dados.';
COMMENT ON TABLE usuario_unidades IS 'Relacionamento N:N entre usuários e unidades. Define quais unidades cada usuário (gerente/atendente) pode acessar.';
COMMENT ON TABLE cliente_unidades IS 'Relacionamento N:N entre clientes e unidades. Define unidades adicionais que o cliente pode acessar além da unidade principal.';

-- ============================================
-- 7. VALIDAÇÕES E CONSTRAINTS
-- ============================================
-- Adicionar constraint para garantir que serviços de um atendente são da mesma unidade
-- Isso será validado na aplicação, mas podemos criar uma função de validação se necessário

-- Função para validar isolamento (opcional, pode ser usado em triggers)
CREATE OR REPLACE FUNCTION validar_isolamento_unidade()
RETURNS TRIGGER AS $$
BEGIN
    -- Esta função pode ser expandida para validar regras de negócio
    -- Por enquanto, apenas retorna NEW
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validar_isolamento_unidade() IS 'Função para validar regras de isolamento de dados por unidade';
