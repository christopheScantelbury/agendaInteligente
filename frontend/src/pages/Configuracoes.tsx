import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Settings,
  User as UserIcon,
  Lock,
  Building2,
  Check,
  Loader2,
  Upload,
  Trash2,
  AlertCircle,
  Link2,
  Clock,
  FileText,
  Users as UsersIcon,
  Briefcase,
  ChevronRight,
  Palette,
} from 'lucide-react'
import { authService } from '../services/authService'
import { usuarioService, Usuario } from '../services/usuarioService'
import { empresaService, Empresa } from '../services/empresaService'
import { useNotification } from '../contexts/NotificationContext'
import { maskPhone, maskCEP, maskCNPJ, maskEmail } from '../utils/masks'
import { buscarEnderecoPorCep } from '../utils/viaCep'
import ConfigPageHeader from '../components/configuracoes/ConfigPageHeader'

// ─── Componentes inline pra manter o padrão visual do sistema ─────────────────
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition disabled:bg-slate-50 disabled:text-slate-400 ${props.className ?? ''}`}
    />
  )
}

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-700 mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  )
}

function SubmitButton({
  loading,
  children,
  disabled,
}: {
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      {children}
    </button>
  )
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Settings
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-4">
      <header className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </header>
      <div>{children}</div>
    </section>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function Configuracoes() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const usuarioToken = authService.getUsuario()
  const perfilNorm = (usuarioToken?.perfil ?? '').toUpperCase().replace('-', '_')
  const isAdminUnico = perfilNorm === 'ADMINISTRADOR'

  const [conta, setConta] = useState<Usuario>({
    nome: '',
    email: '',
    telefone: '',
    areaAtuacao: '',
  })
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [empresaForm, setEmpresaForm] = useState<Empresa>({
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
    corApp: '#7C3AED',
  })
  const [empresaId, setEmpresaId] = useState<number | undefined>(undefined)
  const [logoPreview, setLogoPreview] = useState<string | undefined>(undefined)
  const [buscandoCep, setBuscandoCep] = useState(false)

  const { data: usuarioAtual, isLoading: loadingUsuario } = useQuery({
    queryKey: ['usuario', usuarioToken?.usuarioId],
    queryFn: () => usuarioService.buscarPorId(usuarioToken!.usuarioId),
    enabled: !!usuarioToken?.usuarioId && isAdminUnico,
  })

  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: empresaService.listarTodos,
    enabled: isAdminUnico,
  })

  useEffect(() => {
    if (!usuarioAtual) return
    setConta({
      id: usuarioAtual.id,
      nome: usuarioAtual.nome ?? '',
      email: usuarioAtual.email ?? '',
      telefone: usuarioAtual.telefone ?? '',
      areaAtuacao: usuarioAtual.areaAtuacao ?? '',
    })
  }, [usuarioAtual])

  useEffect(() => {
    if (!empresas.length) return
    const empresa = empresas[0]
    setEmpresaId(empresa.id)
    setEmpresaForm({
      ...empresa,
      ativo: empresa.ativo ?? true,
      corApp: empresa.corApp || '#7C3AED',
    })
    setLogoPreview(empresa.logo)
  }, [empresas])

  const salvarContaMutation = useMutation({
    mutationFn: (payload: Usuario) => usuarioService.atualizar(payload.id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuario', usuarioToken?.usuarioId] })
      showNotification('success', 'Dados da conta atualizados!')
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao atualizar dados da conta.')
    },
  })

  const alterarSenhaMutation = useMutation({
    mutationFn: () => usuarioService.alterarSenha(usuarioToken!.usuarioId, senha, senhaAtual),
    onSuccess: () => {
      setSenhaAtual('')
      setSenha('')
      setConfirmarSenha('')
      showNotification('success', 'Senha alterada com sucesso.')
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao alterar senha.')
    },
  })

  const salvarEmpresaMutation = useMutation({
    mutationFn: (payload: Empresa) => {
      if (empresaId) return empresaService.atualizar(empresaId, payload)
      return empresaService.criar(payload)
    },
    onSuccess: (empresa) => {
      setEmpresaId(empresa.id)
      queryClient.invalidateQueries({ queryKey: ['empresas'] })
      showNotification('success', 'Dados da empresa salvos!')
    },
    onError: (error: any) => {
      showNotification('error', error.response?.data?.message || 'Erro ao salvar dados da empresa.')
    },
  })

  const loading = loadingUsuario || loadingEmpresas

  const podeSalvarConta = useMemo(
    () => !!conta.id && !!conta.nome && !!conta.email,
    [conta.id, conta.nome, conta.email]
  )

  const handleSalvarConta = (e: React.FormEvent) => {
    e.preventDefault()
    if (!conta.id || !usuarioAtual) return
    salvarContaMutation.mutate({
      ...usuarioAtual,
      id: conta.id,
      nome: conta.nome,
      email: conta.email,
      telefone: conta.telefone,
      areaAtuacao: conta.areaAtuacao,
    })
  }

  const handleAlterarSenha = (e: React.FormEvent) => {
    e.preventDefault()
    if (!senhaAtual) {
      showNotification('error', 'Informe a senha atual.')
      return
    }
    if (!senha || senha.length < 6) {
      showNotification('error', 'A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      showNotification('error', 'As senhas não coincidem.')
      return
    }
    alterarSenhaMutation.mutate()
  }

  const handleSalvarEmpresa = (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaForm.nome?.trim()) {
      showNotification('error', 'Nome da empresa é obrigatório.')
      return
    }
    salvarEmpresaMutation.mutate(empresaForm)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      showNotification('error', 'Imagem muito grande (máximo 2 MB).')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setEmpresaForm((prev) => ({ ...prev, logo: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const removerLogo = () => {
    setLogoPreview(undefined)
    setEmpresaForm((prev) => ({ ...prev, logo: undefined }))
  }

  // ViaCEP — auto-preenche endereço quando CEP completo. Cancela request anterior.
  const cepAbortRef = (function () {
    // Closure-style ref pra evitar useRef e manter o componente conciso
    let ctrl: AbortController | null = null
    return {
      get: () => ctrl,
      set: (c: AbortController | null) => {
        ctrl = c
      },
    }
  })()

  const handleCepChange = async (raw: string) => {
    const masked = maskCEP(raw)
    setEmpresaForm((p) => ({ ...p, cep: masked }))
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 8) return

    // Cancela busca anterior se ainda em vôo
    cepAbortRef.get()?.abort()
    const ctrl = new AbortController()
    cepAbortRef.set(ctrl)

    setBuscandoCep(true)
    try {
      const end = await buscarEnderecoPorCep(digits, ctrl.signal)
      if (!end) {
        showNotification('error', 'CEP não encontrado. Preencha o endereço manualmente.')
        return
      }
      // Só preenche campos VAZIOS pra não sobrescrever edição do user
      setEmpresaForm((p) => ({
        ...p,
        endereco: p.endereco?.trim() ? p.endereco : end.logradouro,
        bairro: p.bairro?.trim() ? p.bairro : end.bairro,
        cidade: p.cidade?.trim() ? p.cidade : end.cidade,
        uf: p.uf?.trim() ? p.uf : end.uf,
      }))
      showNotification('success', 'Endereço preenchido automaticamente.')
    } finally {
      setBuscandoCep(false)
    }
  }

  if (!isAdminUnico) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Acesso restrito</p>
            <p className="text-xs text-red-700 mt-1">
              Esta tela é exclusiva para o perfil ADMINISTRADOR.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações…
        </div>
      </div>
    )
  }

  // Outras configurações disponíveis em telas dedicadas
  const atalhos = [
    {
      titulo: 'Horários de funcionamento',
      descricao: 'Defina os horários em que cada unidade atende.',
      path: '/configuracoes/horarios',
      icon: Clock,
    },
    {
      titulo: 'Link público da empresa',
      descricao: 'Personalize a URL pública para divulgar.',
      path: '/configuracoes/link-publico',
      icon: Link2,
    },
    {
      titulo: 'Emissão de NFS-e',
      descricao: 'Configure inscrição municipal por unidade.',
      path: '/configuracoes/nfse',
      icon: FileText,
    },
    {
      titulo: 'Serviços',
      descricao: 'Cadastre o catálogo de serviços oferecidos.',
      path: '/configuracoes/servicos',
      icon: Briefcase,
    },
    {
      titulo: 'Profissionais',
      descricao: 'Gerencie os profissionais da equipe.',
      path: '/configuracoes/profissionais',
      icon: UserIcon,
    },
    {
      titulo: 'Equipe e convites',
      descricao: 'Convide novos profissionais por link.',
      path: '/configuracoes/equipe',
      icon: UsersIcon,
    },
  ]

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <ConfigPageHeader />
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-violet-600" />
          Configurações
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerencie sua conta, senha e os dados da empresa.
        </p>
      </header>

      {/* ── Conta ──────────────────────────────────────────────────────────── */}
      <SectionCard
        icon={UserIcon}
        title="Conta"
        description="Suas informações pessoais como administrador."
      >
        <form className="space-y-3" onSubmit={handleSalvarConta}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nome" required>Nome</Label>
              <Input
                id="nome"
                type="text"
                required
                value={conta.nome || ''}
                onChange={(e) => setConta((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email" required>Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={conta.email || ''}
                onChange={(e) => setConta((p) => ({ ...p, email: maskEmail(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="areaAtuacao">Área de atuação</Label>
              <Input
                id="areaAtuacao"
                type="text"
                value={conta.areaAtuacao || ''}
                onChange={(e) => setConta((p) => ({ ...p, areaAtuacao: e.target.value }))}
                placeholder="Ex.: Salão de beleza, Clínica estética"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="text"
                value={conta.telefone || ''}
                onChange={(e) => setConta((p) => ({ ...p, telefone: maskPhone(e.target.value) }))}
                maxLength={15}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <SubmitButton
              loading={salvarContaMutation.isPending}
              disabled={!podeSalvarConta}
            >
              Salvar dados da conta
            </SubmitButton>
          </div>
        </form>
      </SectionCard>

      {/* ── Senha ──────────────────────────────────────────────────────────── */}
      <SectionCard
        icon={Lock}
        title="Alterar senha"
        description="Use uma senha forte com no mínimo 6 caracteres."
      >
        <form className="space-y-3" onSubmit={handleAlterarSenha}>
          <div>
            <Label htmlFor="senhaAtual" required>Senha atual</Label>
            <Input
              id="senhaAtual"
              type="password"
              autoComplete="current-password"
              required
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="senha" required>Nova senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmarSenha" required>Confirmar nova senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                autoComplete="new-password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            </div>
          </div>
          {senha && confirmarSenha && senha !== confirmarSenha && (
            <p className="text-xs text-red-600">As senhas não coincidem.</p>
          )}
          <div className="flex justify-end pt-2">
            <SubmitButton loading={alterarSenhaMutation.isPending}>
              Alterar senha
            </SubmitButton>
          </div>
        </form>
      </SectionCard>

      {/* ── Empresa ────────────────────────────────────────────────────────── */}
      <SectionCard
        icon={Building2}
        title="Empresa"
        description="Dados cadastrais da sua empresa."
      >
        <form className="space-y-3" onSubmit={handleSalvarEmpresa}>
          <div>
            <Label htmlFor="empresaNome" required>Nome fantasia</Label>
            <Input
              id="empresaNome"
              type="text"
              required
              value={empresaForm.nome || ''}
              onChange={(e) => setEmpresaForm((p) => ({ ...p, nome: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="razaoSocial">Razão social</Label>
            <Input
              id="razaoSocial"
              type="text"
              value={empresaForm.razaoSocial || ''}
              onChange={(e) => setEmpresaForm((p) => ({ ...p, razaoSocial: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                type="text"
                value={empresaForm.cnpj || ''}
                onChange={(e) => setEmpresaForm((p) => ({ ...p, cnpj: maskCNPJ(e.target.value) }))}
                maxLength={18}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <Label htmlFor="empresaTelefone">Telefone</Label>
              <Input
                id="empresaTelefone"
                type="text"
                value={empresaForm.telefone || ''}
                onChange={(e) => setEmpresaForm((p) => ({ ...p, telefone: maskPhone(e.target.value) }))}
                maxLength={15}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="empresaEmail">Email</Label>
            <Input
              id="empresaEmail"
              type="email"
              value={empresaForm.email || ''}
              onChange={(e) => setEmpresaForm((p) => ({ ...p, email: maskEmail(e.target.value) }))}
            />
          </div>

          {/* Endereço */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Endereço
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="endereco">Logradouro</Label>
                <Input
                  id="endereco"
                  type="text"
                  value={empresaForm.endereco || ''}
                  onChange={(e) => setEmpresaForm((p) => ({ ...p, endereco: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  type="text"
                  value={empresaForm.numero || ''}
                  onChange={(e) => setEmpresaForm((p) => ({ ...p, numero: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  type="text"
                  value={empresaForm.bairro || ''}
                  onChange={(e) => setEmpresaForm((p) => ({ ...p, bairro: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    type="text"
                    value={empresaForm.cep || ''}
                    onChange={(e) => handleCepChange(e.target.value)}
                    maxLength={9}
                    placeholder="00000-000"
                    className={buscandoCep ? 'pr-10' : ''}
                  />
                  {buscandoCep && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Preenchemos o endereço automaticamente.
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  type="text"
                  value={empresaForm.cidade || ''}
                  onChange={(e) => setEmpresaForm((p) => ({ ...p, cidade: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  type="text"
                  value={empresaForm.uf || ''}
                  onChange={(e) =>
                    setEmpresaForm((p) => ({ ...p, uf: e.target.value.toUpperCase().slice(0, 2) }))
                  }
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
            </div>
          </div>

          {/* Identidade visual */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Identidade visual
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
              <div>
                <Label>Logo da empresa</Label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-16 w-16 rounded-xl object-contain border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-300">
                      <Upload className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition">
                      <Upload className="h-3.5 w-3.5" />
                      {logoPreview ? 'Trocar imagem' : 'Enviar imagem'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={removerLogo}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  PNG, JPG ou SVG até 2 MB.
                </p>
              </div>

              <div>
                <Label htmlFor="corApp">
                  <span className="inline-flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" /> Cor da marca
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="corApp"
                    type="color"
                    value={empresaForm.corApp || '#7C3AED'}
                    onChange={(e) => setEmpresaForm((p) => ({ ...p, corApp: e.target.value }))}
                    className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <code className="text-xs font-mono text-slate-600">
                    {empresaForm.corApp ?? '#7C3AED'}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <SubmitButton loading={salvarEmpresaMutation.isPending}>
              Salvar dados da empresa
            </SubmitButton>
          </div>
        </form>
      </SectionCard>

      {/* ── Atalhos para outras configurações ──────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 px-1">
          Outras configurações
        </h2>
        <ul className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
          {atalhos.map((a) => {
            const Icon = a.icon
            return (
              <li key={a.path}>
                <button
                  type="button"
                  onClick={() => navigate(a.path)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{a.titulo}</p>
                    <p className="text-xs text-slate-500 truncate">{a.descricao}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
