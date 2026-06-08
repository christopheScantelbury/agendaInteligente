import { useMemo } from 'react'
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
import { dotClass } from '../../utils/statusAgendamento'

interface Props {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onJumpToDayMode: (date: Date) => void
}

// #151: paleta unificada via helper statusAgendamento.

/**
 * Modo Semana — 7 dias.
 * Mobile (<sm): stack vertical, cada dia é um card clicável com contagem
 *               + 3 primeiros agendamentos. Tap → vai pro DayMode daquele dia.
 * Desktop (≥md): mesma estrutura mas com mais respiro.
 */
export default function WeekMode({ selectedDate, onDateChange, onJumpToDayMode }: Props) {
  const inicioSemana = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const fimSemana = addDays(inicioSemana, 6)

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
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
    // ordena cada dia por hora
    mapa.forEach((lista) =>
      lista.sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())
    )
    return mapa
  }, [agendamentos, dias, inicioSemana, fimSemana])

  const totalSemana = useMemo(
    () => Array.from(agendamentosPorDia.values()).reduce((acc, lista) => acc + lista.length, 0),
    [agendamentosPorDia]
  )

  return (
    <div className="space-y-4">
      {/* Header semana */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDateChange(addDays(selectedDate, -7))}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {format(inicioSemana, "d 'de' MMM", { locale: ptBR })} – {format(fimSemana, "d 'de' MMM", { locale: ptBR })}
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
        <ul className="space-y-2">
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
                          hoje
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <p className="text-[10px] uppercase font-bold leading-none">
                          {format(dia, 'EEE', { locale: ptBR }).slice(0, 3)}
                        </p>
                        <p className="text-sm font-bold leading-none mt-0.5">{format(dia, 'd')}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 capitalize truncate">
                          {format(dia, "EEEE", { locale: ptBR })}
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
                          <span
                            className={`h-2 w-2 rounded-full ${dotClass(a.status)}`}
                          />
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
      )}
    </div>
  )
}
