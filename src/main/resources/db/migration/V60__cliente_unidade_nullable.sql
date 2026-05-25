-- BUG-01: tornar unidade opcional no cadastro de cliente público.
-- Auto-cadastro de cliente não tem contexto de empresa; unidade é escolhida no 1º agendamento.

ALTER TABLE clientes
    ALTER COLUMN unidade_id DROP NOT NULL;
