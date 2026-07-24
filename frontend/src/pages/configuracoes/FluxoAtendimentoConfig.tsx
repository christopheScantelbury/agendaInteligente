import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Building2, Check, Loader2, SlidersHorizontal } from 'lucide-react'
import { unidadeService, Unidade } from '../../services/unidadeService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfigPageHeader from '../../components/configuracoes/ConfigPageHeader'
import ProximaEtapaCard from '../../components/configuracoes/ProximaEtapaCard'
import IntegerInput from '../../components/forms/IntegerInput'

type UnidadeFluxoState = Unidade & { dirty?: boolean }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
      {children}
    </p>
  )
}

export default function FluxoAtendimentoConfig() {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const { data: unidades = [], isLoading, error } = useQuery({
    queryKey: ['configuracoes', 'fluxo-atendimento'],
    queryFn: () => unidadeService.listarTodos(),
  })

  const [linhas, setLinhas] = useState<Record<number, UnidadeFluxoState>>({})
  const [salvouAlgo, setSalvouAlgo] = useState(false)

  useEffect(() => {
    if (!unidades.length) return

    setLinhas((prev) => {
      const next: Record<number, UnidadeFluxoState> = { ...prev }

      unidades.forEach((u) => {
        if (!u.id) return
        if (next[u.id]?.dirty) return

        next[u.id] = {
          ...u,
          ativo: u.ativo ?? true,
          cobraSinal: u.cobraSinal ?? false,
          percentualSinal: u.percentualSinal ?? 30,
          requerSinalPraIniciar: u.requerSinalPraIniciar ?? false,
          permiteFinalizarSemPagamento: u.permiteFinalizarSemPagamento ?? true,
          clientePodeCancelarAposConfirmar: u.clientePodeCancelarAposConfirmar ?? true,
          lembreteConfirmacaoHoras: u.lembreteConfirmacaoHoras ?? 24,
          dirty: false,
        }
      })

      return next
    })
  }, [unidades])

  const salvarMutation = useMutation({
    mutationFn: (payload: Unidade) => unidadeService.atualizar(payload.id!, payload),
    onSuccess: (atualizada) => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'fluxo-atendimento'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      setLinhas((prev) => ({
        ...prev,
        [atualizada.id!]: {
          ...atualizada,
          ativo: atualizada.ativo ?? true,
          cobraSinal: atualizada.cobraSinal ?? false,
          percentualSinal: atualizada.percentualSinal ?? 30,
          requerSinalPraIniciar: atualizada.requerSinalPraIniciar ?? false,
          permiteFinalizarSemPagamento: atualizada.permiteFinalizarSemPagamento ?? true,
          clientePodeCancelarAposConfirmar: atualizada.clientePodeCancelarAposConfirmar ?? true,
          lembreteConfirmacaoHoras: atualizada.lembreteConfirmacaoHoras ?? 24,
          dirty: false,
        },
      }))
      setSalvouAlgo(true)
      showNotification('success', 'Fluxo de atendimento atualizado!')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível salvar.'
      showNotification('error', msg)
    },
  })

  const setCampo = <K extends keyof UnidadeFluxoState>(
    unidadeId: number,
    campo: K,
    valor: UnidadeFluxoState[K]
  ) => {
    setLinhas((prev) => ({
      ...prev,
      [unidadeId]: {
        ...(prev[unidadeId] ?? { id: unidadeId, nome: '' }),
        [campo]: valor,
        dirty: true,
      } as UnidadeFluxoState,
    }))
  }

  const salvarUnidade = (unidadeId: number) => {
    const linha = linhas[unidadeId]
    if (!linha || !linha.id) return
    salvarMutation.mutate({
      ...linha,
      ativo: linha.ativo ?? true,
      cobraSinal: linha.cobraSinal ?? false,
      percentualSinal: linha.percentualSinal ?? 30,
      requerSinalPraIniciar: linha.requerSinalPraIniciar ?? false,
      permiteFinalizarSemPagamento: linha.permiteFinalizarSemPagamento ?? true,
      clientePodeCancelarAposConfirmar: linha.clientePodeCancelarAposConfirmar ?? true,
      lembreteConfirmacaoHoras: linha.lembreteConfirmacaoHoras ?? 24,
    })
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <ConfigPageHeader />

      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6 text-violet-600" />
          Fluxo de atendimento
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Regras operacionais dos agendamentos.
        </p>
      </header>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando unidades…
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
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600">
            Nenhuma unidade cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {unidades.map((u) => {
            if (!u.id) return null
            const linha = linhas[u.id] ?? {
              ...u,
              ativo: u.ativo ?? true,
              cobraSinal: u.cobraSinal ?? false,
              percentualSinal: u.percentualSinal ?? 30,
              requerSinalPraIniciar: u.requerSinalPraIniciar ?? false,
              permiteFinalizarSemPagamento: u.permiteFinalizarSemPagamento ?? true,
              clientePodeCancelarAposConfirmar: u.clientePodeCancelarAposConfirmar ?? true,
              lembreteConfirmacaoHoras: u.lembreteConfirmacaoHoras ?? 24,
              dirty: false,
            }

            return (
              <section
                key={u.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-5"
              >
                <header className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-slate-900 truncate">{u.nome}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configurações aplicadas a esta unidade.
                      </p>
                    </div>
                  </div>
                  {!linha.dirty && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Configurado
                    </span>
                  )}
                </header>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <SectionLabel>Sinal / Adiantamento</SectionLabel>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={linha.cobraSinal ?? false}
                      onChange={(e) => setCampo(u.id!, 'cobraSinal', e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 accent-violet-600"
                    />
                    <span className="text-sm text-slate-700">
                      Esta unidade cobra sinal para confirmar agendamento
                    </span>
                  </label>

                  {linha.cobraSinal && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Percentual sugerido (% do valor total)
                        </label>
                        <IntegerInput
                          min={0}
                          max={100}
                          value={linha.percentualSinal}
                          onChange={(v) => setCampo(u.id!, 'percentualSinal', v)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Exemplo: agendamento de R$ 100 com 30% gera sinal de R$ 30.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <SectionLabel>Fluxo de atendimento</SectionLabel>
                  <p className="text-xs text-slate-500">
                    Regras operacionais desta unidade. Padrões preservam o fluxo atual.
                  </p>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={linha.requerSinalPraIniciar ?? false}
                      onChange={(e) => setCampo(u.id!, 'requerSinalPraIniciar', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
                      disabled={!linha.cobraSinal}
                    />
                    <span className="text-sm text-slate-700">
                      Exigir sinal pago para iniciar o atendimento
                      <span className="block text-[11px] text-slate-500">
                        Profissional não consegue iniciar enquanto o cliente não pagar o sinal.
                        {!linha.cobraSinal && (
                          <span className="text-amber-700"> Disponível só com &quot;Cobra sinal&quot; ativo.</span>
                        )}
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!(linha.permiteFinalizarSemPagamento ?? true)}
                      onChange={(e) =>
                        setCampo(u.id!, 'permiteFinalizarSemPagamento', !e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
                    />
                    <span className="text-sm text-slate-700">
                      Exigir pagamento ao finalizar atendimento
                      <span className="block text-[11px] text-slate-500">
                        Bloqueia &quot;Finalizar&quot; sem registrar valor recebido.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!(linha.clientePodeCancelarAposConfirmar ?? true)}
                      onChange={(e) =>
                        setCampo(u.id!, 'clientePodeCancelarAposConfirmar', !e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
                    />
                    <span className="text-sm text-slate-700">
                      Bloquear cancelamento pelo cliente após confirmar
                      <span className="block text-[11px] text-slate-500">
                        Cliente só consegue cancelar antes de confirmar.
                      </span>
                    </span>
                  </label>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Antecedência do lembrete automático (horas, 1–168)
                    </label>
                    <IntegerInput
                      min={1}
                      max={168}
                      value={linha.lembreteConfirmacaoHoras}
                      onChange={(v) => setCampo(u.id!, 'lembreteConfirmacaoHoras', v)}
                      className="w-full sm:w-40 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Tempo antes do horário do agendamento para notificar o cliente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {linha.dirty && (
                    <span className="text-xs text-amber-600 mr-auto">Alteração não salva</span>
                  )}
                  <button
                    type="button"
                    onClick={() => salvarUnidade(u.id!)}
                    disabled={!linha.dirty || salvarMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
                  >
                    {salvarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salvar fluxo
                  </button>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {salvouAlgo && <ProximaEtapaCard tarefaAtualId="fluxo-atendimento" />}
    </div>
  )
}
