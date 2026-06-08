import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  getDay,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { agendamentoService } from '../../services/agendamentoService'
import { dotClass } from '../../utils/statusAgendamento'

interface Props {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onJumpToDayMode: (date: Date) => void
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

// #151: paleta unificada — usar helper compartilhado statusAgendamento.

/**
 * Modo Mês — grid 7×N. Cada dia mostra contagem como número e até 3 dots de status.
 * Tap em dia → vai pro DayMode daquele dia.
 * Mobile-first: cell ~44px (toque confortável).
 */
export default function MonthMode({ selectedDate, onDateChange, onJumpToDayMode }: Props) {
  const inicioMes = startOfMonth(selectedDate)
  const fimMes = endOfMonth(selectedDate)

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
  })

  // Calcula o calendário (com dias do mês anterior pra completar a 1ª semana)
  const cells = useMemo(() => {
    const daysOfMonth = eachDayOfInterval({ start: inicioMes, end: fimMes })
    const firstDayOfWeek = getDay(inicioMes) // 0 = Domingo
    const lead: Date[] = []
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(inicioMes)
      d.setDate(d.getDate() - (i + 1))
      lead.push(d)
    }
    // trailing pra completar múltiplo de 7
    const total = lead.length + daysOfMonth.length
    const trailingCount = (7 - (total % 7)) % 7
    const trailing: Date[] = []
    for (let i = 1; i <= trailingCount; i++) {
      const d = new Date(fimMes)
      d.setDate(d.getDate() + i)
      trailing.push(d)
    }
    return [...lead, ...daysOfMonth, ...trailing]
  }, [inicioMes, fimMes])

  const agendamentosPorDia = useMemo(() => {
    const mapa = new Map<string, Array<{ status?: string }>>()
    agendamentos.forEach((a) => {
      if (!a.dataHoraInicio) return
      const key = format(new Date(a.dataHoraInicio), 'yyyy-MM-dd')
      const lista = mapa.get(key) ?? []
      lista.push({ status: a.status })
      mapa.set(key, lista)
    })
    return mapa
  }, [agendamentos])

  const totalMes = useMemo(() => {
    let count = 0
    agendamentosPorDia.forEach((lista, key) => {
      const d = new Date(key + 'T00:00:00')
      if (isSameMonth(d, selectedDate)) count += lista.length
    })
    return count
  }, [agendamentosPorDia, selectedDate])

  return (
    <div className="space-y-4">
      {/* Header mês */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDateChange(addMonths(selectedDate, -1))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-semibold text-slate-900 truncate capitalize">
            {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs text-slate-500">
            {totalMes} agendamento{totalMes !== 1 ? 's' : ''} no mês
          </p>
        </div>

        <button
          onClick={() => onDateChange(addMonths(selectedDate, 1))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <button
          onClick={() => onDateChange(new Date())}
          className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
          title="Mês atual"
        >
          <Calendar className="h-3.5 w-3.5" />
          Hoje
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-3">
        {/* Cabeçalho de dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((label, idx) => (
            <div
              key={idx}
              className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid dos dias */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Carregando mês...</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((dia, idx) => {
              const key = format(dia, 'yyyy-MM-dd')
              const ags = agendamentosPorDia.get(key) ?? []
              const noMes = isSameMonth(dia, selectedDate)
              const isSelected = isSameDay(dia, selectedDate)
              const hoje = isToday(dia)
              // 3 primeiros status únicos pra mostrar dots
              const statusUnicos = Array.from(
                new Set(ags.map((a) => a.status ?? '').filter(Boolean))
              ).slice(0, 3)

              return (
                <button
                  key={idx}
                  onClick={() => onJumpToDayMode(dia)}
                  disabled={!noMes}
                  className={`aspect-square flex flex-col items-center justify-start py-1.5 rounded-lg transition relative ${
                    !noMes
                      ? 'text-slate-300 cursor-default'
                      : isSelected
                        ? 'bg-violet-100 text-violet-800 ring-1 ring-violet-300'
                        : hoje
                          ? 'bg-violet-50 text-violet-900 hover:bg-violet-100'
                          : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`text-xs sm:text-sm font-semibold leading-tight ${
                      hoje && noMes ? 'text-violet-700' : ''
                    }`}
                  >
                    {format(dia, 'd')}
                  </span>
                  {noMes && ags.length > 0 && (
                    <>
                      <div className="flex items-center gap-0.5 mt-1">
                        {statusUnicos.map((s, i) => (
                          <span
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${dotClass(s)}`}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                        {ags.length}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap justify-center">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-900" /> Agendado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Confirmado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Finalizado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Cancelado
        </span>
      </div>
    </div>
  )
}
