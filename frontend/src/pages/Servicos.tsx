import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { servicoService, Servico } from '../services/servicoService'
import { unidadeService } from '../services/unidadeService'
import { usuarioService } from '../services/usuarioService'
import { authService } from '../services/authService'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import FilterBar from '../components/FilterBar'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Servicos() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingServico, setEditingServico] = useState<Servico | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string }>({})
  const queryClient = useQueryClient()

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listarTodos,
  })

  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  // Função helper para obter nome da unidade
  const getNomeUnidade = (unidadeId: number) => {
    const unidade = todasUnidades.find(u => u.id === unidadeId)
    return unidade?.nome || 'Unidade não encontrada'
  }

  const servicosFiltrados = useMemo(() => {
    let filtered = [...servicos]

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.nome.toLowerCase().includes(term) ||
          s.descricao?.toLowerCase().includes(term)
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((s) => (s.ativo ?? true) === isAtivo)
    }

    return filtered
  }, [servicos, searchTerm, filters])

  const deleteMutation = useMutation({
    mutationFn: servicoService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
      showNotification('success', 'Serviço excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir serviço'
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Serviços</h1>
        <Button
          onClick={() => {
            setEditingServico(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Barra de Filtros */}
      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome ou descrição..."
        filters={[
          {
            key: 'ativo',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'true', label: 'Ativos' },
              { value: 'false', label: 'Inativos' },
            ],
          },
        ]}
      />

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {servicosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum serviço encontrado com os filtros aplicados'
                : 'Nenhum serviço cadastrado'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {servicosFiltrados.map((servico) => (
            <li key={servico.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{servico.nome}</p>
                  {servico.descricao && (
                    <p className="text-sm text-gray-500">{servico.descricao}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Valor: R$ {servico.valor.toFixed(2)} | Duração: {servico.duracaoMinutos} min
                    {servico.unidadeId && (
                      <> | Unidade: {getNomeUnidade(servico.unidadeId)}</>
                    )}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        servico.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {servico.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingServico(servico)
                      setShowModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    aria-label="Editar serviço"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(servico.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    aria-label="Excluir serviço"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
            ))}
          </ul>
        )}
        {servicosFiltrados.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Mostrando {servicosFiltrados.length} de {servicos.length} serviço{servicos.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingServico(null)
        }}
        title={editingServico ? 'Editar Serviço' : 'Novo Serviço'}
        size="md"
      >
        <ServicoForm
          servico={editingServico}
          onClose={() => {
            setShowModal(false)
            setEditingServico(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function ServicoForm({
  servico,
  onClose,
}: {
  servico: Servico | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const usuario = authService.getUsuario()
  const perfilLogado = usuario?.perfil

  // Buscar todas as unidades
  const { data: todasUnidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  // Buscar usuário completo para obter suas unidades (se não for admin)
  const { data: usuarioCompleto } = useQuery({
    queryKey: ['usuario', usuario?.usuarioId],
    queryFn: () => {
      if (!usuario?.usuarioId) return Promise.resolve(null)
      return usuarioService.buscarPorId(usuario.usuarioId)
    },
    enabled: !!usuario?.usuarioId && perfilLogado !== 'ADMIN',
  })

  // Filtrar unidades baseado no perfil
  const unidadesDisponiveis = useMemo(() => {
    if (perfilLogado === 'ADMIN') {
      return todasUnidades
    }
    // Para GERENTE e PROFISSIONAL, usar unidades do usuário completo
    if (usuarioCompleto?.unidadesIds && usuarioCompleto.unidadesIds.length > 0) {
      return todasUnidades.filter(u => usuarioCompleto.unidadesIds?.includes(u.id!))
    }
    // Fallback: usar unidadeId se existir
    if (usuario?.unidadeId) {
      return todasUnidades.filter(u => u.id === usuario.unidadeId)
    }
    return []
  }, [todasUnidades, perfilLogado, usuarioCompleto?.unidadesIds, usuario?.unidadeId])

  const [formData, setFormData] = useState<Servico>({
    id: 0,
    nome: '',
    descricao: '',
    valor: 0,
    duracaoMinutos: 30,
    unidadeId: 0,
    ativo: true,
  })

  // Atualizar formData quando servico ou unidadesDisponiveis mudarem
  useEffect(() => {
    if (servico) {
      // Ao editar: usar dados do serviço
      setFormData({
        id: servico.id,
        nome: servico.nome || '',
        descricao: servico.descricao || '',
        valor: servico.valor || 0,
        duracaoMinutos: servico.duracaoMinutos || 30,
        unidadeId: servico.unidadeId || 0,
        ativo: servico.ativo !== undefined ? servico.ativo : true,
      })
    } else {
      // Ao criar: usar unidade padrão se houver apenas uma disponível
      const unidadePadrao = unidadesDisponiveis.length === 1 ? unidadesDisponiveis[0].id! : 0
      setFormData({
        id: 0,
        nome: '',
        descricao: '',
        valor: 0,
        duracaoMinutos: 30,
        unidadeId: unidadePadrao,
        ativo: true,
      })
    }
  }, [servico, unidadesDisponiveis])

  const saveMutation = useMutation({
    mutationFn: (data: Servico) =>
      servico?.id
        ? servicoService.atualizar(servico.id, data)
        : servicoService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
      showNotification('success', servico ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar serviço'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação adicional
    if (!formData.unidadeId || formData.unidadeId === 0) {
      showNotification('error', 'Por favor, selecione uma unidade')
      return
    }

    if (!formData.nome || formData.nome.trim() === '') {
      showNotification('error', 'Por favor, informe o nome do serviço')
      return
    }

    if (!formData.valor || formData.valor <= 0) {
      showNotification('error', 'Por favor, informe um valor válido')
      return
    }

    if (!formData.duracaoMinutos || formData.duracaoMinutos <= 0) {
      showNotification('error', 'Por favor, informe uma duração válida')
      return
    }

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

      <FormField label="Descrição">
        <textarea
          value={formData.descricao || ''}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>

      <FormField label="Unidade" required>
        <p className="text-xs text-gray-500 mb-2">O serviço ficará disponível apenas nesta unidade.</p>
        <select
          required
          value={formData.unidadeId || ''}
          onChange={(e) => setFormData({ ...formData, unidadeId: parseInt(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={unidadesDisponiveis.length === 1}
        >
          <option value="">Selecione uma unidade</option>
          {unidadesDisponiveis.map((unidade) => (
            <option key={unidade.id} value={unidade.id}>
              {unidade.nome}
            </option>
          ))}
        </select>
        {unidadesDisponiveis.length === 0 && (
          <p className="mt-1 text-sm text-red-600">Você não tem acesso a nenhuma unidade</p>
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Valor (R$)" required>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>

        <FormField label="Duração (minutos)" required>
          <input
            type="number"
            min="1"
            required
            value={formData.duracaoMinutos}
            onChange={(e) =>
              setFormData({ ...formData, duracaoMinutos: parseInt(e.target.value) || 30 })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>
      </div>

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

