import { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  endOfDay,
  startOfDay,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react'
import { agendamentoService, Agendamento } from '../../services/agendamentoService'
import { atendenteService } from '../../services/atendenteService'
import { dotClass } from '../../utils/statusAgendamento'
import WeekTimeline, { Prof } from '../../components/agendamentos/WeekTimeline'
import { useIsWebLayout } from '../../hooks/useIsWebLayout'
import NovoAgendamentoSheet from '../../components/agendamentos/NovoAgendamentoSheet'
import DetalhesSheet from '../../components/agendamentos/DetalhesSheet'

interface Props {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onJumpToDayMode: (date: Date) => void
}

/**
 * Modo Semana — 7 dias.
 * Mobile (<lg): stack vertical, cada dia é um card com contagem + 3 primeiros
 *               agendamentos. Tap → vai pro DayMode daquele dia.
 * Web (≥lg, #164): timeline horizontal — 7 colunas dia + eixo Y hora +
 *                  cores por profissional + granularidade 15/30/60m.
 */
export default function WeekMode({ selectedDate, onDateChange, onJumpToDayMode }: Props) {
  const isWeb = useIsWebLayout()
  const inicioSemana = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const fimSemana = addDays(inicioSemana, 6)

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
  })

  const { data: atendentes = [] } = useQuery({
    queryKey: ['atendentes'],
    queryFn: atendenteService.listarTodos,
  })

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i)), [inicioSemana])

  const agendamentosPorDia = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>()
    dias.forEach((d) => mapa.set(format(d, 'yyyy-MM-dd'), []))
    agendamentos.forEach((a) => {
      if (!a.dataHoraInicio) return
      const dt = new Date(a.dataHoraInicio)
      if (!isWithinInterval(dt, { start: startOfDay(inicioSemana), end: endOfDay(fimSemana) })) return
      const key = format(dt, 'yyyy-MM-dd')
      const lista = mapa.get(key)
      if (lista) lista.push(a)
    })
    mapa.forEach((lista) =>
      lista.sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())
    )
    return mapa
  }, [agendamentos, dias, inicioSemana, fimSemana])

  const totalSemana = useMemo(
    () => Array.from(agendamentosPorDia.values()).reduce((acc, lista) => acc + lista.length, 0),
    [agendamentosPorDia]
  )

  // ── #164 web: profissionais ativos + selecionados + granularidade ─────────
  const profissionaisAtivos = useMemo<Prof[]>(() => {
    const contagem = new Map<number, number>()
    // Conta cada item da semana (multi-prof #155)
    Array.from(agendamentosPorDia.values()).flat().forEach((a) => {
      const items = (a.servicos ?? []) as any[]
      if (items.length === 0) {
        if (a.atendenteId) contagem.set(a.atendenteId, (contagem.get(a.atendenteId) ?? 0) + 1)
        return
      }
      items.forEach((it) => {
        const eff = (it.atendenteId as number | undefined) ?? a.atendenteId
        if (eff) contagem.set(eff, (contagem.get(eff) ?? 0) + 1)
      })
    })
    return atendentes
      .filter((a) => a.ativo !== false)
      .map((a) => ({
        id: (a.id ?? a.usuarioId) as number,
        nome: (a.nomeUsuario || `Profissional #${a.id}`).split(' ')[0],
        countSemana: contagem.get((a.id ?? a.usuarioId) as number) ?? 0,
      }))
      .filter((p) => typeof p.id === 'number')
  }, [atendentes, agendamentosPorDia])

  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<number[]>([])
  const touchedRef = useRef(false)

  // Auto-seleção inicial: top 2 por count. Mesmo padrão do DayMode.
  useEffect(() => {
    if (touchedRef.current || profissionaisAtivos.length === 0) return
    const top = [...profissionaisAtivos]
      .sort((a, b) => (b.countSemana ?? 0) - (a.countSemana ?? 0) || a.nome.localeCompare(b.nome))
      .slice(0, 2)
      .map((p) => p.id)
    if (
      top.length !== profissionaisSelecionados.length ||
      !top.every((id, i) => id === profissionaisSelecionados[i])
    ) {
      setProfissionaisSelecionados(top)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profissionaisAtivos])

  const handleProfsChange = (ids: number[]) => {
    touchedRef.current = true
    setProfissionaisSelecionados(ids)
  }

  const [granularidade, setGranularidade] = useState<15 | 30 | 60>(30)
  const [novoSheetOpen, setNovoSheetOpen] = useState(false)
  const [novoInitial, setNovoInitial] = useState<{ date: Date; atendenteId?: number } | null>(null)
  const [detalhesId, setDetalhesId] = useState<number | null>(null)

  const handleSlotClick = (date: Date, atendenteId: number) => {
    setNovoInitial({ date, atendenteId })
    setNovoSheetOpen(true)
  }
  const handleAgendamentoClick = (a: Agendamento) => {
    if (a.id) setDetalhesId(a.id)
  }

  return (
    <div className={isWeb ? 'h-full flex flex-col gap-3' : 'space-y-4'}>
      {/* Header semana — comum a mobile+desktop */}
      <div className={`flex items-center gap-2 ${isWeb ? 'flex-shrink-0' : ''}`}>
        <button
          onClick={() => onDateChange(addDays(selectedDate, -7))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {format(inicioSemana, "d 'de' MMM", { locale: ptBR })} – {format(fimSemana, "d 'de' MMM, yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs text-slate-500">
            {totalSemana} agendamento{totalSemana !== 1 ? 's' : ''} na semana
          </p>
        </div>

        <button
          onClick={() => onDateChange(addDays(selectedDate, 7))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          aria-label="Próxima semana"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <button
          onClick={() => onDateChange(new Date())}
          className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
          title="Esta semana"
        >
          <Calendar className="h-3.5 w-3.5" />
          Hoje
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando semana...</div>
      ) : (
        <div className={isWeb ? 'flex-1 min-h-0 flex flex-col' : ''}>
          {/* Mobile: layout vertical clássico (mantido) */}
          <ul className="space-y-2 lg:hidden">
            {dias.map((dia) => {
              const lista = agendamentosPorDia.get(format(dia, 'yyyy-MM-dd')) ?? []
              const hoje = isToday(dia)
              const isSelected = isSameDay(dia, selectedDate)
              return (
                <li key={dia.toISOString()}>
                  <button
                    onClick={() => onJumpToDayMode(dia)}
                    className={`w-full text-left bg-white border rounded-2xl p-4 hover:shadow-sm transition ${
                      isSelected ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-10 w-10 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${
                            hoje ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <p className="text-[10px] uppercase font-bold leading-none">
                            {format(dia, 'EEE', { locale: ptBR }).slice(0, 3)}
                          </p>
                          <p className="text-sm font-bold leading-none mt-0.5">{format(dia, 'd')}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 capitalize truncate">
                            {format(dia, 'EEEE', { locale: ptBR })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lista.length === 0
                              ? 'Sem agendamentos'
                              : `${lista.length} agendamento${lista.length !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-400 -rotate-90 flex-shrink-0" />
                    </div>

                    {lista.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {lista.slice(0, 3).map((a) => (
                          <li key={a.id} className="flex items-center gap-2 text-xs text-slate-600">
                            <span className={`h-2 w-2 rounded-full ${dotClass(a.status)}`} />
                            <span className="font-mono font-semibold text-slate-900">
                              {format(new Date(a.dataHoraInicio), 'HH:mm')}
                            </span>
                            <span className="truncate">
                              {a.cliente?.nome ?? `Cliente #${a.clienteId}`}
                            </span>
                          </li>
                        ))}
                        {lista.length > 3 && (
                          <li className="text-[11px] text-violet-700 font-semibold pt-0.5">
                            + {lista.length - 3} agendamento{lista.length - 3 !== 1 ? 's' : ''}…
                          </li>
                        )}
                      </ul>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Desktop (#164): timeline horizontal */}
          <WeekTimeline
            inicioSemana={inicioSemana}
            fimSemana={fimSemana}
            agendamentos={agendamentos}
            profissionaisAtivos={profissionaisAtivos}
            profissionaisSelecionados={profissionaisSelecionados}
            onProfissionaisChange={handleProfsChange}
            granularidade={granularidade}
            onGranularidadeChange={setGranularidade}
            onSlotClick={handleSlotClick}
            onAgendamentoClick={handleAgendamentoClick}
            fillHeight={isWeb}
          />
        </div>
      )}

      {/* Sheets — reusa mesmos do DayMode */}
      <NovoAgendamentoSheet
        isOpen={novoSheetOpen}
        onClose={() => {
          setNovoSheetOpen(false)
          setNovoInitial(null)
        }}
        initialDateTime={novoInitial?.date}
        initialAtendenteId={novoInitial?.atendenteId}
      />
      <DetalhesSheet agendamentoId={detalhesId} onClose={() => setDetalhesId(null)} />
    </div>
  )
}
