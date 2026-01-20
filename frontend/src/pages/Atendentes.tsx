import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { atendenteService, Atendente } from '../services/atendenteService'
import { unidadeService } from '../services/unidadeService'
import { usuarioService } from '../services/usuarioService'
import { servicoService } from '../services/servicoService'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskCPF, maskPhone } from '../utils/masks'

export default function Atendentes() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingAtendente, setEditingAtendente] = useState<Atendente | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const queryClient = useQueryClient()

  const { data: atendentes = [], isLoading } = useQuery({
    queryKey: ['atendentes'],
    queryFn: atendenteService.listarTodos,
  })

  const deleteMutation = useMutation({
    mutationFn: atendenteService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendentes'] })
      showNotification('success', 'Atendente excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir atendente'
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Atendentes</h1>
        <Button
          onClick={() => {
            setEditingAtendente(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Atendente
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {atendentes.map((atendente) => (
            <li key={atendente.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {atendente.nomeUsuario || 'Atendente'}
                  </p>
                  {atendente.nomeUnidade && (
                    <p className="text-sm text-gray-500">Unidade: {atendente.nomeUnidade}</p>
                  )}
                  <p className="text-sm text-gray-500">CPF: {atendente.cpf}</p>
                  {atendente.telefone && (
                    <p className="text-sm text-gray-500">Telefone: {atendente.telefone}</p>
                  )}
                  {(atendente.percentualComissao !== undefined && atendente.percentualComissao !== null) && (
                    <p className="text-sm text-gray-500">
                      Comissão: {typeof atendente.percentualComissao === 'number' 
                        ? atendente.percentualComissao.toFixed(2) 
                        : parseFloat(String(atendente.percentualComissao)).toFixed(2)}%
                    </p>
                  )}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${atendente.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {atendente.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingAtendente(atendente)
                      setShowModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    aria-label="Editar atendente"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(atendente.id!)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    aria-label="Excluir atendente"
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
          setEditingAtendente(null)
        }}
        title={editingAtendente ? 'Editar Atendente' : 'Novo Atendente'}
        size="lg"
      >
        <AtendenteForm
          atendente={editingAtendente}
          onClose={() => {
            setShowModal(false)
            setEditingAtendente(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este atendente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function AtendenteForm({
  atendente,
  onClose,
}: {
  atendente: Atendente | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<Atendente>({
    unidadeId: 0,
    usuarioId: 0,
    cpf: '',
    telefone: '',
    percentualComissao: undefined,
    ativo: true,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuarioService.listar,
  })

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listarTodos,
  })

  const [servicosSelecionados, setServicosSelecionados] = useState<number[]>([])

  // Carrega dados do atendente quando edita
  useEffect(() => {
    if (atendente) {
      setFormData({
        unidadeId: atendente.unidadeId || 0,
        usuarioId: atendente.usuarioId || 0,
        cpf: atendente.cpf || '',
        telefone: atendente.telefone || '',
        percentualComissao: atendente.percentualComissao !== undefined && atendente.percentualComissao !== null && atendente.percentualComissao !== 0
          ? atendente.percentualComissao 
          : undefined,
        ativo: atendente.ativo !== undefined ? atendente.ativo : true,
      })
      setServicosSelecionados(atendente.servicosIds || [])
    } else {
      // Reset para novo atendente
      setFormData({
        unidadeId: 0,
        usuarioId: 0,
        cpf: '',
        telefone: '',
        percentualComissao: undefined,
        ativo: true,
      })
      setServicosSelecionados([])
    }
  }, [atendente])


  const saveMutation = useMutation({
    mutationFn: (data: Atendente) =>
      atendente?.id
        ? atendenteService.atualizar(atendente.id, data)
        : atendenteService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atendentes'] })
      showNotification('success', atendente ? 'Atendente atualizado com sucesso!' : 'Atendente criado com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar atendente'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSave = {
      ...formData,
      servicosIds: servicosSelecionados,
      percentualComissao: formData.percentualComissao === undefined || formData.percentualComissao === null
        ? 0 
        : formData.percentualComissao
    }
    saveMutation.mutate(dataToSave as any)
  }

  const handleServicoToggle = (servicoId: number) => {
    setServicosSelecionados((prev) =>
      prev.includes(servicoId) ? prev.filter((id) => id !== servicoId) : [...prev, servicoId]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Unidade" required>
        <select
          required
          value={formData.unidadeId}
          onChange={(e) => setFormData({ ...formData, unidadeId: parseInt(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="0">Selecione uma unidade</option>
          {unidades.map((unidade) => (
            <option key={unidade.id} value={unidade.id}>
              {unidade.nome}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Usuário" required>
        <select
          required
          value={formData.usuarioId}
          onChange={(e) => setFormData({ ...formData, usuarioId: parseInt(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="0">Selecione um usuário</option>
          {usuarios
            .filter((u) => u.perfil === 'ATENDENTE')
            .map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome} ({usuario.email})
              </option>
            ))}
        </select>
      </FormField>

      <FormField label="CPF" required>
        <input
          type="text"
          required
          value={formData.cpf}
          onChange={(e) => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
          maxLength={14}
          placeholder="000.000.000-00"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>

      <FormField label="Telefone">
        <input
          type="text"
          value={formData.telefone || ''}
          onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
          maxLength={15}
          placeholder="(00) 00000-0000"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>

      <FormField label="Percentual de Comissão (%)">
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formData.percentualComissao !== undefined && formData.percentualComissao !== null && formData.percentualComissao !== 0
            ? formData.percentualComissao 
            : ''}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '') {
              setFormData({ ...formData, percentualComissao: 0 });
            } else {
              const numValue = parseFloat(value);
              setFormData({ 
                ...formData, 
                percentualComissao: isNaN(numValue) ? 0 : numValue
              });
            }
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="0.00"
        />
        <p className="mt-1 text-xs text-gray-500">Percentual de comissão sobre os serviços prestados (0.00 a 100.00). Deixe vazio para 0%.</p>
      </FormField>

      <FormField label="Serviços" required>
        <div className="mt-1 space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3">
          {servicos
            .filter((s) => s.ativo)
            .map((servico) => (
              <label
                key={servico.id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={servicosSelecionados.includes(servico.id)}
                  onChange={() => handleServicoToggle(servico.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex-1">
                  <span className="font-medium">{servico.nome}</span>
                  <span className="text-gray-600 ml-2">
                    - R$ {servico.valor.toFixed(2)} ({servico.duracaoMinutos} min)
                  </span>
                </span>
              </label>
            ))}
        </div>
        {servicosSelecionados.length === 0 && (
          <p className="mt-1 text-sm text-red-600">Selecione pelo menos um serviço</p>
        )}
      </FormField>

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

