import { useQuery } from '@tanstack/react-query'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock } from 'lucide-react'
import { dashboardGerenteService, ProximoAgendamento } from '../../services/dashboardGerenteService'

function rotuloData(iso: string) {
  const d = parseISO(iso)
  if (isToday(d)) return 'Hoje'
  if (isTomorrow(d)) return 'Amanhã'
  return format(d, "EEE, dd/MM", { locale: ptBR })
}

export default function ProximosAgendamentos() {
  const { data: lista = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'gerente', 'proximos'],
    queryFn: () => dashboardGerenteService.proximos(),
    refetchInterval: 60_000,
  })

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-4 w-4 text-violet-600" />
        <p className="text-sm font-semibold text-slate-700">Próximos agendamentos</p>
      </div>

      {isLoading ? (
        <ul className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <li key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </ul>
      ) : lista.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">Nenhum agendamento futuro ativo.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {lista.map((a: ProximoAgendamento) => (
            <li key={a.id} className="py-2 flex items-center gap-3">
              <div className="w-12 text-center">
                <p className="text-xs text-gray-500 capitalize">{rotuloData(a.dataHoraInicio)}</p>
                <p className="text-sm font-bold text-slate-900">
                  {format(parseISO(a.dataHoraInicio), 'HH:mm')}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{a.clienteNome}</p>
                <p className="text-xs text-gray-500 truncate">
                  {a.servicos.length > 0 ? a.servicos.join(', ') : 'Atendimento'}
                  {a.atendenteNome && (
                    <> · {a.atendenteNome}</>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
