-- Configuração editável da Landing Page (controlada por ADMIN GLOBAL).
-- Estrutura JSONB pra flexibilidade — schema validado no frontend/backend
-- via tipos TypeScript/Records, default vem do seed abaixo.

CREATE TABLE IF NOT EXISTS landing_config (
    id                 BIGSERIAL PRIMARY KEY,
    conteudo           JSONB        NOT NULL,
    atualizado_por_id  BIGINT       REFERENCES usuarios(id),
    data_criacao       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Garante registro singleton (id=1)
INSERT INTO landing_config (id, conteudo)
VALUES (1, '{
  "hero": {
    "tituloLinha1": "O único agendamento",
    "tituloLinha2": "que emite a NFS-e",
    "subtitulo": "Plataforma completa de agendamento, financeiro e nota fiscal — tudo em um lugar. Sem contabilista, sem planilha, sem dor de cabeça.",
    "ctaPrimario": "Começar 14 dias grátis",
    "ctaSecundario": "Ver demonstração",
    "ctaPrimarioLink": "/cadastro",
    "ctaSecundarioLink": "#funcionalidades"
  },
  "stats": [
    {"valor": "5k+", "label": "agendamentos/dia"},
    {"valor": "98%", "label": "uptime"},
    {"valor": "<200ms", "label": "latência API"},
    {"valor": "100%", "label": "NFS-e nativa"}
  ],
  "destaques": [
    {"icone": "Calendar", "titulo": "Agendamento online", "descricao": "Link público pra cliente marcar direto. Multi-profissional, multi-unidade, com bloqueio de horário automático."},
    {"icone": "Receipt", "titulo": "NFS-e em 1 clique", "descricao": "Emissão automática ao finalizar atendimento. Integração nativa via NotaFácil — sem trocar de sistema."},
    {"icone": "DollarSign", "titulo": "Controle financeiro", "descricao": "Registre pagamentos, acompanhe recebimentos e gere relatórios de faturamento por profissional. Sem planilha, sem papel."}
  ],
  "comparativo": {
    "titulo": "Por que escolher o Agenda Inteligente",
    "subtitulo": "Comparativo direto com soluções do mercado",
    "concorrentes": [
      {"nome": "★ AgendaInteligente", "destaque": true, "cols": ["✓ Completo", "✓ Sim", "✓ Nativa", "✓ Email", "R$49–199"], "tipos": ["has", "has", "has", "has", "has"]},
      {"nome": "Trinks", "destaque": false, "cols": ["✓", "⚠ Limitado", "✕", "✓", "R$89–299"], "tipos": ["has", "partial", "no", "has", "neutral"]},
      {"nome": "Doctoralia", "destaque": false, "cols": ["✓", "⚠", "✕", "⚠", "R$149–449"], "tipos": ["has", "partial", "no", "partial", "neutral"]},
      {"nome": "EasyFit", "destaque": false, "cols": ["✓", "✓", "✕", "⚠", "R$199–599"], "tipos": ["has", "has", "no", "partial", "neutral"]},
      {"nome": "Calendly", "destaque": false, "cols": ["✓", "✕", "✕", "✕", "US$8–16"], "tipos": ["has", "no", "no", "no", "neutral"]}
    ]
  },
  "footerCta": {
    "titulo": "Pronto para emitir sua primeira NFS-e?",
    "subtitulo": "14 dias grátis. Sem cartão. Configuração em 5 minutos.",
    "cta": "Cadastrar agora"
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
