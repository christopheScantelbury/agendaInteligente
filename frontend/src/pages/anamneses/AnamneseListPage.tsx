import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Eye } from 'lucide-react'
import { anamneseService } from '../../services/anamneseService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import Button from '../../components/Button'

export default function AnamneseListPage() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  })

  const { data: anamneses = [], isLoading } = useQuery({
    queryKey: ['anamneses'],
    queryFn: () => anamneseService.listar({}),
  })

  const deleteMutation = useMutation({
    mutationFn: anamneseService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamneses'] })
      showNotification('success', 'Ficha excluída com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao excluir ficha'
      showNotification('error', msg)
    },
  })

  const filtered = anamneses.filter((a) => {
    if (!searchTerm) return true
    return a.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Anamneses</h1>
        <Button onClick={() => navigate('/anamneses/nova')}>
          <Plus className="h-5 w-5 mr-2" />
          Nova Ficha
        </Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome de cliente..."
          className="block w-full sm:w-80 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? 'Nenhuma ficha encontrada com os filtros aplicados' : 'Nenhuma ficha encontrada'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serviço</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{a.clienteNome}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.servicoNome || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.templateNome || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {a.data ? new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/anamneses/${a.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                            aria-label="Ver ficha"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ isOpen: true, id: a.id })}
                            className="text-red-600 hover:text-red-800"
                            aria-label="Excluir ficha"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="sm:hidden divide-y divide-gray-200">
              {filtered.map((a) => (
                <li key={a.id} className="px-4 py-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">{a.clienteNome}</p>
                      {a.servicoNome && <p className="text-xs text-gray-500">{a.servicoNome}</p>}
                      {a.templateNome && <p className="text-xs text-gray-400">{a.templateNome}</p>}
                      <p className="text-xs text-gray-500">
                        {a.data ? new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/anamneses/${a.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ isOpen: true, id: a.id })}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
              Mostrando {filtered.length} de {anamneses.length} ficha{anamneses.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta ficha? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete.id) deleteMutation.mutate(confirmDelete.id)
        }}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}
