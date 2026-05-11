import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit } from 'lucide-react'
import { clienteService } from '../services/clienteService'
import { authService } from '../services/authService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { matchSearch } from '../utils/normalize'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import FilterBar from '../components/FilterBar'
import Button from '../components/Button'
import { useCategoria } from '../hooks/useCategoria'

export default function Clientes() {
  const { showNotification } = useNotification()
  const { dict } = useCategoria()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string }>({})

  const usuario = authService.getUsuario()
  const { data: perfilUsuario } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })

  const podeEditarClientes = podeEditar(perfilUsuario, '/usuarios')

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
  })

  const clientesFiltrados = useMemo(() => {
    let filtered = [...clientes]

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          matchSearch(c.nome, searchTerm) ||
          (c.cpfCnpj || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
          matchSearch(c.email ?? '', searchTerm) ||
          (c.telefone && c.telefone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')))
      )
    }

    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((c) => (c.ativo ?? true) === isAtivo)
    }

    return filtered
  }, [clientes, searchTerm, filters])

  const deleteMutation = useMutation({
    mutationFn: clienteService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', 'Cliente excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir cliente'
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{dict.rotuloClientePlural}</h1>
        {podeEditarClientes && (
          <Button onClick={() => navigate('/clientes/novo')}>
            <Plus className="h-5 w-5 mr-2" />
            Novo {dict.rotuloCliente}
          </Button>
        )}
      </div>

      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome, CPF/CNPJ, email ou telefone..."
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
        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
                ? 'Nenhum cliente encontrado com os filtros aplicados'
                : 'Nenhum cliente cadastrado.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {clientesFiltrados.map((cliente) => (
            <li key={cliente.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{cliente.nome}</p>
                  <p className="text-sm text-gray-500">CPF/CNPJ: {cliente.cpfCnpj || 'Não informado'}</p>
                  {cliente.email && (
                    <p className="text-sm text-gray-500">Email: {cliente.email}</p>
                  )}
                  {cliente.telefone && (
                    <p className="text-sm text-gray-500">Telefone: {cliente.telefone}</p>
                  )}
                </div>
                {podeEditarClientes && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/clientes/${cliente.id}/editar`)}
                      className="text-blue-600 hover:text-blue-800"
                      aria-label="Editar cliente"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id!)}
                      className="text-red-600 hover:text-red-800"
                      aria-label="Excluir cliente"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </li>
            ))}
          </ul>
        )}
        {clientesFiltrados.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Mostrando {clientesFiltrados.length} de {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}
