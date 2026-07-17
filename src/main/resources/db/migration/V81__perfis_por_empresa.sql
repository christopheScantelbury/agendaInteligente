-- Issue #171: cargos por empresa + isolamento multi-tenant dos perfis.
--
-- Problema 1 (SEC): `perfis` não tinha admin_unico_id e `nome` era UNIQUE
-- global. Perfis customizados eram compartilhados entre TODOS os tenants —
-- Empresa A criava "Recepção" e a Empresa B não conseguia criar, além de
-- poder ver/usar o perfil alheio. Mesma classe do #SEC02.
--
-- Problema 2 (UX): o perfil do convidado era decidido pelo tipo do link
-- (ADMINISTRADOR sempre gerava GERENTE, hardcoded). Agora o convite aponta
-- pro cargo escolhido.
--
-- Modelo: Perfil vira "cargo" (nome livre, por empresa) ancorado num
-- perfil_sistema_base (enum fixo que define as permissões reais).

-- ── 1. Colunas novas ────────────────────────────────────────────────────────
ALTER TABLE perfis
    ADD COLUMN IF NOT EXISTS admin_unico_id BIGINT;

ALTER TABLE perfis
    ADD COLUMN IF NOT EXISTS perfil_sistema_base VARCHAR(20);

COMMENT ON COLUMN perfis.admin_unico_id IS
    'Tenant dono do cargo. NULL = perfil de sistema global (ADMIN, GERENTE...).';
COMMENT ON COLUMN perfis.perfil_sistema_base IS
    'Enum que define as permissões reais: ADMINISTRADOR|GERENTE|PROFISSIONAL|CLIENTE. O nome do cargo é livre.';

-- ── 2. Backfill ─────────────────────────────────────────────────────────────
-- Perfis de sistema ficam globais (admin_unico_id NULL) e recebem a base
-- correspondente ao próprio nome.
UPDATE perfis SET perfil_sistema_base = 'ADMINISTRADOR'
    WHERE perfil_sistema_base IS NULL AND UPPER(nome) IN ('ADMIN', 'ADMINISTRADOR');
UPDATE perfis SET perfil_sistema_base = 'GERENTE'
    WHERE perfil_sistema_base IS NULL AND (UPPER(nome) = 'GERENTE' OR gerente = TRUE);
UPDATE perfis SET perfil_sistema_base = 'CLIENTE'
    WHERE perfil_sistema_base IS NULL AND (UPPER(nome) = 'CLIENTE' OR cliente = TRUE);
UPDATE perfis SET perfil_sistema_base = 'PROFISSIONAL'
    WHERE perfil_sistema_base IS NULL AND (UPPER(nome) IN ('PROFISSIONAL', 'ATENDENTE') OR atendente = TRUE);
-- Sobrou algum sem classificação → trata como PROFISSIONAL (menor privilégio
-- entre os perfis de equipe).
UPDATE perfis SET perfil_sistema_base = 'PROFISSIONAL'
    WHERE perfil_sistema_base IS NULL;

-- Perfis customizados (sistema = false) herdam o tenant do 1º usuário vinculado.
-- Sem usuário vinculado, permanecem globais — não há como inferir o dono e
-- apagá-los seria destrutivo.
UPDATE perfis p
SET admin_unico_id = sub.admin_unico_id
FROM (
    SELECT u.perfil_id, MIN(COALESCE(u.admin_unico_id, u.id)) AS admin_unico_id
    FROM usuarios u
    WHERE u.perfil_id IS NOT NULL
    GROUP BY u.perfil_id
) sub
WHERE p.id = sub.perfil_id
  AND p.sistema = FALSE
  AND p.admin_unico_id IS NULL;

ALTER TABLE perfis ALTER COLUMN perfil_sistema_base SET NOT NULL;

-- ── 3. Unicidade por tenant ─────────────────────────────────────────────────
-- Antes: nome UNIQUE global. Agora: único dentro do tenant; globais (NULL)
-- continuam únicos entre si via índice parcial.
-- Só as constraints que envolvem EXATAMENTE a coluna `nome` — dropar tudo que é
-- UNIQUE derrubaria constraints de outras colunas junto.
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT con.conname
        FROM pg_constraint con
        WHERE con.conrelid = 'perfis'::regclass
          AND con.contype = 'u'
          AND con.conkey = ARRAY[
              (SELECT att.attnum FROM pg_attribute att
                WHERE att.attrelid = 'perfis'::regclass AND att.attname = 'nome')
          ]::smallint[]
    LOOP
        EXECUTE format('ALTER TABLE perfis DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

DROP INDEX IF EXISTS uk_perfis_nome;

CREATE UNIQUE INDEX IF NOT EXISTS uk_perfis_tenant_nome
    ON perfis (admin_unico_id, nome) WHERE admin_unico_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_perfis_global_nome
    ON perfis (nome) WHERE admin_unico_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_perfis_admin_unico ON perfis (admin_unico_id);

-- ── 4. Convite aponta pro cargo escolhido ───────────────────────────────────
ALTER TABLE convite_acesso
    ADD COLUMN IF NOT EXISTS perfil_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_convite_acesso_perfil'
    ) THEN
        ALTER TABLE convite_acesso
            ADD CONSTRAINT fk_convite_acesso_perfil
            FOREIGN KEY (perfil_id) REFERENCES perfis(id)
            ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN convite_acesso.perfil_id IS
    'Cargo que o convidado assume ao se cadastrar (#171). NULL = comportamento legado (perfil pelo tipo do link).';
