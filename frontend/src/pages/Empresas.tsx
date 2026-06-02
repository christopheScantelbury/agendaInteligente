import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { empresaService, Empresa } from '../services/empresaService'
import { authService } from '../services/authService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { Plus, Trash2, Edit, Briefcase, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskPhone, maskCEP, maskCNPJ, maskEmail } from '../utils/masks'
import { buscarEnderecoPorCep } from '../utils/viaCep'

export default function Empresas() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()

  const { data: perfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarEmpresas = podeEditar(perfil, '/empresas')

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
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-violet-600" />
            Empresas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Dados cadastrais e identidade visual das empresas.
          </p>
        </div>
        {podeEditarEmpresas && (
          <Button
            onClick={() => {
              setEditingEmpresa(null)
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Empresa
          </Button>
        )}
      </header>

      {empresas.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <Briefcase className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">Nenhuma empresa cadastrada ainda.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {empresas.map((empresa) => {
            const inicial = (empresa.nome || '?').charAt(0).toUpperCase()
            return (
              <li
                key={empresa.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-3">
                  {empresa.logo ? (
                    <img
                      src={empresa.logo}
                      alt={empresa.nome}
                      className="h-10 w-10 object-contain rounded-lg bg-slate-50 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {inicial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{empresa.nome}</p>
                    {empresa.razaoSocial && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{empresa.razaoSocial}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      {empresa.cnpj && <span>CNPJ {empresa.cnpj}</span>}
                      {empresa.cnpj && empresa.telefone && <span>·</span>}
                      {empresa.telefone && <span>{empresa.telefone}</span>}
                    </div>
                    {empresa.email && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{empresa.email}</p>
                    )}
                    {empresa.corApp && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className="h-4 w-4 rounded-full border border-slate-200 flex-shrink-0"
                          style={{ backgroundColor: empresa.corApp }}
                        />
                        <span className="text-[11px] font-mono text-slate-500">{empresa.corApp}</span>
                      </div>
                    )}
                  </div>
                  {podeEditarEmpresas && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingEmpresa(empresa)
                          setShowModal(true)
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                        aria-label="Editar empresa"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(empresa.id!)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                        aria-label="Excluir empresa"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

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

  // ViaCEP: auto-preenche endereço/bairro/cidade/uf quando CEP completo.
  const [cepCarregando, setCepCarregando] = useState(false)
  const cepAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const cepDigits = (formData.cep ?? '').replace(/\D/g, '')
    if (cepDigits.length !== 8) {
      cepAbortRef.current?.abort()
      setCepCarregando(false)
      return
    }
    cepAbortRef.current?.abort()
    const controller = new AbortController()
    cepAbortRef.current = controller
    setCepCarregando(true)
    const timer = setTimeout(async () => {
      try {
        const endereco = await buscarEnderecoPorCep(cepDigits, controller.signal)
        if (controller.signal.aborted || !endereco) return
        setFormData((prev) => ({
          ...prev,
          endereco: prev.endereco?.trim() ? prev.endereco : endereco.logradouro,
          bairro: prev.bairro?.trim() ? prev.bairro : endereco.bairro,
          cidade: prev.cidade?.trim() ? prev.cidade : endereco.cidade,
          uf: prev.uf?.trim() ? prev.uf : endereco.uf,
        }))
      } finally {
        if (!controller.signal.aborted) setCepCarregando(false)
      }
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [formData.cep])

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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </FormField>

        <FormField label="Razão Social">
          <input
            type="text"
            value={formData.razaoSocial || ''}
            onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
          <FormField label="Telefone">
            <input
              type="text"
              value={formData.telefone || ''}
              onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
              maxLength={15}
              placeholder="(00) 00000-0000"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
        </div>

        <FormField label="Email">
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
            placeholder="exemplo@email.com"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </FormField>

        <FormField label="CEP">
          <div className="relative">
            <input
              type="text"
              value={formData.cep || ''}
              onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
              maxLength={9}
              placeholder="00000-000"
              inputMode="numeric"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 pr-9"
            />
            {cepCarregando && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 text-violet-600 animate-spin"
                aria-label="Buscando endereço..."
              />
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Auto-preenche o resto.</p>
        </FormField>

        <FormField label="Endereço">
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Número">
            <input
              type="text"
              value={formData.numero || ''}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value.replace(/\D/g, '') })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
          <FormField label="Bairro">
            <input
              type="text"
              value={formData.bairro || ''}
              onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
          <FormField label="UF">
            <input
              type="text"
              maxLength={2}
              value={formData.uf || ''}
              onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
        </div>

        <FormField label="Cidade">
          <input
            type="text"
            value={formData.cidade || ''}
            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <FormField label="Logo da Empresa">
            <input
              type="file"
              accept="image/png, image/jpeg"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
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
