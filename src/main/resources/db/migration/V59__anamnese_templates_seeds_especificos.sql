-- Diferencia as perguntas dos 3 templates legacy seedados na V58
-- (todos tinham as mesmas 9 perguntas genéricas)

-- Alongamento de Cílios — mantém as 9 perguntas focadas em cílios/olhos (já estava correto)

-- Design de Sobrancelha — substitui por perguntas específicas
UPDATE anamnese_templates
SET perguntas = '[
  {"id":"alergia_quimicos","label":"Possui alergia a algum produto químico?","tipo":"sim_nao","comObservacao":true},
  {"id":"dermatite","label":"Tem dermatite ou pele sensível na região?","tipo":"sim_nao","comObservacao":true},
  {"id":"problemas_pele","label":"Apresenta acne, espinhas ou irritação no rosto?","tipo":"sim_nao","comObservacao":true},
  {"id":"medicamento_topico","label":"Faz uso de medicamento tópico no rosto?","tipo":"sim_nao","comObservacao":true},
  {"id":"isotretinoina","label":"Faz uso de isotretinoína ou roacutan?","tipo":"sim_nao","comObservacao":true},
  {"id":"micropigmentacao","label":"Possui micropigmentação ou tatuagem prévia na sobrancelha?","tipo":"sim_nao","comObservacao":true},
  {"id":"preferencia_formato","label":"Qual formato/estilo de sobrancelha prefere?","tipo":"texto","comObservacao":null},
  {"id":"observacoes_design","label":"Outras observações relevantes","tipo":"texto","comObservacao":null}
]'::jsonb
WHERE nome = 'Design de Sobrancelha' AND admin_unico_id IS NULL;

-- Geral — perguntas amplas de saúde
UPDATE anamnese_templates
SET perguntas = '[
  {"id":"alergias_gerais","label":"Possui alergias (medicamentos, alimentos, produtos)?","tipo":"sim_nao","comObservacao":true},
  {"id":"doenca_cronica","label":"Tem alguma doença crônica?","tipo":"sim_nao","comObservacao":true},
  {"id":"uso_medicamento","label":"Faz uso contínuo de medicamento?","tipo":"sim_nao","comObservacao":true},
  {"id":"gravidez_amamentacao","label":"Está grávida ou amamentando?","tipo":"sim_nao","comObservacao":true},
  {"id":"cirurgia_recente","label":"Realizou cirurgia ou procedimento estético recente?","tipo":"sim_nao","comObservacao":true},
  {"id":"problemas_pele","label":"Possui problemas de pele (psoríase, dermatite, etc)?","tipo":"sim_nao","comObservacao":true},
  {"id":"diabetes","label":"É diabético?","tipo":"sim_nao","comObservacao":true},
  {"id":"pressao","label":"Tem hipertensão ou pressão baixa?","tipo":"sim_nao","comObservacao":true},
  {"id":"observacoes_gerais","label":"Outras informações relevantes","tipo":"texto","comObservacao":null}
]'::jsonb
WHERE nome = 'Geral' AND admin_unico_id IS NULL;
