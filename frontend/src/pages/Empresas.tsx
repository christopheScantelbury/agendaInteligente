import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { empresaService, Empresa } from '../services/empresaService'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskPhone, maskCEP, maskCNPJ, maskEmail } from '../utils/masks'

export default function Empresas() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const queryClient = useQueryClient()

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['empresas'],
    queryFn: empresaService.listarTodos,
  })

  const deleteMutation = useMutation({
    mutationFn: empresaService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      showNotification('success', 'Empresa excluída com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir empresa'
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Empresas</h1>
        <Button
          onClick={() => {
            setEditingEmpresa(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Empresa
        </Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {empresas.map((empresa) => (
            <li key={empresa.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {empresa.logo && (
                    <img src={empresa.logo} alt={empresa.nome} className="h-12 w-12 object-contain rounded" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{empresa.nome}</p>
                    {empresa.razaoSocial && (
                      <p className="text-sm text-gray-500">Razão Social: {empresa.razaoSocial}</p>
                    )}
                    {empresa.cnpj && (
                      <p className="text-sm text-gray-500">CNPJ: {empresa.cnpj}</p>
                    )}
                    {empresa.email && (
                      <p className="text-sm text-gray-500">Email: {empresa.email}</p>
                    )}
                    {empresa.telefone && (
                      <p className="text-sm text-gray-500">Tel: {empresa.telefone}</p>
                    )}
                    {empresa.corApp && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">Cor do App:</span>
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: empresa.corApp }}
                        />
                        <span className="text-sm text-gray-500">{empresa.corApp}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingEmpresa(empresa)
                      setShowModal(true)
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    aria-label="Editar empresa"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(empresa.id!)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    aria-label="Excluir empresa"
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
          setEditingEmpresa(null)
        }}
        title={editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
        size="lg"
      >
        <EmpresaForm
          empresa={editingEmpresa}
          onClose={() => {
            setShowModal(false)
            setEditingEmpresa(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function EmpresaForm({
  empresa,
  onClose,
}: {
  empresa: Empresa | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<Empresa>(
    empresa || {
      nome: '',
      razaoSocial: '',
      cnpj: '',
      email: '',
      telefone: '',
      endereco: '',
      numero: '',
      bairro: '',
      cep: '',
      cidade: '',
      uf: '',
      ativo: true,
      logo: undefined,
      corApp: '#2563EB',
    }
  )
  const [logoPreview, setLogoPreview] = useState<string | undefined>(empresa?.logo)

  useEffect(() => {
    if (empresa) {
      setFormData(empresa)
      setLogoPreview(empresa.logo)
    } else {
      setFormData({
        nome: '',
        razaoSocial: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        numero: '',
        bairro: '',
        cep: '',
        cidade: '',
        uf: '',
        ativo: true,
        logo: undefined,
        corApp: '#2563EB',
      })
      setLogoPreview(undefined)
    }
  }, [empresa])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setLogoPreview(base64String)
        setFormData((prev) => ({ ...prev, logo: base64String }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoPreview(undefined)
    setFormData((prev) => ({ ...prev, logo: undefined }))
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Empresa) => {
      return empresa?.id
        ? empresaService.atualizar(empresa.id, data)
        : empresaService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      showNotification('success', empresa ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar empresa'
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
        <FormField label="Nome da Empresa" required>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>

        <FormField label="Razão Social">
          <input
            type="text"
            value={formData.razaoSocial || ''}
            onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="CNPJ">
            <input
              type="text"
              value={formData.cnpj || ''}
              onChange={(e) => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
              maxLength={18}
              placeholder="00.000.000/0000-00"
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
        </div>

        <FormField label="Email">
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
            placeholder="exemplo@email.com"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>

        <FormField label="CEP">
          <input
            type="text"
            value={formData.cep || ''}
            onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
            maxLength={9}
            placeholder="00000-000"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>

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
              onChange={(e) => setFormData({ ...formData, numero: e.target.value.replace(/\D/g, '') })}
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

        <FormField label="Cidade">
          <input
            type="text"
            value={formData.cidade || ''}
            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <FormField label="Logo da Empresa">
            <input
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {logoPreview && (
              <div className="mt-4 flex items-center space-x-4">
                <img src={logoPreview} alt="Logo Preview" className="h-20 w-20 object-contain border rounded-md" />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remover Logo
                </button>
              </div>
            )}
          </FormField>

          <FormField label="Cor Principal do App (Hexadecimal)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.corApp || '#2563EB'}
                onChange={(e) => setFormData({ ...formData, corApp: e.target.value })}
                className="mt-1 h-10 w-10 rounded-md border-gray-300 shadow-sm cursor-pointer"
              />
              <input
                type="text"
                value={formData.corApp || ''}
                onChange={(e) => {
                  const value = e.target.value
                  if (/^#[0-9A-Fa-f]{6}$/.test(value) || value === '') {
                    setFormData({ ...formData, corApp: value || '#2563EB' })
                  }
                }}
                placeholder="#2563EB"
                maxLength={7}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
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
    </div>
  )
}
