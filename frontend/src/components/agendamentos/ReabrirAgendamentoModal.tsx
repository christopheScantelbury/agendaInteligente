import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { agendamentoService } from '../../services/agendamentoService'
import { useNotification } from '../../contexts/NotificationContext'

/**
 * Modal de reabertura de atendimento (compartilhado).
 *
 * Usado em duas telas:
 *  - AcoesAgendamentoSheet (PWA do profissional)
 *  - DetalhesSheet (painel admin/gerente em /agendamentos)
 *
 * Encapsula:
 *  - Lista pré-definida de motivos comuns + opção "Outro" (texto livre)
 *  - Aviso de impacto financeiro (zera valor + remove pagamento)
 *  - Mutation que dispara POST /agendamentos/{id}/reabrir
 *  - Invalidação automática do cache de agendamentos
 *
 * z-[200] — acima do BottomSheet (z-120) e Modal (z-100), igual ao
 * ConfirmDialog. Padrão consolidado em feedback_zindex_hierarquia_overlays.
 */

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

interface Props {
  agendamentoId: number | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ReabrirAgendamentoModal({ agendamentoId, isOpen, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [motivoSelecionado, setMotivoSelecionado] = useState<MotivoReabertura>(MOTIVOS_REABERTURA[0])
  const [motivoTextoLivre, setMotivoTextoLivre] = useState<string>('')
  const ehOutro = motivoSelecionado === 'Outro'

  const mutationReabrir = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      agendamentoService.reabrir(id, motivo),
    onSuccess: (_data, variables) => {
      // IMPORTANTE: invalidar TANTO a lista quanto o detalhe individual.
      // Sem invalidar ['agendamento', id], o DetalhesSheet mantém cache stale
      // com status CONCLUIDO/FINALIZADO mesmo após o reabrir bem-sucedido
      // (bug 09/06 — card lista mostrava "EM PROCEDIMENTO" mas detalhe ainda
      // mostrava "FINALIZADO" + banner verde).
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['agendamento', variables.id] })
      showNotification('success', 'Atendimento reaberto. Finalize de novo com o valor correto.')
      // Reset + fecha
      setMotivoSelecionado(MOTIVOS_REABERTURA[0])
      setMotivoTextoLivre('')
      onClose()
      onSuccess?.()
    },
    onError: (err: any) => {
      showNotification('error', err.response?.data?.message || 'Erro ao reabrir')
    },
  })

  function submeter() {
    if (!agendamentoId) return
    const motivoFinal = ehOutro ? motivoTextoLivre.trim() : motivoSelecionado
    if (!motivoFinal || motivoFinal.length < 3) {
      showNotification('error', 'Descreva o motivo da reabertura (mínimo 3 caracteres)')
      return
    }
    mutationReabrir.mutate({ id: agendamentoId, motivo: motivoFinal })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <header className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Reabrir atendimento</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition"
            aria-label="Fechar"
            disabled={mutationReabrir.isPending}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Atenção</p>
              <p>
                Reabrir vai <strong>zerar o valor cobrado</strong> e apagar o registro de
                pagamento. Você precisa finalizar de novo com o valor correto. Se NFS-e
                foi emitida ou comissão calculada, ajuste em <strong>/comissoes</strong> e{' '}
                <strong>/relatorios</strong>.
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
                    name="motivo-reabertura-admin"
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
        </div>

        {/* Ações */}
        <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 sm:p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={mutationReabrir.isPending}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition w-full sm:w-auto"
          >
            Voltar
          </button>
          <button
            onClick={submeter}
            disabled={mutationReabrir.isPending || (ehOutro && motivoTextoLivre.trim().length < 3)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 shadow-sm shadow-orange-200 disabled:bg-slate-300 disabled:shadow-none transition w-full sm:w-auto inline-flex items-center justify-center gap-2"
          >
            {mutationReabrir.isPending ? 'Reabrindo…' : 'Reabrir atendimento'}
          </button>
        </footer>
      </div>
    </div>
  )
}
