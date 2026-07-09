import { useMemo, useState, useEffect, useRef } from 'react'
import { format, addDays, isWithinInterval, startOfDay, endOfDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Plus } from 'lucide-react'
import { Agendamento } from '../../services/agendamentoService'
import ProfissionalPickerSheet, { PickerItem } from './ProfissionalPickerSheet'

/**
 * #164: WeekMode versão web — timeline horizontal com 7 colunas (dias) + eixo Y
 * de horas. Cores dos cards vêm do profissional selecionado, mesmo esquema do
 * Google Calendar. Só renderiza em ≥lg; abaixo o WeekMode mostra cards
 * verticais (design mobile atual mantido).
 */

export interface Prof {
  id: number
  nome: string
  countSemana?: number
}

interface Props {
  inicioSemana: Date
  fimSemana: Date
  agendamentos: Agendamento[]
  profissionaisAtivos: Prof[]
  profissionaisSelecionados: number[]
  onProfissionaisChange: (ids: number[]) => void
  onSlotClick?: (date: Date, atendenteId: number) => void
  onAgendamentoClick?: (a: Agendamento) => void
  /** Minutos por slot: 15, 30 ou 60. */
  granularidade?: 15 | 30 | 60
  onGranularidadeChange?: (g: 15 | 30 | 60) => void
  /** Hora inicial (default 7). */
  startHour?: number
  /** Hora final exclusiva (default 20). */
  endHour?: number
  /** Preenche a altura disponível (fit-to-viewport no desktop). */
  fillHeight?: boolean
}

// Paleta fixa por índice do prof selecionado (base do Google Cal).
const CORES = [
  { chip: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', card: 'bg-rose-50 border-rose-200 text-rose-900', barra: 'bg-rose-400' },
  { chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', card: 'bg-violet-50 border-violet-200 text-violet-900', barra: 'bg-violet-400' },
  { chip: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', card: 'bg-amber-50 border-amber-200 text-amber-900', barra: 'bg-amber-400' },
  { chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-200 text-emerald-900', barra: 'bg-emerald-400' },
]

export default function WeekTimeline({
  inicioSemana,
  fimSemana,
  agendamentos,
  profissionaisAtivos,
  profissionaisSelecionados,
  onProfissionaisChange,
  onSlotClick,
  onAgendamentoClick,
  granularidade = 30,
  onGranularidadeChange,
  startHour = 7,
  endHour = 20,
  fillHeight = false,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i)),
    [inicioSemana]
  )

  const totalMinutes = (endHour - startHour) * 60

  // fillHeight: mede o corpo e calcula pxPerMin pra caber na altura da tela.
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

  const pxPerMinBase = granularidade === 15 ? 1.4 : granularidade === 30 ? 1.0 : 0.7
  const pxPerMin = fillHeight && bodyH > 0 ? bodyH / totalMinutes : pxPerMinBase
  const totalHeight = fillHeight && bodyH > 0 ? bodyH : totalMinutes * pxPerMinBase
  const slotsPorDia = totalMinutes / granularidade
  const startTotalMin = startHour * 60
  const endTotalMin = endHour * 60

  const hours = useMemo(() => {
    const arr: number[] = []
    for (let h = startHour; h < endHour; h++) arr.push(h)
    return arr
  }, [startHour, endHour])

  // Índice → cor do prof
  const corDoProf = (atendenteId: number): typeof CORES[number] => {
    const idx = profissionaisSelecionados.indexOf(atendenteId)
    return idx >= 0 ? CORES[idx % CORES.length] : CORES[0]
  }

  // Filtra agendamentos da semana + só dos profs selecionados (efetivo do item)
  const agsDaSemana = useMemo(
    () =>
      agendamentos.filter((a) => {
        if (!a.dataHoraInicio) return false
        const dt = new Date(a.dataHoraInicio)
        return isWithinInterval(dt, { start: startOfDay(inicioSemana), end: endOfDay(fimSemana) })
      }),
    [agendamentos, inicioSemana, fimSemana]
  )

  // Achata em items virtuais (mesma técnica do DayMode #155)
  interface Item {
    agendamento: Agendamento
    inicio: Date
    fim: Date
    atendenteId: number
    servicoNome: string
    cliente: string
  }
  const itensPorDia = useMemo(() => {
    const mapa = new Map<string, Item[]>()
    dias.forEach((d) => mapa.set(format(d, 'yyyy-MM-dd'), []))
    agsDaSemana.forEach((a) => {
      const servicos = (a.servicos ?? []) as any[]
      if (servicos.length === 0) return
      servicos.forEach((s) => {
        const atendenteEfetivo = (s.atendenteId as number | undefined) ?? a.atendenteId
        if (!atendenteEfetivo || !profissionaisSelecionados.includes(atendenteEfetivo)) return

        const inicioStr = (s.dataHoraInicio as string | undefined) ?? a.dataHoraInicio
        const fimStr = (s.dataHoraFim as string | undefined) ?? a.dataHoraFim
        if (!inicioStr) return
        const inicio = new Date(inicioStr)
        const fim = fimStr ? new Date(fimStr) : new Date(inicio.getTime() + 30 * 60_000)
        const key = format(inicio, 'yyyy-MM-dd')
        if (!mapa.has(key)) return
        mapa.get(key)!.push({
          agendamento: a,
          inicio,
          fim,
          atendenteId: atendenteEfetivo,
          servicoNome: s.nomeServico ?? s.servico?.nome ?? s.descricao ?? 'Serviço',
          cliente: a.cliente?.nome ?? `Cliente #${a.clienteId}`,
        })
      })
    })
    return mapa
  }, [agsDaSemana, dias, profissionaisSelecionados])

  const pickerItems = useMemo<PickerItem[]>(
    () =>
      profissionaisAtivos.map((p) => ({
        id: p.id,
        nome: p.nome,
        count: p.countSemana,
      })),
    [profissionaisAtivos]
  )

  return (
    <div className={`hidden lg:flex bg-white rounded-2xl border border-slate-200 ${fillHeight ? 'h-full flex-col overflow-hidden' : 'lg:flex-col'}`}>
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-200 flex-shrink-0">
        {/* Chips de profs selecionados */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Users className="h-3.5 w-3.5" />
            Profissionais ({profissionaisSelecionados.length}/{profissionaisAtivos.length})
          </span>
          {profissionaisSelecionados.map((id, idx) => {
            const p = profissionaisAtivos.find((x) => x.id === id)
            if (!p) return null
            const cor = CORES[idx % CORES.length]
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-full text-xs font-semibold ${cor.chip}`}
              >
                <span className={`h-5 w-5 rounded-full ${cor.dot} text-white flex items-center justify-center text-[10px] font-bold`}>
                  {p.nome.charAt(0).toUpperCase()}
                </span>
                {p.nome}
                <button
                  type="button"
                  className="ml-0.5 opacity-70 hover:opacity-100"
                  onClick={() => onProfissionaisChange(profissionaisSelecionados.filter((x) => x !== id))}
                  aria-label="Remover"
                >
                  ×
                </button>
              </span>
            )
          })}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-dashed border-violet-300 text-violet-700 hover:bg-violet-50 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Selecionar profissionais
          </button>
        </div>

        {/* Granularidade */}
        {onGranularidadeChange && (
          <div className="ml-auto inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
            {([15, 30, 60] as const).map((g) => {
              const ativo = g === granularidade
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onGranularidadeChange(g)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    ativo ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {g}m
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Header dos dias */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="border-r border-slate-200" />
        {dias.map((d) => {
          const hoje = isToday(d)
          const selecionado = false // headers não têm seleção ativa aqui
          return (
            <div
              key={d.toISOString()}
              className={`px-2 py-2 text-center border-r border-slate-200 last:border-r-0 ${
                selecionado ? 'bg-violet-50' : ''
              }`}
            >
              <p className={`text-[10px] font-bold uppercase ${hoje ? 'text-violet-700' : 'text-slate-500'}`}>
                {format(d, 'EEE', { locale: ptBR }).slice(0, 3)}
              </p>
              <p className={`text-lg font-black ${hoje ? 'text-violet-700' : 'text-slate-900'}`}>
                {format(d, 'd')}
              </p>
              {profissionaisSelecionados.length > 0 && (
                <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                  {profissionaisSelecionados.map((id, idx) => {
                    const p = profissionaisAtivos.find((x) => x.id === id)
                    if (!p) return null
                    const cor = CORES[idx % CORES.length]
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-0.5 text-[10px] text-slate-600"
                        title={p.nome}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${cor.dot}`} />
                        {p.nome.split(' ')[0]}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Corpo — wrapper mede a altura disponível (fillHeight); grid usa ela */}
      <div ref={bodyRef} className={fillHeight ? 'flex-1 min-h-0 overflow-hidden' : ''}>
      <div
        className="grid grid-cols-[60px_repeat(7,1fr)] relative"
        style={{ height: `${totalHeight}px` }}
      >
        {/* Eixo Y */}
        <div className="relative border-r border-slate-200">
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

        {/* Colunas dos dias */}
        {dias.map((dia) => {
          const key = format(dia, 'yyyy-MM-dd')
          const itens = itensPorDia.get(key) ?? []
          const hoje = isToday(dia)
          return (
            <div
              key={key}
              className={`relative border-r border-slate-200 last:border-r-0 ${
                hoje ? 'bg-violet-50/30' : ''
              }`}
            >
              {/* Linhas de hora */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-slate-100"
                  style={{ top: `${(h - startHour) * 60 * pxPerMin}px` }}
                />
              ))}

              {/* Slots clicáveis */}
              {Array.from({ length: slotsPorDia }).map((_, i) => {
                const slotStart = startTotalMin + i * granularidade
                const d = new Date(dia)
                d.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!onSlotClick || profissionaisSelecionados.length === 0) return
                      // Slot vazio abre wizard pra 1º prof selecionado (mais simples pra web)
                      onSlotClick(d, profissionaisSelecionados[0])
                    }}
                    className="absolute left-0 right-0 z-0 hover:bg-violet-50/60 active:bg-violet-100/60 transition"
                    style={{
                      top: `${i * granularidade * pxPerMin}px`,
                      height: `${granularidade * pxPerMin}px`,
                    }}
                    aria-label={`Criar agendamento ${format(d, 'HH:mm')}`}
                  />
                )
              })}

              {/* Cards de agendamento */}
              {itens.map((it, idx) => {
                const minStart = it.inicio.getHours() * 60 + it.inicio.getMinutes()
                const minEnd = it.fim.getHours() * 60 + it.fim.getMinutes()
                if (minEnd <= startTotalMin || minStart >= endTotalMin) return null
                const top = (Math.max(minStart, startTotalMin) - startTotalMin) * pxPerMin
                const height = Math.max(
                  (Math.min(minEnd, endTotalMin) - Math.max(minStart, startTotalMin)) * pxPerMin,
                  24
                )
                const cor = corDoProf(it.atendenteId)
                return (
                  <button
                    key={`${it.agendamento.id}-${idx}`}
                    type="button"
                    onClick={() => onAgendamentoClick?.(it.agendamento)}
                    className={`absolute left-1 right-1 z-10 text-left rounded-lg border ${cor.card} overflow-hidden flex hover:shadow-md transition`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <div className={`w-1 ${cor.barra} flex-shrink-0`} aria-hidden />
                    <div className="flex-1 min-w-0 px-1.5 py-1">
                      <p className="text-[11px] font-bold leading-tight truncate">{it.cliente}</p>
                      <p className="text-[10px] leading-tight truncate opacity-80">{it.servicoNome}</p>
                      {height > 40 && (
                        <p className="text-[10px] leading-tight opacity-70 mt-0.5">
                          {format(it.inicio, 'HH:mm')} – {format(it.fim, 'HH:mm')}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      </div>

      <ProfissionalPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        items={pickerItems}
        initialSelectedIds={profissionaisSelecionados}
        maxSelected={4}
        onConfirm={(ids) => onProfissionaisChange(ids)}
        title="Selecionar profissionais (máx 4)"
      />
    </div>
  )
}
