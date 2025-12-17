import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clinicaService, Clinica } from '../services/clinicaService'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useState } from 'react'

export default function Clinicas() {
  const [showModal, setShowModal] = useState(false)
  const [editingClinica, setEditingClinica] = useState<Clinica | null>(null)
  const queryClient = useQueryClient()

  const { data: clinicas = [], isLoading } = useQuery({
    queryKey: ['clinicas'],
    queryFn: clinicaService.listar,
  })

  const deleteMutation = useMutation({
    mutationFn: clinicaService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinicas'] })
    },
  })

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta clínica?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clínicas</h1>
        <button
          onClick={() => {
            setEditingClinica(null)
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Clínica
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {clinicas.map((clinica) => (
            <li key={clinica.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{clinica.nome}</p>
                  <p className="text-sm text-gray-500">CNPJ: {clinica.cnpj}</p>
                  {clinica.email && (
                    <p className="text-sm text-gray-500">Email: {clinica.email}</p>
                  )}
                  {clinica.telefone && (
                    <p className="text-sm text-gray-500">Telefone: {clinica.telefone}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingClinica(clinica)
                      setShowModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(clinica.id!)}
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
        <ClinicaModal
          clinica={editingClinica}
          onClose={() => {
            setShowModal(false)
            setEditingClinica(null)
          }}
        />
      )}
    </div>
  )
}

function ClinicaModal({ clinica, onClose }: { clinica: Clinica | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Clinica>(
    clinica || {
      nome: '',
      cnpj: '',
      razaoSocial: '',
      email: '',
      telefone: '',
      endereco: '',
      numero: '',
      bairro: '',
      cep: '',
      cidade: '',
      uf: '',
      inscricaoMunicipal: '',
      inscricaoEstadual: '',
      complemento: '',
      ativo: true,
    }
  )

  const saveMutation = useMutation({
    mutationFn: (data: Clinica) =>
      clinica?.id
        ? clinicaService.atualizar(clinica.id, data)
        : clinicaService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinicas'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {clinica ? 'Editar Clínica' : 'Nova Clínica'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome *</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CNPJ *</label>
              <input
                type="text"
                required
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Razão Social</label>
              <input
                type="text"
                value={formData.razaoSocial || ''}
                onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
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
            <div>
              <label className="block text-sm font-medium text-gray-700">CEP</label>
              <input
                type="text"
                value={formData.cep || ''}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Inscrição Municipal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.inscricaoMunicipal || ''}
                onChange={(e) => setFormData({ ...formData, inscricaoMunicipal: e.target.value })}
                placeholder="Obrigatório para emissão de NFS-e"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Necessário para emissão de notas fiscais
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Inscrição Estadual</label>
              <input
                type="text"
                value={formData.inscricaoEstadual || ''}
                onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Complemento</label>
              <input
                type="text"
                value={formData.complemento || ''}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Endereço</label>
              <input
                type="text"
                value={formData.endereco || ''}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Número</label>
              <input
                type="text"
                value={formData.numero || ''}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bairro</label>
              <input
                type="text"
                value={formData.bairro || ''}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cidade</label>
              <input
                type="text"
                value={formData.cidade || ''}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">UF</label>
              <input
                type="text"
                maxLength={2}
                value={formData.uf || ''}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
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

