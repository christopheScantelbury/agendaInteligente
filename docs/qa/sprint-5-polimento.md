# QA — Sprint 5 (Polimento)

> Prompt para o agente de QA. Cole numa sessão nova.

## Contexto
- Frontend: https://agendainteligente-aleefhenriiques-projects.vercel.app
- Stories: #101 (FAB ajuda), #102 (PostHog), #103 (Lazy loading)
- Doc-base: AgendaInteligente_Redesign_UX.docx §4.4 + §6

## Credenciais
Qualquer um dos perfis (depois do seed):
- ADMIN: `chris@agendainteligente.com` / `Admin@2026`
- ADMINISTRADOR: `salao@demo.com` / `Demo@2026`
- GERENTE: `gerente@salao.demo.com` / `Demo@2026`
- PROFISSIONAL: `profissional@salao.demo.com` / `Demo@2026`
- CLIENTE: `cliente@salao.demo.com` / `Demo@2026`

---

## T5.1 — FAB de ajuda contextual (#101)

**Posicionamento:**
- [ ] Botão circular violet com "?" no canto inferior direito
- [ ] **Mobile:** `bottom-20` (acima do bottom nav do cliente/profissional)
- [ ] **Desktop:** `bottom-4`
- [ ] z-index acima do conteúdo mas abaixo de modais (verificar abrindo um modal de confirmação)
- [ ] Não cobre conteúdo crítico (testar em cada tela)

**Aparece em:**
- [ ] `/dashboard` (admin/gerente)
- [ ] `/plataforma` (ADMIN global)
- [ ] `/agendamentos`, `/clientes`, `/servicos`, etc.
- [ ] `/gerente/dashboard`
- [ ] `/profissional/hoje`, `/profissional/agenda`, `/profissional/perfil`
- [ ] `/cliente`, `/cliente/agendar`, `/cliente/perfil`, `/cliente/meus-agendamentos`

**NÃO aparece em:**
- [ ] `/login`, `/cliente/login` (telas sem layout)
- [ ] `/cadastro`, `/cliente/cadastro`
- [ ] `/recuperar-senha`, `/redefinir-senha` (família)

**Drawer ao clicar:**
- [ ] Drawer sobe do rodapé em mobile (slideUp); aparece à direita em desktop
- [ ] Backdrop escuro com blur
- [ ] Header: ícone HelpCircle + título contextual (ex.: "Modo Dia", "Dashboard", "Início")
- [ ] Botão X de fechar
- [ ] ESC fecha
- [ ] Click fora do drawer fecha
- [ ] **Trocar de rota fecha o drawer automaticamente**

**Conteúdo:**
- [ ] Campo de busca com placeholder "Buscar na ajuda"
- [ ] **Top 3 FAQs** contextuais (sem busca) — varia por rota
- [ ] FAQ é botão expansível: tap mostra/oculta resposta
- [ ] Digitar na busca filtra perguntas + respostas em tempo real
- [ ] "Nenhuma resposta encontrada" se busca não retornar nada

**Rotas com tour (devem ter botão "Refazer tour desta tela"):**
- [ ] `/cliente` → Refazer tour cliente
- [ ] `/profissional/hoje` → Refazer tour profissional
- [ ] `/gerente/dashboard` → Refazer tour gerente

**Rotas sem tour (botão "Refazer tour" NÃO aparece):**
- [ ] `/agendamentos`, `/cliente/agendar`, `/plataforma`, etc.

**Botão "Falar com suporte":**
- [ ] Em emerald, com ícone MessageCircle
- [ ] Abre WhatsApp em nova aba (`target="_blank"`)

**FAQs específicas a validar (alguns exemplos):**
- [ ] Em `/profissional/hoje`: "Como faço check-in de um cliente?"
- [ ] Em `/cliente/agendar`: "O que significa 'Pagar no local'?"
- [ ] Em `/gerente/dashboard`: "Como o faturamento é calculado?"
- [ ] Em `/plataforma`: "Por que MRR e Churn estão 'Em breve'?"

## T5.2 — PostHog Analytics (#102)

**Sem token (`VITE_POSTHOG_KEY` não definido):**
- [ ] App funciona normalmente — sem erros no console
- [ ] Em dev, console mostra `[analytics] PostHog desabilitado (sem VITE_POSTHOG_KEY).`
- [ ] Nenhum request para `posthog.com` no Network

**Com token (configurar VITE_POSTHOG_KEY no Vercel):**
- [ ] Login dispara `login_success` com propriedades `perfil` e `tipo` (usuario|cliente)
- [ ] `identify` é chamado (verificar painel PostHog)
- [ ] Logout dispara `logout` + `reset()`
- [ ] Wizard de agendamento dispara:
  - `cliente_agendamento_iniciado` ao entrar em `/cliente/agendar`
  - `cliente_agendamento_passo2_servico` ao escolher serviço
  - `cliente_agendamento_passo3_horario` ao escolher horário
  - `cliente_agendamento_concluido` ao confirmar (com servicoId, valor, formaPagamento)
- [ ] Profissional dispara `profissional_checkin`, `profissional_finalizar` (com valor) etc.
- [ ] Gerente: `gerente_dashboard_aberto` no mount, `gerente_checklist_tarefa_clicada` em cada tap
- [ ] Onboarding: `onboarding_tour_iniciado`, `tour_pulado`, `tour_completo` (com perfil)

## T5.3 — Lazy loading (#103)

**DevTools → Network:**
- [ ] Abrir `/login` em janela anônima
- [ ] Verificar tamanho do chunk principal (`index-*.js`) — esperado **< 200 kB gzip**
- [ ] Navegar para `/agendamentos` → chunk `Agendamentos-*.js` carrega só agora (~120kB)
- [ ] Navegar para `/relatorios/performance` → `vendor-charts-*.js` (recharts) carrega só agora (~113 kB gzip)
- [ ] Voltar para outra tela → nada novo carrega (cache)
- [ ] Iniciar tour em `/cliente` → `driver-*.js` carrega só nesse momento

**Suspense fallback:**
- [ ] Spinner violet aparece brevemente ao navegar pra rota nova
- [ ] Após carregar, página renderiza normalmente

**Lighthouse (rodar em prod):**
- [ ] Chrome DevTools → Lighthouse → Mobile + Performance
- [ ] Esperado: **Performance ≥ 70** (ideal 80+)
- [ ] First Contentful Paint < 3s em throttling Slow 4G

---

## Pontos críticos do Discovery
- **Lighthouse score:** validar via DevTools, anexar screenshot ao relatório
- **PostHog em prod:** chave precisa ser configurada no Vercel (variável `VITE_POSTHOG_KEY`)
- **Bundle size:** verificar que não passa de 250 kB gzip no chunk principal

## Atenção
- O FAB pode sobrepor levemente o bottom nav em viewports muito pequenos (< 320px). Validar.
- PostHog tem free tier de 1M eventos/mês — verificar dashboard após primeira semana de uso.
- Microsoft Clarity NÃO foi implementado — PostHog substitui (mesma feature de heatmaps + session recording, mas desligado por padrão por privacidade).

Formato pra reportar: ver [sprint-1-cliente.md](sprint-1-cliente.md#formato-pra-reportar-bugs).
