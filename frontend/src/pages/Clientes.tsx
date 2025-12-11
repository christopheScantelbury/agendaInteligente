import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clienteService, Cliente } from '../services/clienteService'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useState } from 'react'

export default function Clientes() {
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const queryClient = useQueryClient()

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
  })

  const deleteMutation = useMutation({
    mutationFn: clienteService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => {
            setEditingCliente(null)
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {clientes.map((cliente) => (
            <li key={cliente.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{cliente.nome}</p>
                  <p className="text-sm text-gray-500">CPF/CNPJ: {cliente.cpfCnpj}</p>
                  {cliente.email && (
                    <p className="text-sm text-gray-500">Email: {cliente.email}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingCliente(cliente)
                      setShowModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cliente.id!)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showModal && (
        <ClienteModal
          cliente={editingCliente}
          onClose={() => {
            setShowModal(false)
            setEditingCliente(null)
          }}
        />
      )}
    </div>
  )
}

function ClienteModal({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Cliente>(
    cliente || {
      nome: '',
      cpfCnpj: '',
      email: '',
      telefone: '',
    }
  )

  const saveMutation = useMutation({
    mutationFn: (data: Cliente) =>
      cliente?.id
        ? clienteService.atualizar(cliente.id, data)
        : clienteService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {cliente ? 'Editar Cliente' : 'Novo Cliente'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
            <input
              type="text"
              required
              value={formData.cpfCnpj}
              onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="text"
              value={formData.telefone || ''}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

