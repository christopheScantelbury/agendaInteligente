import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, CalendarPlus, UserCircle2, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { clienteService, Cliente } from '../services/clienteService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { servicoService, Servico } from '../services/servicoService'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import RecorrenciaConfig, { RecorrenciaConfig as RecorrenciaConfigType } from '../components/RecorrenciaConfig'
import Button from '../components/Button'
import { useNotification } from '../contexts/NotificationContext'
import { maskCPF, maskCNPJ, maskPhone, maskEmail, maskCEP } from '../utils/masks'
import { buscarEnderecoPorCep } from '../utils/viaCep'

// Classes do input padrão (limpa) e do input com erro (borda vermelha + ring rosa).
// Usa quando precisamos destacar campos que falharam validação local OU backend.
const INPUT_BASE = 'mt-1 block w-full rounded-xl bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition'
const INPUT_OK = `${INPUT_BASE} border border-slate-200 focus:border-violet-400 focus:ring-violet-100`
const INPUT_ERR = `${INPUT_BASE} border border-red-300 focus:border-red-400 focus:ring-red-100`
const cls = (field: string, errors: Record<string, string>) => (errors[field] ? INPUT_ERR : INPUT_OK)

function FieldError({ field, errors }: { field: string; errors: Record<string, string> }) {
  if (!errors[field]) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span>{errors[field]}</span>
    </p>
  )
}

type ClienteFormData = Cliente

const EMPTY_FORM: ClienteFormData = {
  nome: '',
  cpfCnpj: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  rg: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  ativo: true,
  unidadesIds: [],
}

export default function ClienteFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const isEditing = !!id
  const clienteId = id ? Number(id) : undefined
  const hasValidClienteId = clienteId != null && Number.isFinite(clienteId)

  const [formData, setFormData] = useState<ClienteFormData>(EMPTY_FORM)

  const [queroCriarAgendamento, setQueroCriarAgendamento] = useState(false)
  const [agendamentoUnidadeId, setAgendamentoUnidadeId] = useState<number | ''>('')
  const [agendamentoAtendenteId, setAgendamentoAtendenteId] = useState<number | ''>('')
  const [agendamentoDataHoraInicio, setAgendamentoDataHoraInicio] = useState('')
  const [agendamentoServicosIds, setAgendamentoServicosIds] = useState<number[]>([])
  const [salvandoComAgendamento, setSalvandoComAgendamento] = useState(false)
  const [recorrenciaConfig, setRecorrenciaConfig] = useState<RecorrenciaConfigType>({
    recorrente: false,
    tipoRecorrencia: 'SEMANAL',
    tipoTermino: 'OCORRENCIAS',
    numeroOcorrencias: 4,
    intervalo: 1,
  })

  // ViaCEP: busca debounced + AbortController quando user digita rápido.
  // Auto-preenche logradouro/bairro/cidade/uf SE estiverem vazios — não sobrescreve edição manual.
  const [cepCarregando, setCepCarregando] = useState(false)
  const cepAbortRef = useRef<AbortController | null>(null)

  // Erros por campo (validação local + backend). Atualizado:
  // - antes do submit (validação local), com mensagens específicas
  // - em onError do save (parsing do `errors` retornado pelo GlobalExceptionHandler)
  // - limpa o erro do campo conforme o user digita
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const { [field]: _, ...rest } = prev
      return rest
    })

  const { data: clienteExistente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => clienteService.buscarPorId(clienteId!),
    enabled: isEditing && hasValidClienteId,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
  })

  const { data: atendentesAgendamento = [] } = useQuery({
    queryKey: ['atendentes', agendamentoUnidadeId],
    queryFn: () =>
      agendamentoUnidadeId ? atendenteService.listarPorUnidade(agendamentoUnidadeId as number) : Promise.resolve([]),
    enabled: !!agendamentoUnidadeId,
  })

  const unidadeUnica = unidades.length === 1 ? unidades[0] : undefined
  const unidadeUnicaId = unidadeUnica?.id
  const mostrarSecaoUnidades = unidades.length !== 1

  useEffect(() => {
    if (!isEditing) {
      setFormData(EMPTY_FORM)
      return
    }

    if (clienteExistente) {
      const unidadesIds = clienteExistente.unidadesIds
        || clienteExistente.unidades?.map((u) => u.id!).filter((value): value is number => value !== undefined)
        || []

      const unidadePrincipal = clienteExistente.unidadeId
      const unidadesComPrincipal = unidadePrincipal && !unidadesIds.includes(unidadePrincipal)
        ? [unidadePrincipal, ...unidadesIds]
        : unidadesIds

      setFormData({
        ...clienteExistente,
        cpfCnpj: clienteExistente.cpfCnpj || '',
        email: clienteExistente.email || '',
        telefone: clienteExistente.telefone || '',
        dataNascimento: clienteExistente.dataNascimento || '',
        rg: clienteExistente.rg || '',
        cep: clienteExistente.cep || '',
        endereco: clienteExistente.endereco || '',
        numero: clienteExistente.numero || '',
        complemento: clienteExistente.complemento || '',
        bairro: clienteExistente.bairro || '',
        cidade: clienteExistente.cidade || '',
        uf: clienteExistente.uf || '',
        ativo: clienteExistente.ativo ?? true,
        unidadesIds: unidadesComPrincipal,
      })
    }
  }, [isEditing, clienteExistente])

  // ViaCEP — dispara quando CEP tem 8 dígitos
  useEffect(() => {
    const cepDigits = (formData.cep ?? '').replace(/\D/g, '')
    if (cepDigits.length !== 8) {
      // CEP incompleto: cancela busca anterior e zera loading
      cepAbortRef.current?.abort()
      setCepCarregando(false)
      return
    }
    // Cancela busca anterior e dispara nova
    cepAbortRef.current?.abort()
    const controller = new AbortController()
    cepAbortRef.current = controller
    setCepCarregando(true)
    const timer = setTimeout(async () => {
      try {
        const endereco = await buscarEnderecoPorCep(cepDigits, controller.signal)
        if (controller.signal.aborted) return
        if (endereco) {
          setFormData((prev) => ({
            ...prev,
            // Só preenche campos vazios — preserva edição manual do usuário
            endereco: prev.endereco?.trim() ? prev.endereco : endereco.logradouro,
            bairro: prev.bairro?.trim() ? prev.bairro : endereco.bairro,
            cidade: prev.cidade?.trim() ? prev.cidade : endereco.cidade,
            uf: prev.uf?.trim() ? prev.uf : endereco.uf,
          }))
        }
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
    if (!unidadeUnicaId) return

    setFormData((prev) => {
      if (prev.unidadesIds?.length === 1 && prev.unidadesIds[0] === unidadeUnicaId) {
        return prev
      }

      return {
        ...prev,
        unidadeId: unidadeUnicaId,
        unidadesIds: [unidadeUnicaId],
      }
    })

    setAgendamentoUnidadeId((prev) => (prev === '' ? unidadeUnicaId : prev))
  }, [unidadeUnicaId])

  const saveMutation = useMutation({
    mutationFn: (data: Cliente) =>
      isEditing && hasValidClienteId
        ? clienteService.atualizar(clienteId!, data)
        : clienteService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      showNotification('success', isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!')
      navigate('/clientes')
    },
    onError: (error: any) => {
      // GlobalExceptionHandler retorna { message, errors: { field: msg } } pra Bean Validation.
      // Mapeamos `errors` em fieldErrors pra destacar exatamente os campos com problema.
      const data = error?.response?.data
      const backendErrors = (data?.errors ?? {}) as Record<string, string | string[]>
      const flatErrors: Record<string, string> = {}
      Object.entries(backendErrors).forEach(([k, v]) => {
        flatErrors[k] = Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '')
      })
      if (Object.keys(flatErrors).length > 0) {
        setFieldErrors(flatErrors)
        const primeiroErro = Object.values(flatErrors)[0]
        showNotification('error', primeiroErro || 'Confira os campos destacados.')
        // Tenta rolar pra primeira ocorrência
        const firstField = Object.keys(flatErrors)[0]
        setTimeout(() => {
          document.querySelector(`[data-field="${firstField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 50)
        return
      }
      const errorMessage = data?.message || error?.message || 'Erro ao salvar cliente'
      showNotification('error', errorMessage)
    },
  })

  /** Validação local antes do submit. Espelha as @Constraints do ClienteDTO. */
  const validarFormulario = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!formData.nome?.trim()) {
      errs.nome = 'Nome é obrigatório'
    }
    const cpfCnpjDigits = (formData.cpfCnpj ?? '').replace(/\D/g, '')
    if (cpfCnpjDigits && cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) {
      errs.cpfCnpj = 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Email inválido'
    }
    const telDigits = (formData.telefone ?? '').replace(/\D/g, '')
    if (telDigits && (telDigits.length < 10 || telDigits.length > 11)) {
      errs.telefone = 'Telefone deve ter 10 ou 11 dígitos com DDD'
    }
    const cepDigits = (formData.cep ?? '').replace(/\D/g, '')
    if (cepDigits && cepDigits.length !== 8) {
      errs.cep = 'CEP deve ter 8 dígitos'
    }
    if (!formData.unidadesIds || formData.unidadesIds.length === 0) {
      errs.unidadesIds = 'Selecione pelo menos uma unidade para o cliente'
    }
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errs = validarFormulario()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      const primeiroErro = Object.values(errs)[0]
      showNotification('error', primeiroErro)
      const firstField = Object.keys(errs)[0]
      setTimeout(() => {
        document.querySelector(`[data-field="${firstField}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }
    setFieldErrors({})

    const { unidades, ...dadosBase } = formData
    const dadosEnvio: Cliente = {
      ...dadosBase,
      // #67: strip da máscara — backend valida 11/14 dígitos puros
      cpfCnpj: (formData.cpfCnpj ?? '').replace(/\D/g, ''),
      telefone: (formData.telefone ?? '').replace(/\D/g, ''),
      cep: (formData.cep ?? '').replace(/\D/g, ''),
      // validarFormulario garantiu que unidadesIds tem ≥ 1 — TS não consegue inferir, então !.
      unidadeId: formData.unidadesIds![0],
      unidadesIds: formData.unidadesIds!,
      uf: formData.uf?.toUpperCase().slice(0, 2),
    }

    if (!isEditing && queroCriarAgendamento) {
      if (!agendamentoUnidadeId || !agendamentoAtendenteId || !agendamentoDataHoraInicio) {
        showNotification('error', 'Preencha unidade, atendente e data/hora do agendamento')
        return
      }
      if (agendamentoServicosIds.length === 0) {
        showNotification('error', 'Selecione pelo menos um serviço para o agendamento')
        return
      }

      setSalvandoComAgendamento(true)
      try {
        const clienteCriado = await clienteService.criar(dadosEnvio)
        const servicosPayload = agendamentoServicosIds.map((servicoId) => {
          const servico = servicos.find((item) => item.id === servicoId)
          return {
            servicoId,
            quantidade: 1,
            valor: servico?.valor ?? 0,
            descricao: servico?.nome,
          }
        })

        const agendamentoPayload: Agendamento = {
          clienteId: clienteCriado.id!,
          unidadeId: agendamentoUnidadeId as number,
          atendenteId: agendamentoAtendenteId as number,
          dataHoraInicio: agendamentoDataHoraInicio,
          servicos: servicosPayload,
          recorrencia: recorrenciaConfig.recorrente ? recorrenciaConfig : undefined,
        }

        await agendamentoService.criar(agendamentoPayload)
        queryClient.invalidateQueries({ queryKey: ['clientes'] })
        queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
        showNotification('success', 'Cliente e agendamento criados com sucesso!')
        navigate('/clientes')
      } catch (error: any) {
        const message = error.response?.data?.message || 'Erro ao salvar. Tente novamente.'
        showNotification('error', message)
      } finally {
        setSalvandoComAgendamento(false)
      }
      return
    }

    saveMutation.mutate(dadosEnvio)
  }

  if (isEditing && !hasValidClienteId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Editar Cliente</h1>
        <p className="text-red-600">ID de cliente inválido.</p>
        <Button variant="secondary" onClick={() => navigate('/clientes')}>Voltar</Button>
      </div>
    )
  }

  if (isEditing && isLoadingCliente) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCircle2 className="h-6 w-6 text-violet-600" />
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Preencha os dados completos do cliente.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </header>

      {/* Banner-resumo dos erros (some quando user corrigir) */}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">
              {Object.keys(fieldErrors).length === 1
                ? 'Há 1 campo com problema:'
                : `Há ${Object.keys(fieldErrors).length} campos com problema:`}
            </p>
            <ul className="mt-1 text-xs text-red-700 list-disc list-inside space-y-0.5">
              {Object.entries(fieldErrors).map(([field, msg]) => (
                <li key={field}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="space-y-4 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-violet-600" />
            <h2 className="text-base font-bold text-slate-900">Dados pessoais</h2>
          </div>

          <div data-field="nome">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => {
                setFormData({ ...formData, nome: e.target.value })
                clearFieldError('nome')
              }}
              className={cls('nome', fieldErrors)}
            />
            <FieldError field="nome" errors={fieldErrors} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div data-field="cpfCnpj">
              <label className="block text-xs font-semibold text-slate-600 mb-1">CPF/CNPJ</label>
              <input
                type="text"
                value={formData.cpfCnpj}
                onChange={(e) => {
                  const raw = e.target.value
                  const numbers = raw.replace(/\D/g, '')
                  const masked = numbers.length <= 11 ? maskCPF(raw) : maskCNPJ(raw)
                  setFormData({ ...formData, cpfCnpj: masked })
                  clearFieldError('cpfCnpj')
                }}
                maxLength={18}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className={cls('cpfCnpj', fieldErrors)}
              />
              <FieldError field="cpfCnpj" errors={fieldErrors} />
            </div>

            <div data-field="rg">
              <label className="block text-xs font-semibold text-slate-600 mb-1">RG</label>
              <input
                type="text"
                value={formData.rg || ''}
                onChange={(e) => { setFormData({ ...formData, rg: e.target.value }); clearFieldError('rg') }}
                placeholder="Documento de identidade"
                className={cls('rg', fieldErrors)}
              />
              <FieldError field="rg" errors={fieldErrors} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2" data-field="email">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => { setFormData({ ...formData, email: maskEmail(e.target.value) }); clearFieldError('email') }}
                placeholder="email@exemplo.com"
                className={cls('email', fieldErrors)}
              />
              <FieldError field="email" errors={fieldErrors} />
            </div>

            <div data-field="telefone">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label>
              <input
                type="text"
                value={formData.telefone || ''}
                onChange={(e) => { setFormData({ ...formData, telefone: maskPhone(e.target.value) }); clearFieldError('telefone') }}
                maxLength={15}
                placeholder="(00) 00000-0000"
                className={cls('telefone', fieldErrors)}
              />
              <FieldError field="telefone" errors={fieldErrors} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Data de nascimento</label>
            <input
              type="date"
              value={formData.dataNascimento || ''}
              onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
          </div>
        </section>

        <section className="space-y-4 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-600" />
            <h2 className="text-base font-bold text-slate-900">Endereço</h2>
          </div>
          <p className="text-xs text-slate-500 -mt-2">Digite o CEP que preenchemos o resto pra você.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div data-field="cep">
              <label className="block text-xs font-semibold text-slate-600 mb-1">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.cep || ''}
                  onChange={(e) => { setFormData({ ...formData, cep: maskCEP(e.target.value) }); clearFieldError('cep') }}
                  placeholder="00000-000"
                  maxLength={9}
                  inputMode="numeric"
                  className={`${cls('cep', fieldErrors)} pr-9`}
                />
                {cepCarregando && (
                  <Loader2
                    className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 text-violet-600 animate-spin"
                    aria-label="Buscando endereço..."
                  />
                )}
              </div>
              <FieldError field="cep" errors={fieldErrors} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço</label>
              <input
                type="text"
                value={formData.endereco || ''}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua, avenida..."
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Número</label>
              <input
                type="text"
                value={formData.numero || ''}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value.replace(/\D/g, '') })}
                placeholder="123"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Complemento</label>
              <input
                type="text"
                value={formData.complemento || ''}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                placeholder="Apartamento, bloco..."
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bairro</label>
              <input
                type="text"
                value={formData.bairro || ''}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                placeholder="Bairro"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
              <input
                type="text"
                value={formData.cidade || ''}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="Cidade"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">UF</label>
            <input
              type="text"
              value={formData.uf || ''}
              onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="UF"
              maxLength={2}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
          </div>
        </section>

        {mostrarSecaoUnidades ? (
          <section
            data-field="unidadesIds"
            className={`space-y-4 bg-white rounded-2xl p-5 sm:p-6 ${
              fieldErrors.unidadesIds ? 'border-2 border-red-300' : 'border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-violet-600" />
              <h2 className="text-base font-bold text-slate-900">Unidades <span className="text-red-500">*</span></h2>
            </div>
            <FieldError field="unidadesIds" errors={fieldErrors} />

            <p className="text-sm text-slate-600">Selecione uma ou mais unidades às quais o cliente terá acesso.</p>

            <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3">
              {unidades.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma unidade disponível</p>
              ) : (
                unidades.map((unidade) => (
                  <label
                    key={unidade.id}
                    className="flex items-center p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.unidadesIds?.includes(unidade.id!) || false}
                      onChange={(e) => {
                        const currentIds = formData.unidadesIds || []
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            unidadesIds: [...currentIds, unidade.id!],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            unidadesIds: currentIds.filter((itemId) => itemId !== unidade.id),
                          })
                        }
                      }}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="ml-3 text-sm text-slate-700">
                      {unidade.nome}
                      {unidade.cidade && <span className="text-slate-500 ml-2">({unidade.cidade})</span>}
                    </span>
                  </label>
                ))
              )}
            </div>

            {formData.unidadesIds && formData.unidadesIds.length > 0 && (
              <p className="text-xs text-slate-500">
                {formData.unidadesIds.length} unidade(s) selecionada(s)
              </p>
            )}
          </section>
        ) : (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-violet-600" />
              <h2 className="text-base font-bold text-slate-900">Unidade</h2>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Unidade selecionada automaticamente: <strong>{unidadeUnica?.nome}</strong>
              {unidadeUnica?.cidade ? ` (${unidadeUnica.cidade})` : ''}
            </p>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.ativo ?? true}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="ml-2 text-sm font-medium text-slate-700">Cliente ativo</span>
          </label>
        </section>

        {!isEditing && (
          <section className="xl:col-span-2 space-y-4 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={queroCriarAgendamento}
                onChange={(e) => {
                  setQueroCriarAgendamento(e.target.checked)
                  if (!e.target.checked) {
                    setAgendamentoUnidadeId('')
                    setAgendamentoAtendenteId('')
                    setAgendamentoDataHoraInicio('')
                    setAgendamentoServicosIds([])
                  }
                }}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 w-4 h-4"
              />
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <CalendarPlus className="w-5 h-5 text-violet-600" />
                Já criar um agendamento para este cliente
              </span>
            </label>

            {queroCriarAgendamento && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-600">
                  Preencha os dados do primeiro agendamento. Pode ser único ou recorrente.
                </p>

                {unidadeUnicaId ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Unidade do agendamento</label>
                    <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2">
                      {unidadeUnica?.nome}
                      {unidadeUnica?.cidade ? ` (${unidadeUnica.cidade})` : ''}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Unidade do agendamento</label>
                    <select
                      value={agendamentoUnidadeId}
                      onChange={(e) => {
                        setAgendamentoUnidadeId(e.target.value ? Number(e.target.value) : '')
                        setAgendamentoAtendenteId('')
                      }}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                    >
                      <option value="">Selecione</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                          {u.cidade ? ` (${u.cidade})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Atendente</label>
                  <select
                    value={agendamentoAtendenteId}
                    onChange={(e) => setAgendamentoAtendenteId(e.target.value ? Number(e.target.value) : '')}
                    disabled={!agendamentoUnidadeId}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Selecione</option>
                    {atendentesAgendamento.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nomeUsuario}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Serviços</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-white">
                    {(servicos || []).filter((s) => s.ativo !== false).map((s: Servico) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agendamentoServicosIds.includes(s.id!)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAgendamentoServicosIds((prev) => [...prev, s.id!])
                            } else {
                              setAgendamentoServicosIds((prev) => prev.filter((itemId) => itemId !== s.id))
                            }
                          }}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm">
                          {s.nome}
                          {s.valor != null && <span className="text-slate-500 ml-1">R$ {Number(s.valor).toFixed(2)}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data e hora</label>
                  <input
                    type="datetime-local"
                    value={agendamentoDataHoraInicio}
                    onChange={(e) => setAgendamentoDataHoraInicio(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                  />
                </div>

                <RecorrenciaConfig value={recorrenciaConfig} onChange={setRecorrenciaConfig} />
              </div>
            )}
          </section>
        )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/clientes')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saveMutation.isPending || salvandoComAgendamento}>
            {saveMutation.isPending || salvandoComAgendamento
              ? 'Salvando...'
              : !isEditing && queroCriarAgendamento
                ? 'Cadastrar e criar agendamento'
                : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
