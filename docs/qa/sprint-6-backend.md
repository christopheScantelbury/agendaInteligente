# QA — Sprint 6 (Backend Hardening & Conversão)

> Prompt para o agente de QA. Cole numa sessão nova.

## Contexto
- Frontend: https://agendainteligente-aleefhenriiques-projects.vercel.app
- Backend: https://agendainteligente-production.up.railway.app
- Stories: #85 (formaPagamento), #86 (Guest checkout), #95 (Auditoria), #94 (Assumir sessão)

## Pré-requisito
Rodar `POST /api/admin/seed-demo` com `X-Seed-Token` em prod.

## Credenciais
- **ADMIN global:** `chris@agendainteligente.com` / `Admin@2026`
- **ADMINISTRADOR:** `salao@demo.com` / `Demo@2026`

---

## T6.1 — Forma de pagamento (#85)

**Teste manual via API ou via UI:**
- [ ] Logar como cliente, agendar serviço, escolher "Pix" no Passo 3
- [ ] Após confirmar, verificar via DB ou via lista de agendamentos do ADMINISTRADOR que o agendamento tem `formaPagamentoPreferida = "PIX"`
- [ ] Campo `observacoes` NÃO contém mais o trecho "Forma de pagamento preferida: ..."
- [ ] Agendamentos antigos (criados antes do deploy) devem ter `formaPagamentoPreferida` preenchido se tinham a string em observacoes — migration V61 fez o backfill

## T6.2 — Guest checkout (#86)

**Em `/cliente/login`:**
- [ ] Botão "Agendar sem criar conta" abaixo do CTA de cadastro
- [ ] Clicar leva para `/cliente/agendar?guest=1`

**Em `/cliente/agendar?guest=1` (sem login):**
- [ ] Página carrega normalmente (sem redirect para login)
- [ ] Passo 1 (escolher serviço) funciona
- [ ] Passo 2 (escolher horário) funciona
- [ ] **Passo 3 mostra card violet "Seus dados"** com:
  - Input Nome completo (obrigatório)
  - Input E-mail (obrigatório)
  - Input Telefone (obrigatório)
  - Input CPF (opcional)
- [ ] Confirmar sem preencher Nome/Email/Telefone mostra erro
- [ ] Confirmar com dados válidos cria agendamento E loga o cliente automaticamente
- [ ] Após sucesso, redireciona para `/cliente` (Home com cliente já logado)
- [ ] Cliente pode ver o agendamento criado em "Meus horários"

## T6.3 — Auditoria (#95)

**Em `/plataforma/auditoria` (logado como `chris@`):**
- [ ] Acesso liberado para ADMIN; ADMINISTRADOR redireciona pra `/`
- [ ] Header "Auditoria" com ícone ShieldCheck violet
- [ ] Contador "X registros · página Y de Z"
- [ ] Botão "Exportar CSV" — clica e baixa arquivo `audit-log-YYYYMMDD-HHmm.csv`
- [ ] CSV contém: timestamp, tipo_acao, autor_email, autor_perfil, entidade, entidade_id, descricao, ip, empresa_id

**Filtros:**
- [ ] Input "Tipo de ação" filtra (ex: `LOGIN_SUCCESS`)
- [ ] Date pickers "De" e "Até" filtram por período
- [ ] Filtros combinam corretamente

**Tabela:**
- [ ] Coluna Ação tem badge colorido:
  - LOGIN_* → emerald
  - LOGOUT* → slate
  - IMPERSONATE_* → violet
  - DELETE/EXCLUIR → red
  - CREATE/CRIAR → blue
- [ ] Colunas Cadastro/Última atividade/IP ocultas em mobile
- [ ] Botão olho 👁 abre modal com JSON completo do registro

**Validação:** após login, deve aparecer pelo menos 1 registro `LOGIN_SUCCESS` recente.

## T6.4 — Assumir sessão (#94)

**Em `/plataforma/empresas` (logado como `chris@`):**
- [ ] Clicar "Assumir" em uma empresa abre **modal amber** com:
  - Título "Assumir sessão"
  - Mensagem "Você vai operar como [empresa] por 15 minutos. Toda ação será registrada."
  - Textarea "Motivo (obrigatório)"
- [ ] Botão "Confirmar e assumir" **desabilitado** até motivo ter >= 5 chars
- [ ] Cancelar fecha modal sem ação

**Após confirmar:**
- [ ] Notification success "Você está como [empresa]. Sessão expira em 15 min."
- [ ] **Banner amber sticky no topo** com:
  - Texto "Você está como [empresa]"
  - "Sessão impersonada — expira em ~15 min. Toda ação está sendo auditada."
  - Botão "Encerrar sessão" (ícone LogOut)
- [ ] Página redireciona pra `/`
- [ ] UI mostra dados da empresa-alvo (não do ADMIN global)
- [ ] Sidebar com menus de ADMINISTRADOR (não os de plataforma)

**Durante impersonação:**
- [ ] Em DevTools > Network, qualquer request leva header `X-Impersonated-By: <id-do-admin>`
- [ ] Em `/plataforma/auditoria` (em outra aba ou após encerrar), aparece evento `IMPERSONATE_INICIO` com motivo + empresa nos metadados

**Encerrar:**
- [ ] Clicar "Encerrar sessão" no banner
- [ ] Notification implícita; banner some
- [ ] Página recarrega em `/plataforma/empresas`
- [ ] `localStorage.token` voltou pro do ADMIN global (verificar via DevTools)
- [ ] Em `/plataforma/auditoria`, novo evento `IMPERSONATE_FIM` registrado

**Expiração:**
- [ ] Aguardar 15 min (ou alterar `IMPERSONATION_TTL_MS` no código pra teste)
- [ ] Qualquer request retorna 401 → app desloga (vai pra `/login`)

---

## Pontos críticos
- **Não vazar dados**: durante impersonação, ADMIN só vê dados da empresa alvo. Verificar acessando `/agendamentos` — não pode vir agendamentos de outras empresas
- **Audit completo**: cada request feita em modo impersonado tem `impersonated_by` populado no banco — abrir um registro no modal "Ver detalhes" e confirmar
- **Restore correto**: após encerrar, ADMIN volta pra sessão dele, com acesso completo a `/plataforma/*`
- **Motivo obrigatório**: backend deve rejeitar (400) se motivo < 5 chars

## Atenção
- TTL é 15 minutos. Se o ADMIN ficar muito tempo no modo impersonado, o JWT expira sem aviso prévio (próxima request retorna 401)
- Caso esqueça de encerrar, sessão impersonada some sozinha após expiração
- O backup do token do ADMIN fica em `localStorage.impersonation_backup_token` — não deletar manualmente
EOF
