import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { empresaService, Empresa, EmpresaEstatisticas, CategoriaEmpresa, CATEGORIAS_EMPRESA as CATEGORIAS } from '../services/empresaService'
import { planoService, Plano } from '../services/planoService'
import { authService } from '../services/authService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import {
  Plus, Trash2, Edit, Briefcase, Loader2, IdCard, MapPin, Link2,
  Crown, BarChart3, Copy, ExternalLink, Check, AlertCircle, Palette,
} from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskPhone, maskCEP, maskCNPJ, maskEmail } from '../utils/masks'
import { buscarEnderecoPorCep } from '../utils/viaCep'

// Categoria define a terminologia do sistema (ver lib/categoria/dictionary.ts)
// e é NOT NULL no banco — precisa estar no form.

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/
const SLUG_MIN = 3
const SLUG_MAX = 60

function baseUrlPublica(): string {
  // Mesma lógica do LinkPublicoConfig: usa o origin do app, sem fallback de prod.
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.host}`
  }
  return ''
}

function fmtMoeda(v: number | undefined | null): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string | null | undefined): string {
  if (!s) return '—'
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}

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
            Dados cadastrais, plano comercial e link público de cada empresa.
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
                  <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {inicial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{empresa.nome}</p>
                    {empresa.razaoSocial && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{empresa.razaoSocial}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      {empresa.cnpj && <span>CNPJ {empresa.cnpj}</span>}
                      {empresa.cnpj && empresa.telefone && <span>·</span>}
                      {empresa.telefone && <span>{empresa.telefone}</span>}
                      {empresa.planoNome && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-violet-700">
                            <Crown className="h-3 w-3" />
                            {empresa.planoNome}
                          </span>
                        </>
                      )}
                    </div>
                    {empresa.email && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{empresa.email}</p>
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
                        onClick={() => setConfirmDelete({ isOpen: true, id: empresa.id! })}
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
        onConfirm={() => { if (confirmDelete.id) deleteMutation.mutate(confirmDelete.id) }}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EmpresaForm — 5 SectionCards (#158)
// ─────────────────────────────────────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}

function SectionCard({ icon: Icon, title, description, children }: SectionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {description && <p className="text-[11px] text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function EmpresaForm({ empresa, onClose }: { empresa: Empresa | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const usuario = authService.getUsuario()
  const ehAdminPlataforma = (usuario?.perfil ?? '').toUpperCase() === 'ADMIN'

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
      slugPublico: '',
      logo: undefined,
      corApp: '#7C3AED',
      categoria: 'OUTROS',
    }
  )

  const [logoPreview, setLogoPreview] = useState<string | undefined>(empresa?.logo)
  useEffect(() => {
    setLogoPreview(empresa?.logo)
  }, [empresa?.id])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) {
      showNotification('error', 'Imagem maior que 500KB. Use uma menor.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setFormData((prev) => ({ ...prev, logo: base64 }))
    }
    reader.readAsDataURL(file)
  }
  const handleRemoveLogo = () => {
    setLogoPreview(undefined)
    setFormData((prev) => ({ ...prev, logo: undefined }))
  }

  // ViaCEP
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
    if (empresa) setFormData(empresa)
  }, [empresa])

  // Estatísticas — só pra empresa existente
  const { data: stats } = useQuery<EmpresaEstatisticas>({
    queryKey: ['empresa', empresa?.id, 'stats'],
    queryFn: () => empresaService.estatisticas(empresa!.id!),
    enabled: !!empresa?.id,
  })

  // Catálogo de planos — só pra ADMIN global trocar
  const { data: planos = [] } = useQuery<Plano[]>({
    queryKey: ['planos'],
    queryFn: planoService.listar,
    enabled: ehAdminPlataforma && !!empresa?.id,
  })

  // ── Slug ──
  const slugAtual = (formData.slugPublico ?? '').trim().toLowerCase()
  const slugFormatoValido =
    !slugAtual || (slugAtual.length >= SLUG_MIN && slugAtual.length <= SLUG_MAX && SLUG_REGEX.test(slugAtual))
  const linkPreview = useMemo(
    () => (slugAtual ? `${baseUrlPublica()}/e/${slugAtual}` : null),
    [slugAtual]
  )
  const [copied, setCopied] = useState(false)
  const handleCopiarLink = () => {
    if (!linkPreview) return
    navigator.clipboard.writeText(linkPreview)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Empresa) => {
      return empresa?.id ? empresaService.atualizar(empresa.id, data) : empresaService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      if (empresa?.id) queryClient.invalidateQueries({ queryKey: ['empresa', empresa.id] })
      showNotification('success', empresa ? 'Empresa atualizada!' : 'Empresa criada!')
      onClose()
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao salvar empresa')
    },
  })

  const trocarPlanoMutation = useMutation({
    mutationFn: (planoId: number) => empresaService.trocarPlano(empresa!.id!, planoId),
    onSuccess: (atualizada) => {
      setFormData((prev) => ({ ...prev, ...atualizada }))
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      queryClient.invalidateQueries({ queryKey: ['empresa', empresa?.id, 'stats'] })
      showNotification('success', 'Plano atualizado!')
    },
    onError: (e: any) => {
      showNotification('error', e.response?.data?.message || 'Erro ao trocar plano')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!slugFormatoValido) {
      showNotification('error', 'Link público inválido. Use letras minúsculas, números e hífen (3-60).')
      return
    }
    saveMutation.mutate({ ...formData, slugPublico: slugAtual || undefined })
  }

  const inputBase =
    'block w-full min-w-0 box-border rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── 1. Identificação ── */}
      <SectionCard icon={IdCard} title="Identificação" description="Dados cadastrais e fiscais da empresa">
        <FormField label="Nome da Empresa" required>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className={inputBase}
          />
        </FormField>
        <FormField label="Razão Social">
          <input
            type="text"
            value={formData.razaoSocial || ''}
            onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
            className={inputBase}
          />
        </FormField>
        <FormField label="Categoria" required>
          <select
            required
            value={formData.categoria ?? 'OUTROS'}
            onChange={(e) =>
              setFormData({ ...formData, categoria: e.target.value as CategoriaEmpresa })
            }
            className={inputBase}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Define os termos usados no sistema (ex.: "cliente" x "paciente").
          </p>
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="CNPJ">
            <input
              type="text"
              value={formData.cnpj || ''}
              onChange={(e) => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
              maxLength={18}
              placeholder="00.000.000/0000-00"
              className={inputBase}
            />
          </FormField>
          <FormField label="Telefone">
            <input
              type="text"
              value={formData.telefone || ''}
              onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
              maxLength={15}
              placeholder="(00) 00000-0000"
              className={inputBase}
            />
          </FormField>
        </div>
        <FormField label="Email">
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
            placeholder="exemplo@email.com"
            className={inputBase}
          />
        </FormField>
      </SectionCard>

      {/* ── 2. Endereço ── */}
      <SectionCard icon={MapPin} title="Endereço">
        <FormField label="CEP">
          <div className="relative">
            <input
              type="text"
              value={formData.cep || ''}
              onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
              maxLength={9}
              placeholder="00000-000"
              inputMode="numeric"
              className={`${inputBase} pr-9`}
            />
            {cepCarregando && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-600 animate-spin" />
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Auto-preenche o resto.</p>
        </FormField>
        <FormField label="Endereço">
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            className={inputBase}
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Número">
            <input
              type="text"
              inputMode="numeric"
              value={formData.numero || ''}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value.replace(/\D/g, '') })}
              className={inputBase}
            />
          </FormField>
          <FormField label="Bairro">
            <input
              type="text"
              value={formData.bairro || ''}
              onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
              className={inputBase}
            />
          </FormField>
          <FormField label="UF">
            <input
              type="text"
              maxLength={2}
              value={formData.uf || ''}
              onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
              className={inputBase}
            />
          </FormField>
        </div>
        <FormField label="Cidade">
          <input
            type="text"
            value={formData.cidade || ''}
            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            className={inputBase}
          />
        </FormField>
      </SectionCard>

      {/* ── 3. Link público ── */}
      <SectionCard
        icon={Link2}
        title="Link público"
        description="URL que clientes usam pra ver os serviços e agendar"
      >
        <FormField label="Slug do link">
          <div className="flex items-stretch gap-0 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition">
            <span className="px-3 py-2.5 text-xs text-slate-500 bg-slate-100 border-r border-slate-200 select-none whitespace-nowrap">
              /e/
            </span>
            <input
              type="text"
              value={formData.slugPublico || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slugPublico: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                })
              }
              maxLength={SLUG_MAX}
              placeholder="seu-salao"
              className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-white focus:outline-none"
            />
          </div>
          {!slugFormatoValido && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Use 3-60 caracteres: letras minúsculas, números e hífen.
            </p>
          )}
        </FormField>

        {linkPreview && slugFormatoValido && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-2">
            <a
              href={linkPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 text-xs font-mono text-violet-900 truncate hover:underline"
            >
              {linkPreview}
            </a>
            <button
              type="button"
              onClick={handleCopiarLink}
              className="p-1.5 rounded-lg text-violet-700 hover:bg-violet-100 transition flex-shrink-0"
              title="Copiar"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={linkPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-violet-700 hover:bg-violet-100 transition flex-shrink-0"
              title="Abrir em nova aba"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </SectionCard>

      {/* ── 4. Plano comercial ── (só pra empresa existente) */}
      {empresa?.id && (
        <SectionCard icon={Crown} title="Plano comercial">
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-violet-900">
                  {formData.planoNome ?? 'Sem plano'}
                </p>
                {formData.planoPreco != null && (
                  <p className="text-xs text-violet-700">{fmtMoeda(formData.planoPreco)} / mês</p>
                )}
              </div>
              {formData.planoExpiracao && (
                <span className="text-[11px] text-violet-700">
                  Vence em {fmtData(formData.planoExpiracao)}
                </span>
              )}
            </div>
            {stats && stats.nfseLimiteMes != null && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-violet-700 mb-1">
                  <span>NFS-e do mês</span>
                  <span>
                    {stats.nfseMesAtual} / {stats.nfseLimiteMes}
                  </span>
                </div>
                <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (stats.nfseMesAtual / Math.max(1, stats.nfseLimiteMes)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {ehAdminPlataforma && planos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Trocar plano (sem billing — só DB)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {planos.filter((p) => p.ativo).map((p) => {
                  const ehAtual = p.id === formData.planoId
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={ehAtual || trocarPlanoMutation.isPending}
                      onClick={() => trocarPlanoMutation.mutate(p.id)}
                      className={`text-xs p-2 rounded-xl border transition ${
                        ehAtual
                          ? 'border-violet-300 bg-violet-50 text-violet-900 cursor-default'
                          : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 text-slate-700'
                      }`}
                    >
                      <p className="font-bold">{p.nomePublico}</p>
                      <p className="text-[10px] text-slate-500">{fmtMoeda(p.precoMensalBrl)}/mês</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* ── 5. Estatísticas ── (só pra empresa existente) */}
      {empresa?.id && stats && (
        <SectionCard icon={BarChart3} title="Estatísticas">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Kpi label="Unidades" valor={stats.unidades} />
            <Kpi label="Profissionais" valor={stats.profissionais} />
            <Kpi label="Agendamentos / mês" valor={stats.agendamentosMesAtual} />
            <Kpi label="Clientes ativos" valor={stats.clientesAtivos} />
          </div>
        </SectionCard>
      )}

      {/* ── 6. Aparência da landing pública (#160) ── */}
      <SectionCard
        icon={Palette}
        title="Aparência da landing pública"
        description="Aplicado apenas em /e/{slug}. O painel administrativo continua com tema padrão."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Logo da empresa">
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoChange}
              className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            {logoPreview && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={logoPreview}
                  alt="Preview"
                  className="h-14 w-14 rounded-lg border border-slate-200 object-contain bg-white p-1"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Remover
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Máx 500 KB. PNG/JPG/SVG.</p>
          </FormField>

          <FormField label="Cor principal (botões da landing)">
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={formData.corApp || '#7C3AED'}
                onChange={(e) => setFormData({ ...formData, corApp: e.target.value })}
                className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={formData.corApp || ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v) || v === '') {
                    setFormData({ ...formData, corApp: v || undefined })
                  }
                }}
                placeholder="#7C3AED"
                maxLength={7}
                className={inputBase + ' font-mono'}
              />
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, corApp: '#7C3AED' })}
              className="text-[11px] text-slate-500 hover:text-violet-700 mt-1"
            >
              Resetar pro violet padrão
            </button>
          </FormField>
        </div>

        {/* Preview compacto */}
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <div
            className="px-4 py-4 text-white flex items-center gap-2"
            style={{ background: formData.corApp || '#7C3AED' }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="" className="h-8 w-8 rounded-lg bg-white p-0.5 object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                {(formData.nome || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-bold">{formData.nome || 'Sua empresa'}</span>
          </div>
          <div className="bg-white px-4 py-3">
            <button
              type="button"
              disabled
              className="w-full py-2 rounded-lg text-white text-xs font-bold cursor-default"
              style={{ backgroundColor: formData.corApp || '#7C3AED' }}
            >
              Agendar horário (preview)
            </button>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end space-x-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={saveMutation.isPending} disabled={!slugFormatoValido}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
      <p className="text-lg font-bold text-slate-900">{valor.toLocaleString('pt-BR')}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
