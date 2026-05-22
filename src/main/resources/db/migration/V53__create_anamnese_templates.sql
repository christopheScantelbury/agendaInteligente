CREATE TABLE anamnese_templates (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(500),
  ativo BOOLEAN DEFAULT true,
  unidade_id BIGINT REFERENCES unidades(id),
  data_criacao TIMESTAMP DEFAULT NOW()
);

INSERT INTO anamnese_templates (nome, descricao) VALUES
  ('Alongamento de Cílios', 'Ficha padrão para procedimento de alongamento de cílios'),
  ('Design de Sobrancelha', 'Ficha padrão para design de sobrancelha'),
  ('Geral', 'Ficha de anamnese geral');
