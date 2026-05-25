import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { addDays, format, isSameDay, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, ChevronRight, TrendingUp, Users } from 'lucide-react'
import { authService } from '../../services/authService'
import { atendenteService } from '../../services/atendenteService'
import { agendamentoService, Agendamento } from '../../services/agendamentoService'

interface DiaResumo {
  data: Date
  agendamentos: Agendamento[]
  faturamentoPrevisto: number
  qtdAtivos: number
}

const STATUS_ATIVOS = new Set(['AGENDADO', 'CONFIRMADO', 'EM_ANDAMENTO'])
const STATUS_CONCLUIDOS = new Set(['CONCLUIDO', 'FINALIZADO', 'PROCEDIMENTO_FIM'])

export default function AgendaProfissional() {
  const navigate = useNavigate()
  const usuario = authService.getUsuario()

  const { data: meuAtendente } = useQuery({
    queryKey: ['atendente', 'meu', usuario?.usuarioId],
    queryFn: () => atendenteService.buscarPorUsuarioId(usuario!.usuarioId),
    enabled: !!usuario?.usuarioId,
  })

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos', 'todos'],
    queryFn: () => agendamentoService.listar(),
  })

  const dias: DiaResumo[] = useMemo(() => {
    if (!meuAtendente) return []
    const hoje = startOfDay(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const data = addDays(hoje, i)
      const doDia = agendamentos
        .filter((a) => a.atendente?.id === meuAtendente.id || a.atendenteId === meuAtendente.id)
        .filter((a) => isSameDay(parseISO(a.dataHoraInicio), data))
      const qtdAtivos = doDia.filter((a) => STATUS_ATIVOS.has(a.status ?? 'AGENDADO') || STATUS_CONCLUIDOS.has(a.status ?? '')).length
      const faturamentoPrevisto = doDia
        .filter((a) => a.status !== 'CANCELADO' && a.status !== 'NO_SHOW')
        .reduce((acc, a) => acc + Number(a.valorTotal ?? 0), 0)
      return { data, agendamentos: doDia, faturamentoPrevisto, qtdAtivos }
    })
  }, [agendamentos, meuAtendente])

  function rotuloDia(data: Date) {
    if (isToday(data)) return 'Hoje'
    if (isTomorrow(data)) return 'Amanhã'
    return format(data, "EEEE", { locale: ptBR })
  }

  function navegarParaDia(data: Date) {
    const iso = format(data, 'yyyy-MM-dd')
    navigate(`/profissional/hoje?data=${iso}`)
  }

  const totalSemana = useMemo(
    () => dias.reduce((acc, d) => ({
      qtd: acc.qtd + d.qtdAtivos,
      faturamento: acc.faturamento + d.faturamentoPrevisto,
    }), { qtd: 0, faturamento: 0 }),
    [dias]
  )

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Próximos 7 dias</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sua agenda completa da semana</p>
      </header>

      {/* Resumo da semana */}
      <section className="grid grid-cols-2 gap-2">
        <div className="bg-violet-50 rounded-xl p-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Atendimentos</p>
            <p className="text-base font-bold text-slate-900">{totalSemana.qtd}</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Previsto</p>
            <p className="text-base font-bold text-slate-900">R$ {totalSemana.faturamento.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* Lista de dias */}
      <section aria-label="Lista de dias da semana">
        {isLoading || !meuAtendente ? (
          <ul className="space-y-2">
            {[...Array(7)].map((_, i) => (
              <li key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {dias.map((dia) => (
              <li key={dia.data.toISOString()}>
                <button
                  type="button"
                  onClick={() => navegarParaDia(dia.data)}
                  className="
                    w-full flex items-center gap-3 p-3
                    bg-white border border-gray-200 rounded-xl
                    hover:border-violet-300 hover:shadow-sm transition
                    text-left
                  "
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] text-violet-600 font-semibold uppercase">
                      {format(dia.data, 'MMM', { locale: ptBR })}
                    </span>
                    <span className="text-base font-black text-violet-700 leading-none">
                      {format(dia.data, 'dd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 capitalize">{rotuloDia(dia.data)}</p>
                    {dia.qtdAtivos > 0 ? (
                      <p className="text-xs text-gray-500">
                        {dia.qtdAtivos} {dia.qtdAtivos === 1 ? 'atendimento' : 'atendimentos'}
                        {dia.faturamentoPrevisto > 0 && (
                          <> · R$ {dia.faturamentoPrevisto.toFixed(2)}</>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Sem atendimentos</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isLoading && totalSemana.qtd === 0 && (
        <div className="text-center py-8 text-sm text-gray-500">
          <div className="mx-auto w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-3">
            <Calendar className="h-6 w-6 text-violet-500" />
          </div>
          Semana livre — bom momento para divulgar serviços.
        </div>
      )}
    </div>
  )
}
