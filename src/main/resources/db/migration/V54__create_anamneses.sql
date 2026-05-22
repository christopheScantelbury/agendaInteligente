CREATE TABLE anamneses (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  servico_id BIGINT REFERENCES servicos(id),
  servico_nome VARCHAR(200),
  template_id BIGINT REFERENCES anamnese_templates(id),
  data DATE NOT NULL,
  -- Questionário
  usa_rimel BOOLEAN,
  usa_rimel_obs VARCHAR(500),
  procedimentos_recentes_olhos BOOLEAN,
  procedimentos_recentes_olhos_obs VARCHAR(500),
  alergias BOOLEAN,
  alergias_obs VARCHAR(500),
  problemas_oculares BOOLEAN,
  problemas_oculares_obs VARCHAR(500),
  tratamento_oncologico BOOLEAN,
  tratamento_oncologico_obs VARCHAR(500),
  tireoide BOOLEAN,
  tireoide_obs VARCHAR(500),
  dorme_de_lado BOOLEAN,
  dorme_de_lado_obs VARCHAR(500),
  gravidez BOOLEAN,
  gravidez_obs VARCHAR(500),
  outros_problemas BOOLEAN,
  outros_problemas_descricao TEXT,
  -- Avaliação
  mapping VARCHAR(200),
  marca_fios VARCHAR(200),
  espessura VARCHAR(100),
  curvatura VARCHAR(100),
  adesivo VARCHAR(200),
  -- Uso de imagem
  uso_imagem BOOLEAN DEFAULT false,
  -- Observações
  observacoes TEXT,
  -- Auditoria
  unidade_id BIGINT REFERENCES unidades(id),
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW()
);
