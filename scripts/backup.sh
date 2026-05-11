#!/bin/sh
# Backup do Postgres do agendaInteligente.
#
# Uso:
#   ./scripts/backup.sh
#
# Variáveis (com defaults para o docker-compose local):
#   PG_HOST       (default: postgres)
#   PG_PORT       (default: 5432)
#   PG_DB         (default: agenda_inteligente)
#   PG_USER       (default: postgres)
#   PGPASSWORD    (default: postgres)         — senha do Postgres
#   BACKUP_DIR    (default: /backups)         — onde salvar
#   RETENTION     (default: 14)               — quantos dumps manter
#
# Saída: ${BACKUP_DIR}/agenda_inteligente_YYYY-MM-DD_HH-MM-SS.dump
# Formato: pg_dump --format=custom (restaurável via pg_restore).
#
# Idempotente: rodar duas vezes no mesmo segundo cria dois arquivos
# distintos (timestamp inclui segundos), mas a retenção limpa.

set -eu

PG_HOST="${PG_HOST:-postgres}"
PG_PORT="${PG_PORT:-5432}"
PG_DB="${PG_DB:-agenda_inteligente}"
PG_USER="${PG_USER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION="${RETENTION:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y-%m-%d_%H-%M-%S)"
OUT="${BACKUP_DIR}/agenda_inteligente_${TIMESTAMP}.dump"
TMP="${OUT}.partial"

echo "[backup] $(date -u +%FT%TZ) iniciando dump de ${PG_DB} em ${PG_HOST}:${PG_PORT}"

pg_dump \
  --host="$PG_HOST" \
  --port="$PG_PORT" \
  --username="$PG_USER" \
  --dbname="$PG_DB" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$TMP"

# Só promove o arquivo final se o dump terminou com sucesso —
# evita deixar arquivos truncados em disco.
mv "$TMP" "$OUT"

SIZE="$(wc -c < "$OUT")"
echo "[backup] $(date -u +%FT%TZ) ok: $OUT (${SIZE} bytes)"

# Retenção: mantém os ${RETENTION} mais recentes, apaga o resto.
ls -1t "${BACKUP_DIR}"/agenda_inteligente_*.dump 2>/dev/null \
  | tail -n +$((RETENTION + 1)) \
  | while IFS= read -r old; do
      echo "[backup] removendo antigo: $old"
      rm -f "$old"
    done

echo "[backup] $(date -u +%FT%TZ) concluído"
