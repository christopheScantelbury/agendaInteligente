-- Criar tabela de perfis customizados
CREATE TABLE IF NOT EXISTS perfis (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao VARCHAR(200),
    sistema BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    permissoes_menu TEXT,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perfis_nome ON perfis(nome);
CREATE INDEX IF NOT EXISTS idx_perfis_ativo ON perfis(ativo);

COMMENT ON TABLE perfis IS 'Tabela de perfis customizados com permissões de menu';
COMMENT ON COLUMN perfis.sistema IS 'Indica se é um perfil do sistema (ADMIN, GERENTE, etc)';
COMMENT ON COLUMN perfis.permissoes_menu IS 'JSON com lista de menus permitidos para este perfil';

-- Criar perfis do sistema
INSERT INTO perfis (nome, descricao, sistema, ativo, data_criacao, data_atualizacao, permissoes_menu)
VALUES 
    ('ADMIN', 'Administrador com acesso total', TRUE, TRUE, NOW(), NOW(), '["/", "/clientes", "/unidades", "/atendentes", "/servicos", "/usuarios", "/agendamentos", "/notificacoes"]'),
    ('GERENTE', 'Gerente de unidade', TRUE, TRUE, NOW(), NOW(), '["/", "/clientes", "/unidades", "/atendentes", "/servicos", "/agendamentos", "/notificacoes"]'),
    ('PROFISSIONAL', 'Profissional/Atendente', TRUE, TRUE, NOW(), NOW(), '["/", "/agendamentos"]'),
    ('CLIENTE', 'Cliente', TRUE, TRUE, NOW(), NOW(), '["/cliente/agendar", "/cliente/meus-agendamentos"]')
ON CONFLICT (nome) DO NOTHING;

-- Adicionar colunas perfil_id e perfil_sistema na tabela usuarios
ALTER TABLE usuarios 
    ADD COLUMN IF NOT EXISTS perfil_sistema VARCHAR(20),
    ADD COLUMN IF NOT EXISTS perfil_id BIGINT;

-- Criar foreign key para perfil customizado
ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuario_perfil 
    FOREIGN KEY (perfil_id) REFERENCES perfis(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_id ON usuarios(perfil_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_sistema ON usuarios(perfil_sistema);

-- Migrar dados: atualizar perfil_sistema baseado no perfil atual (campo VARCHAR existente)
UPDATE usuarios 
SET perfil_sistema = perfil
WHERE perfil_sistema IS NULL AND perfil IS NOT NULL;

-- Vincular usuários aos perfis do sistema correspondentes
UPDATE usuarios u
SET perfil_id = p.id
FROM perfis p
WHERE UPPER(p.nome) = UPPER(u.perfil)
  AND u.perfil_id IS NULL
  AND p.sistema = TRUE;

-- Manter o campo perfil por enquanto para compatibilidade (será removido em migration futura se necessário)
-- O campo perfil_sistema será usado como principal

COMMENT ON COLUMN usuarios.perfil_sistema IS 'Perfil do sistema (ADMIN, GERENTE, PROFISSIONAL, CLIENTE)';
COMMENT ON COLUMN usuarios.perfil_id IS 'ID do perfil customizado (pode ser null se usar perfil_sistema)';
