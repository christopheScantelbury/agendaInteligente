-- Adicionar novas tabelas e campos

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    perfil VARCHAR(20) NOT NULL DEFAULT 'ATENDENTE',
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT uk_usuarios_email UNIQUE (email)
);

-- Tabela de unidades
CREATE TABLE IF NOT EXISTS unidades (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(200),
    endereco VARCHAR(200),
    numero VARCHAR(10),
    bairro VARCHAR(100),
    cep VARCHAR(8),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    telefone VARCHAR(20),
    email VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP
);

-- Tabela de atendentes
CREATE TABLE IF NOT EXISTS atendentes (
    id BIGSERIAL PRIMARY KEY,
    unidade_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL,
    telefone VARCHAR(20),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT fk_atendentes_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id),
    CONSTRAINT fk_atendentes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT uk_atendentes_usuario UNIQUE (usuario_id)
);

-- Adicionar campos novos em agendamentos
ALTER TABLE agendamentos 
    ADD COLUMN IF NOT EXISTS unidade_id BIGINT,
    ADD COLUMN IF NOT EXISTS atendente_id BIGINT,
    ADD COLUMN IF NOT EXISTS valor_final NUMERIC(10, 2);

-- Adicionar foreign keys em agendamentos
ALTER TABLE agendamentos
    ADD CONSTRAINT fk_agendamentos_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id),
    ADD CONSTRAINT fk_agendamentos_atendente FOREIGN KEY (atendente_id) REFERENCES atendentes(id);

-- Tornar os campos obrigatórios (após popular dados se necessário)
-- ALTER TABLE agendamentos ALTER COLUMN unidade_id SET NOT NULL;
-- ALTER TABLE agendamentos ALTER COLUMN atendente_id SET NOT NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_agendamentos_unidade ON agendamentos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_atendente ON agendamentos(atendente_id);
CREATE INDEX IF NOT EXISTS idx_atendentes_unidade ON atendentes(unidade_id);
CREATE INDEX IF NOT EXISTS idx_atendentes_usuario ON atendentes(usuario_id);

