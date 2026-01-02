import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usuarioService, Usuario, PerfilUsuario } from '../services/usuarioService'
import { unidadeService, Unidade } from '../services/unidadeService'
import { Plus, Trash2, Edit, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Usuarios() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const queryClient = useQueryClient()

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuarioService.listar,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const deleteMutation = useMutation({
    mutationFn: usuarioService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      showNotification('success', 'Usuário excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir usuário'
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Usuários</h1>
        <Button
          onClick={() => {
            setEditingUsuario(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {usuarios.map((usuario) => (
            <li key={usuario.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{usuario.nome}</p>
                  <p className="text-sm text-gray-500">Email: {usuario.email}</p>
                  <p className="text-sm text-gray-500">
                    Perfil: <span className="font-medium">{usuario.perfil}</span>
                  </p>
                  {usuario.nomeUnidade && (
                    <p className="text-sm text-gray-500">Unidade: {usuario.nomeUnidade}</p>
                  )}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${usuario.ativo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingUsuario(usuario)
                      setShowModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    aria-label="Editar usuário"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(usuario.id!)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    aria-label="Excluir usuário"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
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
          setEditingUsuario(null)
        }}
        title={editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
        size="md"
      >
        <UsuarioForm
          usuario={editingUsuario}
          unidades={unidades}
          onClose={() => {
            setShowModal(false)
            setEditingUsuario(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function UsuarioForm({
  usuario,
  unidades,
  onClose,
}: {
  usuario: Usuario | null
  unidades: Unidade[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<Usuario>(
    usuario || {
      nome: '',
      email: '',
      senha: '',
      perfil: 'ATENDENTE',
      unidadeId: undefined,
      ativo: true,
    }
  )

  const saveMutation = useMutation({
    mutationFn: (data: Usuario) =>
      usuario?.id
        ? usuarioService.atualizar(usuario.id, data)
        : usuarioService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      showNotification('success', usuario ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar usuário'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome" required>
        <input
          type="text"
          required
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>

      <FormField label="Email" required>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>

      <FormField label={usuario ? 'Nova Senha (deixe em branco para manter)' : 'Senha'} required={!usuario}>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required={!usuario}
            value={formData.senha || ''}
            onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </FormField>

      <FormField label="Perfil" required>
        <select
          required
          value={formData.perfil}
          onChange={(e) => {
            const perfil = e.target.value as PerfilUsuario
            setFormData({
              ...formData,
              perfil,
              // Limpa unidadeId se não for GERENTE
              unidadeId: perfil === 'GERENTE' ? formData.unidadeId : undefined,
            })
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="ADMIN">Administrador</option>
          <option value="GERENTE">Gerente</option>
          <option value="ATENDENTE">Atendente</option>
        </select>
      </FormField>

      {formData.perfil === 'GERENTE' && (
        <FormField label="Unidade" required>
          <select
            required
            value={formData.unidadeId || ''}
            onChange={(e) =>
              setFormData({ ...formData, unidadeId: parseInt(e.target.value) })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Selecione uma unidade</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.nome}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label="Status">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Ativo</span>
        </label>
      </FormField>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={saveMutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

