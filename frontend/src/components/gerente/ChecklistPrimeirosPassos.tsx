import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight, PartyPopper, Rocket, X } from 'lucide-react'
import { dashboardGerenteService } from '../../services/dashboardGerenteService'
import { Events, track } from '../../lib/analytics'

const DISMISSED_KEY = 'gerente_checklist_dispensado_v1'

export default function ChecklistPrimeirosPassos() {
  const navigate = useNavigate()
  const [dispensado, setDispensado] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(DISMISSED_KEY) === '1'
  })

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'gerente', 'checklist'],
    queryFn: () => dashboardGerenteService.checklist(),
    refetchInterval: 60_000,
  })

  if (dispensado || isLoading || !data) return null

  const concluidoTudo = data.concluidas === data.total
  const percentual = Math.round((data.concluidas / data.total) * 100)

  function dispensar() {
    if (typeof window !== 'undefined') window.localStorage.setItem(DISMISSED_KEY, '1')
    setDispensado(true)
  }

  if (concluidoTudo) {
    return (
      <div data-tour="checklist" className="bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-2xl p-6 mb-4 relative overflow-hidden">
        <button
          type="button"
          onClick={dispensar}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <PartyPopper className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold">Parabéns! Seu negócio está no ar.</p>
            <p className="text-sm text-violet-100 mt-0.5">
              Você concluiu todos os passos iniciais. Boas vendas!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-tour="checklist" className="bg-white border-2 border-violet-200 rounded-2xl p-4 sm:p-6 mb-4 relative">
      <button
        type="button"
        onClick={dispensar}
        aria-label="Dispensar checklist"
        className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Rocket className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Configure seu negócio em 5 minutos</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.concluidas} de {data.total} concluídas
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-violet-600 transition-all duration-500"
          style={{ width: `${percentual}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {data.tarefas.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => {
                track(Events.GERENTE_CHECKLIST_TAREFA_CLICADA, { tarefaId: t.id, path: t.path })
                navigate(t.path)
              }}
              disabled={t.concluida}
              className={`
                w-full flex items-center gap-3 p-2 rounded-lg text-left transition
                ${t.concluida
                  ? 'opacity-60 cursor-default'
                  : 'hover:bg-violet-50'}
              `}
            >
              <div
                className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${t.concluida ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}
                `}
              >
                {t.concluida && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
              <span
                className={`flex-1 text-sm ${
                  t.concluida ? 'line-through text-gray-400' : 'text-slate-700 font-medium'
                }`}
              >
                {t.titulo}
              </span>
              {!t.concluida && <ChevronRight className="h-4 w-4 text-violet-400 flex-shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
