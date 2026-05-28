import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Loader2, AlertCircle, Check, Copy } from 'lucide-react'
import { horariosConfigService } from '../../services/horariosConfigService'
import { useNotification } from '../../contexts/NotificationContext'

/** Normaliza HH:mm:ss → HH:mm (input type=time só aceita HH:mm) */
function paraInputTime(v: string | null): string {
  if (!v) return ''
  return v.length >= 5 ? v.slice(0, 5) : v
}

interface LinhaState {
  abertura: string
  fechamento: string
  dirty: boolean
}

export default function HorariosConfig() {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const { data: unidades = [], isLoading, error } = useQuery({
    queryKey: ['configuracoes', 'horarios'],
    queryFn: () => horariosConfigService.listar(),
  })

  // Estado local por unidade — { [unidadeId]: { abertura, fechamento, dirty } }
  const [linhas, setLinhas] = useState<Record<number, LinhaState>>({})

  useEffect(() => {
    if (unidades.length === 0) return
    setLinhas((prev) => {
      const next: Record<number, LinhaState> = { ...prev }
      unidades.forEach((u) => {
        if (next[u.unidadeId]?.dirty) return // não sobrescrever edição em andamento
        next[u.unidadeId] = {
          abertura: paraInputTime(u.abertura),
          fechamento: paraInputTime(u.fechamento),
          dirty: false,
        }
      })
      return next
    })
  }, [unidades])

  const salvarMutation = useMutation({
    mutationFn: ({ unidadeId, abertura, fechamento }: { unidadeId: number; abertura: string; fechamento: string }) =>
      horariosConfigService.atualizar(unidadeId, abertura || null, fechamento || null),
    onSuccess: (atualizada) => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'horarios'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      setLinhas((prev) => ({
        ...prev,
        [atualizada.unidadeId]: {
          abertura: paraInputTime(atualizada.abertura),
          fechamento: paraInputTime(atualizada.fechamento),
          dirty: false,
        },
      }))
      showNotification('success', 'Horários atualizados!')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível salvar.'
      showNotification('error', msg)
    },
  })

  const setCampo = (unidadeId: number, campo: 'abertura' | 'fechamento', valor: string) => {
    setLinhas((prev) => ({
      ...prev,
      [unidadeId]: {
        ...(prev[unidadeId] ?? { abertura: '', fechamento: '', dirty: false }),
        [campo]: valor,
        dirty: true,
      },
    }))
  }

  const copiarParaTodas = () => {
    const primeira = unidades[0]
    if (!primeira) return
    const ref = linhas[primeira.unidadeId]
    if (!ref) return
    setLinhas((prev) => {
      const next: Record<number, LinhaState> = { ...prev }
      unidades.forEach((u) => {
        next[u.unidadeId] = {
          abertura: ref.abertura,
          fechamento: ref.fechamento,
          dirty: true,
        }
      })
      return next
    })
    showNotification('success', 'Horário da 1ª unidade copiado. Lembre de salvar.')
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-6 w-6 text-violet-600" />
          Horários de funcionamento
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Defina os horários em que cada unidade atende. Os clientes só conseguirão agendar
          dentro desse intervalo.
        </p>
      </header>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-900">Não foi possível carregar.</p>
            <p className="text-xs text-red-700 mt-1 break-words">
              {(error as any)?.response?.data?.message ?? (error as any)?.message ?? 'Tente recarregar.'}
            </p>
          </div>
        </div>
      ) : unidades.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600">
            Você ainda não tem unidades ativas. Cadastre uma antes de definir horários.
          </p>
        </div>
      ) : (
        <>
          {unidades.length > 1 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copiarParaTodas}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar 1ª unidade para todas
              </button>
            </div>
          )}

          <ul className="space-y-3">
            {unidades.map((u) => {
              const linha = linhas[u.unidadeId] ?? { abertura: '', fechamento: '', dirty: false }
              const valido =
                (!linha.abertura && !linha.fechamento) ||
                (linha.abertura && linha.fechamento && linha.fechamento > linha.abertura)
              const podeSalvar = linha.dirty && valido && !salvarMutation.isPending

              return (
                <li
                  key={u.unidadeId}
                  className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-slate-900 truncate flex-1">
                      {u.nome}
                    </p>
                    {!linha.dirty && (u.abertura || u.fechamento) && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Configurado
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`abertura-${u.unidadeId}`}
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Abertura
                      </label>
                      <input
                        id={`abertura-${u.unidadeId}`}
                        type="time"
                        value={linha.abertura}
                        onChange={(e) => setCampo(u.unidadeId, 'abertura', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`fechamento-${u.unidadeId}`}
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Fechamento
                      </label>
                      <input
                        id={`fechamento-${u.unidadeId}`}
                        type="time"
                        value={linha.fechamento}
                        onChange={(e) => setCampo(u.unidadeId, 'fechamento', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                      />
                    </div>
                  </div>

                  {linha.abertura && linha.fechamento && linha.fechamento <= linha.abertura && (
                    <p className="text-xs text-red-600 mt-2">
                      O horário de fechamento precisa ser depois do de abertura.
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 mt-3">
                    {linha.dirty && (
                      <span className="text-xs text-amber-600 mr-auto">Alteração não salva</span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        salvarMutation.mutate({
                          unidadeId: u.unidadeId,
                          abertura: linha.abertura,
                          fechamento: linha.fechamento,
                        })
                      }
                      disabled={!podeSalvar}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
                    >
                      {salvarMutation.isPending && salvarMutation.variables?.unidadeId === u.unidadeId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Salvar
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
            💡 Deixe os dois campos vazios para indicar que a unidade está fechada o dia todo
            (cliente verá "horários indisponíveis" ao tentar agendar).
          </div>
        </>
      )}
    </div>
  )
}
