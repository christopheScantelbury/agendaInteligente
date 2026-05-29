import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { perfilService, Perfil } from '../services/perfilService'
import { authService } from '../services/authService'
import { Plus, Trash2, Edit, Shield, Lock, Eye, Pencil, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { podeEditar } from '../utils/permissions'
import { MENUS_CONFIG } from '../constants/menusPermissoes'
import { getApiErrorMessage } from '../utils/apiError'

type TipoPermissao = 'EDITAR' | 'VISUALIZAR' | 'SEM_ACESSO'

function normalizarGranulares(perfil?: Perfil | null): Record<string, TipoPermissao> {
  if (!perfil) return {}
  const granulares = perfil.permissoesGranulares || {}
  if (Object.keys(granulares).length > 0) {
    const normalizado: Record<string, TipoPermissao> = {}
    Object.entries(granulares).forEach(([path, tipo]) => {
      if (tipo === 'EDITAR' || tipo === 'VISUALIZAR') {
        normalizado[path] = tipo
      }
    })
    return normalizado
  }

  const fallbackMenus = perfil.permissoesMenu || []
  return fallbackMenus.reduce<Record<string, TipoPermissao>>((acc, path) => {
    acc[path] = 'VISUALIZAR'
    return acc
  }, {})
}

function contarMenusPermitidos(perfil: Perfil): number {
  const granulares = normalizarGranulares(perfil)
  return Object.keys(granulares).length
}

export default function Perfis() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()

  const { data: perfilUsuario } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarPerfis = podeEditar(perfilUsuario, '/perfis')

  const { data: perfis = [], isLoading } = useQuery({
    queryKey: ['perfis'],
    queryFn: perfilService.listarTodos,
  })

  const deleteMutation = useMutation({
    mutationFn: perfilService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] })
      showNotification('success', 'Perfil excluído com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao excluir perfil'))
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
            <Shield className="h-6 w-6 text-violet-600" />
            Perfis e Permissões
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Controle de acesso por tela para cada tipo de usuário.
          </p>
        </div>
        {podeEditarPerfis && (
          <Button
            onClick={() => {
              setEditingPerfil(null)
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Perfil
          </Button>
        )}
      </header>

      {perfis.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <Shield className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">Nenhum perfil cadastrado ainda.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {perfis.map((perfil) => {
            const totalMenus = contarMenusPermitidos(perfil)
            return (
              <li
                key={perfil.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    perfil.sistema
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-violet-100 text-violet-700'
                  }`}>
                    {perfil.sistema ? <Lock className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{perfil.nome}</p>
                      {perfil.sistema && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          Sistema
                        </span>
                      )}
                      {perfil.atendente && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          Profissional/Secretaria
                        </span>
                      )}
                      {perfil.cliente && (
                        <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          Cliente
                        </span>
                      )}
                      {perfil.gerente && (
                        <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          Gerente
                        </span>
                      )}
                    </div>
                    {perfil.descricao && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{perfil.descricao}</p>
                    )}
                    {totalMenus > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        {totalMenus} menu{totalMenus > 1 ? 's' : ''} permitido{totalMenus > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  {podeEditarPerfis && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingPerfil(perfil)
                          setShowModal(true)
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                        aria-label="Editar perfil"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {!perfil.sistema && (
                        <button
                          onClick={() => handleDelete(perfil.id!)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                          aria-label="Excluir perfil"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
          setEditingPerfil(null)
        }}
        title={editingPerfil ? 'Editar Perfil' : 'Novo Perfil'}
        size="lg"
      >
        <PerfilForm
          perfil={editingPerfil}
          onClose={() => {
            setShowModal(false)
            setEditingPerfil(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function PerfilForm({
  perfil,
  onClose,
}: {
  perfil: Perfil | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<Perfil>(
    perfil || {
      nome: '',
      descricao: '',
      sistema: false,
      ativo: true,
      atendente: false,
      cliente: false,
      gerente: false,
      permissoesMenu: [],
      permissoesGranulares: {},
    }
  )

  useEffect(() => {
    if (perfil) {
      setFormData({
        ...perfil,
        atendente: perfil.atendente ?? false,
        cliente: perfil.cliente ?? false,
        gerente: perfil.gerente ?? false,
        permissoesGranulares: normalizarGranulares(perfil),
        permissoesMenu: Object.keys(normalizarGranulares(perfil)),
      })
    } else {
      setFormData({
        nome: '',
        descricao: '',
        sistema: false,
        ativo: true,
        atendente: false,
        cliente: false,
        gerente: false,
        permissoesMenu: [],
        permissoesGranulares: {},
      })
    }
  }, [perfil])

  const setPermissaoMenu = (menuPath: string, tipo: TipoPermissao) => {
    const novasPermissoes = {
      ...(formData.permissoesGranulares || {}),
      [menuPath]: tipo,
    }
    
    // Se for SEM_ACESSO, remover da lista
    if (tipo === 'SEM_ACESSO') {
      delete novasPermissoes[menuPath]
    }
    
    setFormData({
      ...formData,
      permissoesGranulares: novasPermissoes,
      // Manter compatibilidade com permissoesMenu
      permissoesMenu: tipo !== 'SEM_ACESSO' 
        ? [...new Set([...(formData.permissoesMenu || []), menuPath])]
        : (formData.permissoesMenu || []).filter(path => path !== menuPath),
    })
  }

  const getPermissaoMenu = (menuPath: string): TipoPermissao => {
    const tipo = formData.permissoesGranulares?.[menuPath]
    if (tipo === 'EDITAR' || tipo === 'VISUALIZAR') {
      return tipo
    }
    if ((formData.permissoesMenu || []).includes(menuPath)) {
      return 'VISUALIZAR'
    }
    return 'SEM_ACESSO'
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Perfil) => {
      return perfil?.id
        ? perfilService.atualizar(perfil.id, data)
        : perfilService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] })
      showNotification('success', perfil ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao salvar perfil'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const temTipo = (formData.atendente || formData.cliente || formData.gerente) === true
    if (!perfil?.sistema && !temTipo && formData.nome?.trim()) {
      if (!window.confirm('Este perfil não está marcado como Atendente, Cliente ou Gerente. Deseja mesmo salvar?')) {
        return
      }
    }
    saveMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nome do Perfil" required>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
            placeholder="Ex: VENDEDOR, SUPERVISOR"
            disabled={perfil?.sistema || false}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </FormField>

        <FormField label="Descrição">
          <textarea
            value={formData.descricao || ''}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            rows={3}
            placeholder="Descreva as responsabilidades deste perfil..."
            disabled={perfil?.sistema || false}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </FormField>

        <FormField label="Tipo de perfil">
          <p className="text-xs text-gray-500 mb-2">Marque para identificar este perfil (permite usar qualquer nome acima)</p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.atendente ?? false}
                onChange={(e) => setFormData({ ...formData, atendente: e.target.checked })}
                disabled={perfil?.sistema || false}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">Secretaria / Profissional</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cliente ?? false}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.checked })}
                disabled={perfil?.sistema || false}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">Cliente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.gerente ?? false}
                onChange={(e) => setFormData({ ...formData, gerente: e.target.checked })}
                disabled={perfil?.sistema || false}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">Gerente</span>
            </label>
          </div>
        </FormField>

        <div className="pt-4 border-t">
          <FormField label="Permissões de Menu">
            <div className="mt-2 rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Acesso por tela</p>
                <span className="text-xs text-gray-500">{MENUS_CONFIG.length} itens</span>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-1">
                {MENUS_CONFIG.map((menu) => {
                  const permissaoAtual = getPermissaoMenu(menu.path)
                  return (
                    <div
                      key={menu.path}
                      className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-gray-300"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{menu.label}</p>
                          <p className="truncate text-xs text-gray-400">{menu.path}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                            permissaoAtual === 'EDITAR'
                              ? 'bg-emerald-100 text-emerald-700'
                              : permissaoAtual === 'VISUALIZAR'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {permissaoAtual === 'EDITAR'
                            ? 'Editar'
                            : permissaoAtual === 'VISUALIZAR'
                              ? 'Visualizar'
                              : 'Sem acesso'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 p-1">
                        <button
                          type="button"
                          onClick={() => setPermissaoMenu(menu.path, 'EDITAR')}
                          className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                            permissaoAtual === 'EDITAR'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-gray-700 hover:bg-white'
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPermissaoMenu(menu.path, 'VISUALIZAR')}
                          className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                            permissaoAtual === 'VISUALIZAR'
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-gray-700 hover:bg-white'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => setPermissaoMenu(menu.path, 'SEM_ACESSO')}
                          className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                            permissaoAtual === 'SEM_ACESSO'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-gray-700 hover:bg-white'
                          }`}
                        >
                          <X className="h-3.5 w-3.5" />
                          Bloquear
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">Editar: acesso total da tela</div>
                <div className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5">Visualizar: sem criar/alterar/excluir</div>
                <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5">Sem acesso: não aparece no menu</div>
              </div>
            </div>
          </FormField>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            isLoading={saveMutation.isPending}
          >
            Salvar
          </Button>
        </div>
        {perfil?.sistema && (
          <div className="mt-4 p-3 bg-violet-50 border border-violet-200 rounded-md">
            <p className="text-sm text-violet-800">
              <strong>Perfil do sistema:</strong> Apenas as permissões de menu podem ser editadas. Nome e descrição são fixos.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
