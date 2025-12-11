import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unidadeService, Unidade } from '../services/unidadeService'
import { clinicaService } from '../services/clinicaService'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'

export default function Unidades() {
  const [showModal, setShowModal] = useState(false)
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null)
  const queryClient = useQueryClient()

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const { data: clinicas = [] } = useQuery({
    queryKey: ['clinicas'],
    queryFn: clinicaService.listar,
  })

  const deleteMutation = useMutation({
    mutationFn: unidadeService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
    },
  })

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta unidade?')) {
      deleteMutation.mutate(id)
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
                  {unidade.nomeClinica && (
                    <p className="text-sm text-gray-500">Clínica: {unidade.nomeClinica}</p>
                  )}
                  {unidade.endereco && (
                    <p className="text-sm text-gray-500">
                      {unidade.endereco}
                      {unidade.numero && `, ${unidade.numero}`}
                      {unidade.bairro && ` - ${unidade.bairro}`}
                    </p>
                  )}
                  {unidade.telefone && (
                    <p className="text-sm text-gray-500">Telefone: {unidade.telefone}</p>
                  )}
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
          clinicas={clinicas}
          onClose={() => {
            setShowModal(false)
            setEditingUnidade(null)
          }}
        />
      </Modal>
    </div>
  )
}

function UnidadeForm({
  unidade,
  clinicas,
  onClose,
}: {
  unidade: Unidade | null
  clinicas: any[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
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
      clinicaId: undefined,
    }
  )

  const saveMutation = useMutation({
    mutationFn: (data: Unidade) =>
      unidade?.id
        ? unidadeService.atualizar(unidade.id, data)
        : unidadeService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Clínica" required>
        <select
          required
          value={formData.clinicaId || ''}
          onChange={(e) => setFormData({ ...formData, clinicaId: parseInt(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Selecione uma clínica</option>
          {clinicas.map((clinica) => (
            <option key={clinica.id} value={clinica.id}>
              {clinica.nome}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nome" required>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>
        <FormField label="CEP">
          <input
            type="text"
            value={formData.cep || ''}
            onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
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

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Telefone">
          <input
            type="text"
            value={formData.telefone || ''}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>
        <FormField label="Email">
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>
      </div>

      <FormField label="Descrição">
        <textarea
          value={formData.descricao || ''}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
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

