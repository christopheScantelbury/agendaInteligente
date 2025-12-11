-- Criação das tabelas do sistema

CREATE TABLE IF NOT EXISTS clientes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf_cnpj VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(100),
    telefone VARCHAR(20),
    endereco VARCHAR(200),
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cep VARCHAR(8),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT uk_clientes_cpf_cnpj UNIQUE (cpf_cnpj)
);

CREATE TABLE IF NOT EXISTS servicos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500),
    valor NUMERIC(10, 2) NOT NULL,
    duracao_minutos INTEGER NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agendamentos (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL,
    servico_id BIGINT NOT NULL,
    data_hora_inicio TIMESTAMP NOT NULL,
    data_hora_fim TIMESTAMP NOT NULL,
    observacoes VARCHAR(500),
    valor_total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AGENDADO',
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT fk_agendamentos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_agendamentos_servico FOREIGN KEY (servico_id) REFERENCES servicos(id)
);

CREATE TABLE IF NOT EXISTS pagamentos (
    id BIGSERIAL PRIMARY KEY,
    agendamento_id BIGINT NOT NULL UNIQUE,
    tipo_pagamento VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    valor NUMERIC(10, 2) NOT NULL,
    id_transacao_gateway VARCHAR(100),
    url_pagamento VARCHAR(500),
    dados_transacao VARCHAR(1000),
    data_pagamento TIMESTAMP,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT fk_pagamentos_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id),
    CONSTRAINT uk_pagamentos_agendamento UNIQUE (agendamento_id)
);

CREATE TABLE IF NOT EXISTS notas_fiscais (
    id BIGSERIAL PRIMARY KEY,
    agendamento_id BIGINT NOT NULL UNIQUE,
    numero_nfse VARCHAR(50),
    codigo_verificacao VARCHAR(50),
    url_nfse VARCHAR(500),
    xml_nfse TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    mensagem_erro VARCHAR(1000),
    data_emissao TIMESTAMP,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT fk_notas_fiscais_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id),
    CONSTRAINT uk_notas_fiscais_agendamento UNIQUE (agendamento_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_servico ON agendamentos(servico_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora ON agendamentos(data_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_agendamento ON pagamentos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_transacao ON pagamentos(id_transacao_gateway);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_agendamento ON notas_fiscais(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_numero ON notas_fiscais(numero_nfse);

