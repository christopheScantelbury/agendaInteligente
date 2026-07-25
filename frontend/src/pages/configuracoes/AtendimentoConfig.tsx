import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { unidadeService, type Unidade } from '../../services/unidadeService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfigPageHeader from '../../components/configuracoes/ConfigPageHeader'
import MoneyInput from '../../components/forms/MoneyInput'
import IntegerInput from '../../components/forms/IntegerInput'

/**
 * #177: dá ao dono (ADMINISTRADOR) acesso às regras de Sinal e Fluxo de
 * atendimento por unidade. Antes só existiam no modal de Unidades, que o admin
 * único não alcança (redirect pra /configuracoes). Reusa PUT /api/unidades/{id}.
 */
export default function AtendimentoConfig() {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const { data: unidades = [], isLoading, error } = useQuery({
    queryKey: ['configuracoes', 'atendimento'],
    queryFn: () => unidadeService.listarTodos(),
  })

  // cópia editável por unidade (o PUT manda a unidade inteira)
  const [draft, setDraft] = useState<Record<number, Unidade>>({})
  const [dirty, setDirty] = useState<Record<number, boolean>>({})

  useEffect(() => {
    setDraft((prev) => {
      const next = { ...prev }
      unidades.forEach((u) => {
        if (u.id != null && !dirty[u.id]) next[u.id] = { ...u }
      })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidades])

  const salvarMutation = useMutation({
    mutationFn: (u: Unidade) => unidadeService.atualizar(u.id!, u),
    onSuccess: (saved) => {
      queryClient.setQueryData<Unidade[]>(['configuracoes', 'atendimento'], (old) =>
        (old ?? []).map((x) => (x.id === saved.id ? saved : x)),
      )
      if (saved.id != null) setDirty((d) => ({ ...d, [saved.id!]: false }))
      showNotification('success', 'Regras de atendimento salvas!')
    },
    onError: (e: any) =>
      showNotification('error', e.response?.data?.message || 'Erro ao salvar'),
  })

  function patch(id: number, campos: Partial<Unidade>) {
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...campos } }))
    setDirty((s) => ({ ...s, [id]: true }))
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <ConfigPageHeader />
        <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <ConfigPageHeader />
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-amber-800">Não foi possível carregar as unidades.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <ConfigPageHeader />
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-violet-600" />
          Fluxo de atendimento
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Regras de sinal e de atendimento de cada unidade. Os padrões preservam o fluxo atual —
          só altere se entender o impacto.
        </p>
      </header>

      {unidades.map((u) => {
        const d = draft[u.id!] ?? u
        const tipoSinal = d.tipoSinal ?? 'PERCENTUAL'
        return (
          <section key={u.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">{u.nome}</h2>

            {/* Sinal / Adiantamento */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Sinal / Adiantamento</h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={d.cobraSinal ?? false}
                  onChange={(e) => patch(u.id!, { cobraSinal: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 accent-violet-600"
                />
                <span className="text-sm text-slate-700">
                  Esta unidade cobra sinal para confirmar agendamento
                </span>
              </label>

              {d.cobraSinal && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Como o sinal é definido
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { valor: 'PERCENTUAL', rotulo: 'Percentual do valor' },
                        { valor: 'VALOR_FIXO', rotulo: 'Valor fixo' },
                      ] as const).map((op) => (
                        <button
                          key={op.valor}
                          type="button"
                          onClick={() => patch(u.id!, { tipoSinal: op.valor })}
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                            tipoSinal === op.valor
                              ? 'border-violet-400 bg-violet-50 text-violet-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200'
                          }`}
                        >
                          {op.rotulo}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tipoSinal === 'PERCENTUAL' ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Percentual sugerido (% do valor total)
                      </label>
                      <IntegerInput
                        min={0}
                        max={100}
                        value={d.percentualSinal}
                        onChange={(v) => patch(u.id!, { percentualSinal: v })}
                        className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ex.: agendamento de R$ 100 com 30% → sinal de R$ 30.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Valor fixo do sinal
                      </label>
                      <MoneyInput
                        value={d.valorSinalFixo}
                        onChange={(v) => patch(u.id!, { valorSinalFixo: v })}
                        className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ex.: todo agendamento pede R$ 50, independente do valor total.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fluxo de atendimento */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Fluxo de atendimento</h3>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={d.requerSinalPraIniciar ?? false}
                  onChange={(e) => patch(u.id!, { requerSinalPraIniciar: e.target.checked })}
                  disabled={!d.cobraSinal}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
                />
                <span className="text-sm text-slate-700">
                  Exigir sinal pago para iniciar o atendimento
                  <span className="block text-[11px] text-slate-500">
                    Profissional não inicia enquanto o cliente não pagar o sinal.
                    {!d.cobraSinal && (
                      <span className="text-amber-700"> Disponível só com "Cobra sinal" ativo.</span>
                    )}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={d.exigirConfirmacaoIniciar ?? false}
                  onChange={(e) => patch(u.id!, { exigirConfirmacaoIniciar: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
                />
                <span className="text-sm text-slate-700">
                  Exigir confirmação para iniciar o atendimento
                  <span className="block text-[11px] text-slate-500">
                    Profissional não consegue iniciar enquanto o agendamento não estiver confirmado.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!(d.permiteFinalizarSemPagamento ?? true)}
                  onChange={(e) => patch(u.id!, { permiteFinalizarSemPagamento: !e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
                />
                <span className="text-sm text-slate-700">
                  Exigir pagamento ao finalizar atendimento
                  <span className="block text-[11px] text-slate-500">
                    Bloqueia "Finalizar" sem registrar o valor recebido.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!(d.clientePodeCancelarAposConfirmar ?? true)}
                  onChange={(e) =>
                    patch(u.id!, { clientePodeCancelarAposConfirmar: !e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
                />
                <span className="text-sm text-slate-700">
                  Bloquear cancelamento pelo cliente após confirmar
                  <span className="block text-[11px] text-slate-500">
                    Cliente só cancela antes de confirmar. A equipe da unidade continua podendo.
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
                  value={d.lembreteConfirmacaoHoras}
                  onChange={(v) => patch(u.id!, { lembreteConfirmacaoHoras: v })}
                  className="block w-full sm:w-40 rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tempo antes do horário do agendamento pra notificar o cliente confirmar.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => salvarMutation.mutate(d)}
                disabled={!dirty[u.id!] || salvarMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
              >
                {salvarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
