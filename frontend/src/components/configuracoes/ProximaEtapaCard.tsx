import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ArrowRight, Home, PartyPopper } from 'lucide-react'
import { dashboardGerenteService } from '../../services/dashboardGerenteService'

interface Tarefa {
  id: string
  titulo: string
  path: string
  concluida: boolean
}

interface Props {
  /** ID da tarefa atual (pra não recomendar a si mesma) */
  tarefaAtualId?: string
  /** Se true, força mostrar o card mesmo sem ter salvado nada ainda. */
  alwaysVisible?: boolean
}

/**
 * Card que aparece após uma ação de sucesso em telas de configuração.
 * Mostra "Voltar para o início" + "Próxima etapa" (próxima tarefa pendente
 * do checklist do gerente). Quando tudo está concluído, mostra parabéns.
 */
export default function ProximaEtapaCard({ tarefaAtualId, alwaysVisible = false }: Props) {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['dashboard', 'gerente', 'checklist'],
    queryFn: () => dashboardGerenteService.checklist(),
    enabled: alwaysVisible || true, // sempre busca pra ter pronto quando mostrar
  })

  if (!data) return null

  const tarefas: Tarefa[] = data.tarefas ?? []
  const pendentes = tarefas.filter((t) => !t.concluida && t.id !== tarefaAtualId)
  const proxima = pendentes[0]

  // Todas concluídas — celebração
  if (pendentes.length === 0 && tarefas.length > 0) {
    return (
      <div className="bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Tudo configurado!</p>
            <p className="text-xs text-violet-100">Seu negócio está pronto para receber clientes.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/gerente/dashboard')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-violet-700 hover:bg-violet-50 text-sm font-semibold transition"
        >
          <Home className="h-4 w-4" />
          Voltar para o início
        </button>
      </div>
    )
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-emerald-900">Pronto! Para onde agora?</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => navigate('/gerente/dashboard')}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-sm font-semibold transition"
        >
          <Home className="h-4 w-4" />
          Voltar para o início
        </button>
        {proxima && (
          <button
            type="button"
            onClick={() => navigate(proxima.path)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition shadow-sm"
          >
            <span className="truncate">{proxima.titulo}</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </button>
        )}
      </div>
    </div>
  )
}
