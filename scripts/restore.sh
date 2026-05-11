#!/bin/sh
# Restore do Postgres do agendaInteligente a partir de um dump.
#
# Uso:
#   ./scripts/restore.sh <arquivo.dump>
#   ./scripts/restore.sh /backups/agenda_inteligente_2026-05-11_03-00-00.dump
#
# ATENÇÃO: drop + recreate do schema 'public'. Todos os dados atuais
# do banco-alvo serão perdidos. Confirme antes de rodar em produção.
#
# Variáveis (mesmas do backup.sh):
#   PG_HOST, PG_PORT, PG_DB, PG_USER, PGPASSWORD

set -eu

if [ $# -lt 1 ]; then
  echo "uso: $0 <arquivo.dump>" >&2
  exit 2
fi

DUMP="$1"
if [ ! -f "$DUMP" ]; then
  echo "[restore] arquivo não encontrado: $DUMP" >&2
  exit 1
fi

PG_HOST="${PG_HOST:-postgres}"
PG_PORT="${PG_PORT:-5432}"
PG_DB="${PG_DB:-agenda_inteligente}"
PG_USER="${PG_USER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

echo "[restore] $(date -u +%FT%TZ) restaurando ${DUMP} em ${PG_HOST}:${PG_PORT}/${PG_DB}"
echo "[restore] AVISO: schema 'public' será recriado — dados atuais serão perdidos."

psql \
  --host="$PG_HOST" \
  --port="$PG_PORT" \
  --username="$PG_USER" \
  --dbname="$PG_DB" \
  --set=ON_ERROR_STOP=1 \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

pg_restore \
  --host="$PG_HOST" \
  --port="$PG_PORT" \
  --username="$PG_USER" \
  --dbname="$PG_DB" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$DUMP"

echo "[restore] $(date -u +%FT%TZ) concluído"
