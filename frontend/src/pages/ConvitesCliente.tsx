import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conviteService, ConviteClienteResposta, ConviteClienteCriar } from '../services/conviteService'
import { unidadeService } from '../services/unidadeService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { Plus, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'

export default function ConvitesCliente() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [form, setForm] = useState<ConviteClienteCriar>({
    unidadeId: 0,
    dataExpiracao: '',
  })

  const { data: perfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
  })
  const podeCriar = podeEditar(perfil, '/convites-cliente')

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listar,
    enabled: showModal,
  })

  const { data: convites = [], isLoading, error: convitesError } = useQuery({
    queryKey: ['convites-cliente'],
    queryFn: conviteService.listarConvitesCliente,
    enabled: !!podeCriar || true,
    retry: false,
  })

  const criarMutation = useMutation({
    mutationFn: conviteService.criarConviteCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites-cliente'] })
      showNotification('success', 'Link criado com sucesso!')
      setShowModal(false)
      setForm((f) => ({ ...f, dataExpiracao: '' }))
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao criar link')
    },
  })

  const copiarLink = (item: ConviteClienteResposta) => {
    navigator.clipboard.writeText(item.link)
    setCopiedId(item.id)
    showNotification('success', 'Link copiado!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatarData = (s: string) => (s ? new Date(s).toLocaleString('pt-BR') : '-')

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  if (convitesError) {
    const msg = (convitesError as any)?.response?.data?.message ?? 'Erro ao carregar links de cliente'
    return (
      <div className="w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Links para clientes</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">{msg}</p>
          <p className="text-xs text-yellow-700 mt-2">
            Caso seja inesperado, peça ao administrador para revisar permissões em <strong>Perfis</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Links de cadastro de clientes</h1>
        {podeCriar && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Novo link
          </Button>
        )}
      </div>

      <p className="text-gray-600 mb-4">
        Gere links para clientes se cadastrarem na unidade escolhida. Quem acessar o link criará usuário e senha com perfil de cliente.
      </p>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {convites.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Nenhum link criado. Clique em &quot;Novo link&quot; para gerar um.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {convites.map((item) => (
              <li key={item.id} className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Unidade: {item.unidadeNome}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1">{item.link}</p>
                    <p className="text-xs text-gray-500 mt-1">Expira em {formatarData(item.dataExpiracao)}</p>
                    {item.usadoEm && (
                      <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        Usado em {formatarData(item.usadoEm)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copiarLink(item)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 mr-1 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copiar link
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo link para cliente" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.unidadeId || !form.dataExpiracao) {
              showNotification('error', 'Selecione a unidade e a data de expiração.')
              return
            }
            criarMutation.mutate(form)
          }}
          className="space-y-4"
        >
          <FormField label="Unidade" required>
            <select
              value={form.unidadeId || ''}
              onChange={(e) => setForm({ ...form, unidadeId: parseInt(e.target.value, 10) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            >
              <option value="">Selecione</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Link válido até" required>
            <input
              type="datetime-local"
              value={form.dataExpiracao}
              onChange={(e) => setForm({ ...form, dataExpiracao: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={criarMutation.isPending}>
              Gerar link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
