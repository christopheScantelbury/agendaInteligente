import { useMemo, useEffect, useState, useRef } from 'react'
import { format, isSameDay } from 'date-fns'
import { Agendamento } from '../../services/agendamentoService'
import { barClass, cardClass } from '../../utils/statusAgendamento'

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
  /** Pixels por minuto. Default 1.2 (ex.: 30min = 36px). Ignorado se fillHeight. */
  pxPerMin?: number
  /** Granularidade de slots clicáveis em minutos. Default 30. */
  slotMinutes?: number
  /** Quando true, a timeline mede a altura disponível e calcula pxPerMin pra
   *  caber exatamente na tela (fit-to-viewport no desktop). */
  fillHeight?: boolean
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
  pxPerMin: pxPerMinProp = 1.2,
  slotMinutes = 30,
  fillHeight = false,
  onSlotClick,
  onAgendamentoClick,
}: Props) {
  const totalMinutes = (endHour - startHour) * 60

  // fillHeight: mede o corpo e calcula pxPerMin pra caber na altura disponível.
  const bodyRef = useRef<HTMLDivElement>(null)
  const [bodyH, setBodyH] = useState(0)
  useEffect(() => {
    if (!fillHeight) return
    const el = bodyRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0
      if (h > 0) setBodyH(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fillHeight])

  // pxPerMin efetivo: quando fillHeight e já medimos, distribui a altura toda.
  const pxPerMin = fillHeight && bodyH > 0 ? bodyH / totalMinutes : pxPerMinProp
  const totalHeight = fillHeight && bodyH > 0 ? bodyH : totalMinutes * pxPerMinProp

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
    <div className={`bg-white rounded-2xl border border-slate-200 ${fillHeight ? 'h-full flex flex-col overflow-hidden' : ''}`}>
      {/* Header com nomes dos profissionais */}
      <div className={`flex border-b border-slate-200 bg-slate-50 z-10 rounded-t-2xl ${fillHeight ? 'flex-shrink-0' : 'sticky top-0'}`}>
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
      <div ref={bodyRef} className={`flex relative overflow-x-auto ${fillHeight ? 'flex-1 min-h-0 overflow-y-hidden' : ''}`}>
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
              const height = Math.max((clampedEnd - clampedStart) * pxPerMin, 26)
              const barra = barClass(a.status)
              const bg = cardClass(a.status)
              const clienteNome = a.cliente?.nome ?? `Cliente #${a.clienteId}`
              const servicos: any[] = a.servicos ?? []
              const servicosLabel = servicos
                .map((s: any) => s.nomeServico ?? s.servico?.nome ?? s.descricao ?? '')
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
                  <div className={`w-1.5 ${barra} flex-shrink-0`} aria-hidden />
                  <div className="flex-1 min-w-0 px-1.5 py-0.5">
                    {/* Cliente em destaque — é o "o que é" do agendamento */}
                    <p className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                      {clienteNome}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate leading-tight">
                      {format(inicio, 'HH:mm')}
                      {fim && `–${format(fim, 'HH:mm')}`}
                      {servicosLabel && ` · ${servicosLabel}`}
                    </p>
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
