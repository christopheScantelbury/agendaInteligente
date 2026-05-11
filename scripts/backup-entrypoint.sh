#!/bin/sh
# Entrypoint do container 'backup' (imagem postgres-alpine).
# Roda um loop simples: aguarda até a próxima ocorrência do horário
# configurado (BACKUP_CRON_HOUR, default 03:00 UTC) e executa o backup.
#
# Optei por loop simples ao invés de crond para evitar ter de empacotar
# o cron, manter logs em stdout, e tornar o agendamento óbvio.

set -eu

BACKUP_CRON_HOUR="${BACKUP_CRON_HOUR:-3}"   # 0–23 UTC
BACKUP_CRON_MIN="${BACKUP_CRON_MIN:-0}"     # 0–59
RUN_ON_START="${RUN_ON_START:-false}"       # true = roda 1x ao subir

if [ "$RUN_ON_START" = "true" ]; then
  echo "[backup-entrypoint] RUN_ON_START=true — executando backup imediato"
  /scripts/backup.sh || echo "[backup-entrypoint] backup inicial falhou (seguindo)"
fi

while true; do
  NOW_H="$(date -u +%H)"
  NOW_M="$(date -u +%M)"
  NOW_SEC="$(date -u +%S)"

  # Segundos até o próximo ${BACKUP_CRON_HOUR}:${BACKUP_CRON_MIN} UTC
  TARGET_SEC=$(( (BACKUP_CRON_HOUR * 3600) + (BACKUP_CRON_MIN * 60) ))
  NOW_TOTAL=$(( (NOW_H * 3600) + (NOW_M * 60) + NOW_SEC ))
  DELTA=$(( TARGET_SEC - NOW_TOTAL ))
  if [ "$DELTA" -le 0 ]; then
    DELTA=$(( DELTA + 86400 ))
  fi

  echo "[backup-entrypoint] $(date -u +%FT%TZ) próximo backup em ${DELTA}s (alvo ${BACKUP_CRON_HOUR}:${BACKUP_CRON_MIN} UTC)"
  sleep "$DELTA"

  /scripts/backup.sh || echo "[backup-entrypoint] backup falhou — tentará no próximo ciclo"
done
