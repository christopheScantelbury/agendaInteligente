-- Migration para unificar Cliente, Atendente e Gerente em Usuario
-- Esta migration adiciona os campos necessários e migra os dados

-- 1. Adicionar colunas na tabela usuarios para campos de Cliente
ALTER TABLE usuarios 
    ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(14),
    ADD COLUMN IF NOT EXISTS data_nascimento DATE,
    ADD COLUMN IF NOT EXISTS rg VARCHAR(20),
    ADD COLUMN IF NOT EXISTS endereco VARCHAR(200),
    ADD COLUMN IF NOT EXISTS numero VARCHAR(10),
    ADD COLUMN IF NOT EXISTS complemento VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cep VARCHAR(8),
    ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
    ADD COLUMN IF NOT EXISTS uf VARCHAR(2);

-- 2. Adicionar colunas na tabela usuarios para campos de Atendente/Gerente
ALTER TABLE usuarios 
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS percentual_comissao NUMERIC(5,2) DEFAULT 0;

-- 3. Criar índice único para cpf_cnpj (se não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_cpf_cnpj ON usuarios(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;

-- 4. Migrar dados de Clientes para Usuarios
-- Primeiro, criar usuários para clientes que ainda não têm
INSERT INTO usuarios (nome, email, senha, perfil_sistema, ativo, cpf_cnpj, data_nascimento, rg, 
                      endereco, numero, complemento, bairro, cep, cidade, uf, telefone, 
                      data_criacao, data_atualizacao)
SELECT 
    c.nome,
    COALESCE(c.email, 'cliente_' || c.id || '@temp.com') as email,
    COALESCE(c.senha, 'temp123') as senha,
    'CLIENTE' as perfil_sistema,
    c.ativo,
    c.cpf_cnpj,
    c.data_nascimento,
    c.rg,
    c.endereco,
    c.numero,
    c.complemento,
    c.bairro,
    c.cep,
    c.cidade,
    c.uf,
    c.telefone,
    c.data_criacao,
    c.data_atualizacao
FROM clientes c
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.email = c.email AND c.email IS NOT NULL
)
ON CONFLICT (email) DO NOTHING;

-- Migrar unidades de clientes para usuarios
INSERT INTO cliente_unidades (cliente_id, unidade_id)
SELECT c.id, cu.unidade_id
FROM clientes c
JOIN cliente_unidades cu ON cu.cliente_id = c.id
WHERE NOT EXISTS (
    SELECT 1 FROM usuario_unidades uu
    JOIN usuarios u ON u.id = uu.usuario_id
    WHERE u.email = c.email AND uu.unidade_id = cu.unidade_id
)
ON CONFLICT DO NOTHING;

-- Atualizar usuarios existentes com dados de clientes (se já existir usuário com mesmo email)
UPDATE usuarios u
SET 
    cpf_cnpj = c.cpf_cnpj,
    data_nascimento = c.data_nascimento,
    rg = c.rg,
    endereco = c.endereco,
    numero = c.numero,
    complemento = c.complemento,
    bairro = c.bairro,
    cep = c.cep,
    cidade = c.cidade,
    uf = c.uf,
    telefone = COALESCE(u.telefone, c.telefone)
FROM clientes c
WHERE u.email = c.email AND c.email IS NOT NULL
  AND (u.cpf_cnpj IS NULL OR u.cpf_cnpj = '');

-- 5. Migrar dados de Atendentes para Usuarios
UPDATE usuarios u
SET 
    cpf = a.cpf,
    telefone = COALESCE(u.telefone, a.telefone),
    percentual_comissao = a.percentual_comissao
FROM atendentes a
WHERE u.id = a.usuario_id;

-- Migrar serviços de atendentes para usuarios (atualizar atendente_servicos para usar usuario_id)
-- Primeiro, criar uma tabela temporária para mapear atendente_id -> usuario_id
CREATE TEMP TABLE IF NOT EXISTS atendente_usuario_map AS
SELECT a.id as atendente_id, a.usuario_id
FROM atendentes a;

-- Atualizar atendente_servicos para usar usuario_id diretamente
-- Nota: A tabela atendente_servicos já usa atendente_id, então precisamos atualizar a estrutura
-- Por enquanto, vamos manter a estrutura atual e apenas garantir que os dados estão corretos

-- 6. Migrar dados de Gerentes para Usuarios
UPDATE usuarios u
SET 
    cpf = g.cpf,
    telefone = COALESCE(u.telefone, g.telefone)
FROM gerentes g
WHERE u.id = g.usuario_id;

-- 7. Atualizar tabela agendamentos para usar usuario_id em vez de cliente_id e atendente_id
-- Primeiro, adicionar colunas temporárias
ALTER TABLE agendamentos 
    ADD COLUMN IF NOT EXISTS cliente_usuario_id BIGINT,
    ADD COLUMN IF NOT EXISTS atendente_usuario_id BIGINT;

-- Migrar cliente_id para cliente_usuario_id
UPDATE agendamentos a
SET cliente_usuario_id = u.id
FROM clientes c
JOIN usuarios u ON u.email = c.email AND c.email IS NOT NULL
WHERE a.cliente_id = c.id;

-- Migrar atendente_id para atendente_usuario_id
UPDATE agendamentos a
SET atendente_usuario_id = a2.usuario_id
FROM atendentes a2
WHERE a.atendente_id = a2.id;

-- Remover colunas antigas e renomear (será feito em migration posterior para segurança)
-- ALTER TABLE agendamentos DROP COLUMN cliente_id;
-- ALTER TABLE agendamentos DROP COLUMN atendente_id;
-- ALTER TABLE agendamentos RENAME COLUMN cliente_usuario_id TO cliente_id;
-- ALTER TABLE agendamentos RENAME COLUMN atendente_usuario_id TO atendente_id;

COMMENT ON COLUMN usuarios.cpf_cnpj IS 'CPF/CNPJ do cliente (único)';
COMMENT ON COLUMN usuarios.cpf IS 'CPF do atendente/gerente';
COMMENT ON COLUMN usuarios.data_nascimento IS 'Data de nascimento do cliente';
COMMENT ON COLUMN usuarios.percentual_comissao IS 'Percentual de comissão do atendente';
