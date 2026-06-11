import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Loader2, ShieldCheck, AlertTriangle, Receipt } from 'lucide-react'
import { useState } from 'react'
import { notaFacilService } from '../../services/notaFacilService'
import { useNotification } from '../../contexts/NotificationContext'
import { authService } from '../../services/authService'
import Button from '../Button'
import ConfirmDialog from '../ConfirmDialog'

/**
 * #159: card de provisionamento NotaFácil pra uma unidade.
 *
 * Substitui o input manual de `sk_live_...`. Mostra checklist de pré-requisitos
 * + botão "Provisionar" (chama gateway, grava api_key) ou card verde com chave
 * mascarada + opção "Revogar".
 */
export default function NotaFacilCard({ unidadeId }: { unidadeId: number }) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [confirmRevogar, setConfirmRevogar] = useState(false)
  const usuario = authService.getUsuario()
  const perfil = (usuario?.perfil ?? '').toUpperCase()
  const podeRevogar = perfil === 'ADMIN' || perfil === 'ADMINISTRADOR'

  const { data: status, isLoading } = useQuery({
    queryKey: ['notafacil-status', unidadeId],
    queryFn: () => notaFacilService.status(unidadeId),
    enabled: !!unidadeId,
  })

  const provisionarMutation = useMutation({
    mutationFn: () => notaFacilService.provisionar(unidadeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notafacil-status', unidadeId] })
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      showNotification('success', 'Emissão de NFS-e ativada!')
    },
    onError: (e: any) => {
      showNotification('error', e.response?.data?.message || 'Erro ao provisionar')
    },
  })

  const revogarMutation = useMutation({
    mutationFn: () => notaFacilService.revogar(unidadeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notafacil-status', unidadeId] })
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      showNotification('success', 'Emissão de NFS-e revogada.')
      setConfirmRevogar(false)
    },
    onError: (e: any) => {
      showNotification('error', e.response?.data?.message || 'Erro ao revogar')
    },
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando status NotaFácil...
      </div>
    )
  }

  if (!status) return null

  const todosOk = status.preRequisitos.every((p) => p.ok)

  // ── Card verde: provisionado ──
  if (status.provisionado) {
    return (
      <>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-900">Emissão de NFS-e ativa</p>
              {status.provisionadoEm && (
                <p className="text-[11px] text-emerald-700">
                  Ativo desde {new Date(status.provisionadoEm).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          {status.apiKeyMascarada && (
            <div className="bg-white border border-emerald-100 rounded-lg px-3 py-2 text-xs font-mono text-emerald-900">
              Chave: <span className="font-bold">{status.apiKeyMascarada}</span>
            </div>
          )}

          {podeRevogar && (
            <button
              type="button"
              onClick={() => setConfirmRevogar(true)}
              className="text-xs text-red-600 hover:text-red-700 font-semibold transition"
            >
              Revogar emissão
            </button>
          )}
        </div>

        <ConfirmDialog
          isOpen={confirmRevogar}
          title="Revogar emissão de NFS-e?"
          message="A chave de emissão será apagada. Esta unidade não conseguirá mais emitir NFS-e até reprovisionar. Tem certeza?"
          confirmText="Revogar"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => revogarMutation.mutate()}
          onCancel={() => setConfirmRevogar(false)}
        />
      </>
    )
  }

  // ── Card amarelo: não provisionado ──
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">Emissão de NFS-e não está ativa</p>
          <p className="text-[11px] text-amber-700">
            Provisione automaticamente — sem precisar copiar/colar chave manualmente.
          </p>
        </div>
      </div>

      <div className="bg-white border border-amber-100 rounded-lg p-3 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Pré-requisitos
        </p>
        {status.preRequisitos.map((p) => (
          <div key={p.chave} className="flex items-start gap-2 text-xs">
            {p.ok ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className={p.ok ? 'text-slate-700' : 'text-red-700 font-semibold'}>
                {p.rotulo}
              </span>
              {p.detalhe && (
                <span className="text-slate-500 ml-1">— {p.detalhe}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!todosOk && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-100/50 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>Complete os campos faltantes nesta unidade (ou no plano da empresa) para liberar o botão.</span>
        </div>
      )}

      <Button
        type="button"
        onClick={() => provisionarMutation.mutate()}
        disabled={!todosOk || provisionarMutation.isPending}
      >
        {provisionarMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Provisionando...
          </>
        ) : (
          'Provisionar emissão de NFS-e'
        )}
      </Button>
    </div>
  )
}
