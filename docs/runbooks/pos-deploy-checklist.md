# Runbook — Checklist pós-deploy

Atualizações operacionais que precisam ser feitas manualmente após o deploy do redesign UX completo (Sprints 0-6).

## 1. Re-rodar `seed-demo` em prod

**Por quê:** Sprint 2 estendeu o seed para criar PROFISSIONAL/GERENTE/CLIENTE. Sprint 6 adicionou colunas `forma_pagamento_preferida` e tornou `cliente.unidade_id` nullable.

**Como:**
```bash
curl -X POST https://agendainteligente-production.up.railway.app/api/admin/seed-demo \
  -H "X-Seed-Token: <APP_SEED_TOKEN>"
```

Token está na variável de ambiente `APP_SEED_TOKEN` no Railway (Settings → Variables). Também salvo em `ACESSOS.local.md` (gitignored).

**Resultado esperado:** JSON com lista de usuários criados/atualizados:
- `chris@agendainteligente.com` (ADMIN)
- `salao@demo.com`, `academia@demo.com` (ADMINISTRADOR + empresa+unidade demo)
- `profissional@salao.demo.com`, `profissional@academia.demo.com` (PROFISSIONAL + Atendente)
- `gerente@salao.demo.com`, `gerente@academia.demo.com` (GERENTE)
- `cliente@salao.demo.com`, `cliente@academia.demo.com` (Cliente)

Todos com senha `Demo@2026`.

**Validação:** logar com `profissional@salao.demo.com / Demo@2026` em `/login` → deve redirecionar para `/profissional/hoje` e mostrar a timeline.

---

## 2. Configurar PostHog no Vercel

**Por quê:** Sprint 5 #102 instalou `posthog-js` com graceful degradation — sem chave, app funciona mas tracking fica desativado.

**Como:**

1. Criar conta gratuita em https://posthog.com (free tier 1M eventos/mês)
2. Criar projeto novo → copiar a **Project API Key** (formato `phc_xxxxxxxx`)
3. Vercel Dashboard → projeto `agendainteligente` (conta Aleef) → Settings → Environment Variables
4. Adicionar **2 variáveis** em **Production**:
   - `VITE_POSTHOG_KEY` = `phc_xxxxxxxx`
   - `VITE_POSTHOG_HOST` = `https://us.i.posthog.com` (ou `https://eu.i.posthog.com` se escolheu EU)
5. Vercel → Deployments → último deploy → menu `⋮` → **Redeploy**

**Validação:** abrir https://agendainteligente-aleefhenriiques-projects.vercel.app/login → DevTools Network → procurar requests para `us.i.posthog.com`. Logar → no PostHog Dashboard, evento `login_success` deve aparecer em até 1 min.

**Eventos que serão capturados automaticamente:**
- `login_success` / `logout`
- Cliente: `cliente_agendamento_iniciado` → `passo2_servico` → `passo3_horario` → `concluido`
- Profissional: `profissional_checkin` / `iniciar_atendimento` / `finalizar` / `no_show`
- Gerente: `gerente_dashboard_aberto` / `checklist_tarefa_clicada`
- Onboarding: `onboarding_tour_iniciado` / `tour_pulado` / `tour_completo`

---

## 3. Lighthouse score em prod

**Por quê:** Sprint 5 prometeu Performance ≥ 80 mas não foi medido em prod ainda.

**Como:**

1. Abrir https://agendainteligente-aleefhenriiques-projects.vercel.app em **modo anônimo** (cache limpo)
2. DevTools (F12) → aba **Lighthouse**
3. Categoria: **Performance** · Modo: **Navigation** · Device: **Mobile**
4. Clicar **Analyze page load**
5. Repetir para 3 rotas críticas:
   - `/login`
   - `/cliente/login`
   - `/agendamentos` (autenticado como `salao@demo.com`)

**Meta:** Performance ≥ 80 em mobile.

**Onde anotar:** comentar na issue [#103](https://github.com/christopheScantelbury/agendaInteligente/issues/103) (lazy loading) com os scores capturados.

---

## 4. Verificar rota `/cliente` com seed rodado

**Pré-requisito:** passo 1 (seed-demo).

**Como:**

1. Logar com `cliente@salao.demo.com / Demo@2026` em `/cliente/login`
2. Validar:
   - Redirect para `/cliente` (Home)
   - Modal de boas-vindas aparece no primeiro login
   - Bottom nav 3 itens
   - FAB de ajuda no canto inferior direito
3. Marcar passos pendentes do `docs/qa/sprint-1-cliente.md` como ✅

---

## 5. Testar guest checkout

Não precisa estar logado.

**Como:**

1. Abrir https://agendainteligente-aleefhenriiques-projects.vercel.app/cliente/login
2. Clicar em **"Agendar sem criar conta"** (botão violet outline abaixo do CTA principal)
3. Validar fluxo:
   - Passo 1: escolher serviço
   - Passo 2: escolher horário
   - Passo 3: card violet "Seus dados" com Nome/Email/Telefone/CPF
   - Confirmar com dados válidos
4. Após sucesso, validar:
   - Token JWT temporário salvo
   - Cliente novo aparece em `/clientes` (logado como ADMINISTRADOR)
   - Agendamento aparece na agenda do profissional

---

## 6. Validar audit log

**Como:**

1. Logar como `chris@agendainteligente.com / Admin@2026`
2. Acessar `/plataforma/auditoria`
3. Validar que há pelo menos 1 evento `LOGIN_SUCCESS` recente
4. Testar filtro por data (últimas 24h)
5. Clicar 👁 em um registro → modal com JSON
6. Clicar **Exportar CSV** → baixa arquivo

---

## 7. Testar "Assumir sessão" (impersonation)

**Como:**

1. Logado como `chris@`
2. `/plataforma/empresas` → clicar **"Assumir"** em alguma empresa
3. Modal abre → digitar motivo de teste (≥ 5 chars: "Teste de QA pós-deploy")
4. Confirmar
5. Banner amber sticky aparece no topo
6. UI muda para a empresa-alvo
7. Voltar para `/plataforma/auditoria` → procurar evento `IMPERSONATE_INICIO` com motivo nos metadados
8. Clicar **Encerrar sessão** no banner → restaura sessão admin
9. Voltar para `/plataforma/auditoria` → ver `IMPERSONATE_FIM`

---

## Checklist final

- [ ] `seed-demo` rodado em prod
- [ ] PostHog configurado e tracking aparecendo no dashboard
- [ ] Lighthouse ≥ 80 medido em 3 rotas e documentado no #103
- [ ] Rota `/cliente` validada com user de teste
- [ ] Guest checkout funciona end-to-end
- [ ] Audit log mostra eventos
- [ ] Assumir sessão funciona + audita
