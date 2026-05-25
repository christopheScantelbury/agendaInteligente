import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PlayCircle,
  XCircle,
  Receipt,
  RotateCcw,
  UserCheck,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'
import { agendamentoService, Agendamento } from '../../services/agendamentoService'
import { useNotification } from '../../contexts/NotificationContext'
import BottomSheet from '../ui/BottomSheet'

interface AcoesAgendamentoSheetProps {
  agendamento: Agendamento | null
  onClose: () => void
}

type TipoPagamento = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO'

const PAGAMENTOS: { id: TipoPagamento; label: string }[] = [
  { id: 'PIX', label: 'Pix' },
  { id: 'DINHEIRO', label: 'Dinheiro' },
  { id: 'CARTAO_CREDITO', label: 'Cartão crédito' },
  { id: 'CARTAO_DEBITO', label: 'Cartão débito' },
  { id: 'BOLETO', label: 'Boleto' },
]

export default function AcoesAgendamentoSheet({ agendamento, onClose }: AcoesAgendamentoSheetProps) {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const [modoFinalizar, setModoFinalizar] = useState(false)
  const [valorFinal, setValorFinal] = useState<string>('')
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>('PIX')

  const isOpen = agendamento !== null

  function resetEFecha() {
    setModoFinalizar(false)
    setValorFinal('')
    setTipoPagamento('PIX')
    onClose()
  }

  const mutationStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      agendamentoService.atualizarStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', 'Status atualizado')
      resetEFecha()
    },
    onError: (err: any) => {
      showNotification('error', err.response?.data?.message || 'Erro ao atualizar status')
    },
  })

  const mutationFinalizar = useMutation({
    mutationFn: ({ id, valorFinalNum, tipo }: { id: number; valorFinalNum: number; tipo: TipoPagamento }) =>
      agendamentoService.finalizar(id, { valorFinal: valorFinalNum, tipoPagamento: tipo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', 'Atendimento finalizado e cobrado')
      resetEFecha()
    },
    onError: (err: any) => {
      showNotification('error', err.response?.data?.message || 'Erro ao finalizar')
    },
  })

  function alterarStatus(status: string) {
    if (!agendamento?.id) return
    mutationStatus.mutate({ id: agendamento.id, status })
  }

  function submeterFinalizar() {
    if (!agendamento?.id) return
    const valorNum = parseFloat(valorFinal.replace(',', '.'))
    if (Number.isNaN(valorNum) || valorNum < 0) {
      showNotification('error', 'Valor inválido')
      return
    }
    mutationFinalizar.mutate({ id: agendamento.id, valorFinalNum: valorNum, tipo: tipoPagamento })
  }

  if (!agendamento) return null

  const inicio = parseISO(agendamento.dataHoraInicio)
  const status = agendamento.status ?? 'AGENDADO'
  const clienteNome = agendamento.cliente?.nome ?? 'Cliente'
  const servicos = agendamento.servicos
    ?.map((s: any) => s.servico?.nome ?? s.descricao)
    .filter(Boolean)
    .join(', ')
  const valorBase = agendamento.valorFinal ?? agendamento.valorTotal ?? 0

  const carregando = mutationStatus.isPending || mutationFinalizar.isPending

  return (
    <BottomSheet isOpen={isOpen} onClose={resetEFecha} title={modoFinalizar ? 'Finalizar e cobrar' : clienteNome}>
      {/* Cabeçalho do agendamento */}
      {!modoFinalizar && (
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500">
            {format(inicio, "EEEE, dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
          </p>
          {servicos && <p className="text-sm font-medium text-slate-900 mt-1">{servicos}</p>}
          {valorBase > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">Valor previsto: R$ {Number(valorBase).toFixed(2)}</p>
          )}
        </div>
      )}

      {modoFinalizar ? (
        <FinalizarForm
          valorFinal={valorFinal}
          setValorFinal={setValorFinal}
          tipoPagamento={tipoPagamento}
          setTipoPagamento={setTipoPagamento}
          valorPrevisto={Number(valorBase)}
          carregando={mutationFinalizar.isPending}
          onCancel={() => setModoFinalizar(false)}
          onSubmit={submeterFinalizar}
        />
      ) : (
        <div className="space-y-2">
          {(status === 'AGENDADO' || !agendamento.status) && (
            <>
              <ActionButton
                icon={UserCheck}
                color="emerald"
                label="Cliente chegou"
                desc="Marca check-in (confirmado)"
                disabled={carregando}
                onClick={() => alterarStatus('CONFIRMADO')}
              />
              <ActionButton
                icon={XCircle}
                color="red"
                label="Marcar como no-show"
                desc="Cliente não compareceu"
                disabled={carregando}
                onClick={() => alterarStatus('NO_SHOW')}
              />
            </>
          )}

          {status === 'CONFIRMADO' && (
            <>
              <ActionButton
                icon={PlayCircle}
                color="violet"
                label="Iniciar atendimento"
                desc="Status: Em andamento"
                disabled={carregando}
                onClick={() => alterarStatus('EM_ANDAMENTO')}
              />
              <ActionButton
                icon={XCircle}
                color="red"
                label="Marcar como no-show"
                desc="Cliente não compareceu"
                disabled={carregando}
                onClick={() => alterarStatus('NO_SHOW')}
              />
            </>
          )}

          {status === 'EM_ANDAMENTO' && (
            <ActionButton
              icon={DollarSign}
              color="emerald"
              label="Finalizar e cobrar"
              desc="Registrar valor e forma de pagamento"
              disabled={carregando}
              onClick={() => {
                setValorFinal(String(Number(valorBase).toFixed(2)))
                setModoFinalizar(true)
              }}
            />
          )}

          {(status === 'CONCLUIDO' || status === 'FINALIZADO' || status === 'PROCEDIMENTO_FIM') && (
            <>
              <ActionButton
                icon={Receipt}
                color="slate"
                label="Ver recibo"
                desc="Detalhes do atendimento finalizado"
                disabled={carregando}
                onClick={() => {
                  showNotification('info', 'Tela de recibo em breve — escopo futuro.')
                }}
              />
              <ActionButton
                icon={RotateCcw}
                color="orange"
                label="Reabrir"
                desc="Voltar status para em andamento"
                disabled={carregando}
                onClick={() => alterarStatus('EM_ANDAMENTO')}
              />
            </>
          )}

          {status === 'NO_SHOW' && (
            <ActionButton
              icon={UserCheck}
              color="emerald"
              label="Cliente compareceu"
              desc="Corrigir: cliente chegou"
              disabled={carregando}
              onClick={() => alterarStatus('CONFIRMADO')}
            />
          )}

          {status === 'CANCELADO' && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>Agendamento cancelado — nenhuma ação disponível.</span>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

function ActionButton({
  icon: Icon,
  color,
  label,
  desc,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: 'emerald' | 'violet' | 'red' | 'slate' | 'orange'
  label: string
  desc: string
  disabled?: boolean
  onClick: () => void
}) {
  const colorClasses: Record<typeof color, string> = {
    emerald: 'border-emerald-200 hover:border-emerald-300 bg-emerald-50/40',
    violet: 'border-violet-200 hover:border-violet-300 bg-violet-50/40',
    red: 'border-red-200 hover:border-red-300 bg-red-50/40',
    slate: 'border-slate-200 hover:border-slate-300 bg-slate-50/40',
    orange: 'border-orange-200 hover:border-orange-300 bg-orange-50/40',
  }
  const iconClasses: Record<typeof color, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    violet: 'bg-violet-100 text-violet-700',
    red: 'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
    orange: 'bg-orange-100 text-orange-700',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3 border rounded-xl transition text-left disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[color]}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </button>
  )
}

function FinalizarForm({
  valorFinal,
  setValorFinal,
  tipoPagamento,
  setTipoPagamento,
  valorPrevisto,
  carregando,
  onCancel,
  onSubmit,
}: {
  valorFinal: string
  setValorFinal: (s: string) => void
  tipoPagamento: TipoPagamento
  setTipoPagamento: (t: TipoPagamento) => void
  valorPrevisto: number
  carregando: boolean
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="valorFinal" className="block text-xs font-semibold text-slate-700 mb-1">
          Valor cobrado (R$)
        </label>
        <input
          id="valorFinal"
          type="number"
          step="0.01"
          min="0"
          value={valorFinal}
          onChange={(e) => setValorFinal(e.target.value)}
          placeholder="0,00"
          inputMode="decimal"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        {valorPrevisto > 0 && (
          <p className="text-xs text-gray-500 mt-1">Previsto: R$ {valorPrevisto.toFixed(2)}</p>
        )}
      </div>

      <fieldset>
        <legend className="text-xs font-semibold text-slate-700 mb-1.5">Forma de pagamento</legend>
        <div className="grid grid-cols-2 gap-2">
          {PAGAMENTOS.map((p) => {
            const ativo = p.id === tipoPagamento
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setTipoPagamento(p.id)}
                className={`
                  py-2.5 px-3 rounded-xl border text-sm font-medium transition
                  ${ativo ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-slate-700 hover:border-gray-300'}
                `}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={carregando}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-slate-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={carregando || !valorFinal}
          className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
        >
          {carregando ? 'Confirmando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
