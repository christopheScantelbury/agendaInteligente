-- #138 + #139: Planos do Agenda Inteligente
-- Mapeamento de planos baseado em estudo de mercado (Trinks/Belezzia/Vagaro/Mindbody)
-- e capacidade da plataforma NotaFácil parceira (cota mensal de NFS-e por plano).

CREATE TABLE IF NOT EXISTS planos (
    id                       BIGSERIAL PRIMARY KEY,
    nome                     VARCHAR(40)    NOT NULL UNIQUE,    -- TRIAL, STARTER, PRO, BUSINESS
    nome_publico             VARCHAR(80)    NOT NULL,           -- "Starter", "Pro" (exibição)
    descricao                VARCHAR(500),
    preco_mensal_brl         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    limite_unidades          INTEGER,                           -- NULL = ilimitado
    limite_profissionais     INTEGER,                           -- NULL = ilimitado
    limite_agendamentos_mes  INTEGER,                           -- NULL = ilimitado
    limite_nfse_mes          INTEGER        NOT NULL DEFAULT 0, -- 0 = sem NFS-e
    preco_excedente_nfse_brl NUMERIC(10, 4) DEFAULT 0,          -- cobrado por nota acima do limite
    duracao_trial_dias       INTEGER,                           -- preenchido só pro TRIAL
    ordem                    INTEGER        NOT NULL DEFAULT 0, -- pra exibir em ordem (TRIAL=0, STARTER=1, PRO=2, BUSINESS=3)
    ativo                    BOOLEAN        NOT NULL DEFAULT TRUE,
    data_criacao             TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planos_ativo_ordem ON planos(ativo, ordem);

-- Empresa ganha referência ao plano
ALTER TABLE empresas
    ADD COLUMN IF NOT EXISTS plano_id BIGINT REFERENCES planos(id);
ALTER TABLE empresas
    ADD COLUMN IF NOT EXISTS plano_inicio DATE;
ALTER TABLE empresas
    ADD COLUMN IF NOT EXISTS plano_expiracao DATE;       -- Trial expira; planos pagos podem ser NULL

CREATE INDEX IF NOT EXISTS idx_empresas_plano ON empresas(plano_id);

-- Seed dos 4 planos (estudo de mercado pequeno/médio porte BR — 2026)
-- Trinks ~R$79/mês, Belezzia ~R$49/mês, Vagaro USD 25 (~R$125), Mindbody USD 169
-- Posicionamento Agenda Inteligente: Starter compete com Belezzia, Pro abaixo do
-- Trinks com mais unidades, Business compete com Mindbody pagando menos.
INSERT INTO planos (nome, nome_publico, descricao, preco_mensal_brl,
                    limite_unidades, limite_profissionais, limite_agendamentos_mes,
                    limite_nfse_mes, preco_excedente_nfse_brl, duracao_trial_dias, ordem)
VALUES
  ('TRIAL', 'Trial', 'Período de avaliação gratuita. Sem cartão.', 0.00,
   1, 2, 50, 5, 0.0000, 14, 0),
  ('STARTER', 'Starter', 'Para quem está começando — 1 unidade, equipe pequena.', 49.00,
   1, 3, 200, 20, 1.5000, NULL, 1),
  ('PRO', 'Pro', 'Crescimento — múltiplas unidades, equipe consolidada.', 99.00,
   3, 10, 800, 100, 1.2000, NULL, 2),
  ('BUSINESS', 'Business', 'Redes — sem limites operacionais.', 199.00,
   NULL, NULL, NULL, 500, 1.0000, NULL, 3)
ON CONFLICT (nome) DO NOTHING;

COMMENT ON COLUMN planos.limite_nfse_mes IS '#138: cota mensal de NFS-e via parceria NotaFácil. Excedente cobrado por preco_excedente_nfse_brl/nota.';
COMMENT ON COLUMN planos.preco_excedente_nfse_brl IS '#138: BRL por NFS-e acima do limite_nfse_mes.';
COMMENT ON COLUMN empresas.plano_expiracao IS '#139: usado pro TRIAL (data_criacao + duracao_trial_dias). Planos pagos: NULL (vigência mensal renovada via billing externo).';
