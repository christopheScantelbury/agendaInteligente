import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unidadeService, Unidade } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { Plus, Trash2, Edit, Clock, UserCog, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Unidades() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const queryClient = useQueryClient()

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const deleteMutation = useMutation({
    mutationFn: unidadeService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      showNotification('success', 'Unidade excluída com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir unidade'
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Unidades</h1>
        <Button
          onClick={() => {
            setEditingUnidade(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Unidade
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {unidades.map((unidade) => (
            <li key={unidade.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{unidade.nome}</p>

                  {unidade.endereco && (
                    <p className="text-sm text-gray-500">
                      {unidade.endereco}
                      {unidade.numero && `, ${unidade.numero}`}
                      {unidade.bairro && ` - ${unidade.bairro}`}
                    </p>
                  )}
                  <div className="flex gap-4 mt-1">
                    {unidade.telefone && (
                      <p className="text-sm text-gray-500">Tel: {unidade.telefone}</p>
                    )}
                    {(unidade.horarioAbertura || unidade.horarioFechamento) && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {unidade.horarioAbertura?.slice(0, 5)} - {unidade.horarioFechamento?.slice(0, 5)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingUnidade(unidade)
                      setShowModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    aria-label="Editar unidade"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(unidade.id!)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    aria-label="Excluir unidade"
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
          setEditingUnidade(null)
        }}
        title={editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}
        size="lg"
      >
        <UnidadeForm
          unidade={editingUnidade}
          onClose={() => {
            setShowModal(false)
            setEditingUnidade(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function UnidadeForm({
  unidade,
  onClose,
}: {
  unidade: Unidade | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<Unidade>(
    unidade || {
      nome: '',
      descricao: '',
      endereco: '',
      numero: '',
      bairro: '',
      cep: '',
      cidade: '',
      uf: '',
      telefone: '',
      email: '',
      ativo: true,
      horarioAbertura: '08:00',
      horarioFechamento: '18:00',
      // unidadeId handled automatically
    }
  )

  const saveMutation = useMutation({
    mutationFn: async (data: Unidade) => {
      // Garantir campos de hora no formato HH:mm:ss se necessário, ou HH:mm
      // Backend espera LocalTime, string HH:mm funciona geralmente
      return unidade?.id
        ? unidadeService.atualizar(unidade.id, data)
        : unidadeService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      showNotification('success', unidade ? 'Unidade atualizada com sucesso!' : 'Unidade criada com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar unidade'
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nome da Unidade" required>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Abertura">
              <input
                type="time"
                value={formData.horarioAbertura || ''}
                onChange={(e) => setFormData({ ...formData, horarioAbertura: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Fechamento">
              <input
                type="time"
                value={formData.horarioFechamento || ''}
                onChange={(e) => setFormData({ ...formData, horarioFechamento: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="CEP">
            <input
              type="text"
              value={formData.cep || ''}
              onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Telefone">
            <input
              type="text"
              value={formData.telefone || ''}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
        </div>

        <FormField label="Endereço">
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Número">
            <input
              type="text"
              value={formData.numero || ''}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Bairro">
            <input
              type="text"
              value={formData.bairro || ''}
              onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="UF">
            <input
              type="text"
              maxLength={2}
              value={formData.uf || ''}
              onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </FormField>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saveMutation.isPending}>
            Salvar
          </Button>
        </div>
      </form>

      {/* Seção de Atendentes (Apenas edição) */}
      {unidade?.id && (
        <div className="border-t pt-6 mt-6">
          <AtendentesSection unidadeId={unidade.id} />
        </div>
      )}
    </div>
  )
}

function AtendentesSection({ unidadeId }: { unidadeId: number }) {
  const { data: atendentes = [], isLoading } = useQuery({
    queryKey: ['atendentes', 'unidade', unidadeId],
    queryFn: () => atendenteService.listarPorUnidade(unidadeId),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <UserCog className="h-5 w-5 mr-2 text-gray-500" />
          Funcionários (Atendentes)
        </h3>
        <Link
          to="/atendentes"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          Gerenciar Atendentes <ExternalLink className="h-3 w-3 ml-1" />
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : atendentes.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500 mb-2">Nenhum atendente vinculado a esta unidade.</p>
          <Link to="/atendentes">
            <Button variant="secondary" size="sm">
              Adicionar Novo Atendente
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {atendentes.map((atendente) => (
            <li key={atendente.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{atendente.nomeUsuario || 'Nome não disponível'}</p>
                <p className="text-xs text-gray-500">CPF: {atendente.cpf}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${atendente.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {atendente.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

