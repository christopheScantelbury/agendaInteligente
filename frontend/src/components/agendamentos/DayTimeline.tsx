import { useMemo, useEffect, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { Agendamento } from '../../services/agendamentoService'

const STATUS_BARRA: Record<string, string> = {
  AGENDADO: 'bg-slate-900',
  CONFIRMADO: 'bg-blue-500',
  EM_ANDAMENTO: 'bg-blue-500',
  PROCEDIMENTO_FIM: 'bg-blue-600',
  CONCLUIDO: 'bg-emerald-500',
  FINALIZADO: 'bg-emerald-500',
  CANCELADO: 'bg-red-500',
  NO_SHOW: 'bg-orange-500',
}

const STATUS_BG: Record<string, string> = {
  AGENDADO: 'bg-slate-50 border-slate-200',
  CONFIRMADO: 'bg-blue-50 border-blue-200',
  EM_ANDAMENTO: 'bg-blue-50 border-blue-200',
  PROCEDIMENTO_FIM: 'bg-blue-50 border-blue-200',
  CONCLUIDO: 'bg-emerald-50 border-emerald-200',
  FINALIZADO: 'bg-emerald-50 border-emerald-200',
  CANCELADO: 'bg-red-50 border-red-200',
  NO_SHOW: 'bg-orange-50 border-orange-200',
}

export interface ColunaProfissional {
  id: number
  nome: string
  agendamentos: Agendamento[]
}

interface Props {
  selectedDate: Date
  colunas: ColunaProfissional[]
  /** Hora inicial do range (default 7) */
  startHour?: number
  /** Hora final do range — exclusiva (default 22) */
  endHour?: number
  /** Pixels por minuto. Default 1.2 (ex.: 30min = 36px) */
  pxPerMin?: number
  /** Granularidade de slots clicáveis em minutos. Default 30. */
  slotMinutes?: number
  onSlotClick?: (date: Date, atendenteId: number) => void
  onAgendamentoClick?: (a: Agendamento) => void
}

/**
 * Timeline vertical com colunas por profissional.
 *
 * - Eixo Y: horas (configurável). Slots vazios clicáveis na granularidade configurada.
 * - Cards posicionados por dataHoraInicio + duração (fallback 60min).
 * - "Now line" vermelha quando selectedDate é hoje.
 * - Layout mobile-first: até 2 colunas cabem em 430px (40px de label + 195px cada).
 *
 * Usado pelo DayMode (issue #156).
 */
export default function DayTimeline({
  selectedDate,
  colunas,
  startHour = 7,
  endHour = 22,
  pxPerMin = 1.2,
  slotMinutes = 30,
  onSlotClick,
  onAgendamentoClick,
}: Props) {
  const totalMinutes = (endHour - startHour) * 60
  const totalHeight = totalMinutes * pxPerMin

  const hours = useMemo(() => {
    const arr: number[] = []
    for (let h = startHour; h < endHour; h++) arr.push(h)
    return arr
  }, [startHour, endHour])

  const slotsPerColumn = totalMinutes / slotMinutes

  // Now line — atualiza a cada minuto
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const isHoje = isSameDay(selectedDate, now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startTotalMin = startHour * 60
  const endTotalMin = endHour * 60
  const nowInRange = isHoje && nowMinutes >= startTotalMin && nowMinutes < endTotalMin
  const nowOffset = (nowMinutes - startTotalMin) * pxPerMin

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header com nomes dos profissionais */}
      <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
        <div className="w-10 flex-shrink-0" />
        {colunas.map((col) => (
          <div
            key={col.id}
            className="flex-1 min-w-0 px-2 py-2 text-center border-l border-slate-200"
          >
            <p className="text-xs font-bold text-slate-700 truncate">{col.nome}</p>
            <p className="text-[10px] text-slate-400">
              {col.agendamentos.length} agendamento{col.agendamentos.length !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Corpo */}
      <div className="flex relative overflow-x-auto">
        {/* Eixo de horas */}
        <div className="w-10 flex-shrink-0 relative" style={{ height: `${totalHeight}px` }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1 text-[10px] font-medium text-slate-400 -translate-y-1.5"
              style={{ top: `${(h - startHour) * 60 * pxPerMin}px` }}
            >
              {String(h).padStart(2, '0')}h
            </div>
          ))}
        </div>

        {/* Colunas */}
        {colunas.map((col) => (
          <div
            key={col.id}
            className="flex-1 min-w-0 relative border-l border-slate-100"
            style={{ height: `${totalHeight}px` }}
          >
            {/* Linhas de hora */}
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: `${(h - startHour) * 60 * pxPerMin}px` }}
              />
            ))}

            {/* Slots clicáveis (vazios). Empilhados; agendamentos cobrem por z-index. */}
            {Array.from({ length: slotsPerColumn }).map((_, i) => {
              const slotStart = startTotalMin + i * slotMinutes
              const date = new Date(selectedDate)
              date.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSlotClick?.(date, col.id)}
                  className="absolute left-0 right-0 z-0 hover:bg-violet-50/60 active:bg-violet-100/60 transition group"
                  style={{
                    top: `${i * slotMinutes * pxPerMin}px`,
                    height: `${slotMinutes * pxPerMin}px`,
                  }}
                  aria-label={`Criar agendamento ${format(date, 'HH:mm')}`}
                >
                  <span className="absolute inset-1 rounded-md border border-dashed border-transparent group-hover:border-violet-300 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-violet-600 opacity-0 group-hover:opacity-100">
                      + {format(date, 'HH:mm')}
                    </span>
                  </span>
                </button>
              )
            })}

            {/* Cards de agendamento */}
            {col.agendamentos.map((a) => {
              if (!a.dataHoraInicio) return null
              const inicio = new Date(a.dataHoraInicio)
              const fim = a.dataHoraFim ? new Date(a.dataHoraFim) : null
              const minStart = inicio.getHours() * 60 + inicio.getMinutes()
              const minEnd = fim ? fim.getHours() * 60 + fim.getMinutes() : minStart + 60
              if (minEnd <= startTotalMin || minStart >= endTotalMin) return null

              const clampedStart = Math.max(minStart, startTotalMin)
              const clampedEnd = Math.min(minEnd, endTotalMin)
              const top = (clampedStart - startTotalMin) * pxPerMin
              const height = Math.max((clampedEnd - clampedStart) * pxPerMin, 22)
              const barra = STATUS_BARRA[a.status ?? ''] ?? 'bg-amber-400'
              const bg = STATUS_BG[a.status ?? ''] ?? 'bg-amber-50 border-amber-200'
              const clienteNome = a.cliente?.nome ?? `Cliente #${a.clienteId}`
              const servicos: any[] = a.servicos ?? []
              const servicosLabel = servicos
                .map((s) => s.servico?.nome ?? s.descricao ?? '')
                .filter(Boolean)
                .join(' · ')

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onAgendamentoClick?.(a)}
                  className={`absolute left-1 right-1 z-10 text-left rounded-lg border ${bg} overflow-hidden flex hover:shadow-sm transition`}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <div className={`w-1 ${barra} flex-shrink-0`} aria-hidden />
                  <div className="flex-1 min-w-0 px-1.5 py-1">
                    <p className="text-[10px] font-bold text-slate-900 leading-tight">
                      {format(inicio, 'HH:mm')}
                      {fim && ` – ${format(fim, 'HH:mm')}`}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">
                      {clienteNome}
                    </p>
                    {height > 40 && servicosLabel && (
                      <p className="text-[10px] text-slate-500 truncate leading-tight">
                        {servicosLabel}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}

            {/* Now line */}
            {nowInRange && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{ top: `${nowOffset}px` }}
              >
                <div className="h-px bg-red-500" />
                <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
