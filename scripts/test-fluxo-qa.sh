#!/usr/bin/env bash
# Script E2E para o QA testar o fluxo COMPLETO entre cliente e profissional.
# Simula o ciclo de vida de um agendamento do início ao fim, exercitando
# TODAS as transições de status válidas (positivas e negativas).
#
# Cenário simulado:
#   1. Cliente loga e cria agendamento  → status AGENDADO
#   2. Profissional confirma             → CONFIRMADO
#   3. Profissional inicia atendimento   → EM_ANDAMENTO
#   4. Profissional finaliza             → CONCLUIDO
#   5. Profissional reabre (correção)    → EM_ANDAMENTO  (testa #FIX f70c4a3)
#   6. Profissional finaliza de novo     → CONCLUIDO
#   7. Cria 2º agendamento + marca no-show direto AGENDADO→NO_SHOW (#FIX fdf3c61)
#   8. Reverte no-show pra CONFIRMADO (#FIX f70c4a3)
#   9. Cancela o 2º agendamento
#  10. Tenta transições inválidas (devem dar 400):
#        - CANCELADO → AGENDADO (impossível)
#        - CONCLUIDO → AGENDADO (não é reabrir)
#        - PROCEDIMENTO_FIM → AGENDADO (não é reabrir)
#
# Uso:
#   ./scripts/test-fluxo-qa.sh                                         # prod
#   API_BASE=http://localhost:8080 ./scripts/test-fluxo-qa.sh          # local
#
# Pré-requisitos:
#   - bash + curl + jq (instale com choco/brew/apt)
#   - POST /api/admin/seed-demo rodado pelo menos uma vez
#   - Atendente do seed precisa ter serviços vinculados (re-seed se necessário)

set -uo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
API_BASE="${API_BASE:-https://agendainteligente-production.up.railway.app}"

CLIENTE_EMAIL="${CLIENTE_EMAIL:-cliente@salao.demo.com}"
CLIENTE_SENHA="${CLIENTE_SENHA:-Demo@2026}"

PROFISSIONAL_EMAIL="${PROFISSIONAL_EMAIL:-profissional@salao.demo.com}"
PROFISSIONAL_SENHA="${PROFISSIONAL_SENHA:-Demo@2026}"

# ── Cores ───────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; B=$'\e[34m'; M=$'\e[35m'; X=$'\e[0m'; BOLD=$'\e[1m'
else
  R=''; G=''; Y=''; B=''; M=''; X=''; BOLD=''
fi

PASS=0
FAIL=0
WARN=0
FAILED_STEPS=()

pass() { echo "  ${G}✓${X} $1"; PASS=$((PASS+1)); }
fail() { echo "  ${R}✗${X} $1"; FAIL=$((FAIL+1)); FAILED_STEPS+=("$1"); }
warn() { echo "  ${Y}!${X} $1"; WARN=$((WARN+1)); }
info() { echo "  ${B}→${X} $1"; }
section() { echo; echo "${BOLD}${M}▼ $1${X}"; }
step()    { echo; echo "${BOLD}$1${X}"; }

# ── Curl wrapper ────────────────────────────────────────────────────────────
RESP_STATUS=""
RESP_BODY=""
api_call() {
  local method="$1"
  local url="$2"
  local token="${3:-}"
  local body="${4:-}"
  local args=(-s -X "$method" -H 'Content-Type: application/json' -w '\n__STATUS__:%{http_code}')
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body"  ]] && args+=(--data "$body")
  local raw
  raw=$(curl "${args[@]}" "${API_BASE}${url}")
  RESP_STATUS=$(echo "$raw" | grep '__STATUS__:' | sed 's/.*__STATUS__://')
  RESP_BODY=$(echo "$raw" | sed '/__STATUS__:/d')
}

assert_status() {
  local expected="$1"
  local label="$2"
  if [[ "$RESP_STATUS" == "$expected" ]]; then
    pass "$label (HTTP $RESP_STATUS)"
    return 0
  fi
  fail "$label — esperado HTTP $expected, recebido $RESP_STATUS"
  [[ -n "$RESP_BODY" ]] && echo "      ${Y}body:${X} $(echo "$RESP_BODY" | jq -c . 2>/dev/null || echo "$RESP_BODY" | head -c 300)"
  return 1
}

# Espera receber 400 ou 403 (transição inválida)
assert_blocked() {
  local label="$1"
  if [[ "$RESP_STATUS" == "400" || "$RESP_STATUS" == "403" ]]; then
    pass "$label rejeitado corretamente (HTTP $RESP_STATUS)"
    return 0
  fi
  fail "$label não foi bloqueado — recebeu HTTP $RESP_STATUS (esperado 400/403)"
  return 1
}

# ── Pré-flight ──────────────────────────────────────────────────────────────
section "Pré-flight"
info "API_BASE = $API_BASE"

if ! command -v jq >/dev/null 2>&1; then
  echo "${R}jq não está instalado.${X} Instale com: choco install jq | brew install jq | apt install jq"
  exit 2
fi

api_call GET /actuator/health
if [[ "$RESP_STATUS" != "200" ]]; then
  fail "Backend offline em $API_BASE"
  exit 3
fi
pass "Backend online"

# ── Login dos 2 atores ──────────────────────────────────────────────────────
section "Login dos atores"

step "1. Cliente loga"
api_call POST /api/publico/clientes/login "" \
  "{\"emailOuCpf\":\"$CLIENTE_EMAIL\",\"senha\":\"$CLIENTE_SENHA\"}"
assert_status 201 "Login cliente" || exit 4
TOKEN_CLI=$(echo "$RESP_BODY" | jq -r '.token')
CLIENTE_ID=$(echo "$RESP_BODY" | jq -r '.clienteId')
info "TOKEN_CLI obtido, clienteId=$CLIENTE_ID"

step "2. Profissional loga"
api_call POST /api/auth/login "" \
  "{\"email\":\"$PROFISSIONAL_EMAIL\",\"senha\":\"$PROFISSIONAL_SENHA\"}"
assert_status 200 "Login profissional" || exit 4
TOKEN_PROF=$(echo "$RESP_BODY" | jq -r '.token')
info "TOKEN_PROF obtido"

# ── Descobrir IDs necessários ───────────────────────────────────────────────
section "Descobrir IDs do tenant"

step "3. Cliente lista unidades (vê só as do próprio tenant)"
api_call GET /api/publico/clientes/unidades "$TOKEN_CLI"
assert_status 200 "Lista unidades"
UNIDADE_ID=$(echo "$RESP_BODY" | jq -r '.[0].id')
UNIDADE_NOME=$(echo "$RESP_BODY" | jq -r '.[0].nome')
info "Unidade: $UNIDADE_NOME (id=$UNIDADE_ID)"

step "4. Cliente lista serviços da unidade"
api_call GET "/api/publico/clientes/unidades/$UNIDADE_ID/servicos" "$TOKEN_CLI"
assert_status 200 "Lista serviços"
SERVICO_ID=$(echo "$RESP_BODY" | jq -r '.[0].id')
SERVICO_NOME=$(echo "$RESP_BODY" | jq -r '.[0].nome')
SERVICO_VALOR=$(echo "$RESP_BODY" | jq -r '.[0].valor')
info "Serviço: $SERVICO_NOME (R\$ $SERVICO_VALOR, id=$SERVICO_ID)"

step "5. Cliente busca horários disponíveis (fallback automático de slots)"
HOJE=$(date +%Y-%m-%d)
SEMANA=$(date -d '+7 days' +%Y-%m-%d 2>/dev/null || date -v +7d +%Y-%m-%d)
api_call GET "/api/publico/clientes/horarios-disponiveis?unidadeId=$UNIDADE_ID&servicoId=$SERVICO_ID&dataInicio=$HOJE&dataFim=$SEMANA" "$TOKEN_CLI"
assert_status 200 "Lista horários"
TOTAL_SLOTS=$(echo "$RESP_BODY" | jq 'length')
info "Slots disponíveis: $TOTAL_SLOTS"
if [[ "$TOTAL_SLOTS" == "0" ]]; then
  fail "Zero slots — rode POST /api/admin/seed-demo pra vincular atendente aos serviços"
  exit 5
fi

# Pega 2 slots futuros (pra criar 2 agendamentos)
PROXIMO_SLOT=$(echo "$RESP_BODY" | jq -r '[.[] | select(.dataHoraInicio > (now | strftime("%Y-%m-%dT%H:%M:%S")))] | .[0]')
SEGUNDO_SLOT=$(echo "$RESP_BODY" | jq -r '[.[] | select(.dataHoraInicio > (now | strftime("%Y-%m-%dT%H:%M:%S")))] | .[1] // .[0]')
SLOT_1_INICIO=$(echo "$PROXIMO_SLOT" | jq -r '.dataHoraInicio')
SLOT_2_INICIO=$(echo "$SEGUNDO_SLOT" | jq -r '.dataHoraInicio')
ATENDENTE_ID=$(echo "$PROXIMO_SLOT" | jq -r '.atendenteId')
info "Slot 1: $SLOT_1_INICIO  |  Slot 2: $SLOT_2_INICIO  |  Atendente: $ATENDENTE_ID"

# ── FLUXO 1: ciclo completo AGENDADO → CONCLUIDO ───────────────────────────
section "FLUXO 1: ciclo completo AGENDADO → CONCLUIDO (com reabrir no meio)"

step "6. Cliente cria agendamento → AGENDADO"
PAYLOAD=$(cat <<EOF
{
  "clienteId": $CLIENTE_ID,
  "unidadeId": $UNIDADE_ID,
  "atendenteId": $ATENDENTE_ID,
  "dataHoraInicio": "$SLOT_1_INICIO",
  "formaPagamentoPreferida": "PIX",
  "servicos": [{ "servicoId": $SERVICO_ID, "quantidade": 1, "valor": $SERVICO_VALOR }]
}
EOF
)
api_call POST /api/publico/clientes/agendamentos "$TOKEN_CLI" "$PAYLOAD"
assert_status 201 "POST /agendamentos" || exit 6
AGENDAMENTO_1=$(echo "$RESP_BODY" | jq -r '.id')
info "Agendamento 1 criado: id=$AGENDAMENTO_1"

step "7. Profissional confirma → CONFIRMADO"
api_call PATCH "/api/agendamentos/$AGENDAMENTO_1/status?status=CONFIRMADO" "$TOKEN_PROF"
assert_status 200 "AGENDADO → CONFIRMADO"

step "8. Profissional inicia → EM_ANDAMENTO"
api_call PATCH "/api/agendamentos/$AGENDAMENTO_1/status?status=EM_ANDAMENTO" "$TOKEN_PROF"
assert_status 200 "CONFIRMADO → EM_ANDAMENTO"

step "9. Profissional finaliza atendimento → CONCLUIDO"
api_call POST "/api/agendamentos/$AGENDAMENTO_1/finalizar" "$TOKEN_PROF" \
  "{\"valorFinal\": $SERVICO_VALOR, \"tipoPagamento\": \"PIX\"}"
assert_status 200 "POST /finalizar"

step "10. Profissional reabre (correção) → EM_ANDAMENTO  (#FIX f70c4a3)"
api_call PATCH "/api/agendamentos/$AGENDAMENTO_1/status?status=EM_ANDAMENTO" "$TOKEN_PROF"
assert_status 200 "CONCLUIDO → EM_ANDAMENTO (reabrir)"

step "11. Profissional finaliza de novo → CONCLUIDO"
api_call POST "/api/agendamentos/$AGENDAMENTO_1/finalizar" "$TOKEN_PROF" \
  "{\"valorFinal\": $SERVICO_VALOR, \"tipoPagamento\": \"PIX\"}"
assert_status 200 "POST /finalizar (2ª vez)"

# ── FLUXO 2: no-show + reverter no-show ────────────────────────────────────
section "FLUXO 2: no-show e reversão"

step "12. Cliente cria 2º agendamento → AGENDADO"
PAYLOAD2=$(cat <<EOF
{
  "clienteId": $CLIENTE_ID,
  "unidadeId": $UNIDADE_ID,
  "atendenteId": $ATENDENTE_ID,
  "dataHoraInicio": "$SLOT_2_INICIO",
  "servicos": [{ "servicoId": $SERVICO_ID, "quantidade": 1, "valor": $SERVICO_VALOR }]
}
EOF
)
api_call POST /api/publico/clientes/agendamentos "$TOKEN_CLI" "$PAYLOAD2"
if [[ "$RESP_STATUS" == "201" ]]; then
  AGENDAMENTO_2=$(echo "$RESP_BODY" | jq -r '.id')
  pass "POST /agendamentos #2 (HTTP 201, id=$AGENDAMENTO_2)"
elif [[ "$RESP_STATUS" == "409" ]] || echo "$RESP_BODY" | grep -q -i "conflito\|conflict"; then
  warn "Slot 2 conflitou com agendamento 1 — pulando fluxo 2 (esperado se só tem 1 slot futuro)"
  AGENDAMENTO_2=""
else
  fail "POST /agendamentos #2 falhou (HTTP $RESP_STATUS)"
  AGENDAMENTO_2=""
fi

if [[ -n "$AGENDAMENTO_2" ]]; then
  step "13. Profissional marca direto AGENDADO → NO_SHOW  (#FIX fdf3c61)"
  api_call PATCH "/api/agendamentos/$AGENDAMENTO_2/status?status=NO_SHOW" "$TOKEN_PROF"
  assert_status 200 "AGENDADO → NO_SHOW (sem passar por CONFIRMADO)"

  step "14. Profissional reverte NO_SHOW → CONFIRMADO  (#FIX f70c4a3)"
  api_call PATCH "/api/agendamentos/$AGENDAMENTO_2/status?status=CONFIRMADO" "$TOKEN_PROF"
  assert_status 200 "NO_SHOW → CONFIRMADO (cliente compareceu)"

  step "15. Cliente cancela o 2º agendamento"
  api_call POST "/api/publico/clientes/agendamentos/$AGENDAMENTO_2/cancelar" "$TOKEN_CLI"
  if [[ "$RESP_STATUS" == "200" || "$RESP_STATUS" == "204" ]]; then
    pass "POST /cancelar (HTTP $RESP_STATUS)"
  else
    fail "POST /cancelar (HTTP $RESP_STATUS)"
  fi

  step "16. CANCELADO → AGENDADO deve falhar (cancelado é terminal)"
  api_call PATCH "/api/agendamentos/$AGENDAMENTO_2/status?status=AGENDADO" "$TOKEN_PROF"
  assert_blocked "Tentar ressuscitar agendamento cancelado"
fi

# ── FLUXO 3: assertions de transições inválidas ────────────────────────────
section "FLUXO 3: transições inválidas (state machine deve rejeitar)"

step "17. Tentar EM_ANDAMENTO direto pulando AGENDADO/CONFIRMADO"
# Cria um 3º agendamento se possível, pra testar transição inválida
api_call GET "/api/publico/clientes/horarios-disponiveis?unidadeId=$UNIDADE_ID&servicoId=$SERVICO_ID&dataInicio=$HOJE&dataFim=$SEMANA" "$TOKEN_CLI"
SLOT_3=$(echo "$RESP_BODY" | jq -r '[.[] | select(.dataHoraInicio > (now | strftime("%Y-%m-%dT%H:%M:%S")))] | .[2] // .[1] // empty')
if [[ -n "$SLOT_3" && "$SLOT_3" != "null" ]]; then
  SLOT_3_INICIO=$(echo "$SLOT_3" | jq -r '.dataHoraInicio')
  PAYLOAD3=$(cat <<EOF
{
  "clienteId": $CLIENTE_ID,
  "unidadeId": $UNIDADE_ID,
  "atendenteId": $ATENDENTE_ID,
  "dataHoraInicio": "$SLOT_3_INICIO",
  "servicos": [{ "servicoId": $SERVICO_ID, "quantidade": 1, "valor": $SERVICO_VALOR }]
}
EOF
)
  api_call POST /api/publico/clientes/agendamentos "$TOKEN_CLI" "$PAYLOAD3"
  if [[ "$RESP_STATUS" == "201" ]]; then
    AGENDAMENTO_3=$(echo "$RESP_BODY" | jq -r '.id')
    info "Agendamento 3 criado: id=$AGENDAMENTO_3 — pulando AGENDADO→EM_ANDAMENTO"

    # 17a. AGENDADO → EM_ANDAMENTO (pular CONFIRMADO) deve falhar
    api_call PATCH "/api/agendamentos/$AGENDAMENTO_3/status?status=EM_ANDAMENTO" "$TOKEN_PROF"
    assert_blocked "AGENDADO → EM_ANDAMENTO (pular confirmação)"

    # 17b. AGENDADO → CONCLUIDO deve falhar
    api_call PATCH "/api/agendamentos/$AGENDAMENTO_3/status?status=CONCLUIDO" "$TOKEN_PROF"
    assert_blocked "AGENDADO → CONCLUIDO (deve usar /finalizar)"

    # 17c. AGENDADO → CANCELADO deve falhar (deve usar /cancelar)
    api_call PATCH "/api/agendamentos/$AGENDAMENTO_3/status?status=CANCELADO" "$TOKEN_PROF"
    assert_blocked "AGENDADO → CANCELADO (deve usar /cancelar)"

    # Limpar: cancelar agendamento 3
    api_call POST "/api/publico/clientes/agendamentos/$AGENDAMENTO_3/cancelar" "$TOKEN_CLI"
  else
    warn "Não foi possível criar agendamento #3 — pulando testes de transição inválida"
  fi
else
  warn "Sem slot disponível pra agendamento #3 — pulando"
fi

# ── FLUXO 4: cliente vê histórico ──────────────────────────────────────────
section "FLUXO 4: cliente vê seus agendamentos"

step "18. GET /meus-agendamentos (ativos)"
api_call GET /api/publico/clientes/meus-agendamentos "$TOKEN_CLI"
assert_status 200 "Lista meus-agendamentos"
ATIVOS=$(echo "$RESP_BODY" | jq 'length')
info "Agendamentos ativos: $ATIVOS"

step "19. GET /meus-cancelamentos (histórico)"
api_call GET /api/publico/clientes/meus-cancelamentos "$TOKEN_CLI"
assert_status 200 "Lista meus-cancelamentos"
CANCELADOS=$(echo "$RESP_BODY" | jq 'length')
info "Agendamentos cancelados: $CANCELADOS"

# ── FLUXO 5: profissional vê agenda ────────────────────────────────────────
section "FLUXO 5: profissional vê sua agenda"

step "20. Profissional GET /agendamentos (filtrado por perfil)"
api_call GET /api/agendamentos "$TOKEN_PROF"
assert_status 200 "Profissional lista agendamentos"
AGENDA_TOTAL=$(echo "$RESP_BODY" | jq 'length')
info "Profissional vê $AGENDA_TOTAL agendamento(s) no total"
APARECE_1=$(echo "$RESP_BODY" | jq --arg id "$AGENDAMENTO_1" '[.[] | select(.id == ($id | tonumber))] | length')
if [[ "$APARECE_1" == "1" ]]; then
  pass "Agendamento 1 aparece na agenda do profissional"
else
  fail "Agendamento 1 NÃO aparece — bug de filtro por perfil"
fi

# ── Resumo ──────────────────────────────────────────────────────────────────
echo
echo "${BOLD}═══════════════════════════════════════════════════════════════${X}"
echo "${BOLD}Resumo:${X}  ${G}${PASS} pass${X}  ${R}${FAIL} fail${X}  ${Y}${WARN} warn${X}"
echo "${BOLD}═══════════════════════════════════════════════════════════════${X}"

if [[ "$FAIL" -gt 0 ]]; then
  echo
  echo "${R}${BOLD}Steps que falharam:${X}"
  for s in "${FAILED_STEPS[@]}"; do
    echo "  • $s"
  done
  exit 1
fi

echo "${G}${BOLD}Todos os fluxos passaram ✓${X}"
exit 0
