-- #95 (S6-3): audit log de ações sensíveis na plataforma.

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMP NOT NULL DEFAULT NOW(),
    autor_id        BIGINT,
    autor_email     VARCHAR(255),
    autor_perfil    VARCHAR(50),
    tipo_acao       VARCHAR(80) NOT NULL,
    entidade        VARCHAR(80),
    entidade_id     BIGINT,
    descricao       TEXT,
    ip              VARCHAR(45),
    user_agent      VARCHAR(500),
    metadata        JSONB,
    empresa_id      BIGINT,
    impersonated_by BIGINT
);

CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_log_autor ON audit_log (autor_id);
CREATE INDEX idx_audit_log_tipo ON audit_log (tipo_acao);
CREATE INDEX idx_audit_log_empresa ON audit_log (empresa_id);
