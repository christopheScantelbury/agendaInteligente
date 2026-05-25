import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users } from 'lucide-react'
import { dashboardGerenteService, MembroEquipe, StatusMembro } from '../../services/dashboardGerenteService'

function formatBRL(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function iniciais(nome: string): string {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0][0]?.toUpperCase() ?? '?'
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function statusInfo(status: StatusMembro) {
  switch (status) {
    case 'EM_ATENDIMENTO':
      return { label: 'Em atendimento', tag: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' }
    case 'PROXIMO':
      return { label: 'Próximo', tag: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' }
    default:
      return { label: 'Livre', tag: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' }
  }
}

export default function EquipeTempoReal() {
  const { data: equipe = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'gerente', 'equipe'],
    queryFn: () => dashboardGerenteService.equipe(),
    refetchInterval: 60_000,
  })

  return (
    <div data-tour="equipe" className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-emerald-600" />
        <p className="text-sm font-semibold text-slate-700">Equipe em tempo real</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : equipe.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          Nenhum profissional ativo na unidade.
        </p>
      ) : (
        <ul className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
          {equipe.map((m: MembroEquipe) => {
            const info = statusInfo(m.status)
            return (
              <li
                key={m.atendenteId}
                className="flex-shrink-0 w-56 sm:w-auto bg-gray-50 rounded-xl p-3 border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {iniciais(m.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{m.nome}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${info.tag}`}>
                        {info.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Próximo</p>
                    <p className="font-medium text-slate-900">
                      {m.proximoHorario ? format(parseISO(m.proximoHorario), 'HH:mm', { locale: ptBR }) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Faturado</p>
                    <p className="font-medium text-slate-900">{formatBRL(m.faturamentoDia)}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
