-- Criar tabela de relacionamento N:N entre usuários e unidades
CREATE TABLE IF NOT EXISTS usuario_unidades (
    usuario_id BIGINT NOT NULL,
    unidade_id BIGINT NOT NULL,
    PRIMARY KEY (usuario_id, unidade_id),
    CONSTRAINT fk_usuario_unidades_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_unidades_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usuario_unidades_usuario ON usuario_unidades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_unidades_unidade ON usuario_unidades(unidade_id);

COMMENT ON TABLE usuario_unidades IS 'Tabela de relacionamento N:N entre usuários e unidades - permite que um usuário tenha acesso a múltiplas unidades';
