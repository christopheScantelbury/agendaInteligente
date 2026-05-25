# QA — Sprint 3 (Gerente / Dashboard)

> Prompt para o agente de QA. Cole numa sessão nova.

## Contexto
- Frontend: https://agendainteligente-aleefhenriiques-projects.vercel.app
- Backend: https://agendainteligente-production.up.railway.app
- Stories: #96 (KPIs), #97 (Gráfico), #98 (Equipe + Próximos), #99 (Checklist), #100 (Onboarding)
- Doc-base: AgendaInteligente_Redesign_UX.docx §3.3 + §4.3

## Pré-requisito
Rodar `POST /api/admin/seed-demo` com header `X-Seed-Token`.

## Credenciais
- **Gerente:** `gerente@salao.demo.com` / `Demo@2026`
- **Gerente 2:** `gerente@academia.demo.com` / `Demo@2026`
- **ADMINISTRADOR (também acessa):** `salao@demo.com` / `Demo@2026`

## Dispositivo
Desktop primeiro (1280px) — interface mais completa. Depois validar mobile 375px.

## Preparar dados
Como ADMINISTRADOR, criar:
- Pelo menos 2-3 atendentes ativos na unidade
- Agendamentos no dia atual em vários status (CONCLUIDO com valor para popular faturamento)
- Agendamentos passados (mês atual e anterior) para o gráfico mostrar barras

---

## T3.1 — Login + redirect (#96)

- [ ] Login com `gerente@salao.demo.com` em `/login`
- [ ] Pós-login redireciona para **`/gerente/dashboard`** (NÃO `/`)
- [ ] Gerente vê sidebar admin (menu lateral completo) — diferente do profissional
- [ ] ADMINISTRADOR (`salao@demo.com`) também acessa `/gerente/dashboard` sem erro
- [ ] Acessar `/gerente/dashboard` sem login → redireciona para `/login`
- [ ] Cliente final tentando acessar `/gerente/dashboard` → redireciona

## T3.2 — 4 KPIs principais (#96)
Em `/gerente/dashboard`.

- [ ] Header "Dashboard" + data atual ("Quinta, dd de Maio de 2026")
- [ ] **4 cards de KPI** em grid (2 colunas mobile, 4 colunas desktop):

**Card 1 — Faturamento (mês):**
- [ ] Ícone DollarSign verde (emerald)
- [ ] Valor formatado em BRL ("R$ 1.234,56")
- [ ] Linha abaixo com variação % vs mês anterior:
  - "+X% vs mês anterior" (TrendingUp verde) se subiu
  - "-X% vs mês anterior" (TrendingDown vermelho) se caiu
  - "Sem dados do mês anterior" se mês anterior teve zero faturamento

**Card 2 — Ocupação média:**
- [ ] Ícone Users violet
- [ ] Valor em "%"
- [ ] Sub: "N profissional(is) ativo(s)"

**Card 3 — Ticket médio:**
- [ ] Ícone Receipt azul
- [ ] Valor em BRL
- [ ] Sub: "N atendimentos concluídos"

**Card 4 — Cancelamento + no-show:**
- [ ] Ícone XCircle (vermelho se taxa > 15%, laranja se ≤ 15%)
- [ ] Valor em "%"
- [ ] Sub: "de N atendimentos no mês"

- [ ] Refetch automático a cada 60s
- [ ] Loading skeleton aparece no primeiro carregamento

## T3.3 — Gráfico de faturamento (#97)

- [ ] Card "Faturamento" com:
  - Texto descritivo ("Últimos 30 dias" — default)
  - Total do período em destaque + "anterior R$ X" em texto cinza
- [ ] **4 filtros** no canto direito: **7d, 30d, 90d, 1 ano**
- [ ] Filtro ativo em violet, outros em cinza
- [ ] Clicar em filtro atualiza gráfico sem reload

**Gráfico (recharts):**
- [ ] Linha sólida **violet** = período atual
- [ ] Linha **tracejada cinza** = período anterior comparável
- [ ] Eixo X com datas formatadas (dd/MM)
- [ ] Eixo Y com valores abreviados (1.5k, 2k, etc.)
- [ ] Hover em ponto mostra tooltip: "Atual: R$ X,XX" + "Anterior: R$ Y,YY" + label da data
- [ ] Legenda no rodapé "Atual" / "Anterior"
- [ ] Responsive: largura adapta ao container

## T3.4 — Equipe em tempo real (#98)

- [ ] Card "Equipe em tempo real" com ícone Users
- [ ] **Em mobile:** scroll horizontal de cards (carrossel)
- [ ] **Em desktop:** grid (2 ou 3 colunas)
- [ ] Cada card: avatar com iniciais + nome + dot de status + tag de status
- [ ] **Status possíveis:**
  - Livre (cinza)
  - Próximo (violet — próximo agendamento em ≤ 30min)
  - Em atendimento (azul — tem agendamento EM_ANDAMENTO)
- [ ] Linha embaixo: "Próximo HH:mm" + "Faturado R$ X"
- [ ] Empty state se sem profissionais: "Nenhum profissional ativo na unidade"
- [ ] Refetch 60s

## T3.5 — Próximos agendamentos (#98)

- [ ] Card "Próximos agendamentos" com ícone CalendarClock
- [ ] Lista de até **10** agendamentos futuros ativos, cronológico
- [ ] Cada item: data ("Hoje", "Amanhã", "qua, dd/MM") + hora HH:mm em destaque
- [ ] Nome do cliente em bold
- [ ] Serviços + nome do atendente em cinza pequeno
- [ ] Divider entre itens
- [ ] Empty state: "Nenhum agendamento futuro ativo"

## T3.6 — Checklist de primeiros passos (#99)

- [ ] Card no topo do dashboard com borda violet 2px
- [ ] Ícone Rocket + título "Configure seu negócio em 5 minutos"
- [ ] Sub: "N de 6 concluídas"
- [ ] **Barra de progresso violet** (porcentagem visual)
- [ ] **6 tarefas listadas:**
  1. Cadastrar primeiro serviço → `/servicos`
  2. Cadastrar primeiro profissional → `/profissionais`
  3. Definir horários de funcionamento → `/configuracoes`
  4. Personalizar link público → `/configuracoes`
  5. Configurar emissão de NFS-e (opcional) → `/configuracoes`
  6. Convidar atendentes para a equipe → `/convites-acesso`
- [ ] **Tarefa concluída:** check verde + texto riscado + opacidade reduzida (não clicável)
- [ ] **Tarefa pendente:** círculo vazio + ChevronRight violet (clicável)
- [ ] Tap em tarefa pendente navega para a rota correspondente
- [ ] **Autodetecção:** após cadastrar 1 serviço, tarefa 1 marca verde no próximo refetch (60s)
- [ ] Botão X no canto dispensa o card
- [ ] Refresh da página após dispensar: card NÃO reaparece (localStorage)
- [ ] Limpar `localStorage.gerente_checklist_dispensado_v1` faz card reaparecer

**100% concluído:**
- [ ] Card muda para gradiente violet com PartyPopper
- [ ] Texto "Parabéns! Seu negócio está no ar."
- [ ] Botão X disponível para fechar permanentemente

## T3.7 — Onboarding gerente (#100)

- [ ] **Modal de boas-vindas** aparece automaticamente no primeiro login do gerente
- [ ] Texto: "[nome], vamos configurar seu negócio? Em 5 minutos você já pode receber o primeiro agendamento online."
- [ ] Botão "Iniciar tour" → tour com **4 passos**:
  1. **kpis** — "Seus números: faturamento, ocupação..."
  2. **grafico-faturamento** — "Evolução do faturamento"
  3. **equipe** — "Sua equipe"
  4. **checklist** — "Comece aqui"
- [ ] Botões "Anterior", "Próximo", "Concluir"
- [ ] Botão "Pular por agora" fecha sem tour
- [ ] Flag em `localStorage.gerente_onboarding_visto_v1`
- [ ] Aparece também para ADMINISTRADOR (`salao@demo.com`)
- [ ] **NÃO aparece** para ADMIN global (que cai em `/plataforma`)

---

## Critérios de aceite do Sprint 3
- [ ] Primeiro KPI visível em < 2s após login (medir DevTools Network)
- [ ] Dados do dashboard refletem apenas a unidade do gerente (não vê outros tenants)
- [ ] Gráfico carrega em < 1.5s para 30 dias

## Pontos críticos do Discovery
- **Filtragem por escopo:** gerente do Salão não vê dados da Academia (verificar com `gerente@academia.demo.com`)
- **Status do membro da equipe** computado em runtime — verificar com agendamento EM_ANDAMENTO ativo
- **P013-1 (sev 3):** Convites de acesso aparece no menu do gerente (não mais redirect silencioso)

## Atenção
- Endpoint do dashboard itera `findAll()` em memória — em tenant com > 10k agendamentos pode ficar lento. Anotar tempo de resposta de `/api/dashboard/gerente/kpis` no DevTools.

Formato pra reportar: ver [sprint-1-cliente.md](sprint-1-cliente.md#formato-pra-reportar-bugs).
