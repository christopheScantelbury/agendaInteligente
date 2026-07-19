import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil } from 'lucide-react'
import { anamneseService, type AnamneseFormData } from '../../services/anamneseService'
import { clienteService, type Cliente } from '../../services/clienteService'
import { servicoService, type Servico } from '../../services/servicoService'
import Button from '../../components/Button'
import SimNaoField from '../../components/anamneses/SimNaoField'
import { useNotification } from '../../contexts/NotificationContext'
import { matchSearch } from '../../utils/normalize'
import DateInput from '../../components/forms/DateInput'

const today = new Date().toISOString().split('T')[0]

const emptyForm: AnamneseFormData = {
  clienteId: 0,
  servicoId: undefined,
  servicoNome: '',
  templateId: undefined,
  data: today,
  usaRimel: null,
  usaRimelObs: '',
  procedimentosRecentesOlhos: null,
  procedimentosRecentesOlhosObs: '',
  alergias: null,
  alergiasObs: '',
  problemasOculares: null,
  problemasOcularesObs: '',
  tratamentoOncologico: null,
  tratamentoOncologicoObs: '',
  tireoide: null,
  tireoidedObs: '',
  dormeDeLado: null,
  dormeDeLadoObs: '',
  gravidez: null,
  gravidezObs: '',
  outrosProblemas: null,
  outrosProblemasDescricao: '',
  mapping: '',
  marcaFios: '',
  espessura: '',
  curvatura: '',
  adesivo: '',
  usoImagem: false,
  observacoes: '',
}

export default function AnamneseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const anamneseId = id ? Number(id) : undefined
  // #173: ficha existente abre em leitura; entra em edição pelo botão "Editar"
  // ou já direto quando vem da listagem com ?editar=1.
  const [editing, setEditing] = useState(searchParams.get('editar') === '1')
  const isView = !!id && !editing
  // Cliente é a identidade da ficha — não se troca ao editar, só na criação.
  const clienteBloqueado = !!id

  const [form, setForm] = useState<AnamneseFormData>(emptyForm)
  const [respostasDinamicas, setRespostasDinamicas] = useState<Record<string, { valor?: boolean | string | number | null; obs?: string }>>({})

  // Cliente autocomplete state
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteDropdown, setClienteDropdown] = useState<Cliente[]>([])
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState('')
  const clienteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Serviço autocomplete state
  const [servicoSearch, setServicoSearch] = useState('')
  const [servicoDropdown, setServicoDropdown] = useState<Servico[]>([])
  const [showServicoDropdown, setShowServicoDropdown] = useState(false)
  const servicoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)

  const { data: templates = [] } = useQuery({
    queryKey: ['anamnese-templates'],
    queryFn: anamneseService.listarTemplates,
  })

  const templateSelecionado = templates.find((t) => t.id === form.templateId)
  const usarPerguntasDinamicas = !!(templateSelecionado?.perguntas && templateSelecionado.perguntas.length > 0)

  const { data: todosServicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
  })

  const { data: anamneseExistente, isLoading: isLoadingAnamnese } = useQuery({
    queryKey: ['anamnese', anamneseId],
    queryFn: () => anamneseService.buscarPorId(anamneseId!),
    enabled: isView && !!anamneseId,
  })

  useEffect(() => {
    if (anamneseExistente) {
      setForm({
        clienteId: anamneseExistente.clienteId,
        servicoId: anamneseExistente.servicoId,
        servicoNome: anamneseExistente.servicoNome || '',
        templateId: anamneseExistente.templateId,
        data: anamneseExistente.data,
        usaRimel: anamneseExistente.usaRimel ?? null,
        usaRimelObs: anamneseExistente.usaRimelObs || '',
        procedimentosRecentesOlhos: anamneseExistente.procedimentosRecentesOlhos ?? null,
        procedimentosRecentesOlhosObs: anamneseExistente.procedimentosRecentesOlhosObs || '',
        alergias: anamneseExistente.alergias ?? null,
        alergiasObs: anamneseExistente.alergiasObs || '',
        problemasOculares: anamneseExistente.problemasOculares ?? null,
        problemasOcularesObs: anamneseExistente.problemasOcularesObs || '',
        tratamentoOncologico: anamneseExistente.tratamentoOncologico ?? null,
        tratamentoOncologicoObs: anamneseExistente.tratamentoOncologicoObs || '',
        tireoide: anamneseExistente.tireoide ?? null,
        tireoidedObs: anamneseExistente.tireoidedObs || '',
        dormeDeLado: anamneseExistente.dormeDeLado ?? null,
        dormeDeLadoObs: anamneseExistente.dormeDeLadoObs || '',
        gravidez: anamneseExistente.gravidez ?? null,
        gravidezObs: anamneseExistente.gravidezObs || '',
        outrosProblemas: anamneseExistente.outrosProblemas ?? null,
        outrosProblemasDescricao: anamneseExistente.outrosProblemasDescricao || '',
        mapping: anamneseExistente.mapping || '',
        marcaFios: anamneseExistente.marcaFios || '',
        espessura: anamneseExistente.espessura || '',
        curvatura: anamneseExistente.curvatura || '',
        adesivo: anamneseExistente.adesivo || '',
        usoImagem: anamneseExistente.usoImagem ?? false,
        observacoes: anamneseExistente.observacoes || '',
        respostas: anamneseExistente.respostas,
      })
      setRespostasDinamicas(anamneseExistente.respostas ?? {})
      setClienteNomeSelecionado(anamneseExistente.clienteNome || '')
      setClienteSearch(anamneseExistente.clienteNome || '')
      setServicoSearch(anamneseExistente.servicoNome || '')
    }
  }, [anamneseExistente])

  // Cliente autocomplete
  const handleClienteSearchChange = (value: string) => {
    setClienteSearch(value)
    setClienteNomeSelecionado('')
    setForm((prev) => ({ ...prev, clienteId: 0 }))

    if (clienteDebounceRef.current) clearTimeout(clienteDebounceRef.current)
    if (value.length < 2) {
      setClienteDropdown([])
      setShowClienteDropdown(false)
      return
    }
    clienteDebounceRef.current = setTimeout(async () => {
      try {
        const clientes = await clienteService.listar()
        // #145: busca normaliza acentos (Marília acha quando digito "marilia") +
        // cobre telefone/CPF/email como na listagem de clientes.
        const termoDigits = value.replace(/\D/g, '')
        const filtered = clientes.filter((c) =>
          matchSearch(c.nome, value) ||
          (termoDigits && c.telefone && c.telefone.replace(/\D/g, '').includes(termoDigits)) ||
          (termoDigits && c.cpfCnpj && c.cpfCnpj.replace(/\D/g, '').includes(termoDigits)) ||
          (c.email && matchSearch(c.email, value))
        )
        setClienteDropdown(filtered.slice(0, 8))
        setShowClienteDropdown(true)
      } catch {
        setClienteDropdown([])
      }
    }, 300)
  }

  const selecionarCliente = (cliente: Cliente) => {
    setForm((prev) => ({ ...prev, clienteId: cliente.id! }))
    setClienteNomeSelecionado(cliente.nome)
    setClienteSearch(cliente.nome)
    setClienteDropdown([])
    setShowClienteDropdown(false)
  }

  // Serviço autocomplete
  const handleServicoSearchChange = (value: string) => {
    setServicoSearch(value)
    setForm((prev) => ({ ...prev, servicoId: undefined, servicoNome: value }))

    if (servicoDebounceRef.current) clearTimeout(servicoDebounceRef.current)
    if (value.length < 2) {
      setServicoDropdown([])
      setShowServicoDropdown(false)
      return
    }
    servicoDebounceRef.current = setTimeout(() => {
      const filtered = todosServicos.filter((s) =>
        s.nome.toLowerCase().includes(value.toLowerCase())
      )
      setServicoDropdown(filtered.slice(0, 8))
      setShowServicoDropdown(true)
    }, 300)
  }

  const selecionarServico = (servico: Servico) => {
    setForm((prev) => ({ ...prev, servicoId: servico.id, servicoNome: servico.nome }))
    setServicoSearch(servico.nome)
    setServicoDropdown([])
    setShowServicoDropdown(false)
  }

  const saveMutation = useMutation({
    mutationFn: (data: AnamneseFormData) =>
      anamneseId ? anamneseService.atualizar(anamneseId, data) : anamneseService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamneses'] })
      if (anamneseId) {
        queryClient.invalidateQueries({ queryKey: ['anamnese', anamneseId] })
        showNotification('success', 'Ficha atualizada com sucesso!')
        setEditing(false) // volta pra visualização, sem sair da tela
      } else {
        showNotification('success', 'Ficha salva com sucesso!')
        navigate('/anamneses')
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Erro ao salvar ficha'
      showNotification('error', msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clienteId) {
      showNotification('error', 'Selecione um cliente')
      return
    }
    if (!form.data) {
      showNotification('error', 'Informe a data')
      return
    }
    if (!form.servicoId && !form.servicoNome?.trim()) {
      showNotification('error', 'Informe o procedimento')
      return
    }
    saveMutation.mutate({ ...form, respostas: usarPerguntasDinamicas ? respostasDinamicas : undefined })
  }

  if (isView && isLoadingAnamnese) {
    return <div className="text-center py-8">Carregando...</div>
  }

  const fieldClass =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 text-sm'
  const sectionClass =
    'space-y-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6'
  const sectionTitleClass = 'text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4'

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {!anamneseId ? 'Nova Ficha de Anamnese' : editing ? 'Editar Ficha de Anamnese' : 'Ficha de Anamnese'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {!anamneseId
              ? 'Preencha os dados da ficha de anamnese.'
              : editing
                ? 'Altere os dados e salve no mesmo cadastro.'
                : 'Visualização da ficha.'}
          </p>
          {isView && anamneseExistente?.dataAtualizacao && (
            <p className="text-xs text-gray-400 mt-1">
              Última atualização:{' '}
              {new Date(anamneseExistente.dataAtualizacao).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isView && (
            <Button onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/anamneses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Seção 1 — Identificação */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Identificação</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">
                Cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clienteSearch}
                onChange={(e) => handleClienteSearchChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
                placeholder="Digite para buscar cliente..."
                disabled={clienteBloqueado}
                className={fieldClass}
              />
              {showClienteDropdown && clienteDropdown.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {clienteDropdown.map((c) => (
                    <li
                      key={c.id}
                      onMouseDown={() => selecionarCliente(c)}
                      className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                    >
                      {c.nome}
                      {c.cpfCnpj && <span className="text-gray-400 ml-2 text-xs">{c.cpfCnpj}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {clienteNomeSelecionado && (
                <p className="text-xs text-green-600 mt-1">Selecionado: {clienteNomeSelecionado}</p>
              )}
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={form.data}
                onChange={(v) => setForm({ ...form, data: v })}
                disabled={isView}
                className="mt-1"
              />
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Template</label>
            <select
              value={form.templateId ?? ''}
              onChange={(e) => setForm({ ...form, templateId: e.target.value ? Number(e.target.value) : undefined })}
              disabled={isView}
              className={fieldClass}
            >
              <option value="">Selecione um template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Seção 2 — Questionário (dinâmico baseado no template) */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>
            Questionário
            {usarPerguntasDinamicas && (
              <span className="ml-2 text-xs font-normal text-violet-600">
                ({templateSelecionado?.perguntas?.length} pergunta{templateSelecionado!.perguntas!.length > 1 ? 's' : ''} do template)
              </span>
            )}
          </h2>
          {usarPerguntasDinamicas ? (
            <div className="space-y-5">
              {templateSelecionado!.perguntas!.map((pergunta) => {
                const resposta = respostasDinamicas[pergunta.id] ?? {}
                const setResposta = (patch: { valor?: boolean | string | null; obs?: string }) => {
                  setRespostasDinamicas((prev) => ({
                    ...prev,
                    [pergunta.id]: { ...prev[pergunta.id], ...patch },
                  }))
                }
                if (pergunta.tipo === 'sim_nao') {
                  return (
                    <SimNaoField
                      key={pergunta.id}
                      label={pergunta.label}
                      value={typeof resposta.valor === 'boolean' ? resposta.valor : null}
                      obsValue={resposta.obs ?? ''}
                      showObs={pergunta.comObservacao !== false}
                      onChange={(v) => setResposta({ valor: v })}
                      onObsChange={(obs) => setResposta({ obs })}
                    />
                  )
                }
                return (
                  <div key={pergunta.id} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">{pergunta.label}</label>
                    <input
                      type={pergunta.tipo === 'numero' ? 'number' : 'text'}
                      value={(resposta.valor as string | undefined) ?? ''}
                      onChange={(e) => setResposta({ valor: e.target.value })}
                      disabled={isView}
                      className={fieldClass}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-5">
              {!form.templateId && (
                <p className="text-xs text-gray-500 italic">
                  Selecione um template acima para usar perguntas customizadas, ou preencha as perguntas padrão abaixo.
                </p>
              )}
              <SimNaoField label="Usa rímel?" value={form.usaRimel} obsValue={form.usaRimelObs}
                onChange={(v) => setForm({ ...form, usaRimel: v })}
                onObsChange={(obs) => setForm({ ...form, usaRimelObs: obs })} />
              <SimNaoField label="Realizou algum procedimento recente nos olhos?" value={form.procedimentosRecentesOlhos} obsValue={form.procedimentosRecentesOlhosObs}
                onChange={(v) => setForm({ ...form, procedimentosRecentesOlhos: v })}
                onObsChange={(obs) => setForm({ ...form, procedimentosRecentesOlhosObs: obs })} />
              <SimNaoField label="Possui alergias?" value={form.alergias} obsValue={form.alergiasObs}
                onChange={(v) => setForm({ ...form, alergias: v })}
                onObsChange={(obs) => setForm({ ...form, alergiasObs: obs })} />
              <SimNaoField label="Problemas oculares?" value={form.problemasOculares} obsValue={form.problemasOcularesObs}
                onChange={(v) => setForm({ ...form, problemasOculares: v })}
                onObsChange={(obs) => setForm({ ...form, problemasOcularesObs: obs })} />
              <SimNaoField label="Está em tratamento oncológico?" value={form.tratamentoOncologico} obsValue={form.tratamentoOncologicoObs}
                onChange={(v) => setForm({ ...form, tratamentoOncologico: v })}
                onObsChange={(obs) => setForm({ ...form, tratamentoOncologicoObs: obs })} />
              <SimNaoField label="Tem problema de tireoide?" value={form.tireoide} obsValue={form.tireoidedObs}
                onChange={(v) => setForm({ ...form, tireoide: v })}
                onObsChange={(obs) => setForm({ ...form, tireoidedObs: obs })} />
              <SimNaoField label="Dorme de lado?" value={form.dormeDeLado} obsValue={form.dormeDeLadoObs}
                onChange={(v) => setForm({ ...form, dormeDeLado: v })}
                onObsChange={(obs) => setForm({ ...form, dormeDeLadoObs: obs })} />
              <SimNaoField label="Está grávida?" value={form.gravidez} obsValue={form.gravidezObs}
                onChange={(v) => setForm({ ...form, gravidez: v })}
                onObsChange={(obs) => setForm({ ...form, gravidezObs: obs })} />
              <div className="space-y-2">
                <SimNaoField label="Outros problemas?" value={form.outrosProblemas}
                  onChange={(v) => setForm({ ...form, outrosProblemas: v })} showObs={false} />
                {form.outrosProblemas === true && (
                  <textarea value={form.outrosProblemasDescricao || ''}
                    onChange={(e) => setForm({ ...form, outrosProblemasDescricao: e.target.value })}
                    placeholder="Descreva os outros problemas..." rows={3} disabled={isView}
                    className={fieldClass} />
                )}
              </div>
            </div>
          )}
        </section>

        {/* Seção 3 — Avaliação */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Avaliação</h2>

          {/* Procedimento com autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">
              Procedimento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={servicoSearch}
              onChange={(e) => handleServicoSearchChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowServicoDropdown(false), 200)}
              placeholder="Digite para buscar serviço..."
              disabled={isView}
              className={fieldClass}
            />
            {showServicoDropdown && servicoDropdown.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {servicoDropdown.map((s) => (
                  <li
                    key={s.id}
                    onMouseDown={() => selecionarServico(s)}
                    className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                  >
                    {s.nome}
                    {s.valor != null && (
                      <span className="text-gray-400 ml-2 text-xs">R$ {Number(s.valor).toFixed(2)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mapping</label>
              <input
                type="text"
                value={form.mapping || ''}
                onChange={(e) => setForm({ ...form, mapping: e.target.value })}
                disabled={isView}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Marca dos fios</label>
              <input
                type="text"
                value={form.marcaFios || ''}
                onChange={(e) => setForm({ ...form, marcaFios: e.target.value })}
                disabled={isView}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Espessura</label>
              <input
                type="text"
                value={form.espessura || ''}
                onChange={(e) => setForm({ ...form, espessura: e.target.value })}
                disabled={isView}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Curvatura</label>
              <input
                type="text"
                value={form.curvatura || ''}
                onChange={(e) => setForm({ ...form, curvatura: e.target.value })}
                disabled={isView}
                className={fieldClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Adesivo/Cola</label>
              <input
                type="text"
                value={form.adesivo || ''}
                onChange={(e) => setForm({ ...form, adesivo: e.target.value })}
                disabled={isView}
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        {/* Seção 4 — Uso de imagem */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Uso de imagem</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="usoImagem"
                checked={form.usoImagem === true}
                onChange={() => setForm({ ...form, usoImagem: true })}
                disabled={isView}
                className="text-blue-600 focus:ring-violet-500"
              />
              <span className="text-sm text-gray-700">Autoriza uso de imagem</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="usoImagem"
                checked={form.usoImagem === false}
                onChange={() => setForm({ ...form, usoImagem: false })}
                disabled={isView}
                className="text-blue-600 focus:ring-violet-500"
              />
              <span className="text-sm text-gray-700">Não autoriza</span>
            </label>
          </div>
        </section>

        {/* Seção 5 — Observações */}
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>Observações</h2>
          <textarea
            value={form.observacoes || ''}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            rows={4}
            placeholder="Observações adicionais (opcional)..."
            disabled={isView}
            className={fieldClass}
          />
        </section>

        {!isView && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (editing && anamneseId) {
                  // cancela a edição: descarta alterações recarregando a ficha e volta pra leitura
                  setEditing(false)
                  queryClient.invalidateQueries({ queryKey: ['anamnese', anamneseId] })
                } else {
                  navigate('/anamneses')
                }
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {saveMutation.isPending
                ? 'Salvando...'
                : anamneseId
                  ? 'Salvar alterações'
                  : 'Salvar ficha'}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
