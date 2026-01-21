import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { perfilService, Perfil } from '../services/perfilService'
import { Plus, Trash2, Edit, Shield, Lock, Eye, Pencil, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'

type TipoPermissao = 'EDITAR' | 'VISUALIZAR' | 'SEM_ACESSO'

// Lista de menus disponíveis no sistema
const MENUS_DISPONIVEIS = [
  { path: '/', label: 'Início' },
  { path: '/clientes', label: 'Clientes' },
  { path: '/empresas', label: 'Empresas' },
  { path: '/unidades', label: 'Unidades' },
  { path: '/atendentes', label: 'Atendentes' },
  { path: '/servicos', label: 'Serviços' },
  { path: '/usuarios', label: 'Usuários' },
  { path: '/perfis', label: 'Perfis' },
  { path: '/agendamentos', label: 'Agendamentos' },
  { path: '/notificacoes', label: 'Notificações' },
]

export default function Perfis() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const queryClient = useQueryClient()

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ['perfis'],
    queryFn: perfilService.listarTodos,
  })

  const deleteMutation = useMutation({
    mutationFn: perfilService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] })
      showNotification('success', 'Perfil excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir perfil'
      showNotification('error', errorMessage)
    },
  })

  const handleDelete = (id: number) => {
    setConfirmDelete({ isOpen: true, id })
  }

  const confirmDeleteAction = () => {
    if (confirmDelete.id) {
      deleteMutation.mutate(confirmDelete.id)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Perfis e Permissões</h1>
        <Button
          onClick={() => {
            setEditingPerfil(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Perfil
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {perfis.map((perfil) => (
            <li key={perfil.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {perfil.sistema ? (
                    <Lock className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Shield className="h-5 w-5 text-blue-500" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{perfil.nome}</p>
                      {perfil.sistema && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Sistema</span>
                      )}
                    </div>
                    {perfil.descricao && (
                      <p className="text-sm text-gray-500">{perfil.descricao}</p>
                    )}
                    {perfil.permissoesMenu && perfil.permissoesMenu.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {perfil.permissoesMenu.length} menu(s) permitido(s)
                      </p>
                    )}
                  </div>
                </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingPerfil(perfil)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        aria-label="Editar perfil"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      {!perfil.sistema && (
                        <button
                          onClick={() => handleDelete(perfil.id!)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          aria-label="Excluir perfil"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingPerfil(null)
        }}
        title={editingPerfil ? 'Editar Perfil' : 'Novo Perfil'}
        size="lg"
      >
        <PerfilForm
          perfil={editingPerfil}
          onClose={() => {
            setShowModal(false)
            setEditingPerfil(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function PerfilForm({
  perfil,
  onClose,
}: {
  perfil: Perfil | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<Perfil>(
    perfil || {
      nome: '',
      descricao: '',
      sistema: false,
      ativo: true,
      permissoesMenu: [],
      permissoesGranulares: {},
    }
  )

  useEffect(() => {
    if (perfil) {
      setFormData({
        ...perfil,
        permissoesGranulares: perfil.permissoesGranulares || {},
      })
    } else {
      setFormData({
        nome: '',
        descricao: '',
        sistema: false,
        ativo: true,
        permissoesMenu: [],
        permissoesGranulares: {},
      })
    }
  }, [perfil])

  const setPermissaoMenu = (menuPath: string, tipo: TipoPermissao) => {
    const novasPermissoes = {
      ...(formData.permissoesGranulares || {}),
      [menuPath]: tipo,
    }
    
    // Se for SEM_ACESSO, remover da lista
    if (tipo === 'SEM_ACESSO') {
      delete novasPermissoes[menuPath]
    }
    
    setFormData({
      ...formData,
      permissoesGranulares: novasPermissoes,
      // Manter compatibilidade com permissoesMenu
      permissoesMenu: tipo !== 'SEM_ACESSO' 
        ? [...new Set([...(formData.permissoesMenu || []), menuPath])]
        : (formData.permissoesMenu || []).filter(path => path !== menuPath),
    })
  }

  const getPermissaoMenu = (menuPath: string): TipoPermissao => {
    return (formData.permissoesGranulares?.[menuPath] as TipoPermissao) || 'SEM_ACESSO'
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Perfil) => {
      return perfil?.id
        ? perfilService.atualizar(perfil.id, data)
        : perfilService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] })
      showNotification('success', perfil ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar perfil'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nome do Perfil" required>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
            placeholder="Ex: VENDEDOR, SUPERVISOR"
            disabled={perfil?.sistema || false}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </FormField>

        <FormField label="Descrição">
          <textarea
            value={formData.descricao || ''}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            rows={3}
            placeholder="Descreva as responsabilidades deste perfil..."
            disabled={perfil?.sistema || false}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </FormField>

        <div className="pt-4 border-t">
          <FormField label="Permissões de Menu">
            <div className="mt-2 space-y-3 max-h-96 overflow-y-auto">
              {MENUS_DISPONIVEIS.map((menu) => {
                const permissaoAtual = getPermissaoMenu(menu.path)
                return (
                  <div
                    key={menu.path}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{menu.label}</span>
                        <span className="ml-2 text-xs text-gray-400">{menu.path}</span>
                      </div>
                      {permissaoAtual !== 'SEM_ACESSO' && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          permissaoAtual === 'EDITAR' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {permissaoAtual === 'EDITAR' ? 'Editar' : 'Visualizar'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPermissaoMenu(menu.path, 'EDITAR')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          permissaoAtual === 'EDITAR'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermissaoMenu(menu.path, 'VISUALIZAR')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          permissaoAtual === 'VISUALIZAR'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermissaoMenu(menu.path, 'SEM_ACESSO')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          permissaoAtual === 'SEM_ACESSO'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <X className="h-4 w-4" />
                        Sem Acesso
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600 mb-2">
                <strong>Legenda:</strong>
              </p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span><strong>Editar:</strong> Pode criar, editar e excluir registros</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span><strong>Visualizar:</strong> Pode apenas visualizar, sem edição</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded"></div>
                  <span><strong>Sem Acesso:</strong> Menu não aparece na navegação</span>
                </div>
              </div>
            </div>
          </FormField>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            isLoading={saveMutation.isPending}
          >
            Salvar
          </Button>
        </div>
        {perfil?.sistema && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Perfil do sistema:</strong> Apenas as permissões de menu podem ser editadas. Nome e descrição são fixos.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
