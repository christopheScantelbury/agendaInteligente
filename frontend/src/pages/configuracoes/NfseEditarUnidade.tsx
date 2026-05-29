import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  FileText,
  Building2,
  MapPin,
  Settings2,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Trash2,
} from 'lucide-react'
import { nfseConfigService, NfseUnidadePayload } from '../../services/nfseConfigService'
import { useNotification } from '../../contexts/NotificationContext'
import { maskCEP, maskCNPJ, maskPhone, maskEmail } from '../../utils/masks'
import { buscarEnderecoPorCep } from '../../utils/viaCep'

const REGIMES = [
  { value: 'MEI', label: 'MEI — Microempreendedor Individual' },
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL', label: 'Lucro Real' },
]

// Helpers de estilo (mantém consistência com /configuracoes)
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition disabled:bg-slate-50 disabled:text-slate-400 ${props.className ?? ''}`}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition ${props.className ?? ''}`}
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

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof FileText
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-3">
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

export default function NfseEditarUnidade() {
  const { unidadeId: idStr } = useParams<{ unidadeId: string }>()
  const unidadeId = Number(idStr)
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['configuracoes', 'nfse', unidadeId],
    queryFn: () => nfseConfigService.buscar(unidadeId),
    enabled: Number.isFinite(unidadeId) && unidadeId > 0,
    retry: false,
  })

  const [form, setForm] = useState<NfseUnidadePayload & { cep: string; cnpj: string }>({
    razaoSocial: '',
    cnpj: '',
    inscricaoMunicipal: '',
    inscricaoEstadual: '',
    regimeTributario: '',
    endereco: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    uf: '',
    municipioIbge: '',
    email: '',
    telefone: '',
    notafacilApiKey: '',
    notafacilAtivo: false,
  })
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [mostrarApiKey, setMostrarApiKey] = useState(false)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certSenha, setCertSenha] = useState('')
  const [mostrarCertSenha, setMostrarCertSenha] = useState(false)

  // Hidrata o form quando os dados chegam
  useEffect(() => {
    if (!data) return
    setForm({
      razaoSocial: data.razaoSocial ?? '',
      cnpj: data.cnpj ? maskCNPJ(data.cnpj) : '',
      inscricaoMunicipal: data.inscricaoMunicipal ?? '',
      inscricaoEstadual: data.inscricaoEstadual ?? '',
      regimeTributario: data.regimeTributario ?? '',
      endereco: data.endereco ?? '',
      numero: data.numero ?? '',
      bairro: data.bairro ?? '',
      cep: data.cep ? maskCEP(data.cep) : '',
      cidade: data.cidade ?? '',
      uf: data.uf ?? '',
      municipioIbge: data.municipioIbge ?? '',
      email: data.email ?? '',
      telefone: data.telefone ?? '',
      notafacilApiKey: '', // nunca pré-preenche a apikey (segurança)
      notafacilAtivo: data.notafacilAtivo,
    })
  }, [data])

  // ViaCEP auto-fill (preenche tb municipioIbge!)
  let cepAbort: AbortController | null = null
  const handleCepChange = async (raw: string) => {
    const masked = maskCEP(raw)
    setForm((p) => ({ ...p, cep: masked }))
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 8) return

    cepAbort?.abort()
    cepAbort = new AbortController()
    setBuscandoCep(true)
    try {
      const end = await buscarEnderecoPorCep(digits, cepAbort.signal)
      if (!end) {
        showNotification('error', 'CEP não encontrado.')
        return
      }
      setForm((p) => ({
        ...p,
        endereco: p.endereco?.trim() ? p.endereco : end.logradouro,
        bairro: p.bairro?.trim() ? p.bairro : end.bairro,
        cidade: p.cidade?.trim() ? p.cidade : end.cidade,
        uf: p.uf?.trim() ? p.uf : end.uf,
        municipioIbge: end.ibge ?? p.municipioIbge,
      }))
      showNotification('success', 'Endereço preenchido (incluindo código IBGE).')
    } finally {
      setBuscandoCep(false)
    }
  }

  const uploadCertMutation = useMutation({
    mutationFn: ({ arquivo, senha }: { arquivo: File; senha: string }) =>
      nfseConfigService.uploadCertificado(unidadeId, arquivo, senha),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'nfse', unidadeId] })
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'nfse'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      setCertFile(null)
      setCertSenha('')
      showNotification('success', 'Certificado validado e salvo.')
    },
    onError: (err: any) => {
      showNotification('error', err?.response?.data?.message ?? 'Não foi possível salvar o certificado.')
    },
  })

  const removerCertMutation = useMutation({
    mutationFn: () => nfseConfigService.removerCertificado(unidadeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'nfse', unidadeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      showNotification('success', 'Certificado removido.')
    },
  })

  const salvarMutation = useMutation({
    mutationFn: (payload: NfseUnidadePayload) => nfseConfigService.atualizar(unidadeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'nfse'] })
      queryClient.invalidateQueries({ queryKey: ['configuracoes', 'nfse', unidadeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      showNotification('success', 'Dados fiscais salvos com sucesso.')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível salvar.'
      showNotification('error', msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    salvarMutation.mutate({
      ...form,
      cep: form.cep ? form.cep.replace(/\D/g, '') : null,
      cnpj: form.cnpj ? form.cnpj.replace(/\D/g, '') : null,
      notafacilApiKey: form.notafacilApiKey?.trim() || undefined, // só envia se preencheu
    })
  }

  // MEI emite via NFS-e Nacional (gov.br/nfse) — não precisa Inscrição Municipal.
  // Demais regimes (Simples/Presumido/Real) ainda exigem IM da prefeitura.
  const isMei = form.regimeTributario === 'MEI'
  const cert = data?.certificado
  const certOk = !!cert?.configurado && !cert?.expirado

  // Cálculo de "pronto pra emitir" — visualiza o que falta
  const camposObrigatorios = [
    { label: 'Razão social', ok: !!form.razaoSocial?.trim() },
    { label: 'CNPJ', ok: !!form.cnpj && form.cnpj.replace(/\D/g, '').length === 14 },
    { label: 'Regime tributário', ok: !!form.regimeTributario },
    ...(isMei
      ? []
      : [{ label: 'Inscrição municipal', ok: !!form.inscricaoMunicipal?.trim() }]),
    { label: 'Endereço completo', ok: !!(form.endereco && form.numero && form.bairro && form.cep && form.cidade && form.uf) },
    { label: 'Código IBGE do município', ok: !!form.municipioIbge?.trim() && form.municipioIbge.length === 7 },
    { label: 'Certificado digital A1 vigente', ok: certOk },
  ]
  const pendentes = camposObrigatorios.filter((c) => !c.ok)
  const prontoParaEmitir = pendentes.length === 0

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <Link
        to="/configuracoes/nfse"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-violet-700 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para lista de NFS-e
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-violet-600" />
          Dados fiscais da unidade
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {data?.nome ? <span className="font-semibold">{data.nome}</span> : 'Carregando…'}
          {' '}— preencha os dados exigidos pela prefeitura para emissão de NFS-e.
        </p>
      </header>

      {/* Status do que falta */}
      {data && (
        <section
          className={`rounded-2xl p-4 border ${
            prontoParaEmitir
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          {prontoParaEmitir ? (
            <div className="flex items-center gap-2 text-emerald-800">
              <Check className="h-5 w-5" />
              <p className="text-sm font-semibold">
                Dados completos — esta unidade pode emitir NFS-e.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-semibold">Faltam {pendentes.length} dados pra emitir:</p>
              </div>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                {pendentes.map((c) => (
                  <li key={c.label}>{c.label}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Não foi possível carregar.</p>
            <p className="text-xs text-red-700 mt-1 break-words">
              {(error as any)?.response?.data?.message ?? (error as any)?.message ?? 'Tente recarregar.'}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Identificação fiscal ─────────────────────────────────────── */}
          <SectionCard
            icon={Building2}
            title="Identificação fiscal"
            description="Dados que aparecem no XML da NFS-e."
          >
            <div className="space-y-3">
              <div>
                <Label htmlFor="razaoSocial" required>Razão social</Label>
                <Input
                  id="razaoSocial"
                  type="text"
                  value={form.razaoSocial ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, razaoSocial: e.target.value }))}
                  placeholder="Nome jurídico exato como na Receita Federal"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cnpj" required>CNPJ</Label>
                  <Input
                    id="cnpj"
                    type="text"
                    value={form.cnpj}
                    onChange={(e) => setForm((p) => ({ ...p, cnpj: maskCNPJ(e.target.value) }))}
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="regimeTributario" required>Regime tributário</Label>
                  <Select
                    id="regimeTributario"
                    value={form.regimeTributario ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, regimeTributario: e.target.value }))}
                  >
                    <option value="">Selecione…</option>
                    {REGIMES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inscricaoMunicipal" required={!isMei}>
                    Inscrição municipal
                    {isMei && (
                      <span className="ml-1 text-[10px] font-semibold text-emerald-700">
                        · opcional para MEI
                      </span>
                    )}
                  </Label>
                  <Input
                    id="inscricaoMunicipal"
                    type="text"
                    value={form.inscricaoMunicipal ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, inscricaoMunicipal: e.target.value }))}
                    placeholder={isMei ? 'Deixe em branco se não tem' : 'Obtido na prefeitura'}
                  />
                  {isMei && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      MEI emite pelo portal nacional <code className="font-mono">nfse.gov.br</code> — não precisa de IM.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="inscricaoEstadual">Inscrição estadual</Label>
                  <Input
                    id="inscricaoEstadual"
                    type="text"
                    value={form.inscricaoEstadual ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, inscricaoEstadual: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email">Email fiscal</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, email: maskEmail(e.target.value) }))}
                    placeholder="financeiro@suaempresa.com"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    type="text"
                    value={form.telefone ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, telefone: maskPhone(e.target.value) }))}
                    maxLength={15}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Endereço fiscal ──────────────────────────────────────────── */}
          <SectionCard
            icon={MapPin}
            title="Endereço fiscal"
            description="Endereço da unidade que aparece na nota. Preenchemos pelo CEP."
          >
            <div className="space-y-3">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 sm:p-4">
                <Label htmlFor="cep">
                  <span className="inline-flex items-center gap-1.5">
                    CEP <span className="text-violet-600 font-semibold">· busca automática</span>
                  </span>
                </Label>
                <div className="relative max-w-xs">
                  <Input
                    id="cep"
                    type="text"
                    inputMode="numeric"
                    value={form.cep}
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
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Digite o CEP — preenchemos logradouro, bairro, cidade, UF e código IBGE
                  automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="endereco">Logradouro</Label>
                  <Input
                    id="endereco"
                    type="text"
                    value={form.endereco ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value }))}
                    placeholder="Rua, avenida…"
                  />
                </div>
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    type="text"
                    value={form.numero ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                    placeholder="123"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    type="text"
                    value={form.bairro ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    type="text"
                    value={form.cidade ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    type="text"
                    value={form.uf ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, uf: e.target.value.toUpperCase().slice(0, 2) }))
                    }
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor="municipioIbge">Código IBGE do município</Label>
                  <Input
                    id="municipioIbge"
                    type="text"
                    value={form.municipioIbge ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, municipioIbge: e.target.value.replace(/\D/g, '').slice(0, 7) }))
                    }
                    maxLength={7}
                    placeholder="7 dígitos (ex.: 3550308)"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Obrigatório para NFS-e Nacional. Preenchido automaticamente ao buscar o CEP.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Certificado Digital A1 ───────────────────────────────────── */}
          <SectionCard
            icon={cert?.expirado ? ShieldAlert : ShieldCheck}
            title="Certificado digital A1"
            description="Arquivo .pfx/.p12 que assina o XML da NFS-e. Obrigatório para emitir."
          >
            {cert?.configurado && !cert?.expirado && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4 mb-3">
                <div className="flex items-center gap-2 text-emerald-800 mb-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-semibold">Certificado vigente</p>
                </div>
                <div className="text-xs text-slate-700 space-y-0.5">
                  <p><span className="text-slate-500">Titular:</span> <span className="font-mono">{cert.cn}</span></p>
                  <p><span className="text-slate-500">Validade:</span> {cert.validoDe} → {cert.validoAte}</p>
                  {typeof cert.diasAteVencer === 'number' && (
                    <p className={cert.diasAteVencer <= 30 ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
                      {cert.diasAteVencer > 0
                        ? `Vence em ${cert.diasAteVencer} dia${cert.diasAteVencer === 1 ? '' : 's'}`
                        : 'Vence hoje'}
                      {cert.diasAteVencer <= 30 && ' — providencie a renovação.'}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removerCertMutation.mutate()}
                  disabled={removerCertMutation.isPending}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover certificado
                </button>
              </div>
            )}

            {cert?.configurado && cert?.expirado && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 mb-3 flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Certificado expirado em {cert.validoAte}</p>
                  <p className="text-xs text-red-700 mt-0.5">Faça upload de um novo abaixo para retomar a emissão.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="certFile" required={!cert?.configurado}>
                  {cert?.configurado ? 'Substituir certificado (.pfx ou .p12)' : 'Arquivo do certificado (.pfx ou .p12)'}
                </Label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition">
                    <Upload className="h-3.5 w-3.5" />
                    Escolher arquivo
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    {certFile ? certFile.name : 'Nenhum arquivo selecionado'}
                  </span>
                  <input
                    id="certFile"
                    type="file"
                    accept=".pfx,.p12,application/x-pkcs12"
                    onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <Label htmlFor="certSenha" required={!!certFile}>Senha do certificado</Label>
                <div className="relative">
                  <Input
                    id="certSenha"
                    type={mostrarCertSenha ? 'text' : 'password'}
                    value={certSenha}
                    onChange={(e) => setCertSenha(e.target.value)}
                    autoComplete="off"
                    placeholder="Senha definida na emissão do certificado"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarCertSenha((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={mostrarCertSenha ? 'Esconder' : 'Mostrar'}
                  >
                    {mostrarCertSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!certFile) {
                    showNotification('error', 'Selecione o arquivo do certificado.')
                    return
                  }
                  if (!certSenha) {
                    showNotification('error', 'Informe a senha do certificado.')
                    return
                  }
                  uploadCertMutation.mutate({ arquivo: certFile, senha: certSenha })
                }}
                disabled={uploadCertMutation.isPending || !certFile || !certSenha}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
              >
                {uploadCertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {cert?.configurado ? 'Substituir certificado' : 'Enviar certificado'}
              </button>

              <p className="text-[10px] text-slate-400">
                🔒 O arquivo e a senha são armazenados de forma protegida no servidor —
                nunca enviamos de volta para o navegador.
              </p>
            </div>
          </SectionCard>

          {/* ── Integração NotaFácil ─────────────────────────────────────── */}
          <SectionCard
            icon={Settings2}
            title="Integração NotaFácil (Nota MEI Gateway)"
            description="Credenciais para emissão automática via gateway."
          >
            <div className="space-y-3">
              <div>
                <Label htmlFor="notafacilApiKey">
                  API Key
                  {data?.notafacilApiKeyConfigurada && (
                    <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      Configurada
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="notafacilApiKey"
                    type={mostrarApiKey ? 'text' : 'password'}
                    value={form.notafacilApiKey ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, notafacilApiKey: e.target.value }))}
                    placeholder={
                      data?.notafacilApiKeyConfigurada
                        ? 'Deixe em branco para manter a atual'
                        : 'sk_live_… ou sk_test_…'
                    }
                    className="pr-10"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarApiKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={mostrarApiKey ? 'Esconder' : 'Mostrar'}
                  >
                    {mostrarApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Obtenha em <a href="https://notameigateway.com.br" target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">notameigateway.com.br</a>.
                </p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.notafacilAtivo}
                  onChange={(e) => setForm((p) => ({ ...p, notafacilAtivo: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <div className="text-sm">
                  <p className="font-medium text-slate-900">Emissão automática ativada</p>
                  <p className="text-xs text-slate-500">
                    Ao concluir um atendimento, emitimos a NFS-e automaticamente via NotaFácil.
                  </p>
                </div>
              </label>
            </div>
          </SectionCard>

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate('/configuracoes/nfse')}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvarMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
            >
              {salvarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salvar dados fiscais
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
