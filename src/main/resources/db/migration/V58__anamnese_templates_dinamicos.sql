-- Permite que cada template defina suas próprias perguntas dinamicamente
ALTER TABLE anamnese_templates
    ADD COLUMN IF NOT EXISTS perguntas JSONB,
    ADD COLUMN IF NOT EXISTS admin_unico_id BIGINT;

-- Permite armazenar respostas de perguntas dinâmicas além das colunas fixas
ALTER TABLE anamneses
    ADD COLUMN IF NOT EXISTS respostas JSONB;

CREATE INDEX IF NOT EXISTS idx_anamnese_templates_admin ON anamnese_templates(admin_unico_id);

-- Seed: perguntas padrão para os 3 templates já existentes (mesma lista das colunas atuais)
UPDATE anamnese_templates
SET perguntas = '[
  {"id":"usa_rimel","label":"Usa rímel?","tipo":"sim_nao","comObservacao":true},
  {"id":"procedimentos_recentes_olhos","label":"Realizou algum procedimento recente nos olhos?","tipo":"sim_nao","comObservacao":true},
  {"id":"alergias","label":"Possui alergias?","tipo":"sim_nao","comObservacao":true},
  {"id":"problemas_oculares","label":"Tem problemas oculares?","tipo":"sim_nao","comObservacao":true},
  {"id":"tratamento_oncologico","label":"Faz tratamento oncológico?","tipo":"sim_nao","comObservacao":true},
  {"id":"tireoide","label":"Tem problema de tireoide?","tipo":"sim_nao","comObservacao":true},
  {"id":"dorme_de_lado","label":"Dorme de lado?","tipo":"sim_nao","comObservacao":true},
  {"id":"gravidez","label":"Está grávida ou amamentando?","tipo":"sim_nao","comObservacao":true},
  {"id":"outros_problemas","label":"Tem outros problemas de saúde?","tipo":"sim_nao","comObservacao":true}
]'::jsonb
WHERE perguntas IS NULL;
