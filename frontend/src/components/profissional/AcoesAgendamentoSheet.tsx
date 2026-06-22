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
import ConfirmDialog from '../ConfirmDialog'
import { Events, track } from '../../lib/analytics'
import BottomSheet from '../ui/BottomSheet'
import ReciboModal from './ReciboModal'
import MoneyInput from '../forms/MoneyInput'

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

// Motivos pré-definidos pra reabrir atendimento concluído.
const MOTIVOS_REABERTURA = [
  'Valor cobrado errado',
  'Cliente vai pagar diferente',
  'Profissional errado registrado',
  'Serviço errado registrado',
  'Cliente pediu para reverter',
  'Erro de marcação (cliente ainda em atendimento)',
  'Outro',
] as const
type MotivoReabertura = typeof MOTIVOS_REABERTURA[number]

export default function AcoesAgendamentoSheet({ agendamento, onClose }: AcoesAgendamentoSheetProps) {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const [modoFinalizar, setModoFinalizar] = useState(false)
  const [valorFinal, setValorFinal] = useState<number | null>(null)
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>('PIX')
  // Modo reabrir: select de motivos + textarea pra "Outro"
  const [modoReabrir, setModoReabrir] = useState(false)
  const [motivoSelecionado, setMotivoSelecionado] = useState<MotivoReabertura>(MOTIVOS_REABERTURA[0])
  const [motivoTextoLivre, setMotivoTextoLivre] = useState<string>('')
  // Recibo: modal com dados completos do atendimento finalizado + botão imprimir
  const [verRecibo, setVerRecibo] = useState(false)

  const isOpen = agendamento !== null

  function resetEFecha() {
    setModoFinalizar(false)
    setModoReabrir(false)
    setMotivoSelecionado(MOTIVOS_REABERTURA[0])
    setMotivoTextoLivre('')
    setValorFinal(null)
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

  // #163: confirmar via endpoint dedicado pra gravar a flag confirmadoSemSinal.
  const mutationConfirmar = useMutation({
    mutationFn: ({ id, semSinal }: { id: number; semSinal: boolean }) =>
      agendamentoService.confirmar(id, semSinal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', 'Agendamento confirmado')
      resetEFecha()
    },
    onError: (err: any) => {
      showNotification('error', err.response?.data?.message || 'Erro ao confirmar')
    },
  })

  // #163: state pra modal "Confirmar mesmo assim?"
  const [confirmSemSinalAberto, setConfirmSemSinalAberto] = useState(false)

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

  const mutationReabrir = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      agendamentoService.reabrir(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', 'Atendimento reaberto. Finalize de novo com o valor correto.')
      resetEFecha()
    },
    onError: (err: any) => {
      showNotification('error', err.response?.data?.message || 'Erro ao reabrir')
    },
  })

  function submeterReabrir() {
    if (!agendamento?.id) return
    const motivoFinal =
      motivoSelecionado === 'Outro' ? motivoTextoLivre.trim() : motivoSelecionado
    if (!motivoFinal || motivoFinal.length < 3) {
      showNotification('error', 'Descreva o motivo da reabertura (mínimo 3 caracteres)')
      return
    }
    mutationReabrir.mutate({ id: agendamento.id, motivo: motivoFinal })
  }

  function alterarStatus(status: string) {
    if (!agendamento?.id) return
    if (status === 'CONFIRMADO') track(Events.PROFISSIONAL_CHECKIN, { agendamentoId: agendamento.id })
    if (status === 'EM_ANDAMENTO') track(Events.PROFISSIONAL_INICIAR_ATENDIMENTO, { agendamentoId: agendamento.id })
    if (status === 'NO_SHOW') track(Events.PROFISSIONAL_NO_SHOW, { agendamentoId: agendamento.id })

    // #163: confirmar passa por endpoint dedicado + modal "sem sinal" quando
    // não há sinal pago. Mantém /status pros outros casos (no-show etc).
    if (status === 'CONFIRMADO') {
      if (agendamento.sinalPago) {
        mutationConfirmar.mutate({ id: agendamento.id, semSinal: false })
      } else {
        setConfirmSemSinalAberto(true)
      }
      return
    }
    mutationStatus.mutate({ id: agendamento.id, status })
  }

  function submeterFinalizar() {
    if (!agendamento?.id) return
    const valorNum = valorFinal ?? NaN
    if (Number.isNaN(valorNum) || valorNum < 0) {
      showNotification('error', 'Valor inválido')
      return
    }
    track(Events.PROFISSIONAL_FINALIZAR, {
      agendamentoId: agendamento.id,
      valorFinal: valorNum,
      tipoPagamento,
    })
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

  const carregando = mutationStatus.isPending || mutationFinalizar.isPending || mutationConfirmar.isPending

  return (
    <BottomSheet isOpen={isOpen} onClose={resetEFecha} title={
      modoFinalizar ? 'Finalizar e cobrar'
        : modoReabrir ? 'Reabrir atendimento'
        : clienteNome
    }>
      {/* Cabeçalho do agendamento */}
      {!modoFinalizar && !modoReabrir && (
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

      {modoReabrir ? (
        <ReabrirForm
          motivoSelecionado={motivoSelecionado}
          setMotivoSelecionado={setMotivoSelecionado}
          motivoTextoLivre={motivoTextoLivre}
          setMotivoTextoLivre={setMotivoTextoLivre}
          carregando={mutationReabrir.isPending}
          onCancel={() => setModoReabrir(false)}
          onSubmit={submeterReabrir}
        />
      ) : modoFinalizar ? (
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
                setValorFinal(Number(valorBase))
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
                onClick={() => setVerRecibo(true)}
              />
              <ActionButton
                icon={RotateCcw}
                color="orange"
                label="Reabrir"
                desc="Voltar status para em andamento (pede motivo)"
                disabled={carregando}
                onClick={() => setModoReabrir(true)}
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
      {/* Recibo de atendimento finalizado (z-[200], acima do BottomSheet) */}
      {verRecibo && (
        <ReciboModal
          agendamento={agendamento}
          onClose={() => setVerRecibo(false)}
        />
      )}
      {/* #163: modal "Confirmar sem sinal?" */}
      <ConfirmDialog
        isOpen={confirmSemSinalAberto}
        title="Confirmar agendamento"
        message="Este agendamento não possui sinal registrado. Deseja confirmar o agendamento mesmo assim?"
        confirmText="Confirmar agendamento"
        cancelText="Cancelar"
        variant="warning"
        onConfirm={() => {
          setConfirmSemSinalAberto(false)
          if (agendamento?.id) {
            mutationConfirmar.mutate({ id: agendamento.id, semSinal: true })
          }
        }}
        onCancel={() => setConfirmSemSinalAberto(false)}
      />
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
  valorFinal: number | null
  setValorFinal: (n: number | null) => void
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
        <MoneyInput
          id="valorFinal"
          value={valorFinal}
          onChange={(n) => setValorFinal(n)}
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
          disabled={carregando || valorFinal == null || valorFinal <= 0}
          className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
        >
          {carregando ? 'Confirmando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}

function ReabrirForm({
  motivoSelecionado,
  setMotivoSelecionado,
  motivoTextoLivre,
  setMotivoTextoLivre,
  carregando,
  onCancel,
  onSubmit,
}: {
  motivoSelecionado: MotivoReabertura
  setMotivoSelecionado: (m: MotivoReabertura) => void
  motivoTextoLivre: string
  setMotivoTextoLivre: (s: string) => void
  carregando: boolean
  onCancel: () => void
  onSubmit: () => void
}) {
  const ehOutro = motivoSelecionado === 'Outro'
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Atenção</p>
          <p>
            Reabrir vai <strong>zerar o valor cobrado</strong> e apagar o registro de
            pagamento. Você precisa finalizar de novo com o valor correto. Se NFS-e
            foi emitida ou comissão calculada, ajuste em <strong>/comissoes</strong> e
            <strong> /relatorios</strong>.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Motivo da reabertura <span className="text-red-500">*</span>
        </label>
        <div className="space-y-1">
          {MOTIVOS_REABERTURA.map((m) => (
            <label
              key={m}
              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                motivoSelecionado === m
                  ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="motivo-reabertura"
                value={m}
                checked={motivoSelecionado === m}
                onChange={() => setMotivoSelecionado(m)}
                className="text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-slate-800">{m}</span>
            </label>
          ))}
        </div>
      </div>

      {ehOutro && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Descreva o motivo
          </label>
          <textarea
            value={motivoTextoLivre}
            onChange={(e) => setMotivoTextoLivre(e.target.value)}
            rows={3}
            placeholder="Conte o que aconteceu para que esse atendimento precise ser reaberto."
            maxLength={500}
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
          />
          <p className="text-[11px] text-slate-400 mt-1 text-right">
            {motivoTextoLivre.length}/500
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={onCancel}
          disabled={carregando}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
        >
          Voltar
        </button>
        <button
          onClick={onSubmit}
          disabled={carregando || (ehOutro && motivoTextoLivre.trim().length < 3)}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 shadow-sm shadow-orange-200 disabled:bg-slate-300 disabled:shadow-none transition"
        >
          {carregando ? 'Reabrindo...' : 'Reabrir atendimento'}
        </button>
      </div>
    </div>
  )
}
