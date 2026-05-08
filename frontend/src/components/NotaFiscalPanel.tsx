import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notaFiscalService, StatusNotaFiscal } from '../services/notaFiscalService'
import { useNotification } from '../contexts/NotificationContext'
import { FileText, Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'

const STATUS_CONFIG: Record<StatusNotaFiscal, { label: string; cls: string }> = {
  PENDENTE:     { label: 'Pendente',     cls: 'bg-slate-100 text-slate-600' },
  PROCESSANDO:  { label: 'Processando…', cls: 'bg-amber-100 text-amber-700' },
  EMITIDA:      { label: 'Emitida ✓',   cls: 'bg-emerald-100 text-emerald-700' },
  CANCELADA:    { label: 'Cancelada',    cls: 'bg-slate-100 text-slate-500' },
  ERRO:         { label: 'Erro',         cls: 'bg-red-100 text-red-700' },
}

interface Props {
  agendamentoId: number
  agendamentoStatus?: string
}

export default function NotaFiscalPanel({ agendamentoId, agendamentoStatus }: Props) {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const isConcluido =
    agendamentoStatus === 'CONCLUIDO' ||
    agendamentoStatus === 'NO_SHOW' ||
    agendamentoStatus === 'PROCEDIMENTO_FIM'

  const { data: nota, isLoading, isError } = useQuery({
    queryKey: ['notaFiscal', agendamentoId],
    queryFn: () => notaFiscalService.buscarPorAgendamento(agendamentoId),
    enabled: isConcluido,
    retry: false,
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.status === 'PROCESSANDO' ? 8_000 : false,
  })

  const emitirMutation = useMutation({
    mutationFn: () => notaFiscalService.emitir(agendamentoId),
    onSuccess: () => {
      showNotification('success', 'NFS-e enviada para emissão via NotaFácil.')
      queryClient.invalidateQueries({ queryKey: ['notaFiscal', agendamentoId] })
    },
    onError: () => showNotification('error', 'Erro ao emitir NFS-e. Tente novamente.'),
  })

  if (!isConcluido) return null

  const statusCfg = nota ? STATUS_CONFIG[nota.status] : null

  return (
    <div className="flex items-start gap-4 rounded-lg px-2 py-2">
      {/* Ícone */}
      <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-violet-600 text-white">
        <FileText className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">NFS-e (NotaFácil)</p>

        {isLoading && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando nota fiscal…
          </div>
        )}

        {/* Sem nota ainda — botão emitir */}
        {!isLoading && (isError || !nota) && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-slate-400">Nota não emitida</span>
            <button
              onClick={() => emitirMutation.mutate()}
              disabled={emitirMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {emitirMutation.isPending
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Enviando…</>
                : 'Emitir via NotaFácil'}
            </button>
          </div>
        )}

        {/* Nota encontrada */}
        {nota && (
          <div className="mt-1 space-y-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg?.cls}`}>
              {statusCfg?.label}
            </span>

            {nota.status === 'EMITIDA' && (
              <>
                {nota.numeroNfse && (
                  <p className="text-xs text-slate-500">
                    Número: <span className="font-medium text-slate-700">{nota.numeroNfse}</span>
                  </p>
                )}
                {nota.codigoVerificacao && (
                  <p className="text-xs text-slate-500">
                    Código: <span className="font-medium text-slate-700">{nota.codigoVerificacao}</span>
                  </p>
                )}
                {nota.urlNfse && (
                  <a
                    href={nota.urlNfse}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver / Download PDF
                  </a>
                )}
              </>
            )}

            {nota.status === 'PROCESSANDO' && (
              <p className="flex items-center gap-1 text-xs text-amber-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aguardando autorização da prefeitura…
              </p>
            )}

            {nota.status === 'ERRO' && (
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {nota.mensagemErro ?? 'Erro na emissão'}
                </p>
                <button
                  onClick={() => emitirMutation.mutate()}
                  disabled={emitirMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  <RefreshCw className="h-3 w-3" />
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
