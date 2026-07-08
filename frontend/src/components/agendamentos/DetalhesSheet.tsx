import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  User,
  Clock,
  MapPin,
  Briefcase,
  CreditCard,
  StickyNote,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Wallet,
  Receipt,
} from 'lucide-react'
import BottomSheet from '../BottomSheet'
import ConfirmDialog from '../ConfirmDialog'
import MoneyInput from '../forms/MoneyInput'
import ReabrirAgendamentoModal from './ReabrirAgendamentoModal'
import ReceberSinalModal from './ReceberSinalModal'
import ReciboModal from '../profissional/ReciboModal'

import { agendamentoService, FinalizarAgendamento } from '../../services/agendamentoService'
import { useNotification } from '../../contexts/NotificationContext'
import { getApiErrorMessage } from '../../utils/apiError'

interface Props {
  agendamentoId: number | null
  onClose: () => void
}

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  AGENDADO: { label: 'Agendado', classes: 'bg-slate-100 text-slate-700' },
  CONFIRMADO: { label: 'Confirmado', classes: 'bg-blue-50 text-blue-700' },
  EM_ANDAMENTO: { label: 'Em procedimento', classes: 'bg-blue-50 text-blue-700' },
  PROCEDIMENTO_FIM: { label: 'Procedimento OK', classes: 'bg-blue-50 text-blue-700' },
  CONCLUIDO: { label: 'Finalizado', classes: 'bg-emerald-50 text-emerald-700' },
  FINALIZADO: { label: 'Finalizado', classes: 'bg-emerald-50 text-emerald-700' },
  CANCELADO: { label: 'Cancelado', classes: 'bg-red-50 text-red-700' },
  NO_SHOW: { label: 'Não compareceu', classes: 'bg-orange-50 text-orange-700' },
}

const FORMAS_PAGAMENTO_FINALIZAR = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de débito' },
] as const

/**
 * Converte a string interna do form (sempre número puro ou vírgula decimal)
 * pro number consumido pelo MoneyInput. Mantém compatibilidade com a lógica
 * antiga (parseValorBr no submit).
 */
function parseValorInput(s: string): number {
  if (!s) return 0
  const limpo = s.replace(/[^\d,.-]/g, '').replace(',', '.')
  const n = parseFloat(limpo)
  return Number.isFinite(n) ? n : 0
}

/**
 * Bottom-sheet de detalhes do agendamento.
 *
 * Slice 4. Cobre os fluxos comuns (visualizar, confirmar, finalizar, cancelar).
 * Edge cases (recorrência, sinal, devolução, no-show com observação) ficam pra
 * próxima iteração — botão "Editar no detalhe completo" leva pro modal legado.
 */
export default function DetalhesSheet({ agendamentoId, onClose }: Props) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [confirmCancelar, setConfirmCancelar] = useState(false)
  const [finalizandoOpen, setFinalizandoOpen] = useState(false)
  const [valorFinalInput, setValorFinalInput] = useState<string>('')
  const [tipoPagamentoFinal, setTipoPagamentoFinal] = useState<string>('PIX')
  const [reabrirOpen, setReabrirOpen] = useState(false)
  const [sinalOpen, setSinalOpen] = useState(false)
  const [reciboOpen, setReciboOpen] = useState(false)

  const { data: agendamento, isLoading } = useQuery({
    queryKey: ['agendamento', agendamentoId],
    queryFn: () => agendamentoService.buscarPorId(agendamentoId!),
    enabled: agendamentoId != null,
  })

  const status = agendamento?.status ?? 'AGENDADO'
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.AGENDADO

  const podeConfirmar = status === 'AGENDADO'
  const podeFinalizar = ['AGENDADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'PROCEDIMENTO_FIM'].includes(status)
  const podeCancelar = !['CANCELADO', 'CONCLUIDO', 'FINALIZADO'].includes(status)
  // Sinal: pode receber se status não-finalizado E sinal ainda não foi pago.
  // A configuração `cobraSinal` da unidade só controla a sugestão/ênfase;
  // mesmo unidade sem cobraSinal pode receber sinal voluntário pra qualquer agendamento.
  const sinalPago = Boolean(agendamento?.sinalPago)
  // #163: esconder "Receber Sinal" depois de uma confirmação deliberada sem sinal.
  const confirmadoSemSinal = Boolean((agendamento as any)?.confirmadoSemSinal)
  const podeReceberSinal =
    !!agendamento?.id &&
    !sinalPago &&
    !confirmadoSemSinal &&
    !['CANCELADO', 'CONCLUIDO', 'FINALIZADO'].includes(status)
  const percentualSinalUnidade = Number(agendamento?.unidade?.percentualSinal ?? 30)

  const inicio = agendamento?.dataHoraInicio ? new Date(agendamento.dataHoraInicio) : null
  const valorPadrao = agendamento?.valorTotal ?? agendamento?.valorFinal ?? 0

  // #163: confirmar via endpoint dedicado; semSinal=true grava flag pra esconder Receber Sinal.
  const confirmarMutation = useMutation({
    mutationFn: (semSinal: boolean) => agendamentoService.confirmar(agendamentoId!, semSinal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamento', agendamentoId] })
      showNotification('success', 'Agendamento confirmado!')
    },
    onError: (e: any) => showNotification('error', getApiErrorMessage(e, 'Erro ao confirmar')),
  })

  // #163: modal "Confirmar mesmo assim?" — abre quando user clica em confirmar
  // num agendamento que não tem sinal pago. Se sinal já está pago, confirma direto.
  const [confirmSemSinalAberto, setConfirmSemSinalAberto] = useState(false)
  const handleConfirmarClick = () => {
    if (sinalPago) {
      confirmarMutation.mutate(false)
    } else {
      setConfirmSemSinalAberto(true)
    }
  }

  const cancelarMutation = useMutation({
    mutationFn: () => agendamentoService.cancelar(agendamentoId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamento', agendamentoId] })
      showNotification('success', 'Agendamento cancelado.')
      setConfirmCancelar(false)
      onClose()
    },
    onError: (e: any) => {
      showNotification('error', getApiErrorMessage(e, 'Erro ao cancelar'))
      setConfirmCancelar(false)
    },
  })

  const finalizarMutation = useMutation({
    mutationFn: (payload: FinalizarAgendamento) => agendamentoService.finalizar(agendamentoId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamento', agendamentoId] })
      showNotification('success', 'Agendamento finalizado!')
      setFinalizandoOpen(false)
      onClose()
    },
    onError: (e: any) => showNotification('error', getApiErrorMessage(e, 'Erro ao finalizar')),
  })

  const handleFinalizar = () => {
    const valor = parseFloat(valorFinalInput.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      showNotification('error', 'Informe um valor final válido.')
      return
    }
    finalizarMutation.mutate({
      valorFinal: valor,
      tipoPagamento: tipoPagamentoFinal as any,
    })
  }

  const openFinalizando = () => {
    setValorFinalInput(String(valorPadrao || 0).replace('.', ','))
    setTipoPagamentoFinal('PIX')
    setFinalizandoOpen(true)
  }

  const isOpen = agendamentoId != null

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Detalhes do agendamento" size="full">
        {isLoading || !agendamento ? (
          <div className="py-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : (
          <div className="space-y-4">
            {/* Status + Cliente */}
            <div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.classes}`}
              >
                {badge.label}
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                {agendamento.cliente?.nome ?? `Cliente #${agendamento.clienteId}`}
              </h2>
            </div>

            {/* Info rows */}
            <div className="space-y-2">
              <InfoRow icon={Clock} label="Quando">
                {inicio ? (
                  <span>
                    {format(inicio, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    <br />
                    <span className="font-bold text-slate-900">
                      {format(inicio, 'HH:mm')}
                    </span>
                  </span>
                ) : (
                  '—'
                )}
              </InfoRow>

              <InfoRow icon={User} label="Profissional">
                {agendamento.atendente?.nomeUsuario
                  ?? agendamento.atendente?.usuario?.nome
                  ?? agendamento.atendente?.nome
                  ?? '—'}
                {(() => {
                  // #155: marca quando há outros profissionais nos itens
                  const itens = (agendamento.servicos ?? []) as any[]
                  const principal = agendamento.atendente?.id ?? agendamento.atendenteId
                  const outros = new Set(
                    itens
                      .map((it) => it.atendenteId)
                      .filter((id) => id != null && id !== principal)
                  )
                  if (outros.size === 0) return null
                  return (
                    <span className="ml-2 text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5">
                      + {outros.size} prof.
                    </span>
                  )
                })()}
              </InfoRow>

              {agendamento.unidade?.nome && (
                <InfoRow icon={MapPin} label="Unidade">
                  {agendamento.unidade.nome}
                </InfoRow>
              )}

              <InfoRow icon={Briefcase} label="Serviços">
                {agendamento.servicos && agendamento.servicos.length > 0 ? (
                  <div className="space-y-1">
                    {agendamento.servicos.map((s: any, i: number) => {
                      const nomeServico = s.nomeServico ?? s.servico?.nome ?? s.descricao ?? 'Serviço'
                      // #164: sempre mostrar QUAL profissional realiza o serviço.
                      // Se o item tem atendente próprio (#155), usa nomeAtendente.
                      // Senão, herda do atendente principal do agendamento.
                      const nomeAt =
                        s.nomeAtendente
                        ?? agendamento.atendente?.nomeUsuario
                        ?? agendamento.atendente?.usuario?.nome
                        ?? null
                      return (
                        <div key={i} className="text-sm flex items-center flex-wrap gap-1.5">
                          <span className="text-slate-800">{nomeServico}</span>
                          {nomeAt && (
                            <span className="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5">
                              {nomeAt.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  '—'
                )}
              </InfoRow>

              <InfoRow icon={CreditCard} label="Valor">
                <span className="font-bold text-slate-900">
                  R$ {Number(agendamento.valorTotal ?? agendamento.valorFinal ?? 0).toFixed(2).replace('.', ',')}
                </span>
                {agendamento.formaPagamentoPreferida && (
                  <span className="text-xs text-slate-500 ml-2">
                    · {agendamento.formaPagamentoPreferida.replace(/_/g, ' ')}
                  </span>
                )}
              </InfoRow>

              {agendamento.observacoes && (
                <InfoRow icon={StickyNote} label="Observações">
                  <p className="whitespace-pre-wrap text-slate-700">{agendamento.observacoes}</p>
                </InfoRow>
              )}
            </div>

            {/* Bloco "Sinal pago" — informativo quando já foi recebido */}
            {sinalPago && agendamento?.valorSinal != null && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-start gap-2">
                <Wallet className="h-5 w-5 text-violet-600 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-violet-900">
                    Sinal recebido: R$ {Number(agendamento.valorSinal).toFixed(2).replace('.', ',')}
                  </p>
                  {agendamento.sinalFormaPagamento && (
                    <p className="text-xs text-violet-700 mt-0.5">
                      via {agendamento.sinalFormaPagamento}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ações */}
            {(podeConfirmar || podeFinalizar || podeCancelar || podeReceberSinal) && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ações</p>

                {podeReceberSinal && (
                  <button
                    onClick={() => setSinalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-sm font-semibold hover:bg-violet-100 transition"
                  >
                    <Wallet className="h-4 w-4" />
                    Receber sinal {agendamento?.unidade?.cobraSinal ? `(${percentualSinalUnidade}% sugerido)` : ''}
                  </button>
                )}

                {podeConfirmar && (
                  <button
                    onClick={handleConfirmarClick}
                    disabled={confirmarMutation.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 shadow-sm shadow-violet-200 disabled:bg-slate-300 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {confirmarMutation.isPending ? 'Confirmando...' : 'Confirmar agendamento'}
                  </button>
                )}

                {podeFinalizar && (
                  <button
                    onClick={openFinalizando}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition"
                  >
                    <Check className="h-4 w-4" />
                    Finalizar atendimento
                  </button>
                )}

                {podeCancelar && (
                  <button
                    onClick={() => setConfirmCancelar(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
                  >
                    <X className="h-4 w-4" />
                    Cancelar agendamento
                  </button>
                )}
              </div>
            )}

            {/* Aviso pra status finais + ver recibo + opção de reabrir */}
            {(status === 'CONCLUIDO' || status === 'FINALIZADO' || status === 'PROCEDIMENTO_FIM') && (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm text-emerald-800">
                    Atendimento finalizado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReciboOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  <Receipt className="h-4 w-4" />
                  Ver recibo
                </button>
                <button
                  type="button"
                  onClick={() => setReabrirOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-sm font-semibold hover:bg-orange-100 transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reabrir atendimento
                </button>
              </div>
            )}

            {status === 'CANCELADO' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">Este agendamento foi cancelado.</p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Confirm cancelar */}
      <ConfirmDialog
        isOpen={confirmCancelar}
        title="Cancelar agendamento"
        message="Tem certeza? Esta ação pode ser revertida apenas reagendando manualmente."
        confirmText="Sim, cancelar"
        cancelText="Voltar"
        variant="danger"
        onConfirm={() => cancelarMutation.mutate()}
        onCancel={() => setConfirmCancelar(false)}
      />

      {/* #163: confirmar sem sinal */}
      <ConfirmDialog
        isOpen={confirmSemSinalAberto}
        title="Confirmar agendamento"
        message="Este agendamento não possui sinal registrado. Deseja confirmar o agendamento mesmo assim?"
        confirmText="Confirmar agendamento"
        cancelText="Cancelar"
        variant="warning"
        onConfirm={() => {
          setConfirmSemSinalAberto(false)
          confirmarMutation.mutate(true)
        }}
        onCancel={() => setConfirmSemSinalAberto(false)}
      />

      {/* Modal compartilhado de reabertura — z-[200] acima do BottomSheet */}
      <ReabrirAgendamentoModal
        agendamentoId={agendamentoId}
        isOpen={reabrirOpen}
        onClose={() => setReabrirOpen(false)}
        onSuccess={() => {
          // Fecha o BottomSheet pra forçar refetch quando o admin abrir o
          // agendamento de novo. Sem isso, status no card volta pra EM_ANDAMENTO
          // mas o detalhe aberto ainda mostra os botões antigos.
          onClose()
        }}
      />

      {/* Modal de receber sinal — z-[200] acima do BottomSheet */}
      <ReceberSinalModal
        agendamentoId={agendamentoId}
        valorTotal={Number(agendamento?.valorTotal ?? 0)}
        percentualSinal={percentualSinalUnidade}
        isOpen={sinalOpen}
        onClose={() => setSinalOpen(false)}
      />

      {/* Modal de recibo (somente leitura + imprimir) — z-[200] */}
      <ReciboModal
        agendamento={reciboOpen ? (agendamento ?? null) : null}
        onClose={() => setReciboOpen(false)}
      />

      {/* Sub-sheet de finalizar (valor final + forma) */}
      <BottomSheet
        isOpen={finalizandoOpen}
        onClose={() => setFinalizandoOpen(false)}
        title="Finalizar atendimento"
        size="auto"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setFinalizandoOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalizar}
              disabled={finalizarMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200 disabled:bg-slate-300"
            >
              {finalizarMutation.isPending ? 'Salvando...' : 'Confirmar finalização'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Valor recebido</label>
            <MoneyInput
              value={parseValorInput(valorFinalInput)}
              onChange={(n) => setValorFinalInput(n > 0 ? String(n) : '')}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Forma de pagamento</label>
            {/* Grid de botões selecionáveis — substitui o <select> nativo (não
                estilizado, ruim em mobile). Padrão consolidado no projeto
                (igual ao /cliente/agendar passo 3 e PWA do profissional). */}
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGAMENTO_FINALIZAR.map((f) => {
                const ativo = tipoPagamentoFinal === f.value
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setTipoPagamentoFinal(f.value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition text-left ${
                      ativo
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-100'
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
      </BottomSheet>
    </>
  )
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="h-8 w-8 rounded-full bg-white text-violet-600 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="text-sm text-slate-700 mt-0.5">{children}</div>
      </div>
    </div>
  )
}
