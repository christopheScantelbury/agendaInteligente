# QA — Sprint 4 (Admin / Plataforma)

> Prompt para o agente de QA. Cole numa sessão nova.

## Contexto
- Frontend: https://agendainteligente-aleefhenriiques-projects.vercel.app
- Backend: https://agendainteligente-production.up.railway.app
- Stories: #92 (Dashboard plataforma), #93 (Empresas turbinada) — entregues
- Stories #94 (Assumir sessão) e #95 (Auditoria) — NÃO testar (follow-ups backend pesado)
- Doc-base: AgendaInteligente_Redesign_UX.docx §3.4

## Credenciais
- **ADMIN global:** `chris@agendainteligente.com` / `Admin@2026`
- **ADMINISTRADOR (deve ser BLOQUEADO):** `salao@demo.com` / `Demo@2026`

## Dispositivo
Desktop primeiro. Validar mobile depois.

---

## T4.1 — Dashboard plataforma (#92)

Login com `chris@`. Acessar manualmente: `/plataforma`.

**Guards:**
- [ ] ADMIN global acessa sem erro
- [ ] Login com `salao@demo.com` e tentar acessar `/plataforma` → redireciona para `/login`
- [ ] Cliente final tentando acessar → redireciona

**Layout:**
- [ ] Layout admin usual (com sidebar)
- [ ] Header "Plataforma" + data atual capitalizada
- [ ] Sub "Visão geral · [dia da semana, dd de mês]"

**4 KPIs principais (linha 1, grid 2x2 mobile / 4 colunas desktop):**

**Empresas ativas:**
- [ ] Ícone Building2 violet
- [ ] Número
- [ ] Sub: "N total"

**Usuários ativos:**
- [ ] Ícone Users emerald
- [ ] Número

**Agendamentos no mês:**
- [ ] Ícone Calendar azul
- [ ] Número
- [ ] Sub: "N total"

**NFS-e no mês:**
- [ ] Ícone FileText orange
- [ ] Número
- [ ] Sub: "N total"

**Placeholders (linha 2):**
- [ ] MRR e Churn 30d em cards cinzas com borda tracejada
- [ ] Badge amber "Em breve" em cada
- [ ] Texto "Disponível quando integração com Stripe estiver ativa"

**Box informativo:**
- [ ] Box violet com texto "Visão de plataforma"
- [ ] Menção de "Assumir sessão (em breve)"

**Comportamento:**
- [ ] Loading skeleton no primeiro carregamento
- [ ] Refetch automático a cada 60s
- [ ] Erro 403 mostra mensagem "Não foi possível carregar as métricas"

## T4.2 — Empresas da plataforma (#93)

Em `/plataforma/empresas` (logado como `chris@`).

**Guards:**
- [ ] ADMIN acessa
- [ ] ADMINISTRADOR bloqueado

**Header:**
- [ ] Título "Empresas da plataforma"
- [ ] Contador "X de Y empresas"

**Filtros:**
- [ ] Input de busca com placeholder "Buscar por nome, razão social, CNPJ ou email"
- [ ] Busca filtra a tabela em real-time (sem debounce visível)
- [ ] 3 botões de filtro de status: **Todas** (default), **Ativas**, **Inativas**
- [ ] Filtro ativo em violet, outros em cinza
- [ ] Filtros combinam (busca + status)

**Tabela:**
- [ ] Header com colunas: **Empresa**, **Plano**, **Status**, **Cadastro**, **Última atividade**, **Agendamentos (mês)**, **Ações**
- [ ] Em mobile: colunas Plano, Cadastro, Última atividade, Agendamentos ocultam (apenas Empresa + Status + Ações)

**Conteúdo da linha:**
- [ ] **Empresa:** ícone Building2 + nome em bold + CNPJ ou email em cinza pequeno
- [ ] **Plano:** badge cinza "—" (placeholder)
- [ ] **Status:** badge verde "Ativa" ou cinza "Inativa"
- [ ] **Cadastro:** dd/MM/yyyy
- [ ] **Última atividade:** relativa ("há 2 dias", "agora há pouco")
- [ ] **Agendamentos:** número à direita
- [ ] **Ações:** botão "Assumir" com ícone UserCog

**Ações:**
- [ ] Botão "Assumir" mostra notification info "Em breve. Funcionalidade depende de #94 (backend)."
- [ ] Botão visível em todas as linhas

**Estados:**
- [ ] Loading: linhas com skeleton animado
- [ ] Empty state se não há empresas: "Nenhuma empresa encontrada com esses filtros"
- [ ] Erro 403: mensagem "Não foi possível carregar empresas. Verifique se você tem perfil ADMIN global."

---

## Critérios de aceite parciais do Sprint 4
- [ ] ADMIN NÃO tem visibilidade automática de dados operacionais (só métricas agregadas em `/plataforma`)
- [ ] Listagem `/plataforma/empresas` carrega em < 1s para até 100 empresas
- [ ] Métricas refletem dados reais (não mock)

## NÃO testar nesta sprint
- ❌ #94 — Assumir sessão (não implementado, é placeholder com toast informativo)
- ❌ #95 — Auditoria de ações sensíveis (não implementado)

## Pontos críticos do Discovery
- **P022-1 (sev 4) — Mitigado parcialmente:** ADMIN tem `/plataforma` separado, mas ainda pode acessar `/empresas` (rota legacy do ADMINISTRADOR) e ver dados de tenant. Solução completa exige #94.
- **P022-2 (sev 4):** ✅ Dashboard ADMIN tem métricas de plataforma
- **P023-1 (sev 4):** ✅ Empresas tem status, cadastro, última atividade, agendamentos do mês
- **P023-2 (sev 4):** 🚧 "Assumir sessão" é placeholder — fica em #94

## Atenção
- Como ADMIN global no Layout admin, o usuário ainda vê sidebar com `/empresas`, `/usuarios` etc. (rotas que ADMINISTRADOR usa). Isso é intencional para não quebrar fluxo, mas o **caminho recomendado é via `/plataforma`**.
- Endpoint `/api/plataforma/empresas` itera em memória — anotar tempo de resposta para tenants > 100 empresas.

Formato pra reportar: ver [sprint-1-cliente.md](sprint-1-cliente.md#formato-pra-reportar-bugs).
