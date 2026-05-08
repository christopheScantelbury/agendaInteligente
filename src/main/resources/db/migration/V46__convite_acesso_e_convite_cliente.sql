ALTER TABLE empresas ADD COLUMN IF NOT EXISTS data_expiracao_acesso DATE;

CREATE TABLE IF NOT EXISTS convite_acesso (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    max_unidades INTEGER NOT NULL DEFAULT 1,
    data_expiracao_link TIMESTAMP NOT NULL,
    data_expiracao_acesso DATE NOT NULL,
    usado_em TIMESTAMP,
    criado_por_id BIGINT,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT fk_convite_acesso_criado_por FOREIGN KEY (criado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_convite_acesso_token ON convite_acesso(token);
CREATE INDEX IF NOT EXISTS idx_convite_acesso_usado ON convite_acesso(usado_em) WHERE usado_em IS NULL;

CREATE TABLE IF NOT EXISTS convite_cliente (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    unidade_id BIGINT NOT NULL,
    data_expiracao TIMESTAMP NOT NULL,
    usado_em TIMESTAMP,
    criado_por_id BIGINT,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT fk_convite_cliente_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE,
    CONSTRAINT fk_convite_cliente_criado_por FOREIGN KEY (criado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_convite_cliente_token ON convite_cliente(token);
CREATE INDEX IF NOT EXISTS idx_convite_cliente_unidade ON convite_cliente(unidade_id);
CREATE INDEX IF NOT EXISTS idx_convite_cliente_usado ON convite_cliente(usado_em) WHERE usado_em IS NULL;
