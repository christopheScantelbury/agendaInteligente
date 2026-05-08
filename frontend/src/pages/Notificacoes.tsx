import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reclamacaoService, Reclamacao } from '../services/reclamacaoService'
import { authService } from '../services/authService'
import { unidadeService } from '../services/unidadeService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { Bell, Check, AlertCircle, Sparkles, Copy, ClipboardCheck } from 'lucide-react'
import Button from '../components/Button'
import { useNotification } from '../contexts/NotificationContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { iaService } from '../services/iaService'
import { useState } from 'react'

export default function Notificacoes() {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()

  const { data: perfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarNotificacoes = podeEditar(perfil, '/notificacoes')

  // Determinar qual query usar baseado no perfil
  const perfilNorm = (usuario?.perfil ?? '').toUpperCase().replace('-', '_')
  const isAdmin = perfilNorm === 'ADMIN' || perfilNorm === 'ADMINISTRADOR'
  const unidadeId = usuario?.unidadeId

  const { data: reclamacoes = [], isLoading } = useQuery<Reclamacao[]>({
    queryKey: ['reclamacoes', isAdmin ? 'todas' : 'unidade', unidadeId],
    queryFn: () => {
      if (isAdmin) {
        return reclamacaoService.listarTodas()
      } else if (unidadeId) {
        return reclamacaoService.listarPorUnidade(unidadeId)
      }
      return Promise.resolve([])
    },
    enabled: isAdmin || !!unidadeId,
  })

  const { data: contador = 0 } = useQuery({
    queryKey: ['reclamacoes', 'contador', isAdmin ? 'todas' : 'unidade', unidadeId],
    queryFn: () => {
      if (isAdmin) {
        return reclamacaoService.contarNaoLidas()
      } else if (unidadeId) {
        return reclamacaoService.contarNaoLidasPorUnidade(unidadeId)
      }
      return Promise.resolve(0)
    },
    enabled: isAdmin || !!unidadeId,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    enabled: isAdmin,
  })

  const marcarComoLidaMutation = useMutation({
    mutationFn: reclamacaoService.marcarComoLida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reclamacoes'] })
      showNotification('success', 'Reclamação marcada como lida')
    },
    onError: () => {
      showNotification('error', 'Erro ao marcar reclamação como lida')
    },
  })

  const reclamacoesNaoLidas = reclamacoes.filter((r) => !r.lida)
  const reclamacoesLidas = reclamacoes.filter((r) => r.lida)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-full">
            <Bell className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
            <p className="text-sm text-gray-500">
              {contador > 0
                ? `${contador} reclamação${contador > 1 ? 'ões' : ''} não lida${contador > 1 ? 's' : ''}`
                : 'Nenhuma reclamação pendente'}
            </p>
          </div>
        </div>
      </div>

      {/* Reclamações Não Lidas */}
      {reclamacoesNaoLidas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Não Lidas ({reclamacoesNaoLidas.length})
          </h2>
          <div className="space-y-4">
            {reclamacoesNaoLidas.map((reclamacao) => (
              <ReclamacaoCard
                key={reclamacao.id}
                reclamacao={reclamacao}
                unidades={unidades}
                onMarcarComoLida={podeEditarNotificacoes ? () => reclamacao.id && marcarComoLidaMutation.mutate(reclamacao.id) : undefined}
                isLoading={marcarComoLidaMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reclamações Lidas */}
      {reclamacoesLidas.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Lidas ({reclamacoesLidas.length})
          </h2>
          <div className="space-y-4">
            {reclamacoesLidas.map((reclamacao) => (
              <ReclamacaoCard
                key={reclamacao.id}
                reclamacao={reclamacao}
                unidades={unidades}
                onMarcarComoLida={podeEditarNotificacoes ? () => reclamacao.id && marcarComoLidaMutation.mutate(reclamacao.id) : undefined}
                isLoading={marcarComoLidaMutation.isPending}
                isLida
              />
            ))}
          </div>
        </div>
      )}

      {reclamacoes.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhuma reclamação encontrada</p>
        </div>
      )}
    </div>
  )
}

function ReclamacaoCard({
  reclamacao,
  unidades,
  onMarcarComoLida,
  isLoading,
  isLida = false,
}: {
  reclamacao: Reclamacao
  unidades: any[]
  onMarcarComoLida?: () => void
  isLoading: boolean
  isLida?: boolean
}) {
  const unidade = unidades.find((u) => u.id === reclamacao.unidadeId)
  const [respostaIa, setRespostaIa] = useState('')
  const [loadingIa, setLoadingIa] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const handleSugerirResposta = async () => {
    if (!reclamacao.mensagem) return
    setLoadingIa(true)
    try {
      const resposta = await iaService.sugerirRespostaReclamacao(reclamacao.mensagem)
      setRespostaIa(resposta)
    } finally {
      setLoadingIa(false)
    }
  }

  const handleCopiar = () => {
    navigator.clipboard.writeText(respostaIa)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${
        isLida ? 'border-slate-200 opacity-75' : 'border-red-500'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {unidade && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded-full mb-2">
              {unidade.nome}
            </span>
          )}
          <p className="text-gray-900 whitespace-pre-wrap">{reclamacao.mensagem}</p>
        </div>
      </div>

      {/* Resposta sugerida pela IA */}
      {respostaIa && (
        <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-violet-700 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Resposta sugerida pela IA
            </span>
            <button
              onClick={handleCopiar}
              className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors"
            >
              {copiado ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <textarea
            value={respostaIa}
            onChange={(e) => setRespostaIa(e.target.value)}
            className="w-full text-sm text-slate-700 bg-transparent border-none outline-none resize-none"
            rows={4}
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <div className="text-sm text-gray-500">
          {reclamacao.dataCriacao && (
            <span>
              Enviada em{' '}
              {format(new Date(reclamacao.dataCriacao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isLida && (
            <button
              onClick={handleSugerirResposta}
              disabled={loadingIa}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loadingIa ? 'Gerando...' : 'Sugerir resposta com IA'}
            </button>
          )}
          {!isLida && onMarcarComoLida && (
            <Button variant="secondary" size="sm" onClick={onMarcarComoLida} isLoading={isLoading}>
              <Check className="h-4 w-4 mr-2" />
              Marcar como lida
            </Button>
          )}
          {isLida && reclamacao.dataLeitura && (
            <span className="text-sm text-gray-500">
              Lida em{' '}
              {format(new Date(reclamacao.dataLeitura), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
