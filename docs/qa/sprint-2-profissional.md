# QA — Sprint 2 (Profissional / Modo Dia)

> Prompt para o agente de QA. Cole numa sessão nova.

## Contexto
- Frontend: https://agendainteligente-aleefhenriiques-projects.vercel.app
- Backend: https://agendainteligente-production.up.railway.app
- Stories: #87 (Layout), #88 (Modo Dia timeline), #89 (Bottom sheet), #90 (Agenda 7d), #91 (Onboarding)
- Doc-base: AgendaInteligente_Redesign_UX.docx §3.2 + §4.1/§4.2

## Pré-requisito
Rodar `POST /api/admin/seed-demo` com header `X-Seed-Token`. **Cria atendente vinculado.**

## Credenciais
- **Profissional:** `profissional@salao.demo.com` / `Demo@2026`
- **Profissional 2:** `profissional@academia.demo.com` / `Demo@2026`

## Dispositivo
**Mobile 375px** — interface é "usada em pé durante o expediente". Desktop depois.

## Preparar dados de teste
Como ADMINISTRADOR (`salao@demo.com`):
1. Criar 3-4 agendamentos no dia atual para o profissional do seed, em horários diferentes
2. Ter pelo menos 1 em cada status: AGENDADO, CONFIRMADO, EM_ANDAMENTO, CONCLUIDO

---

## T2.1 — Login + redirect + guard (#87)

- [ ] Login com `profissional@salao.demo.com` em `/login`
- [ ] Pós-login redireciona para `/profissional/hoje` (NÃO `/`)
- [ ] **Profissional NÃO vê sidebar admin** (sem menu lateral)
- [ ] Tentar acessar `/empresas` ou `/usuarios` ou `/relatorios` → redireciona para `/profissional/hoje`
- [ ] Bottom nav fixo com 3 itens: **Hoje** (Sun), **Agenda** (Calendar), **Perfil** (User)
- [ ] Header simples: logo + nome do usuário truncado

## T2.2 — Modo Dia / Timeline (#88)
Em `/profissional/hoje`.

**Header:**
- [ ] Setas de navegação anterior/próximo dia funcionam
- [ ] Texto da data em destaque ("Quinta", "dd de Maio")
- [ ] Se NÃO está no dia atual: link "Voltar para hoje"
- [ ] 2 KPIs: "Atendimentos" (Activity) + "Faturado R$" (TrendingUp)
- [ ] KPIs mudam ao navegar para outro dia

**Timeline:**
- [ ] Horas listadas de **06:00 a 22:00** (lado esquerdo, texto cinza pequeno)
- [ ] Linha tracejada cinza entre horas
- [ ] Cards de agendamento posicionados absolutamente por horário
- [ ] Card: barra lateral colorida + avatar com iniciais + horário + tag status + nome cliente + serviços
- [ ] **Cores por status:**
  - AGENDADO → cinza claro
  - CONFIRMADO → emerald (verde)
  - EM_ANDAMENTO → azul
  - CONCLUIDO/FINALIZADO → cinza escuro
  - NO_SHOW → vermelho
  - CANCELADO → rosa
  - "Próximo" (em até 30min) → violet
- [ ] **Linha "agora" violet** horizontal aparece se está no dia atual e dentro de 06h-22h
- [ ] **Auto-scroll** ao carregar leva pra perto da hora atual
- [ ] **Refetch a cada 60s** (verificar Network)
- [ ] Empty state com ícone CalendarDays + "Sem atendimentos para esse dia"

## T2.3 — Bottom sheet de ações (#89)
Tap em um card de agendamento.

**Animação:**
- [ ] Sheet sobe do rodapé (slideUp 220ms)
- [ ] Backdrop escuro com blur
- [ ] Handle visual no topo (mobile)
- [ ] Header com nome do cliente + X de fechar

**Resumo:**
- [ ] Data/hora formatada
- [ ] Serviços listados
- [ ] Valor previsto

**Ações por status:**

| Status do card | Ações esperadas |
|---|---|
| AGENDADO | "Cliente chegou" (emerald) + "Marcar como no-show" (red) |
| CONFIRMADO | "Iniciar atendimento" (violet) + "Marcar como no-show" (red) |
| EM_ANDAMENTO | "Finalizar e cobrar" (emerald, DollarSign) |
| CONCLUIDO/FINALIZADO | "Ver recibo" (slate, info "Em breve") + "Reabrir" (orange) |
| NO_SHOW | "Cliente compareceu" (emerald, corrige) |
| CANCELADO | Aviso amber "Nenhuma ação disponível" |

- [ ] Tap em ação muda status, fecha sheet, mostra notification success
- [ ] **Timeline reflete novo status imediatamente** (React Query invalidate)

**Finalizar e cobrar:**
- [ ] Abre form interno (não fecha sheet)
- [ ] Input "Valor cobrado" pré-preenchido com valor previsto
- [ ] 5 tipos de pagamento (Pix/Dinheiro/Crédito/Débito/Boleto) em radio
- [ ] Botão "Voltar" volta ao menu de ações
- [ ] Confirmar muda status para CONCLUIDO e cria registro de pagamento

**Fechamento:**
- [ ] Tap fora do sheet fecha
- [ ] ESC fecha
- [ ] **Scroll lock:** ao abrir, página por baixo não rola

## T2.4 — Agenda 7 dias (#90)
Tap em "Agenda" no bottom nav.

- [ ] URL: `/profissional/agenda`
- [ ] Título "Próximos 7 dias"
- [ ] 2 KPIs do topo: Atendimentos da semana + Previsto em R$
- [ ] Lista de 7 dias (Hoje, Amanhã, ...)
- [ ] Card de dia: avatar dia/mês violet + rótulo + qtd atendimentos + valor previsto
- [ ] Tap em dia → `/profissional/hoje?data=YYYY-MM-DD` e abre na data correta
- [ ] Voltar para `/profissional/hoje` (sem param) mostra dia atual
- [ ] Empty state se semana toda livre: "Bom momento para divulgar serviços"

## T2.5 — Onboarding profissional (#91)

- [ ] **Modal de boas-vindas** aparece no primeiro login do profissional em `/profissional/hoje`
- [ ] Texto: "Olá, [nome]! Boas vindas à equipe. Sua agenda do dia está pronta..."
- [ ] Botão "Iniciar tour" → tour com **3 passos**:
  1. header-dia (data + KPIs)
  2. timeline (cards e cores)
  3. bottom-nav-profissional
- [ ] Botões "Anterior", "Próximo", "Concluir"
- [ ] Botão "Pular por agora" fecha sem tour
- [ ] Flag em `localStorage.profissional_onboarding_visto_v1`

## T2.6 — Perfil profissional (#91)
Tap em "Perfil".

- [ ] URL: `/profissional/perfil`
- [ ] Dados: Nome, Perfil, ID usuário, atendenteId, unidadeId
- [ ] Seção "Ajuda" com "Refazer tour"
- [ ] Tap em "Refazer tour" navega para `/profissional/hoje` e dispara tour
- [ ] Seção "Conta" com "Sair"
- [ ] Sair com confirm leva para `/login`

---

## Critérios de aceite do Sprint 2
- [ ] **Check-in de cliente em < 5 segundos** (tap card → tap "Cliente chegou")
- [ ] **Finalizar atendimento em ≤ 3 cliques** (tap card → "Finalizar e cobrar" → "Confirmar")
- [ ] Profissional NÃO vê faturamento consolidado da empresa
- [ ] Profissional NÃO vê dados de outros profissionais

## Pontos críticos
- Verificar que tour aparece NA PRIMEIRA visita (pode precisar limpar localStorage)
- Verificar refetch automático: após mudar status via outra aba, timeline atualiza em até 60s
- Test em viewport 360x640 (Android antigo) — não pode quebrar layout

Formato pra reportar: ver [sprint-1-cliente.md](sprint-1-cliente.md#formato-pra-reportar-bugs).
