-- #175: sinal em duas modalidades (percentual do valor OU valor fixo).
-- #176: nova regra de fluxo — exigir agendamento CONFIRMADO antes de iniciar.
-- Defensiva: cada ALTER em statement separado + IF NOT EXISTS (ver
-- feedback-flyway-idempotente).

-- ── #175 tipo de sinal ──────────────────────────────────────────────────────
ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS tipo_sinal VARCHAR(20) NOT NULL DEFAULT 'PERCENTUAL';

ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS valor_sinal_fixo NUMERIC(12,2);

COMMENT ON COLUMN unidades.tipo_sinal IS
    'Como o sinal é definido: PERCENTUAL (percentual_sinal) ou VALOR_FIXO (valor_sinal_fixo). #175';
COMMENT ON COLUMN unidades.valor_sinal_fixo IS
    'Valor absoluto do sinal quando tipo_sinal = VALOR_FIXO. #175';

-- ── #176 exigir confirmação para iniciar ────────────────────────────────────
ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS exigir_confirmacao_iniciar BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN unidades.exigir_confirmacao_iniciar IS
    'Se TRUE, profissional só inicia o atendimento (EM_ANDAMENTO) com o agendamento CONFIRMADO. #176';
