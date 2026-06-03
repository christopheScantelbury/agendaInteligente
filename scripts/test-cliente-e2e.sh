#!/usr/bin/env bash
# E2E script de testes do fluxo completo do CLIENTE.
# Cobre login, listagem de unidades/serviços/horários, criação de agendamento,
# listagem dos próprios agendamentos, cancelamento, e checks de segurança
# multi-tenant (#SEC02 — cliente do tenant A não acessa tenant B).
#
# Uso:
#   ./scripts/test-cliente-e2e.sh                          # roda contra prod
#   API_BASE=http://localhost:8080 ./scripts/test-cliente-e2e.sh   # roda contra local
#
# Requisitos: bash, curl, jq.
# Pré-requisito: ter rodado POST /api/admin/seed-demo pelo menos uma vez.

set -uo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
API_BASE="${API_BASE:-https://agendainteligente-production.up.railway.app}"
CLIENTE_SALAO_EMAIL="${CLIENTE_SALAO_EMAIL:-cliente@salao.demo.com}"
CLIENTE_SALAO_SENHA="${CLIENTE_SALAO_SENHA:-Demo@2026}"
CLIENTE_ACAD_EMAIL="${CLIENTE_ACAD_EMAIL:-cliente@academia.demo.com}"
CLIENTE_ACAD_SENHA="${CLIENTE_ACAD_SENHA:-Demo@2026}"

# ── Cores ───────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; B=$'\e[34m'; X=$'\e[0m'; BOLD=$'\e[1m'
else
  R=''; G=''; Y=''; B=''; X=''; BOLD=''
fi

PASS=0
FAIL=0
WARN=0

# ── Helpers ─────────────────────────────────────────────────────────────────
pass() { echo "  ${G}✓${X} $1"; PASS=$((PASS+1)); }
fail() { echo "  ${R}✗${X} $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ${Y}!${X} $1"; WARN=$((WARN+1)); }
info() { echo "  ${B}→${X} $1"; }
section() { echo; echo "${BOLD}$1${X}"; }

# Curl wrapper que sempre captura status + body separados.
# Args: METHOD URL [TOKEN] [BODY_JSON]
# Output em $RESP_STATUS e $RESP_BODY (vars globais)
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
  else
    fail "$label — esperado HTTP $expected, recebido $RESP_STATUS"
    [[ -n "$RESP_BODY" ]] && echo "      ${Y}body:${X} $(echo "$RESP_BODY" | jq -c . 2>/dev/null || echo "$RESP_BODY")"
    return 1
  fi
}

# ── Pré-flight ──────────────────────────────────────────────────────────────
section "Pré-flight"
info "API_BASE = $API_BASE"

if ! command -v jq >/dev/null 2>&1; then
  echo "${R}jq não está instalado.${X} Instale com: choco install jq (Windows) ou brew install jq (Mac) ou apt install jq (Linux)"
  exit 2
fi

api_call GET /actuator/health
if [[ "$RESP_STATUS" != "200" ]]; then
  fail "Backend offline em $API_BASE (status=$RESP_STATUS)"
  exit 3
fi
pass "Backend respondendo"

# ── Cenário 1: login do cliente Salão ───────────────────────────────────────
section "1. Login do cliente Salão Demo"
api_call POST /api/publico/clientes/login "" \
  "{\"emailOuCpf\":\"$CLIENTE_SALAO_EMAIL\",\"senha\":\"$CLIENTE_SALAO_SENHA\"}"
assert_status 201 "POST /publico/clientes/login" || {
  echo "${R}Login falhou — abortando.${X} Verifique se o seed foi executado."
  exit 4
}
TOKEN_SALAO=$(echo "$RESP_BODY" | jq -r '.token // empty')
CLIENTE_SALAO_ID=$(echo "$RESP_BODY" | jq -r '.clienteId // empty')
if [[ -z "$TOKEN_SALAO" || -z "$CLIENTE_SALAO_ID" ]]; then
  fail "Resposta de login não trouxe token/clienteId"
  exit 4
fi
pass "Token recebido (clienteId=$CLIENTE_SALAO_ID)"

# ── Cenário 2: listar unidades ──────────────────────────────────────────────
section "2. Listar unidades"
api_call GET /api/publico/clientes/unidades "$TOKEN_SALAO"
assert_status 200 "GET /publico/clientes/unidades"
UNIDADES_COUNT=$(echo "$RESP_BODY" | jq 'length')
if [[ "$UNIDADES_COUNT" -gt 0 ]]; then
  pass "Retornou $UNIDADES_COUNT unidade(s)"
else
  fail "Nenhuma unidade retornada — cliente deveria ver pelo menos a unidade do próprio tenant"
fi
UNIDADE_SALAO_ID=$(echo "$RESP_BODY" | jq -r '.[0].id')
UNIDADE_SALAO_NOME=$(echo "$RESP_BODY" | jq -r '.[0].nome')
info "Unidade principal: ${UNIDADE_SALAO_NOME} (id=$UNIDADE_SALAO_ID)"

# SEC: confirmar que NENHUMA unidade da Academia aparece
ACADEMIA_NA_LISTA=$(echo "$RESP_BODY" | jq -r '[.[] | select((.empresaNome // "") | test("[Aa]cademia"))] | length')
if [[ "$ACADEMIA_NA_LISTA" == "0" ]]; then
  pass "SEC: nenhuma unidade da Academia vazou pro cliente do Salão"
else
  fail "SEC: ${ACADEMIA_NA_LISTA} unidade(s) da Academia vazaram — vazamento multi-tenant!"
fi

# ── Cenário 3: listar serviços ──────────────────────────────────────────────
section "3. Listar serviços da unidade"
api_call GET "/api/publico/clientes/unidades/$UNIDADE_SALAO_ID/servicos" "$TOKEN_SALAO"
assert_status 200 "GET /unidades/$UNIDADE_SALAO_ID/servicos"
SERVICOS_COUNT=$(echo "$RESP_BODY" | jq 'length')
if [[ "$SERVICOS_COUNT" -gt 0 ]]; then
  pass "Retornou $SERVICOS_COUNT serviço(s)"
else
  fail "Nenhum serviço cadastrado — rode POST /api/admin/seed-demo pra criar os serviços padrão"
fi
SERVICO_ID=$(echo "$RESP_BODY" | jq -r '.[0].id')
SERVICO_NOME=$(echo "$RESP_BODY" | jq -r '.[0].nome')
SERVICO_DURACAO=$(echo "$RESP_BODY" | jq -r '.[0].duracaoMinutos')
info "Serviço escolhido: ${SERVICO_NOME} (${SERVICO_DURACAO}min, id=$SERVICO_ID)"

# ── Cenário 4: horários disponíveis (fallback automático) ───────────────────
section "4. Buscar horários disponíveis"
HOJE=$(date +%Y-%m-%d)
SEMANA=$(date -d '+7 days' +%Y-%m-%d 2>/dev/null || date -v +7d +%Y-%m-%d)
api_call GET "/api/publico/clientes/horarios-disponiveis?unidadeId=$UNIDADE_SALAO_ID&servicoId=$SERVICO_ID&dataInicio=$HOJE&dataFim=$SEMANA" "$TOKEN_SALAO"
assert_status 200 "GET /horarios-disponiveis"
SLOTS_COUNT=$(echo "$RESP_BODY" | jq 'length')
if [[ "$SLOTS_COUNT" -gt 0 ]]; then
  pass "Retornou $SLOTS_COUNT slot(s) virtuais (fallback automático funcionou)"
else
  fail "Zero slots — atendente provavelmente sem serviço vinculado OU unidade sem horário de funcionamento"
fi

# Pega o 1º slot futuro (não o de hoje passado)
PRIMEIRO_SLOT=$(echo "$RESP_BODY" | jq -r '[.[] | select(.dataHoraInicio > (now | strftime("%Y-%m-%dT%H:%M:%S")))][0]')
SLOT_INICIO=$(echo "$PRIMEIRO_SLOT" | jq -r '.dataHoraInicio')
ATENDENTE_ID=$(echo "$PRIMEIRO_SLOT" | jq -r '.atendenteId')
ATENDENTE_NOME=$(echo "$PRIMEIRO_SLOT" | jq -r '.atendenteNome')
info "Slot escolhido: ${SLOT_INICIO} com ${ATENDENTE_NOME} (id=$ATENDENTE_ID)"

# ── Cenário 5: criar agendamento ────────────────────────────────────────────
section "5. Criar agendamento"
SERVICO_VALOR=$(echo "$RESP_BODY" | jq -r 'length' >/dev/null; echo "0")
# Recupera valor via /servicos
api_call GET "/api/publico/clientes/unidades/$UNIDADE_SALAO_ID/servicos" "$TOKEN_SALAO"
SERVICO_VALOR=$(echo "$RESP_BODY" | jq -r ".[] | select(.id==$SERVICO_ID) | .valor")

PAYLOAD=$(cat <<EOF
{
  "clienteId": $CLIENTE_SALAO_ID,
  "unidadeId": $UNIDADE_SALAO_ID,
  "atendenteId": $ATENDENTE_ID,
  "dataHoraInicio": "$SLOT_INICIO",
  "formaPagamentoPreferida": "PIX",
  "servicos": [
    { "servicoId": $SERVICO_ID, "quantidade": 1, "valor": $SERVICO_VALOR }
  ]
}
EOF
)
api_call POST /api/publico/clientes/agendamentos "$TOKEN_SALAO" "$PAYLOAD"
assert_status 201 "POST /publico/clientes/agendamentos"
AGENDAMENTO_ID=$(echo "$RESP_BODY" | jq -r '.id // empty')
if [[ -n "$AGENDAMENTO_ID" ]]; then
  pass "Agendamento criado (id=$AGENDAMENTO_ID)"
else
  fail "Resposta do POST não trouxe id"
fi

# ── Cenário 6: listar meus agendamentos ─────────────────────────────────────
section "6. Listar meus agendamentos"
api_call GET /api/publico/clientes/meus-agendamentos "$TOKEN_SALAO"
assert_status 200 "GET /publico/clientes/meus-agendamentos"
MEUS_COUNT=$(echo "$RESP_BODY" | jq 'length')
if [[ "$MEUS_COUNT" -gt 0 ]]; then
  pass "Retornou $MEUS_COUNT agendamento(s)"
else
  fail "Lista vazia mesmo após criar — bug em validarPermissaoVisualizarAgendamento?"
fi
ENCONTROU=$(echo "$RESP_BODY" | jq --arg id "$AGENDAMENTO_ID" '[.[] | select(.id == ($id | tonumber))] | length')
if [[ "$ENCONTROU" == "1" ]]; then
  pass "Agendamento recém-criado aparece na lista"
else
  fail "Agendamento $AGENDAMENTO_ID não apareceu na lista"
fi

# ── Cenário 7: SEC — tentar acessar unidade de outro tenant ─────────────────
section "7. SEC: tentar acessar dados de outro tenant"

# Login como cliente Academia pra descobrir ID de uma unidade dela
api_call POST /api/publico/clientes/login "" \
  "{\"emailOuCpf\":\"$CLIENTE_ACAD_EMAIL\",\"senha\":\"$CLIENTE_ACAD_SENHA\"}"
if [[ "$RESP_STATUS" != "201" ]]; then
  warn "Login academia falhou (status=$RESP_STATUS) — pulando teste de cross-tenant"
  warn "Verifique se o seed foi executado pra criar cliente@academia.demo.com"
else
  TOKEN_ACAD=$(echo "$RESP_BODY" | jq -r '.token')
  api_call GET /api/publico/clientes/unidades "$TOKEN_ACAD"
  UNIDADE_ACAD_ID=$(echo "$RESP_BODY" | jq -r '.[0].id // empty')
  if [[ -n "$UNIDADE_ACAD_ID" && "$UNIDADE_ACAD_ID" != "null" ]]; then
    info "Unidade da Academia descoberta: id=$UNIDADE_ACAD_ID"
    # Agora tenta acessar com TOKEN_SALAO (deve dar 403)
    api_call GET "/api/publico/clientes/unidades/$UNIDADE_ACAD_ID/servicos" "$TOKEN_SALAO"
    if [[ "$RESP_STATUS" == "403" ]]; then
      pass "SEC: cliente do Salão recebeu 403 ao tentar ver serviços da Academia"
    else
      fail "SEC: cliente do Salão acessou serviços da Academia (status=$RESP_STATUS) — VAZAMENTO!"
    fi
    # Tenta horarios também
    api_call GET "/api/publico/clientes/horarios-disponiveis?unidadeId=$UNIDADE_ACAD_ID&servicoId=1&dataInicio=$HOJE&dataFim=$SEMANA" "$TOKEN_SALAO"
    if [[ "$RESP_STATUS" == "403" ]]; then
      pass "SEC: cliente do Salão recebeu 403 ao tentar ver horarios da Academia"
    else
      fail "SEC: cliente do Salão acessou horarios da Academia (status=$RESP_STATUS) — VAZAMENTO!"
    fi
    # Tenta CRIAR agendamento na unidade da Academia
    PAYLOAD_BAD=$(cat <<EOF
{
  "clienteId": $CLIENTE_SALAO_ID,
  "unidadeId": $UNIDADE_ACAD_ID,
  "atendenteId": 1,
  "dataHoraInicio": "${SLOT_INICIO}",
  "servicos": [{ "servicoId": 1, "quantidade": 1, "valor": 100.0 }]
}
EOF
)
    api_call POST /api/publico/clientes/agendamentos "$TOKEN_SALAO" "$PAYLOAD_BAD"
    if [[ "$RESP_STATUS" == "400" || "$RESP_STATUS" == "403" ]]; then
      pass "SEC: criar agendamento em unidade fora do tenant rejeitado (HTTP $RESP_STATUS)"
    else
      fail "SEC: cliente conseguiu criar agendamento cross-tenant (status=$RESP_STATUS)"
    fi
  else
    warn "Academia não tem unidades cadastradas — pulando cross-tenant test"
  fi
fi

# ── Cenário 8: cancelar agendamento ─────────────────────────────────────────
section "8. Cancelar agendamento"
if [[ -n "$AGENDAMENTO_ID" ]]; then
  api_call POST "/api/publico/clientes/agendamentos/$AGENDAMENTO_ID/cancelar" "$TOKEN_SALAO"
  if [[ "$RESP_STATUS" == "200" || "$RESP_STATUS" == "204" ]]; then
    pass "POST /agendamentos/$AGENDAMENTO_ID/cancelar (HTTP $RESP_STATUS)"
  else
    fail "Cancelamento falhou (HTTP $RESP_STATUS)"
  fi

  # Confirma que foi pra histórico
  api_call GET /api/publico/clientes/meus-cancelamentos "$TOKEN_SALAO"
  if [[ "$RESP_STATUS" == "200" ]]; then
    ENCONTRADO_CANCEL=$(echo "$RESP_BODY" | jq --arg id "$AGENDAMENTO_ID" '[.[] | select(.id == ($id | tonumber))] | length')
    if [[ "$ENCONTRADO_CANCEL" == "1" ]]; then
      pass "Agendamento cancelado apareceu em /meus-cancelamentos"
    else
      warn "Cancelado não apareceu no histórico — pode ser feature pendente"
    fi
  fi
fi

# ── Cenário 9: enviar reclamação ────────────────────────────────────────────
section "9. Enviar reclamação/feedback"
RECLAMACAO_PAYLOAD=$(cat <<EOF
{
  "mensagem": "Teste E2E automatizado — feedback do script",
  "unidadeId": $UNIDADE_SALAO_ID,
  "categoria": "ELOGIO",
  "nomeReclamante": "Script E2E",
  "emailReclamante": "e2e@test.com"
}
EOF
)
api_call POST /api/publico/reclamacoes "" "$RECLAMACAO_PAYLOAD"
assert_status 201 "POST /publico/reclamacoes (anônimo)"

# ── Resumo ──────────────────────────────────────────────────────────────────
echo
echo "${BOLD}═══════════════════════════════════════════${X}"
echo "${BOLD}Resumo:${X}  ${G}${PASS} pass${X}  ${R}${FAIL} fail${X}  ${Y}${WARN} warn${X}"
echo "${BOLD}═══════════════════════════════════════════${X}"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
