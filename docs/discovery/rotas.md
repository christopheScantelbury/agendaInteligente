# Inventário de Rotas — Agenda Inteligente

> **Story:** [#74 — S0-1 Inventariar todas as rotas](https://github.com/christopheScantelbury/agendaInteligente/issues/74)
> **Sprint:** 0 — Discovery
> **Gerado em:** 2026-05-25
> **Branch:** `main` @ commit `b59387c`

---

## 1. Visão geral

| Camada | Total |
|---|---|
| Rotas frontend (React Router) | 35 |
| Endpoints backend (Spring REST) | 198 |
| Controllers | 30 |
| Endpoints públicos (sem JWT) | 18 |
| Endpoints com `@PreAuthorize` granular | 38 |
| Endpoints autenticados padrão (JWT) | 142 |

---

## 2. Perfis do sistema

| Perfil | Origem | Descrição |
|---|---|---|
| `ADMIN` | role JWT | Admin global da plataforma |
| `ADMINISTRADOR` | role JWT | Admin de uma empresa única (multi-tenant) |
| `GERENTE` | role JWT | Gerente de unidade |
| `PROFISSIONAL` | role JWT | Profissional/atendente que executa serviços |
| `CLIENTE` | role JWT (token cliente público separado) | Cliente final que agenda |

**Sistema de permissões granulares:** além das roles, perfis customizados têm `permissoesGranulares: Record<path, 'VISUALIZAR' | 'EDITAR'>` controlado em `frontend/src/constants/menusPermissoes.ts`.

---

## 3. Rotas Frontend (React Router)

Arquivo: [`frontend/src/App.tsx`](../../frontend/src/App.tsx)

### 3.1 Rotas públicas (não autenticadas)

| Rota | Componente | Perfis | Notas |
|---|---|---|---|
| `/` | `Landing` (se não logado) | Público | Landing page de marketing |
| `/login` | `Login` | Público | Login admin/gerente/profissional |
| `/cadastro` | `Cadastro` | Público | Cadastro de empresa |
| `/cliente/login` | `LoginCliente` | Público | Login do cliente final |
| `/cliente/cadastro` | `CadastroCliente` | Público | Cadastro de cliente |
| `/reclamacoes` | `Reclamacoes` | Público | Formulário público de reclamação |

### 3.2 Rotas do cliente final

| Rota | Componente | Perfis | Notas |
|---|---|---|---|
| `/cliente/agendar` | `AgendarCliente` | CLIENTE | Tela pública de agendamento |
| `/cliente/meus-agendamentos` | `MeusAgendamentosCliente` | CLIENTE | Listagem dos próprios agendamentos |

### 3.3 Rotas autenticadas (admin/gerente/profissional)

Todas protegidas por `<ProtectedRoute>` + `<Layout>` + (na maioria) `<RequirePermissao path="...">`.

| Rota | Componente | Permissão granular | Perfis típicos |
|---|---|---|---|
| `/` | `DashboardOrAgendamentos` | `/` ou fallback | ADMIN, ADMINISTRADOR, GERENTE |
| `/dashboard` | `DashboardOrAgendamentos` | (idem) | (idem) |
| `/clientes` | `Clientes` | `/clientes` (fb: `/usuarios`) | ADMIN, GERENTE, PROFISSIONAL |
| `/clientes/novo` | `ClienteFormPage` | `/clientes` (fb: `/usuarios`) | (idem) |
| `/clientes/:id/editar` | `ClienteFormPage` | `/clientes` (fb: `/usuarios`) | (idem) |
| `/anamneses` | `AnamneseListPage` | `/clientes` (fb: `/usuarios`) | ADMIN, GERENTE, PROFISSIONAL |
| `/anamneses/templates` | `AnamneseTemplatesPage` | `/clientes` (fb: `/usuarios`) | ADMIN, ADMINISTRADOR, GERENTE |
| `/anamneses/nova` | `AnamneseFormPage` | `/clientes` (fb: `/usuarios`) | (idem) |
| `/anamneses/:id` | `AnamneseFormPage` | `/clientes` (fb: `/usuarios`) | (idem) |
| `/unidades` | `Unidades` | `/unidades` | ADMIN, GERENTE (ADMINISTRADOR redirecionado p/ `/configuracoes`) |
| `/servicos` | `Servicos` | `/servicos` | ADMIN, GERENTE |
| `/usuarios` | `Usuarios` | `/usuarios` | ADMIN, ADMINISTRADOR, GERENTE |
| `/configuracoes` | `Configuracoes` | (sem `RequirePermissao`) | Todos autenticados |
| `/profissionais` | `Profissionais` | `/profissionais` (fb: `/usuarios`) | ADMIN, GERENTE |
| `/atendentes` | redirect → `/profissionais` | — | (legacy) |
| `/agendamentos` | `Agendamentos` | `/agendamentos` | Todos exceto cliente público |
| `/agendamentos/novo` | `NovoAgendamento` | `/agendamentos` | (idem) |
| `/notificacoes` | `Notificacoes` | `/notificacoes` | (idem) |
| `/empresas` | `Empresas` | `/empresas` | ADMIN (ADMINISTRADOR redirecionado) |
| `/perfis` | `Perfis` | `/perfis` | ADMIN, GERENTE |
| `/convites-acesso` | `ConvitesAcesso` | `/convites-acesso` | ADMIN, ADMINISTRADOR |
| `/convites-cliente` | `ConvitesCliente` | `/convites-cliente` | ADMIN, ADMINISTRADOR |
| `/relatorios` | `Relatorios` | (sem `RequirePermissao`) | Todos autenticados |
| `/despesas` | `Despesas` | (sem `RequirePermissao`) | Todos autenticados |
| `/comissoes` | `Comissoes` | (sem `RequirePermissao`) | Todos autenticados |
| `/relatorios/performance` | `Performance` | (sem `RequirePermissao`) | Todos autenticados |
| `/relatorios/financeiro` | `ResumoFinanceiro` | (sem `RequirePermissao`) | Todos autenticados |

### 3.4 Mapeamento contra categorias do doc UX (§1.2)

| Categoria | Rotas |
|---|---|
| **A. Telas públicas** | `/`, `/login`, `/cadastro`, `/cliente/login`, `/cliente/cadastro`, `/reclamacoes` |
| **B. Auth & perfil** | `/configuracoes`, `/perfis` |
| **C. Agenda & agendamentos** | `/agendamentos`, `/agendamentos/novo`, `/cliente/agendar`, `/cliente/meus-agendamentos` |
| **D. Serviços** | `/servicos` |
| **E. Clientes/usuários** | `/clientes`, `/clientes/novo`, `/clientes/:id/editar`, `/anamneses*`, `/usuarios`, `/profissionais`, `/convites-acesso`, `/convites-cliente` |
| **F. Financeiras** | `/despesas`, `/comissoes` (NFS-e dentro do detalhe do agendamento) |
| **G. Relatórios** | `/relatorios`, `/relatorios/performance`, `/relatorios/financeiro` |
| **H. Configuração** | `/configuracoes`, `/unidades`, `/empresas` |
| **I. Administrativas** | `/empresas`, `/perfis` |
| **J. Estados especiais** | ❌ Não há rota dedicada (404/500 só via ErrorBoundary) |

**Gaps observados (preliminar):**
- Não há tela para **detalhe de agendamento** dedicada (só listagem + novo).
- Não há rota de **recuperação de senha** no frontend, apesar do backend ter (`/api/publico/recuperacao-senha/*`).
- Não há rota de **convidar usuário/profissional** separada da `/convites-acesso`.
- Não há **404 page** dedicada (`/*` cai sempre no Layout autenticado).
- Não há fluxo de **onboarding** pós-cadastro.

---

## 4. Endpoints Backend (Spring REST)

Pacote raiz: `br.com.agendainteligente.controller`

### 4.1 Endpoints públicos (sem JWT)

| Controller | Método | Path | Observação |
|---|---|---|---|
| AuthController | POST | `/api/auth/login` | |
| AuthController | POST | `/api/auth/cadastro` | |
| AuthController | GET | `/api/auth/hash/{senha}` | ⚠️ Endpoint debug — verificar se deve estar em produção |
| AuthController | POST | `/api/auth/fix-admin-senha` | Requer `X-Seed-Token` |
| ClientePublicoController | POST | `/api/publico/clientes/cadastro` | |
| ClientePublicoController | POST | `/api/publico/clientes/login` | |
| ClientePublicoController | GET | `/api/publico/clientes/horarios-disponiveis` | |
| ConvitePublicoController | GET | `/api/publico/convites/acesso/{token}` | |
| ConvitePublicoController | POST | `/api/publico/convites/acesso/{token}/finalizar` | |
| ConvitePublicoController | GET | `/api/publico/convites/cliente/{token}` | |
| ConvitePublicoController | POST | `/api/publico/convites/cliente/{token}/finalizar` | |
| NotaFacilWebhookController | POST | `/api/webhooks/notafacil` | Webhook NFS-e |
| ReclamacaoPublicoController | POST | `/api/publico/reclamacoes` | |
| RecuperacaoSenhaController | POST | `/api/publico/recuperacao-senha/usuario/solicitar` | |
| RecuperacaoSenhaController | POST | `/api/publico/recuperacao-senha/cliente/solicitar` | |
| RecuperacaoSenhaController | POST | `/api/publico/recuperacao-senha/usuario/redefinir` | |
| RecuperacaoSenhaController | POST | `/api/publico/recuperacao-senha/cliente/redefinir` | |
| SeedAdminController | POST | `/api/admin/seed-demo` | Requer `X-Seed-Token` |
| VersionController | GET | `/api/publico/version` | |

### 4.2 Endpoints autenticados — por controller

> Coluna **Acesso**: `JWT` = qualquer autenticado; `@PreAuthorize` = anotação explícita.

#### AgendamentoController — `/api/agendamentos`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/agendamentos` | `hasAnyRole('ADMIN','GERENTE','PROFISSIONAL','CLIENTE')` |
| GET | `/api/agendamentos/{id}` | (mesmo) |
| POST | `/api/agendamentos` | (mesmo) |
| PUT | `/api/agendamentos/{id}` | (mesmo) |
| PATCH | `/api/agendamentos/{id}/status` | `hasAnyRole('ADMIN','GERENTE','PROFISSIONAL')` |
| PATCH | `/api/agendamentos/{id}/observacao` | `hasAnyRole('ADMIN','GERENTE','PROFISSIONAL','CLIENTE')` |
| POST | `/api/agendamentos/{id}/cancelar` | (mesmo) |
| DELETE | `/api/agendamentos/{id}` | (mesmo) |
| POST | `/api/agendamentos/{id}/finalizar` | `hasAnyRole('ADMIN','GERENTE','PROFISSIONAL')` |

#### AnamneseController — `/api/anamneses` e `/api/anamnese-templates`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/anamneses` | `hasAnyRole('ADMIN','GERENTE','PROFISSIONAL')` |
| GET | `/api/anamneses/{id}` | (mesmo) |
| POST | `/api/anamneses` | (mesmo) |
| DELETE | `/api/anamneses/{id}` | `hasAnyRole('ADMIN','GERENTE')` |
| GET | `/api/anamnese-templates` | `hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE','PROFISSIONAL')` |
| GET | `/api/anamnese-templates/{id}` | (mesmo) |
| POST | `/api/anamnese-templates` | `hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')` |
| PUT | `/api/anamnese-templates/{id}` | (mesmo) |
| DELETE | `/api/anamnese-templates/{id}` | (mesmo) |

#### AtendenteController — `/api/atendentes`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/atendentes` | JWT |
| GET | `/api/atendentes/ativos` | JWT |
| GET | `/api/atendentes/unidade/{unidadeId}` | JWT |
| GET | `/api/atendentes/unidade/{unidadeId}/servicos` | JWT |
| GET | `/api/atendentes/usuario/{usuarioId}` | JWT |
| GET | `/api/atendentes/{id}` | JWT |
| POST | `/api/atendentes` | JWT |
| PUT | `/api/atendentes/{id}` | JWT |
| DELETE | `/api/atendentes/{id}` | JWT |

⚠️ **Sem `@PreAuthorize` granular** — qualquer autenticado pode criar/editar/excluir atendentes. Risco alto se cliente final tiver JWT válido.

#### CategoriaDespesaController — `/api/categorias-despesa`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/categorias-despesa` | JWT |
| POST | `/api/categorias-despesa` | JWT |
| PUT | `/api/categorias-despesa/{id}` | JWT |
| DELETE | `/api/categorias-despesa/{id}` | JWT |

#### ClienteController — `/api/clientes`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/clientes` | `ADMIN, GERENTE, PROFISSIONAL` |
| GET | `/api/clientes/meu-perfil` | JWT |
| GET | `/api/clientes/{id}` | JWT |
| GET | `/api/clientes/cpf-cnpj/{cpfCnpj}` | JWT |
| POST | `/api/clientes` | `ADMIN, GERENTE, PROFISSIONAL` |
| PUT | `/api/clientes/{id}` | JWT |
| DELETE | `/api/clientes/{id}` | `ADMIN, GERENTE` |

#### ClienteInsightsController — `/api/clientes/...`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/clientes/retornos` | `ADMIN, GERENTE, PROFISSIONAL` |
| GET | `/api/clientes/sumidos` | (mesmo) |
| GET | `/api/clientes/{id}/resumo` | (mesmo) |
| GET | `/api/clientes/duplicatas` | `ADMIN, GERENTE` |

#### ClientePublicoController — `/api/publico/clientes`

| Método | Path | Acesso |
|---|---|---|
| POST | `/api/publico/clientes/cadastro` | **Público** |
| POST | `/api/publico/clientes/login` | **Público** |
| GET | `/api/publico/clientes/horarios-disponiveis` | **Público** |
| POST | `/api/publico/clientes/agendamentos` | Cliente autenticado |
| GET | `/api/publico/clientes/meus-agendamentos` | (mesmo) |
| GET | `/api/publico/clientes/meus-cancelamentos` | (mesmo) |
| POST | `/api/publico/clientes/agendamentos/{id}/cancelar` | (mesmo) |

#### ComissaoController — `/api/comissoes`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/comissoes/regras` | JWT |
| POST | `/api/comissoes/regras` | JWT |
| DELETE | `/api/comissoes/regras/{id}` | JWT |
| GET | `/api/comissoes/pendentes` | JWT |
| GET | `/api/comissoes/resumo` | JWT |
| POST | `/api/comissoes/pagar` | JWT |
| GET | `/api/comissoes/pagamentos` | JWT |

#### ConviteController — `/api/convites`

| Método | Path | Acesso |
|---|---|---|
| POST | `/api/convites/acesso` | JWT |
| GET | `/api/convites/acesso` | JWT |
| POST | `/api/convites/cliente` | JWT |
| GET | `/api/convites/cliente` | JWT |

#### DespesaController — `/api/despesas`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/despesas` | JWT |
| GET | `/api/despesas/resumo` | JWT |
| GET | `/api/despesas/{id}` | JWT |
| POST | `/api/despesas` | JWT |
| PUT | `/api/despesas/{id}` | JWT |
| PATCH | `/api/despesas/{id}/status` | JWT |
| DELETE | `/api/despesas/{id}` | JWT |

#### EmpresaController — `/api/empresas`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/empresas` | `ADMIN` |
| GET | `/api/empresas/ativas` | `ADMIN, GERENTE` |
| GET | `/api/empresas/{id}` | (mesmo) |
| POST | `/api/empresas` | `ADMIN` |
| PUT | `/api/empresas/{id}` | `ADMIN` |
| DELETE | `/api/empresas/{id}` | `ADMIN` |

#### HorarioDisponivelController — `/api/horarios-disponiveis`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/horarios-disponiveis/meus-horarios` | `PROFISSIONAL` |
| POST | `/api/horarios-disponiveis` | `PROFISSIONAL` |
| PUT | `/api/horarios-disponiveis/{id}` | JWT |
| DELETE | `/api/horarios-disponiveis/{id}` | JWT |
| GET | `/api/horarios-disponiveis/buscar` | JWT |

#### IaController — `/api/ia`

| Método | Path | Acesso |
|---|---|---|
| POST | `/api/ia/sugerir-resposta-reclamacao` | JWT |
| POST | `/api/ia/sugerir-servico` | JWT |
| POST | `/api/ia/mensagem-reengajamento` | JWT |

#### InteligenciaController — `/api/inteligencia`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/inteligencia/horarios-populares` | JWT |
| GET | `/api/inteligencia/risco-no-show` | JWT |
| GET | `/api/inteligencia/servicos-complementares` | JWT |
| GET | `/api/inteligencia/insights-semanais` | JWT |
| GET | `/api/inteligencia/clientes-risco` | JWT |
| GET | `/api/inteligencia/churn-profissional` | JWT |

#### NfseTestController — `/api/nfse/test`

| Método | Path | Acesso |
|---|---|---|
| POST | `/api/nfse/test/agendamento/{agendamentoId}` | JWT (só env homologação) |
| GET | `/api/nfse/test/info` | JWT (só env homologação) |

#### NotaFiscalController — `/api/notas-fiscais`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/notas-fiscais/agendamento/{agendamentoId}` | JWT |
| POST | `/api/notas-fiscais/agendamento/{agendamentoId}/emitir` | JWT |

#### PagamentoController — `/api/pagamentos`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/pagamentos/agendamento/{agendamentoId}` | JWT |
| POST | `/api/pagamentos/agendamento/{agendamentoId}` | JWT |
| POST | `/api/pagamentos/agendamento/{agendamentoId}/registrar` | JWT |
| PATCH | `/api/pagamentos/agendamento/{agendamentoId}/ajustar` | JWT |

#### PerfilController — `/api/perfis`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/perfis` | `ADMIN, GERENTE` |
| GET | `/api/perfis/ativos` | `ADMIN, GERENTE` |
| GET | `/api/perfis/customizados` | `ADMIN` |
| GET | `/api/perfis/{id}` | `ADMIN` |
| GET | `/api/perfis/meu` | `isAuthenticated()` |
| GET | `/api/perfis/nome/{nome}` | `ADMIN` |
| POST | `/api/perfis` | `ADMIN, GERENTE` |
| PUT | `/api/perfis/{id}` | `ADMIN, GERENTE` |
| DELETE | `/api/perfis/{id}` | `ADMIN, GERENTE` |

#### ReclamacaoController — `/api/reclamacoes`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/reclamacoes` | `ADMIN, GERENTE` |
| GET | `/api/reclamacoes/nao-lidas` | (mesmo) |
| GET | `/api/reclamacoes/contador` | (mesmo) |
| GET | `/api/reclamacoes/unidade/{unidadeId}` | (mesmo) |
| GET | `/api/reclamacoes/unidade/{unidadeId}/nao-lidas` | (mesmo) |
| GET | `/api/reclamacoes/unidade/{unidadeId}/contador` | (mesmo) |
| GET | `/api/reclamacoes/{id}` | (mesmo) |
| PUT | `/api/reclamacoes/{id}/marcar-lida` | (mesmo) |

#### RelatorioController — `/api/relatorios`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/relatorios/faturamento-mensal` | JWT |
| GET | `/api/relatorios/top-servicos` | JWT |
| GET | `/api/relatorios/taxa-retorno` | JWT |
| GET | `/api/relatorios/performance` | JWT |
| GET | `/api/relatorios/financeiro/dashboard` | JWT |
| GET | `/api/relatorios/financeiro/fluxo-diario` | JWT |

#### ServicoController — `/api/servicos`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/servicos` | JWT |
| GET | `/api/servicos/ativos` | JWT |
| GET | `/api/servicos/unidade/{unidadeId}` | JWT |
| GET | `/api/servicos/unidade/{unidadeId}/ativos` | JWT |
| GET | `/api/servicos/{id}` | JWT |
| POST | `/api/servicos` | JWT |
| PUT | `/api/servicos/{id}` | JWT |
| DELETE | `/api/servicos/{id}` | JWT |

#### UnidadeController — `/api/unidades`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/unidades` | `ADMIN, GERENTE, PROFISSIONAL, CLIENTE` |
| GET | `/api/unidades/ativas` | (mesmo) |
| GET | `/api/unidades/{id}` | (mesmo) |
| POST | `/api/unidades` | `ADMIN, GERENTE` |
| PUT | `/api/unidades/{id}` | `ADMIN, GERENTE` |

⚠️ **Sem DELETE** — unidades não podem ser excluídas via API.

#### UsuarioController — `/api/usuarios`

| Método | Path | Acesso |
|---|---|---|
| GET | `/api/usuarios` | JWT |
| GET | `/api/usuarios/{id}` | JWT |
| POST | `/api/usuarios` | JWT |
| PUT | `/api/usuarios/{id}` | JWT |
| PUT | `/api/usuarios/{id}/senha` | `ADMIN` |
| DELETE | `/api/usuarios/{id}` | JWT |

---

## 5. Gaps de autorização identificados (preliminar)

Pontos que o discovery levantou e que devem virar problemas de severidade alta na análise heurística (#77):

| Gap | Severidade preliminar | Detalhe |
|---|---|---|
| `AtendenteController` sem `@PreAuthorize` | Alta (3-4) | Cliente autenticado pode CRUD em atendentes |
| `ServicoController` sem `@PreAuthorize` | Alta (3-4) | Cliente autenticado pode CRUD em serviços |
| `DespesaController` sem `@PreAuthorize` | Alta (3-4) | Apenas isolamento por tenant (via SecurityContextHolder), mas qualquer role consegue |
| `ComissaoController` sem `@PreAuthorize` | Alta (3-4) | Profissional poderia editar regras de comissão |
| `RelatorioController` sem `@PreAuthorize` | Média (2-3) | Profissional vê faturamento consolidado |
| `UsuarioController` POST sem restrição | Alta (3) | Profissional pode criar usuários |
| `AuthController.gerarHash` | Alta (3-4) | Endpoint debug exposto em prod |
| Sem rota frontend `/recuperar-senha` | Média (2) | Backend tem endpoint mas sem UI |
| Sem rota frontend `/404` | Baixa (1) | UX ruim quando usuário cai em rota inválida |
| Sem detalhe de agendamento dedicado | Média (2) | Apenas modal/listagem |

---

## 6. Componentes compartilhados identificados

A partir da varredura de `App.tsx`:

- `ProtectedRoute` — guard de autenticação
- `Layout` — shell autenticado (sidebar + header)
- `RequirePermissao` — guard por permissão granular com fallback paths
- `ErrorBoundary` — captura erros React
- `NotificationContainer` / `NotificationProvider` — toasts globais
- `InstallPrompt` — banner PWA

---

## 7. Próximos passos

- [#75 — Capturar prints mobile/desktop por perfil](https://github.com/christopheScantelbury/agendaInteligente/issues/75)
- [#76 — Preencher matriz de discovery por tela](https://github.com/christopheScantelbury/agendaInteligente/issues/76)
- [#77 — Análise heurística Nielsen](https://github.com/christopheScantelbury/agendaInteligente/issues/77) — os gaps de autorização da §5 deste doc são insumo direto.
