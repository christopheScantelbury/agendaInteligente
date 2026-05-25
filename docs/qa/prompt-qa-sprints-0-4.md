# Prompt para Agente de QA — Redesign UX Sprints 0/1/2/4

> Cole este prompt no início de uma nova sessão do agente de QA. Ele assume que o agente acessará a aplicação via browser (Chrome MCP) ou execução manual.

---

## Contexto do projeto

**Produto:** Agenda Inteligente (SaaS multi-tenant de agendamento + NFS-e)
**Stack:** Java 21 + Spring Boot 3.3 (backend) · React 19 + Vite + TypeScript + Tailwind (frontend) · Postgres · Railway + Vercel
**Repo:** github.com/christopheScantelbury/agendaInteligente
**URLs:**
- Frontend: https://agendainteligente-aleefhenriiques-projects.vercel.app
- Backend API: https://agendainteligente-production.up.railway.app
- Health: https://agendainteligente-production.up.railway.app/actuator/health

**Doc-base do redesign:** `AgendaInteligente_Redesign_UX.docx` (raiz do repo)
**Doc de discovery:** `docs/discovery/rotas.md` e `docs/discovery/matriz.md`

---

## Escopo deste QA

Validar 4 sprints de redesign UX entregues entre 2026-05-25:

- **Sprint 0 — Discovery** (#68 fechado): inventário de rotas + matriz heurística — só validar que docs estão no repo, sem testes funcionais
- **Sprint 1 — Cliente** (#69 fechado): 5 stories — nova interface do cliente final
- **Sprint 2 — Profissional** (#70 fechado): 5 stories — Modo Dia do profissional
- **Sprint 4 — Admin** (#72 fechado parcial): 2 de 4 stories — Dashboard e Empresas da plataforma

Sprint 3 (Gerente) ainda não foi entregue — não testar.

---

## Pré-requisitos

### 1. Seedar usuários demo

Antes de tudo, executar `POST /api/admin/seed-demo` em produção com o header `X-Seed-Token` (token está em `ACESSOS.local.md` na máquina do Chris — pedir se necessário). Isso cria/atualiza os usuários abaixo.

### 2. Credenciais de teste (produção)

| Email | Senha | Perfil |
|---|---|---|
| `chris@agendainteligente.com` | `Admin@2026` | ADMIN global |
| `salao@demo.com` | `Demo@2026` | ADMINISTRADOR (Salão Demo) |
| `academia@demo.com` | `Demo@2026` | ADMINISTRADOR (Academia Demo) |
| `rede@demo.com` | `Demo@2026` | ADMIN (multi-empresa) |
| `gerente@salao.demo.com` | `Demo@2026` | GERENTE (Salão Demo) |
| `gerente@academia.demo.com` | `Demo@2026` | GERENTE (Academia Demo) |
| `profissional@salao.demo.com` | `Demo@2026` | PROFISSIONAL (Salão Demo) |
| `profissional@academia.demo.com` | `Demo@2026` | PROFISSIONAL (Academia Demo) |
| `cliente@salao.demo.com` | `Demo@2026` | Cliente final (Salão Demo) |
| `cliente@academia.demo.com` | `Demo@2026` | Cliente final (Academia Demo) |

### 3. Dispositivos
Testar em **mobile (375px de largura)** PRIMEIRO — todo o redesign é mobile-first. Depois validar desktop. Cliente e profissional foram desenhados para uso 100% mobile.

---

## Bateria de testes — Sprint 1 (Cliente)

### T1.1 — Login e cadastro do cliente
**Login:** `/cliente/login` em mobile (375px).

- [ ] Logo do AgendaInteligente visível no topo
- [ ] Título: "Bem-vindo!" (NÃO "Área do Cliente")
- [ ] Subtítulo: "Marque seu horário em poucos toques"
- [ ] Campo "E-mail ou CPF" + senha
- [ ] Toggle de mostrar/ocultar senha funciona (ícone olho)
- [ ] Link "Esqueci minha senha" visível abaixo da senha
- [ ] Login com `cliente@salao.demo.com` / `Demo@2026` redireciona para `/cliente` (NÃO `/cliente/agendar`)
- [ ] Link "Cadastre-se grátis" leva para `/cliente/cadastro`

**Cadastro:** `/cliente/cadastro`

- [ ] Tem apenas 7 campos: Nome, CPF, Data Nascimento, Email, Telefone, Senha, Confirmar Senha
- [ ] NÃO tem: RG, CEP, Endereço, Número, Complemento, Bairro, Cidade, UF
- [ ] Máscara de CPF funciona ao digitar
- [ ] Máscara de telefone funciona
- [ ] Senha < 6 caracteres mostra erro
- [ ] Senhas diferentes mostram erro
- [ ] Após cadastro bem-sucedido, faz login automático e redireciona para `/cliente/agendar`

**Recuperar senha:**

- [ ] `/cliente/recuperar-senha` carrega
- [ ] Envio mostra mensagem de confirmação genérica (não revela se conta existe)
- [ ] `/cliente/redefinir-senha` sem `?token=` mostra tela "Link inválido"
- [ ] `/cliente/redefinir-senha?token=qualquer-coisa` mostra form de nova senha
- [ ] Senhas diferentes mostram erro

### T1.2 — Home do cliente
**Logar com `cliente@salao.demo.com`.**

- [ ] URL após login: `/cliente`
- [ ] Bottom nav fixo na parte inferior com 3 itens: Início (Home), Meus horários (Calendar), Perfil (User)
- [ ] Item ativo "Início" com cor violet
- [ ] Header com logo + botão sair (LogOut)
- [ ] Saudação "Olá, [primeiro nome]"
- [ ] **Modal de boas-vindas aparece automaticamente no primeiro login** ("Bem-vindo, [nome]!" com gradiente violet)
- [ ] Botão "Iniciar tour" no modal abre tour com 4 passos (driver.js)
- [ ] Tour: próximo horário → CTA → favoritos → bottom nav
- [ ] Botão "Pular por agora" fecha modal sem tour
- [ ] Após dispensar, modal NÃO aparece em refresh (localStorage)

**Bloco "Próximo horário":**

- [ ] Se cliente tem agendamento futuro: card com gradiente violet, countdown ("em X dias"), serviço, profissional, unidade, botões Reagendar/Cancelar
- [ ] Se não tem: empty state com ícone Calendar e texto "Você ainda não tem horários marcados"

**Bloco CTA:**

- [ ] Botão grande violet "+ Marcar novo horário" leva para `/cliente/agendar`

**Bloco Favoritos** (se houver agendamentos passados):
- [ ] Carrossel horizontal com top 5 serviços usados
- [ ] Cada card tem nome, valor, "Agendar de novo"

**Bloco Histórico:**
- [ ] Seção colapsável "Histórico (N)"
- [ ] Botão expandir/colapsar funciona
- [ ] Lista mostra max 5 itens com data, status badge, valor
- [ ] Se > 5, link "Ver tudo" leva para `/cliente/meus-agendamentos`

### T1.3 — Fluxo de agendamento 3 passos
**Em `/cliente/agendar` (logado).**

- [ ] Barra de progresso violet no topo com 3 barras + indicador "1/3"
- [ ] Botão voltar (seta) funciona em cada passo

**Passo 1 — Serviço:**

- [ ] Se há mais de 1 unidade: dropdown de unidade aparece no topo
- [ ] Se há 1 unidade: dropdown não aparece (auto-selecionada)
- [ ] Busca filtra serviços por nome/descrição
- [ ] Lista vertical de cards com nome, duração, valor, ChevronRight
- [ ] Tap em serviço avança para Passo 2

**Passo 2 — Horário:**

- [ ] Card no topo mostra serviço + unidade
- [ ] Calendário/seletor de data funciona
- [ ] Slots disponíveis aparecem em verde
- [ ] Tap em slot avança para Passo 3
- [ ] Setinha voltar retorna ao Passo 1 mantendo serviço

**Passo 3 — Confirmar:**

- [ ] Resumo em rows: Serviço, Data e hora, Profissional, Local, Valor (em negrito)
- [ ] Radio group "Forma de pagamento" com 3 opções: No local (padrão), Pix, Cartão
- [ ] Link "Trocar horário" volta ao Passo 2
- [ ] Botão "Confirmar agendamento" (violet, ícone CheckCircle)
- [ ] Ao confirmar, mostra notificação success e redireciona para `/cliente` (Home, não Meus agendamentos)
- [ ] **Anti-race-condition:** se outro cliente pegou o slot entre Passo 2 e 3, mostra erro "Esse horário foi ocupado enquanto você decidia" e volta ao Passo 2

### T1.4 — Perfil do cliente
**Tap em "Perfil" no bottom nav.**

- [ ] URL: `/cliente/perfil`
- [ ] Card com Nome, E-mail, ID do cliente
- [ ] Seção "Ajuda" com botão "Refazer tour" (ícone RefreshCw)
- [ ] Tap em "Refazer tour": limpa flag, redireciona para `/cliente`, modal de boas-vindas reaparece, tour dispara
- [ ] Seção "Conta" com botão "Sair" (vermelho)
- [ ] Tap em "Sair" abre ConfirmDialog
- [ ] Confirmar leva para `/cliente/login` e limpa sessão

---

## Bateria de testes — Sprint 2 (Profissional)

### T2.1 — Login e redirect
**Logar com `profissional@salao.demo.com` / `Demo@2026` em `/login` (admin).**

- [ ] Após login, redireciona para `/profissional/hoje` (NÃO `/dashboard` nem `/`)
- [ ] Profissional NÃO vê sidebar admin
- [ ] Tentar acessar `/empresas` ou `/usuarios` ou `/relatorios` redireciona para `/profissional/hoje`
- [ ] Bottom nav fixo com 3 itens: **Hoje** (Sun), **Agenda** (Calendar), **Perfil** (User)
- [ ] Header com logo + nome do usuário

### T2.2 — Modo Dia
**Em `/profissional/hoje`.**

- [ ] **Modal de boas-vindas aparece no primeiro login** ("Olá, [nome]! Boas vindas à equipe.")
- [ ] Tour de 3 passos (header-dia → timeline → bottom-nav)
- [ ] Header mostra data atual ("Quinta, dd de Maio")
- [ ] Botões setas anterior/próximo dia navegam corretamente
- [ ] Se não está no dia atual, link "Voltar para hoje" aparece
- [ ] 2 KPIs no header: "Atendimentos" (com Activity) e "Faturado" (com TrendingUp, em R$)
- [ ] KPIs atualizam quando muda de dia

**Timeline:**

- [ ] Horas listadas de 06:00 a 22:00 (lado esquerdo, texto cinza pequeno)
- [ ] Linha tracejada cinza entre cada hora
- [ ] Se há agendamentos no dia: cards posicionados absolutamente pela hora de início
- [ ] Card: barra lateral colorida + avatar com iniciais + horário + tag de status + nome cliente + serviços
- [ ] **Cores por status:**
  - AGENDADO → cinza claro
  - CONFIRMADO → verde (emerald)
  - EM_ANDAMENTO → azul
  - CONCLUIDO/FINALIZADO → cinza escuro
  - NO_SHOW → vermelho
  - CANCELADO → rosa
  - "Próximo" (em até 30min) → violet
- [ ] **Linha "agora"** violet horizontal aparece se está no dia atual e dentro de 06:00-22:00
- [ ] **Auto-scroll** ao carregar move timeline pra perto da hora atual
- [ ] **Refetch a cada 60s** (verificar Network do DevTools)
- [ ] Empty state com ícone CalendarDays quando dia não tem atendimentos

### T2.3 — Bottom sheet de ações
**Tap em um card de agendamento.**

- [ ] Bottom sheet sobe do rodapé (animação slideUp 220ms)
- [ ] Backdrop escuro com blur
- [ ] Handle visual no topo (mobile)
- [ ] Header com nome do cliente + X de fechar
- [ ] Resumo: data/hora + serviços + valor previsto

**Ações disponíveis por status do agendamento:**

| Status | Ações esperadas |
|---|---|
| AGENDADO | "Cliente chegou" (emerald) + "Marcar como no-show" (red) |
| CONFIRMADO | "Iniciar atendimento" (violet) + "Marcar como no-show" (red) |
| EM_ANDAMENTO | "Finalizar e cobrar" (emerald, ícone DollarSign) |
| CONCLUIDO/FINALIZADO | "Ver recibo" (slate, info "Em breve") + "Reabrir" (orange) |
| NO_SHOW | "Cliente compareceu" (emerald) — corrige |
| CANCELADO | Aviso amber "Nenhuma ação disponível" |

**Testes:**

- [ ] Tap em ação muda status, fecha sheet, mostra notification success
- [ ] Timeline reflete novo status imediatamente (React Query invalidate)
- [ ] **Finalizar e cobrar** abre form interno (sem fechar sheet) com:
  - Input "Valor cobrado" pré-preenchido com valor previsto
  - Radio group de 5 tipos de pagamento (Pix/Dinheiro/Crédito/Débito/Boleto)
  - Botão "Voltar" + "Confirmar"
- [ ] Tap fora do sheet ou ESC fecha
- [ ] Scroll lock: ao abrir, página por baixo não rola

### T2.4 — Agenda 7 dias
**Tap em "Agenda" no bottom nav.**

- [ ] URL: `/profissional/agenda`
- [ ] Título "Próximos 7 dias"
- [ ] 2 KPIs do topo: Atendimentos da semana + Previsto em R$
- [ ] Lista de 7 dias (hoje, amanhã, depois...)
- [ ] Card de dia: avatar com dia/mês violet + rótulo (Hoje/Amanhã/quinta-feira) + qtd atendimentos + valor previsto
- [ ] Tap em dia leva para `/profissional/hoje?data=YYYY-MM-DD` e abre na data correta
- [ ] Voltar para `/profissional/hoje` (sem param) mostra dia atual
- [ ] Empty state se semana toda livre

### T2.5 — Perfil do profissional
**Tap em "Perfil".**

- [ ] URL: `/profissional/perfil`
- [ ] Dados: Nome, Perfil, ID usuário, atendenteId, unidadeId
- [ ] Seção "Ajuda" com "Refazer tour"
- [ ] Tap em "Refazer tour" navega para `/profissional/hoje` e dispara tour
- [ ] Seção "Conta" com "Sair"
- [ ] Sair leva para `/login`

---

## Bateria de testes — Sprint 4 (Admin)

### T4.1 — Dashboard plataforma
**Logar com `chris@agendainteligente.com` (ADMIN global).**

Acesso manual via URL: `/plataforma`

- [ ] Carrega sem erro (ADMIN tem permissão)
- [ ] Layout admin usual (com sidebar)
- [ ] Header "Plataforma" + data atual
- [ ] **4 KPIs principais** (cards com ícone + número + label):
  - Empresas ativas (violet) + sub "N total"
  - Usuários ativos (emerald)
  - Agendamentos no mês (blue) + sub "N total"
  - NFS-e no mês (orange) + sub "N total"
- [ ] **2 placeholders**: MRR e Churn 30d com badge amber "Em breve"
- [ ] Box informativo violet explicando a filosofia "visão de plataforma"
- [ ] Refetch a cada 60s
- [ ] **Guard:** logar com `salao@demo.com` (ADMINISTRADOR) e acessar `/plataforma` → redireciona para `/login` (ou mostra erro 403)

### T4.2 — Empresas da plataforma
**Em `/plataforma/empresas` (logado como `chris@`).**

- [ ] Carrega tabela com header "Empresas da plataforma" + contador "X de Y empresas"
- [ ] Barra de filtros com:
  - Input de busca (livre)
  - 3 botões: Todas (default), Ativas, Inativas
- [ ] Busca filtra por nome, razão social, CNPJ ou email
- [ ] Filtro de status funciona
- [ ] Tabela colunas:
  - Empresa (com ícone Building2 e nome + CNPJ embaixo)
  - Plano (placeholder "—")
  - Status (badge "Ativa" verde / "Inativa" cinza)
  - Cadastro (data dd/MM/yyyy) — oculto em mobile
  - Última atividade (relativa, "há 2 dias") — oculto em mobile
  - Agendamentos (mês) — oculto em mobile/tablet
  - Ações
- [ ] Botão "Assumir" presente em cada linha (ícone UserCog)
- [ ] Tap em "Assumir" mostra notification info "Em breve. Funcionalidade depende de #94"
- [ ] **Guard:** ADMINISTRADOR não acessa (redireciona)

---

## Testes de regressão (não quebrar o que funciona)

- [ ] `chris@` login → `/` ainda funciona (não força redirect para `/plataforma`)
- [ ] `salao@demo.com` (ADMINISTRADOR) → fluxo normal funciona (configurações, despesas, etc.)
- [ ] Listagem de agendamentos `/agendamentos` carrega para ADMINISTRADOR/GERENTE
- [ ] Calendário em `/agendamentos` ainda funciona
- [ ] Despesas, Comissões, Relatórios funcionam para ADMINISTRADOR
- [ ] `/login` admin tem link "Esqueci minha senha" novo
- [ ] InstallPrompt (PWA banner) ainda aparece

---

## Pontos críticos para verificar

1. **P022-1 (sev 4):** ADMIN logado NÃO tem dashboards com dados operacionais de uma empresa específica. Verificar que `/plataforma` substitui essa função.
2. **P028-1 (sev 4):** Cadastro do cliente reduzido a 7 campos.
3. **P027-1, P027-2, P027-3:** Login cliente tem logo, "Esqueci senha", título amigável.
4. **P003-2 (sev 3):** Fluxo de agendamento revalida slot antes de submeter.
5. **Anti-race-condition:** Tentar pegar mesmo slot em 2 abas — segunda deve receber erro.

---

## Como reportar

Para cada teste falho, abrir issue no GitHub com formato:

```
**Story afetada:** #80 (S1-1) | #81 (S1-2) | etc.
**Tela:** /cliente/login | /cliente | etc.
**Perfil testado:** CLIENTE | PROFISSIONAL | ADMIN
**Dispositivo:** Mobile 375px | Desktop 1280px
**Passos para reproduzir:** ...
**Esperado:** ...
**Obtido:** ...
**Severidade:** 0-4 (usar escala do Discovery §2.2)
**Screenshot:** anexar
```

Marcar com label `qa-feedback` e mencionar a issue da story original.

---

## Resumo dos commits sob teste

| Commit | Sprint | Escopo |
|---|---|---|
| `bc30e2e` `6577f21` | S0 | Discovery (docs) |
| `9afa693` | S1-1 | ClientLayout + BottomNav |
| `3527265` | S1-2 | Home do cliente |
| `cffb07f` | S1-3 | Wizard 3 passos |
| `85d703d` | S1-4 | Cadastro enxuto + recuperação de senha |
| `622d48e` | S1-5 | Onboarding cliente |
| `ebb0b27` | #78 | Seeds PROFISSIONAL/GERENTE/CLIENTE |
| `6a9d7a1` | S2-1 | ProfessionalLayout + BottomNav |
| `e3539f9` | S2-2 | Modo Dia timeline |
| `09be7ed` | S2-3 | Bottom sheet ações |
| `8b66ccc` | S2-4 | Agenda 7 dias |
| `010a0ee` | S2-5 | Onboarding profissional |
| `915939b` | S4-1 | Dashboard plataforma |
| `92eb759` | S4-2 | Empresas plataforma |

**Total:** 14 commits, 9 stories entregues + 1 desbloqueio.
