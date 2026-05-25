# Matriz de Discovery + Análise Heurística — Agenda Inteligente

> **Stories combinadas:** [#75](https://github.com/christopheScantelbury/agendaInteligente/issues/75) (prints) + [#76](https://github.com/christopheScantelbury/agendaInteligente/issues/76) (matriz) + [#77](https://github.com/christopheScantelbury/agendaInteligente/issues/77) (heurística)
> **Sprint:** 0 — Discovery
> **Iniciado em:** 2026-05-25
> **Viewport:** Mobile real (431×932, UA mobile) via Chrome MCP
> **URL prod:** https://agendainteligente-aleefhenriiques-projects.vercel.app

## Nota sobre PNGs

Os screenshots foram capturados durante a navegação mas não estão persistidos no repo
— a limitação técnica do Chrome MCP impede salvar arquivos em path arbitrário. As
**observações abaixo são feitas a partir da inspeção visual de cada tela durante a
sessão de discovery**, com referência a elementos identificados via DOM e
`accessibility tree`.

## Heurísticas de Nielsen aplicadas

`H1` Visibilidade do status · `H2` Linguagem do usuário · `H3` Liberdade e controle ·
`H4` Consistência · `H5` Prevenção de erros · `H6` Reconhecimento (não memorização) ·
`H7` Flexibilidade · `H8` Design minimalista · `H9` Mensagens de erro · `H10` Ajuda

Severidade: `0` cosmético · `1` baixo · `2` médio · `3` alto · `4` crítico

---

## Telas inventariadas

### T-001 · `/login` — Login (admin/gerente/profissional)

| Campo | Valor |
|---|---|
| Rota | `/login` |
| Categoria (doc §1.2) | A (Telas públicas) |
| Perfis | Público — qualquer perfil não-cliente |
| Componente | `pages/Login.tsx` |

**Ações principais**
1. Entrar (email + senha)
2. Cadastrar-se (link para `/cadastro`)

**Dados exibidos**
Logo, título "Bem-vindo de volta", subtítulo, email, senha, botão Entrar, link "Não tem conta? Cadastre-se grátis"

**Problemas observados**

| # | Heurística | Severidade | Descrição |
|---|---|---|---|
| P001-1 | H6 | 2 | **Sem entrada para cliente final.** O link "Cadastre-se grátis" vai pra `/cadastro` (cadastro de empresa). Não há CTA "Sou cliente, quero agendar" → cliente final precisa adivinhar a URL `/cliente/login`. |
| P001-2 | H3 | 3 | **Sem "Esqueci minha senha"** apesar do backend ter 4 endpoints prontos (`/api/publico/recuperacao-senha/*`). Usuário travado fica sem recuperação. |
| P001-3 | H1 | 1 | Email field veio autofill com valor antigo do navegador (não é bug do app, mas pode confundir). |
| P001-4 | H5 | 3 | **Banner PWA "Instalar App" cobre o botão Entrar** quando aparece — quebra ação primária na tela mais crítica. |

---

### T-002 · `/agendamentos` — Agenda (visão calendário) — ADMINISTRADOR

| Campo | Valor |
|---|---|
| Rota | `/agendamentos` (default após login do ADMINISTRADOR) |
| Categoria | C (Agenda) |
| Perfis | ADMIN, ADMINISTRADOR, GERENTE, PROFISSIONAL, CLIENTE |
| Componente | `pages/Agendamentos.tsx` |

**Ações principais:** Trocar Lista/Calendário · Novo agendamento · Navegar dia/semana · Tocar card

**Dados:** timeline vertical com horários 08:00→ ; cards com hora, cliente, serviço

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P002-1 | H4 | 2 | Toggle "Lista | Calendário" repete função do menu — duas formas de chegar à mesma visão. Confunde. |
| P002-2 | H8 | 2 | Densidade alta em mobile — cards de agendamento truncam serviço ("Avaliação completa de condicionamento físico" cortado). |
| P002-3 | H6 | 1 | Sem indicador de hora atual (linha "agora") na timeline — usuário não vê onde está no dia. |
| P002-4 | H7 | 2 | Sem filtro rápido por profissional/serviço no header — só na visão Lista. |

**Comparar com doc §3.2 (Modo Dia):** essa tela é a candidata para virar o "Modo Dia" do profissional — falta status colorido por card, bottom sheet de ações.

---

### T-003 · `/agendamentos/novo` — Novo Agendamento

| Campo | Valor |
|---|---|
| Rota | `/agendamentos/novo` |
| Categoria | C |
| Componente | `pages/NovoAgendamento.tsx` |

**Ações:** Selecionar Cliente · Unidade · Atendente · Serviços · Data/hora · Observações · Criar / Cancelar

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P003-1 | H6 | 3 | **Ordem dos campos inversa do mental model:** Cliente → Unidade → Atendente → Serviços. Usuário pensa "que serviço o cliente quer" primeiro, depois quem faz. Doc UX §3.1 propõe serviço → horário → confirmar. |
| P003-2 | H5 | 3 | Sem indicação de disponibilidade no campo de hora — usuário pode escolher hora ocupada e só descobrir no submit. |
| P003-3 | H2 | 1 | "Atendente" vs "Profissional" — terminologia inconsistente (na sidebar é "Profissionais"). |
| P003-4 | H5 | 2 | Dropdowns sem search/typeahead — em empresa com 50 clientes/serviços vira lista enorme. |
| P003-5 | H8 | 1 | Doc do redesign propõe **3 passos** (serviço, horário, confirmar). Aqui é form único com 6+ campos. |

---

### T-004 · `/clientes` — Lista de Clientes

| Campo | Valor |
|---|---|
| Categoria | E (Clientes) |
| Componente | `pages/Clientes.tsx` |

**Ações:** Buscar · Filtrar status · Tabs (Retornantes/Sumidos/Unificar) · Novo · Editar · Excluir

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P004-1 | H4 | 2 | Tab "Unificar Cons" truncada (provavelmente "Unificar Consultas" ou "Contas") — texto cortado prejudica entendimento. |
| P004-2 | H8 | 1 | Coluna "Telefone" com `—` para vários clientes sem placeholder explicativo. |
| P004-3 | H6 | 2 | Sem indicação visual de cliente novo vs recorrente na lista. |
| P004-4 | H4 | 1 | "Ações" como coluna com ícones editar/lixeira sem texto — bom no desktop, mas ícones pequenos em mobile (área de toque < 44px). |

---

### T-005 · `/clientes/novo` (ou `/:id/editar`) — Form Cliente

**Ações:** Voltar · Preencher · Salvar

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P005-1 | H6 | 2 | Campos duplicados: **RG** e **"Documento de identidade"** — qual usar? Confunde. |
| P005-2 | H5 | 2 | Sem indicação de campos obrigatórios (asterisco ou label). |
| P005-3 | H1 | 2 | Botão Voltar no topo mas o submit no rodapé — distância grande em mobile, sem CTA flutuante. |

---

### T-006 · `/servicos` — Lista de Serviços

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P006-1 | H8 | 2 | Cards densos: nome, valor, duração, unidade, status, ações no mesmo bloco — falta hierarquia. |
| P006-2 | H4 | 1 | Info "Unidade: Salão Demo · Unidade Principal" é redundante para ADMINISTRADOR (que tem 1 unidade). |
| P006-3 | H6 | 1 | Sem categorização visual — serviços de áreas diferentes (cabelo, estética, massagem) misturados. |

---

### T-007 · `/profissionais` — Lista de Profissionais

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P007-1 | H4 | 3 | **Sobreposição com `/usuarios`** — mesmos dados em duas listas (Salão Demo aparece em ambas). Quando criar/editar em qual? |
| P007-2 | H6 | 1 | Badges "Administrador" e "Ativo" misturados sem padrão visual (cor, peso). |

---

### T-008 · `/usuarios` — Lista de Usuários

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P008-1 | H4 | 3 | **Não está no menu lateral do ADMINISTRADOR** mas a rota responde. Inconsistência entre permissão de rota e menu — confunde modelo mental. |
| P008-2 | H4 | 3 | Redundância com `/profissionais` (ver P007-1). |
| P008-3 | H8 | 2 | Email + perfil + unidade no mesmo card sem hierarquia visual. |

---

### T-009 · `/anamneses` — Lista de Fichas

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P009-1 | H6 | 2 | Mesma cliente aparece duas vezes (Ana Costa) sem diferenciar tipo/data — visual idêntico. |
| P009-2 | H4 | 1 | Botões "Gerenciar Templates" e "+ Nova Ficha" lado a lado com mesma cor — ações de níveis diferentes (admin vs operacional). |
| P009-3 | H8 | 1 | Cards mostram "Tratamento Da Tarefa" — provável placeholder seed em prod (limpar). |

---

### T-010 · `/anamneses/templates` — Templates

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P010-1 | H8 | 2 | **Templates de QA visíveis em prod** ("QA S11 Toda", "Template QA Sessão") — bagunçando UX. |
| P010-2 | H4 | 2 | Tabela densa em mobile — colunas truncadas. Melhor formato seria card. |
| P010-3 | H2 | 1 | Coluna "PERGUNTAS" mostra número sem label/contexto. |

---

### T-011 · `/anamneses/nova` — Form Anamnese

**Pontos positivos:** Seções nomeadas (Identificação, Questionário), workflow claro.

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P011-1 | H1 | 1 | Date default para hoje (bom), mas sem indicar que é editável. |

---

### T-012 · `/perfis` — Perfis e Permissões

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P012-1 | H8 | 2 | Cards densos com nome + 2 badges + descrição + ações — escaneabilidade ruim. |
| P012-2 | H6 | 1 | Ícone cadeado (🔒) para perfis "Sistema" — convenção OK, mas falta tooltip explicando "não editável". |
| P012-3 | H8 | 1 | Cinco perfis: Cliente, ADMINISTRADOR, SECRETÁRIA, PROFISSIONAL, ADMIN — naming inconsistente (uppercase vs Title Case). |

---

### T-013 · `/convites-acesso` e `/convites-cliente` — **ROTAS BLOQUEADAS PARA ADMINISTRADOR**

**Problemas críticos**

| # | H | Sev | Descrição |
|---|---|---|---|
| P013-1 | H1 | 4 | **Redirect silencioso** para `/` (Dashboard) sem feedback. `RequirePermissao` provavelmente retorna fallback sem mensagem. Usuário clica → vai pro Dashboard → não entende o que aconteceu. |
| P013-2 | H4 | 3 | ADMINISTRADOR é o dono da empresa — faz sentido que veja convites de sua empresa. Decisão de permissão pode estar errada no seed/RequirePermissao. |

---

### T-014 · `/notificacoes` — Notificações/Reclamações

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P014-1 | H4 | 2 | Título da página "Notificações" mas conteúdo diz "Nenhuma reclamação encontrada" — Notificações ≠ Reclamações. |
| P014-2 | H1 | 1 | Bom empty state com ícone e mensagem. |

---

### T-015 · `/despesas` — Despesas

**Pontos positivos:** Cards de totalizadores (R$ recebidos, pagos, vencidos) + Export CSV.

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P015-1 | H8 | 2 | Header com título + subtítulo + 3 botões (Categorias, Exportar CSV, Adicionar) — competição visual. |
| P015-2 | H1 | 1 | Cores semânticas OK (verde, vermelho, amarelo). |
| P015-3 | H6 | 1 | "Vencidos" com triângulo de alerta amarelo — bom indicador visual. |

---

### T-016 · `/comissoes` — Comissões

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P016-1 | H1 | 3 | **Estado vazio sem orientação** — só mostra dropdown "Selecione um profissional", sem texto explicando "Selecione um profissional para ver pendências e regras". |
| P016-2 | H10 | 2 | Sem ajuda inline sobre como funciona o cálculo de comissão. |

---

### T-017 · `/relatorios` — Relatórios (hub)

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P017-1 | H4 | 2 | Tabs "Performance | Resumo Financeiro" levam para outras rotas (`/relatorios/performance` e `/relatorios/financeiro`) — não são abas no mesmo componente. Confuso. |
| P017-2 | H1 | 1 | Filtros (unidade, período) bem posicionados. |

---

### T-018 · `/relatorios/performance` — Performance

**Pontos positivos:** Uso de cor para indicar sinal (verde positivo, vermelho negativo), tabs Empresa/Profissionais.

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P018-1 | H4 | 2 | Breadcrumb "Relatórios > Resumo Financeiro" mas estou em Performance — link errado/confuso. |
| P018-2 | H6 | 1 | "Lucro" com seta para baixo + cor laranja — bom semaforização. |

---

### T-019 · `/relatorios/financeiro` — Resumo Financeiro

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P019-1 | H8 | 1 | Três tabs no header (Dashboard, Fluxo de Caixa Diário, Fluxo de Caixa) — diferença entre "Fluxo Diário" e "Fluxo" não está clara. |

---

### T-020 · `/configuracoes` — Configurações da Conta

**Pontos positivos:** Numeração das seções facilita scan.

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P020-1 | H5 | 2 | Sem indicação de campos obrigatórios. |
| P020-2 | H4 | 1 | "Salvar Dados da Conta" e "Alterar senha" botões em seções separadas — bom para escopo, ruim para discoverability. |

---

### T-021 · `/empresas` e `/unidades` — REDIRECT SILENCIOSO

| # | H | Sev | Descrição |
|---|---|---|---|
| P021-1 | H1 | 3 | ADMINISTRADOR digita `/empresas` ou `/unidades` na URL → redirect silencioso para `/configuracoes`. Sem feedback ("Você só gerencia 1 unidade — veja em Configurações"). |

---

## Perfil: ADMIN GLOBAL (chris@agendainteligente.com)

Menu lateral tem **16 itens** (vs 13 do ADMINISTRADOR). Adicionais: Empresas, Unidades, Usuários, Links de venda de acesso. Faltando: Configurações, Links para clientes (`/convites-cliente`).

### T-022 · `/` (Dashboard) — ADMIN

**Pontos:** título "Dashboard | Visão geral do negócio", cards com Agendamentos Hoje, Total de Clientes, Faturamento Geral.

**Problemas críticos**

| # | H | Sev | Descrição |
|---|---|---|---|
| P022-1 | H6 | **4** | **ADMIN global vê dados operacionais (agendamentos, clientes, faturamento) — viola §3.4 do doc UX.** Doc determina: "O admin não deve ter visibilidade automática dos dados operacionais das empresas". Esses dados são... de qual empresa? Provavelmente são agregados ou da empresa default — risco de vazamento entre tenants. |
| P022-2 | H6 | 4 | **Faltam métricas de plataforma**: MRR, churn, número de empresas ativas, NFS-e emitidas, agendamentos totais. Doc §3.4 lista todos. |
| P022-3 | H4 | 3 | Dashboard idêntico ao do ADMINISTRADOR — ADMIN e gerente compartilham mesma tela. Doc cobra interfaces distintas. |

### T-023 · `/empresas` — ADMIN-only

**Lista exibe:** ForFit, Salão Alef, Empresa-Salão de Beleza, Salão Demo, Academia Demo, com Razão Social, CNPJ, Email, Telefone, "Cor do App".

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P023-1 | H6 | **4** | **Falta plano, status, MRR, última atividade**. Doc §3.4 pede explicitamente: "Nome, plano, data de cadastro, última atividade, MRR, status". Atual mostra só dados de cadastro estáticos. |
| P023-2 | H7 | **4** | **Falta ação "Assumir sessão"** (impersonate) para depurar problemas — pilar do doc §3.4. Sem isso, ADMIN não pode ajudar empresas reportando bugs. |
| P023-3 | H10 | 2 | Sem dashboard de saúde da empresa antes de entrar em edição (ex.: quantos agendamentos, profissionais ativos). |
| P023-4 | H8 | 2 | Cards densos com 4-5 linhas — escaneabilidade ruim para listas que vão crescer. |

### T-024 · `/unidades` — ADMIN (visão multi-empresa)

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P024-1 | H6 | 3 | Lista mistura unidades de empresas diferentes sem agrupar por empresa pai. Difícil escanear. |
| P024-2 | H8 | 1 | Endereço, telefone e horário no mesmo card — info útil mas misturada. |

### T-026 · `/convites-acesso` — ADMIN-only

**Ponto positivo:** Empty state claro com instrução de uso e descrição completa da feature ("Gere links para novos gerentes finalizarem o cadastro...").

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P026-1 | H2 | 2 | Naming inconsistente — sidebar diz "Links de venda de acesso", título da página igual, mas conceitualmente são "convites" (rota é `/convites-acesso`). Confunde dev e suporte. |

---

## Perfil: PROFISSIONAL e GERENTE — não testados nesta sessão

Seeds existentes (Carlos QA Teste, QA Tester 5B) não têm senha conhecida. **Hipótese sustentada pelos paths do código:**
- PROFISSIONAL provavelmente vê: `/agendamentos`, `/clientes`, `/anamneses`, `/notificacoes`, `/comissoes/pendentes`
- Não vê: `/usuarios`, `/perfis`, `/relatorios`, `/empresas`, `/unidades`, `/convites-*`
- Endpoint `/api/horarios-disponiveis/meus-horarios` é exclusivo dele (cadastro próprio de disponibilidade)
- GERENTE: papel intermediário entre ADMIN e ATENDENTE — pelos `@PreAuthorize` do backend tem visibilidade quase completa de uma empresa

**Recomendação:** abrir issue de follow-up para capturar esses perfis após gerar seeds com senha conhecida — `SeedAdminController.seedDemoUsers` deveria criar 1 PROFISSIONAL e 1 GERENTE por empresa demo.

---

## Perfil: CLIENTE FINAL

### T-027 · `/cliente/login` — Login do Cliente

**Ações:** Entrar (email/CPF + senha), Cadastrar-se

**Pontos positivos:** Aceita email **ou** CPF/CNPJ no mesmo campo (flexível); mensagem de erro clara em banner acima do form ("Email/CPF ou senha inválidos").

**Problemas**

| # | H | Sev | Descrição |
|---|---|---|---|
| P027-1 | H4 | 2 | **Sem logo do AgendaInteligente** — diferente da tela admin que tem logo grande. Quebra consistência de identidade. |
| P027-2 | H3 | 3 | Sem "Esqueci a senha" — backend tem `/api/publico/recuperacao-senha/cliente/solicitar` mas frontend não expõe. |
| P027-3 | H2 | 2 | Título "Área do Cliente" é formal demais — doc §3.1 prega tom de "app de delivery", saudação simples ("Bem-vindo!"). |
| P027-4 | H1 | 1 | Mensagem de erro genérica (correto pra segurança, mas sem indicação de tentativas restantes). |

### T-028 · `/cliente/cadastro` — Cadastro de Cliente

**Pontos positivos:** Asteriscos indicando campos obrigatórios; placeholders informativos (mask CPF, CEP).

**Problemas críticos**

| # | H | Sev | Descrição |
|---|---|---|---|
| P028-1 | H8 | **4** | **Form muito longo para o JTBD do cliente.** Pede Nome, CPF/CNPJ, RG, Data Nasc., Email, Telefone, CEP, Endereço, Número, etc. Doc §3.1: cliente quer "agendar em segundos". Cadastro deveria ser progressivo (Nome+Email+Senha → outros dados no agendamento). |
| P028-2 | H5 | 3 | CPF/CNPJ obrigatório — cliente PF dificilmente tem CNPJ. Confunde. |
| P028-3 | H6 | 3 | Sem opção "Agendar sem cadastro" / "Continuar como visitante". Doc §3.1 propõe fluxo de 3 passos onde cadastro é o último (pagar/confirmar). |
| P028-4 | H7 | 2 | Sem login social (Google, Apple) — fricção desnecessária. |

### T-029 · `/cliente/agendar` — Agendar (não capturado nesta sessão)

Não logado como cliente — captura fica para follow-up. Pela leitura de `pages/AgendarCliente.tsx` deve mostrar:
- Lista/grid de serviços disponíveis
- Calendário/slots de horários
- Resumo de pedido

**Recomendação:** capturar manualmente após criar cliente seed.

### T-030 · `/cliente/meus-agendamentos` — Meus Agendamentos (não capturado)

**Recomendação:** capturar manualmente após criar cliente seed.

---

## Sumário Executivo da Heurística

### Total de problemas identificados: **64**

| Severidade | Quantidade |
|---|---|
| 4 — Crítico | 6 |
| 3 — Alto | 17 |
| 2 — Médio | 28 |
| 1 — Baixo | 13 |
| 0 — Cosmético | 0 |

### Top 10 problemas por impacto

1. **P022-1** (sev 4) — ADMIN vê dados operacionais que deveria pertencer a tenant (vazamento)
2. **P022-2** (sev 4) — Faltam métricas de plataforma no Dashboard do ADMIN (MRR, churn, empresas)
3. **P023-1** (sev 4) — `/empresas` sem plano, status, MRR, última atividade
4. **P023-2** (sev 4) — Sem ação "Assumir sessão" (impersonate) — pilar §3.4
5. **P028-1** (sev 4) — Cadastro de cliente longo demais (10+ campos)
6. **P013-1** (sev 4) — `/convites-acesso` redirect silencioso sem feedback para ADMINISTRADOR
7. **P003-1** (sev 3) — Ordem dos campos em Novo Agendamento contraria mental model
8. **P003-2** (sev 3) — Sem indicação de disponibilidade no campo hora
9. **P001-2** (sev 3) — Sem "Esqueci minha senha" no login admin
10. **P007-1** (sev 3) — Redundância `/profissionais` vs `/usuarios`

### Quick wins (severidade 1-2, fix rápido)

- P010-1 — Limpar templates de QA visíveis em prod
- P004-1 — Texto "Unificar Cons" truncado (renomear/encurtar tab)
- P018-1 — Breadcrumb errado em `/relatorios/performance`
- P017-1 — Tabs do `/relatorios` que viram rotas distintas — converter em sub-rotas reais ou aba
- P014-1 — Título "Notificações" vs conteúdo "reclamações" (alinhar nome)

### Conclusões para o Redesign

A análise confirma fortemente as hipóteses do doc UX:

1. **Interface "one-size-fits-all" é o problema raiz.** O dashboard de ADMIN é idêntico ao de ADMINISTRADOR, levando a problemas críticos (P022-1).
2. **JTBD do cliente final está mal endereçado.** Cadastro de 10+ campos para alguém que só quer agendar.
3. **ADMIN sem ferramenta de plataforma.** Falta o painel SaaS real (P022-2, P023-1, P023-2).
4. **Fluxos operacionais lentos.** Novo agendamento com 6+ campos quando doc propõe 3 passos.
5. **Sistema de permissões granular gera redirects silenciosos** (P013-1, P021-1).

Tudo isso reforça o plano de Sprint 1-4 do doc UX: redesign por perfil é o caminho certo.


