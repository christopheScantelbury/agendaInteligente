-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    razao_social VARCHAR(200),
    cnpj VARCHAR(14) UNIQUE,
    email VARCHAR(100),
    telefone VARCHAR(20),
    endereco VARCHAR(200),
    numero VARCHAR(10),
    bairro VARCHAR(100),
    cep VARCHAR(8),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    logo TEXT,
    cor_app VARCHAR(7),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON empresas(ativo);

COMMENT ON TABLE empresas IS 'Tabela de empresas que possuem múltiplas unidades';
COMMENT ON COLUMN empresas.logo IS 'Logo da empresa em base64 (comprimida)';
COMMENT ON COLUMN empresas.cor_app IS 'Cor principal do app em formato hexadecimal (ex: #FF5733)';

-- Adicionar coluna empresa_id na tabela unidades
ALTER TABLE unidades 
    ADD COLUMN IF NOT EXISTS empresa_id BIGINT;

-- Criar foreign key
ALTER TABLE unidades
    ADD CONSTRAINT fk_unidade_empresa 
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_unidades_empresa_id ON unidades(empresa_id);

-- Migrar dados: mover logo e cor_app de unidades para empresas
-- Criar uma empresa padrão para unidades existentes
INSERT INTO empresas (nome, razao_social, ativo, data_criacao, data_atualizacao)
SELECT 
    COALESCE(MAX(nome), 'Empresa Padrão') as nome,
    COALESCE(MAX(nome), 'Empresa Padrão') as razao_social,
    TRUE as ativo,
    NOW() as data_criacao,
    NOW() as data_atualizacao
FROM unidades
WHERE NOT EXISTS (SELECT 1 FROM empresas LIMIT 1)
LIMIT 1;

-- Atualizar unidades existentes para usar a empresa padrão
UPDATE unidades 
SET empresa_id = (SELECT id FROM empresas LIMIT 1)
WHERE empresa_id IS NULL;

-- Mover logo e cor_app para a empresa (se houver)
UPDATE empresas e
SET 
    logo = (SELECT logo FROM unidades u WHERE u.empresa_id = e.id LIMIT 1),
    cor_app = (SELECT cor_app FROM unidades u WHERE u.empresa_id = e.id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM unidades u WHERE u.empresa_id = e.id);

-- Remover colunas logo e cor_app de unidades (será feito em migration separada para segurança)
-- ALTER TABLE unidades DROP COLUMN IF EXISTS logo;
-- ALTER TABLE unidades DROP COLUMN IF EXISTS cor_app;

-- Tornar empresa_id obrigatório após migração
ALTER TABLE unidades 
    ALTER COLUMN empresa_id SET NOT NULL;

COMMENT ON COLUMN unidades.empresa_id IS 'ID da empresa à qual a unidade pertence';
