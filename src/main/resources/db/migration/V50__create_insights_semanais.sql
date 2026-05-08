CREATE TABLE IF NOT EXISTS insights_semanais (
    id          BIGSERIAL PRIMARY KEY,
    unidade_id  BIGINT REFERENCES unidades(id) ON DELETE CASCADE,
    semana      DATE NOT NULL,
    texto       TEXT NOT NULL,
    criado_em   TIMESTAMP DEFAULT NOW(),
    UNIQUE (unidade_id, semana)
);

CREATE INDEX IF NOT EXISTS idx_insights_unidade_semana ON insights_semanais (unidade_id, semana DESC);
