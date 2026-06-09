import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Wallet } from 'lucide-react'
import { agendamentoService } from '../../services/agendamentoService'
import { useNotification } from '../../contexts/NotificationContext'
import { getApiErrorMessage } from '../../utils/apiError'
import MoneyInput from '../forms/MoneyInput'

/**
 * Modal de registro de sinal/adiantamento (V76).
 *
 * Aberto a partir do DetalhesSheet quando:
 *  - Status ∈ {AGENDADO, CONFIRMADO, EM_ANDAMENTO, PROCEDIMENTO_FIM}
 *  - Sinal AINDA não pago
 *
 * Pré-preenche o valor com o % configurado na unidade × valor total (default 30%).
 * Admin pode ajustar livremente.
 *
 * z-[200] — mesma camada do ConfirmDialog (acima de BottomSheet z-120).
 */

const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de débito' },
] as const

interface Props {
  agendamentoId: number | null
  valorTotal: number
  percentualSinal?: number       // default 30
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ReceberSinalModal({
  agendamentoId,
  valorTotal,
  percentualSinal = 30,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [valor, setValor] = useState<number>(0)
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX')

  // Pré-preenche o valor sugerido toda vez que abre
  useEffect(() => {
    if (isOpen && valorTotal > 0) {
      const sugerido = Math.round((valorTotal * (percentualSinal ?? 30)) ) / 100
      setValor(sugerido > 0 ? Number(sugerido.toFixed(2)) : 0)
    }
  }, [isOpen, valorTotal, percentualSinal])

  const mutationSinal = useMutation({
    mutationFn: ({ id, valor, formaPagamento }: { id: number; valor: number; formaPagamento: string }) =>
      agendamentoService.registrarSinal(id, valor, formaPagamento),
    onSuccess: (_data, variables) => {
      // Invalida lista + detalhe individual (padrão da memória feedback_query_cache_invalidation)
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamento', variables.id] })
      showNotification('success', 'Sinal registrado. Agendamento confirmado.')
      onClose()
      onSuccess?.()
    },
    onError: (e) => showNotification('error', getApiErrorMessage(e, 'Erro ao registrar sinal')),
  })

  function submeter() {
    if (!agendamentoId) return
    if (valor <= 0) {
      showNotification('error', 'Informe o valor recebido como sinal')
      return
    }
    mutationSinal.mutate({ id: agendamentoId, valor, formaPagamento })
  }

  if (!isOpen) return null

  const formatMoeda = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const restante = Math.max(0, valorTotal - valor)

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden shadow-xl">
        <header className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Receber sinal</h2>
              <p className="text-xs text-slate-500">Adiantamento pra confirmar o agendamento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition"
            aria-label="Fechar"
            disabled={mutationSinal.isPending}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Resumo financeiro */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Valor total do agendamento</span>
              <span className="font-semibold text-slate-900 tabular-nums">{formatMoeda(valorTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sinal sugerido ({percentualSinal}%)</span>
              <span className="font-semibold text-violet-700 tabular-nums">
                {formatMoeda(Math.round((valorTotal * (percentualSinal ?? 30))) / 100)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-700 font-semibold">Restante a cobrar depois</span>
              <span className="font-bold text-slate-900 tabular-nums">{formatMoeda(restante)}</span>
            </div>
          </div>

          {/* Valor do sinal */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Valor recebido <span className="text-red-500">*</span>
            </label>
            <MoneyInput value={valor} onChange={setValor} />
          </div>

          {/* Forma de pagamento — grid de botões (padrão consolidado) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Forma de pagamento <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGAMENTO.map((f) => {
                const ativo = formaPagamento === f.value
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormaPagamento(f.value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition text-left ${
                      ativo
                        ? 'bg-violet-50 border-violet-400 text-violet-800 ring-2 ring-violet-100'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 sm:p-5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={mutationSinal.isPending}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submeter}
            disabled={mutationSinal.isPending || valor <= 0 || valor > valorTotal}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 disabled:bg-slate-300 disabled:shadow-none transition w-full sm:w-auto"
          >
            {mutationSinal.isPending ? 'Salvando…' : 'Confirmar sinal'}
          </button>
        </footer>
      </div>
    </div>
  )
}
