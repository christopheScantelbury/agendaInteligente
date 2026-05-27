-- Slug público da empresa para landing/QR code (ex.: agendainteligente.com.br/e/{slug})
-- Permite ao gerente personalizar a URL pública usada para divulgar agendamento.
-- NULL = empresa ainda não personalizou o link (checklist gerente "Personalizar link público").
ALTER TABLE empresas
    ADD COLUMN slug_publico VARCHAR(60);

-- Unique parcial: permite múltiplas empresas com slug NULL, mas não duplicado quando preenchido.
CREATE UNIQUE INDEX idx_empresa_slug_publico
    ON empresas (slug_publico)
    WHERE slug_publico IS NOT NULL;
