import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conviteService, ConviteAcessoResposta, ConviteAcessoCriar } from '../services/conviteService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { Plus, Link2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'

export default function ConvitesAcesso() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [form, setForm] = useState<ConviteAcessoCriar>({
    maxUnidades: 1,
    dataExpiracaoLink: '',
    dataExpiracaoAcesso: '',
  })

  const { data: perfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
  })
  const podeCriar = podeEditar(perfil, '/convites-acesso')

  const { data: convites = [], isLoading } = useQuery({
    queryKey: ['convites-acesso'],
    queryFn: conviteService.listarConvitesAcesso,
    enabled: !!podeCriar || true,
  })

  const criarMutation = useMutation({
    mutationFn: conviteService.criarConviteAcesso,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites-acesso'] })
      showNotification('success', 'Link criado com sucesso!')
      setShowModal(false)
      setForm({ maxUnidades: 1, dataExpiracaoLink: '', dataExpiracaoAcesso: '' })
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao criar link')
    },
  })

  const copiarLink = (item: ConviteAcessoResposta) => {
    navigator.clipboard.writeText(item.link)
    setCopiedId(item.id)
    showNotification('success', 'Link copiado!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatarData = (s: string) => (s ? new Date(s).toLocaleString('pt-BR') : '-')

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Links de venda de acesso</h1>
        {podeCriar && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Novo link
          </Button>
        )}
      </div>

      <p className="text-gray-600 mb-4">
        Gere links para novos gerentes finalizarem o cadastro (empresa, unidade e usuário). Quem acessar o link poderá criar conta como gerente.
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
                      Até {item.maxUnidades} unidade(s) · Acesso até {formatarData(item.dataExpiracaoAcesso)}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1">{item.link}</p>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Novo link de venda de acesso" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.dataExpiracaoLink || !form.dataExpiracaoAcesso) {
              showNotification('error', 'Preencha data de expiração do link e do acesso.')
              return
            }
            criarMutation.mutate(form)
          }}
          className="space-y-4"
        >
          <FormField label="Máximo de unidades" required>
            <input
              type="number"
              min={1}
              max={100}
              value={form.maxUnidades}
              onChange={(e) => setForm({ ...form, maxUnidades: parseInt(e.target.value, 10) || 1 })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Link válido até" required>
            <input
              type="datetime-local"
              value={form.dataExpiracaoLink}
              onChange={(e) => setForm({ ...form, dataExpiracaoLink: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Acesso ao sistema válido até" required>
            <input
              type="date"
              value={form.dataExpiracaoAcesso}
              onChange={(e) => setForm({ ...form, dataExpiracaoAcesso: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
