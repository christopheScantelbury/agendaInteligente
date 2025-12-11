-- Adicionar tabela de clínicas
CREATE TABLE IF NOT EXISTS clinicas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    razao_social VARCHAR(200),
    cnpj VARCHAR(14) NOT NULL UNIQUE,
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
    data_atualizacao TIMESTAMP,
    CONSTRAINT uk_clinicas_cnpj UNIQUE (cnpj)
);

-- Adicionar campo clinica_id em unidades
ALTER TABLE unidades 
    ADD COLUMN IF NOT EXISTS clinica_id BIGINT;

-- Adicionar foreign key
ALTER TABLE unidades
    ADD CONSTRAINT fk_unidades_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id);

-- Tabela de relacionamento atendente-serviço (N:N)
CREATE TABLE IF NOT EXISTS atendente_servicos (
    atendente_id BIGINT NOT NULL,
    servico_id BIGINT NOT NULL,
    PRIMARY KEY (atendente_id, servico_id),
    CONSTRAINT fk_atendente_servicos_atendente FOREIGN KEY (atendente_id) REFERENCES atendentes(id) ON DELETE CASCADE,
    CONSTRAINT fk_atendente_servicos_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
);

-- Tabela de serviços do agendamento (permite múltiplos serviços)
CREATE TABLE IF NOT EXISTS agendamento_servicos (
    id BIGSERIAL PRIMARY KEY,
    agendamento_id BIGINT NOT NULL,
    servico_id BIGINT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    descricao VARCHAR(500),
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_total NUMERIC(10, 2) NOT NULL,
    CONSTRAINT fk_agendamento_servicos_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
    CONSTRAINT fk_agendamento_servicos_servico FOREIGN KEY (servico_id) REFERENCES servicos(id)
);

-- Remover campo servico_id de agendamentos (agora usa agendamento_servicos)
ALTER TABLE agendamentos 
    DROP CONSTRAINT IF EXISTS fk_agendamentos_servico,
    DROP COLUMN IF EXISTS servico_id;

-- Índices
CREATE INDEX IF NOT EXISTS idx_unidades_clinica ON unidades(clinica_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_servicos_agendamento ON agendamento_servicos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_servicos_servico ON agendamento_servicos(servico_id);
CREATE INDEX IF NOT EXISTS idx_atendente_servicos_atendente ON atendente_servicos(atendente_id);
CREATE INDEX IF NOT EXISTS idx_atendente_servicos_servico ON atendente_servicos(servico_id);

