-- Tabela para registrar tokens de push notification (Expo).
-- Cada cliente pode ter múltiplos tokens (um por dispositivo).

CREATE TABLE IF NOT EXISTS push_tokens (
    id              BIGSERIAL PRIMARY KEY,
    cliente_id      BIGINT       NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    token           VARCHAR(500) NOT NULL,
    plataforma      VARCHAR(20),   -- 'ios' | 'android' | 'web'
    device_info     VARCHAR(200),  -- modelo/OS pra debug
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE,
    data_criacao    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_push_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_cliente ON push_tokens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_ativo ON push_tokens(ativo) WHERE ativo = true;
