-- Criar tabela de gerentes
CREATE TABLE IF NOT EXISTS gerentes (
    id BIGSERIAL PRIMARY KEY,
    clinica_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL,
    telefone VARCHAR(20),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT fk_gerentes_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
    CONSTRAINT fk_gerentes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT uk_gerentes_usuario UNIQUE (usuario_id)
);

-- Criar tabela de horários disponíveis (gerenciados por profissionais)
CREATE TABLE IF NOT EXISTS horarios_disponiveis (
    id BIGSERIAL PRIMARY KEY,
    atendente_id BIGINT NOT NULL,
    data_hora_inicio TIMESTAMP NOT NULL,
    data_hora_fim TIMESTAMP NOT NULL,
    disponivel BOOLEAN NOT NULL DEFAULT TRUE,
    observacoes VARCHAR(500),
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP,
    CONSTRAINT fk_horarios_disponiveis_atendente FOREIGN KEY (atendente_id) REFERENCES atendentes(id)
);

-- Adicionar campos para recuperação de senha
ALTER TABLE usuarios 
    ADD COLUMN IF NOT EXISTS token_recuperacao_senha VARCHAR(255),
    ADD COLUMN IF NOT EXISTS token_recuperacao_senha_expiracao TIMESTAMP;

ALTER TABLE clientes 
    ADD COLUMN IF NOT EXISTS token_recuperacao_senha VARCHAR(255),
    ADD COLUMN IF NOT EXISTS token_recuperacao_senha_expiracao TIMESTAMP;

-- Atualizar perfil padrão de ATENDENTE para PROFISSIONAL nos registros existentes
UPDATE usuarios 
SET perfil = 'PROFISSIONAL' 
WHERE perfil = 'ATENDENTE';

-- Índices
CREATE INDEX IF NOT EXISTS idx_gerentes_clinica ON gerentes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_gerentes_usuario ON gerentes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_horarios_disponiveis_atendente ON horarios_disponiveis(atendente_id);
CREATE INDEX IF NOT EXISTS idx_horarios_disponiveis_data ON horarios_disponiveis(data_hora_inicio, data_hora_fim);
CREATE INDEX IF NOT EXISTS idx_usuarios_token_recuperacao ON usuarios(token_recuperacao_senha) WHERE token_recuperacao_senha IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_token_recuperacao ON clientes(token_recuperacao_senha) WHERE token_recuperacao_senha IS NOT NULL;

-- Comentários
COMMENT ON TABLE gerentes IS 'Gerentes de clínicas - podem gerenciar tudo da sua clínica';
COMMENT ON TABLE horarios_disponiveis IS 'Horários disponíveis criados pelos profissionais para agendamento';
COMMENT ON COLUMN usuarios.token_recuperacao_senha IS 'Token para recuperação de senha';
COMMENT ON COLUMN clientes.token_recuperacao_senha IS 'Token para recuperação de senha';

