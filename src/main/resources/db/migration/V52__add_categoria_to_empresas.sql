-- Adiciona coluna 'categoria' em empresas para suportar personalização de UI
-- por tipo de estabelecimento (ACADEMIA, CONSULTORIO_MEDICO, SALAO_BELEZA, etc.).
--
-- Empresas existentes recebem 'OUTROS' como default (fallback genérico).
-- A coluna é NOT NULL para garantir que o frontend sempre receba um valor
-- válido — categorias não-mapeadas no dicionário caem no fallback de OUTROS.

ALTER TABLE empresas
    ADD COLUMN categoria VARCHAR(40) NOT NULL DEFAULT 'OUTROS';

CREATE INDEX idx_empresas_categoria ON empresas(categoria);
