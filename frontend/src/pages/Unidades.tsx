import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unidadeService, Unidade } from '../services/unidadeService'
import { empresaService } from '../services/empresaService'
import { atendenteService } from '../services/atendenteService'
import { authService } from '../services/authService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import { Plus, Trash2, Edit, Clock, UserCog, ExternalLink, Building2, Phone, Loader2 } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'
import Button from '../components/Button'
import FormField from '../components/FormField'
import FilterBar from '../components/FilterBar'
import IntegerInput from '../components/forms/IntegerInput'
import MoneyInput from '../components/forms/MoneyInput'
import NotaFacilCard from '../components/unidades/NotaFacilCard'
import { useNotification } from '../contexts/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { maskPhone, maskCEP, maskNumber } from '../utils/masks'
import { matchSearch } from '../utils/normalize'
import { buscarEnderecoPorCep } from '../utils/viaCep'

export default function Unidades() {
  const { showNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ ativo?: string; empresaId?: string }>({})
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()

  const { data: perfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarUnidades = podeEditar(perfil, '/unidades')

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: empresaService.listarTodos,
  })

  const unidadesFiltradas = useMemo(() => {
    let filtered = [...unidades]

    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          matchSearch(u.nome, searchTerm) ||
          matchSearch(u.descricao ?? '', searchTerm) ||
          matchSearch(u.cidade ?? '', searchTerm) ||
          (u.telefone && u.telefone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')))
      )
    }

    // Filtro de status
    if (filters.ativo !== undefined && filters.ativo !== '') {
      const isAtivo = filters.ativo === 'true'
      filtered = filtered.filter((u) => (u.ativo ?? true) === isAtivo)
    }

    // Filtro de empresa
    if (filters.empresaId && filters.empresaId !== '') {
      filtered = filtered.filter((u) => u.empresaId === parseInt(filters.empresaId!))
    }

    return filtered
  }, [unidades, searchTerm, filters])

  const deleteMutation = useMutation({
    mutationFn: unidadeService.excluir,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      showNotification('success', 'Unidade excluída com sucesso!')
      setConfirmDelete({ isOpen: false, id: null })
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao excluir unidade'
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
            <Building2 className="h-6 w-6 text-violet-600" />
            Unidades
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Endereços e horários de funcionamento da empresa.
          </p>
        </div>
        {podeEditarUnidades && (
          <Button
            onClick={() => {
              setEditingUnidade(null)
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Unidade
          </Button>
        )}
      </header>

      {/* Barra de Filtros */}
      <FilterBar
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        searchPlaceholder="Buscar por nome, descrição, cidade ou telefone..."
        filters={[
          {
            key: 'ativo',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'true', label: 'Ativas' },
              { value: 'false', label: 'Inativas' },
            ],
          },
          ...(empresas.length > 0
            ? [
                {
                  key: 'empresaId',
                  label: 'Empresa',
                  type: 'select' as const,
                  options: (empresas as Array<{ id?: number; nome: string }>).map((e) => ({
                    value: e.id?.toString() || '',
                    label: e.nome,
                  })),
                },
              ]
            : []),
        ]}
      />

      {unidadesFiltradas.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <Building2 className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">
            {searchTerm || Object.values(filters).some(v => v !== '' && v !== undefined)
              ? 'Nenhuma unidade encontrada com os filtros aplicados.'
              : 'Nenhuma unidade cadastrada ainda.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {unidadesFiltradas.map((unidade) => {
            const ativo = unidade.ativo ?? true
            const endereco = [unidade.endereco, unidade.numero && unidade.endereco ? `, ${unidade.numero}` : '', unidade.bairro ? ` - ${unidade.bairro}` : '']
              .filter(Boolean)
              .join('')
            return (
              <li
                key={unidade.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{unidade.nome}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    {endereco && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{endereco}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      {unidade.telefone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {unidade.telefone}
                        </span>
                      )}
                      {(unidade.horarioAbertura || unidade.horarioFechamento) && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {unidade.horarioAbertura?.slice(0, 5)} – {unidade.horarioFechamento?.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                  {podeEditarUnidades && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingUnidade(unidade)
                          setShowModal(true)
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700 transition"
                        aria-label="Editar unidade"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(unidade.id!)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                        aria-label="Excluir unidade"
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

      {unidadesFiltradas.length > 0 && (
        <p className="text-xs text-slate-500 text-center">
          Mostrando {unidadesFiltradas.length} de {unidades.length} unidade{unidades.length !== 1 ? 's' : ''}
        </p>
      )}

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
          onClose={() => {
            setShowModal(false)
            setEditingUnidade(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  )
}

function UnidadeForm({
  unidade,
  onClose,
}: {
  unidade: Unidade | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
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
      horarioAbertura: '08:00',
      horarioFechamento: '18:00',
      empresaId: undefined,
    }
  )

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: empresaService.listarAtivas,
  })

  // ViaCEP: busca debounced auto-preenche endereço/bairro/cidade/uf/municipioIbge
  // (este último é necessário pro NFS-e). Não sobrescreve campos já preenchidos.
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
          municipioIbge: prev.municipioIbge?.trim() ? prev.municipioIbge : endereco.ibge,
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
    if (unidade) {
      setFormData({
        ...unidade,
      })
    } else {
      setFormData({
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
        horarioAbertura: '08:00',
        horarioFechamento: '18:00',
        empresaId: undefined,
      })
    }
  }, [unidade])

  const saveMutation = useMutation({
    mutationFn: async (data: Unidade) => {
      // Garantir campos de hora no formato HH:mm:ss se necessário, ou HH:mm
      // Backend espera LocalTime, string HH:mm funciona geralmente
      return unidade?.id
        ? unidadeService.atualizar(unidade.id, data)
        : unidadeService.criar(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      showNotification('success', unidade ? 'Unidade atualizada com sucesso!' : 'Unidade criada com sucesso!')
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao salvar unidade'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validação local — espelha @NotNull + @AssertTrue do UnidadeDTO.
    if (!formData.horarioAbertura || !formData.horarioFechamento) {
      showNotification('error', 'Horário de abertura e fechamento são obrigatórios.')
      return
    }
    if (formData.horarioAbertura >= formData.horarioFechamento) {
      showNotification('error', 'Horário de fechamento precisa ser posterior ao de abertura.')
      return
    }
    saveMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nome da Unidade" required>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Abertura" required>
              <input
                type="time"
                required
                value={formData.horarioAbertura || ''}
                onChange={(e) => setFormData({ ...formData, horarioAbertura: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
              />
            </FormField>
            <FormField label="Fechamento" required>
              <input
                type="time"
                required
                value={formData.horarioFechamento || ''}
                onChange={(e) => setFormData({ ...formData, horarioFechamento: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
              />
            </FormField>
          </div>
          <p className="text-[11px] text-slate-500 -mt-1">
            Necessário pra cliente conseguir agendar. Configure os horários típicos
            de funcionamento — se quiser controle fino por dia, cadastre slots manuais
            em <strong>Profissionais → Horários disponíveis</strong>.
          </p>
        </div>

        <FormField label="Empresa" required>
          <select
            required
            value={formData.empresaId || ''}
            onChange={(e) => setFormData({ ...formData, empresaId: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          >
            <option value="">Selecione uma empresa</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <FormField label="Endereço">
          <input
            type="text"
            value={formData.endereco || ''}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </FormField>

        <FormField label="Email">
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })}
            placeholder="exemplo@email.com"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </FormField>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <FormField label="Número">
            <input
              type="text"
              value={formData.numero || ''}
              onChange={(e) => setFormData({ ...formData, numero: maskNumber(e.target.value) })}
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

        {/* Seção NotaFácil */}
        <div className="border-t pt-4 mt-2">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600 mb-3">NotaFácil — Emissão de NFS-e</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="CNPJ da Unidade">
              <input
                type="text"
                maxLength={14}
                value={formData.cnpj || ''}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, '') })}
                placeholder="00000000000000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 font-mono text-sm"
              />
            </FormField>
            <FormField label="Inscrição Municipal">
              <input
                type="text"
                value={formData.inscricaoMunicipal || ''}
                onChange={(e) => setFormData({ ...formData, inscricaoMunicipal: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 font-mono text-sm"
              />
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Código IBGE do Município">
              <input
                type="text"
                maxLength={7}
                value={formData.municipioIbge || ''}
                onChange={(e) => setFormData({ ...formData, municipioIbge: e.target.value.replace(/\D/g, '') })}
                placeholder="ex: 3550308"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 font-mono text-sm"
              />
            </FormField>
          </div>

          {/* #159: card de provisionamento NotaFácil. Substitui o input manual
              de api_key — agora a chave é gerada pelo gateway via botão. */}
          {unidade?.id && (
            <div className="mt-4">
              <NotaFacilCard unidadeId={unidade.id} />
            </div>
          )}
          {!unidade?.id && (
            <p className="mt-3 text-[11px] text-slate-500">
              Salve a unidade primeiro pra liberar a emissão de NFS-e.
            </p>
          )}
        </div>

        {/* Sinal/Adiantamento (V76) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Sinal / Adiantamento</h3>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.cobraSinal ?? false}
              onChange={(e) => setFormData({ ...formData, cobraSinal: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 accent-violet-600"
            />
            <span className="text-sm text-slate-700">Esta unidade cobra sinal para confirmar agendamento</span>
          </label>
          {formData.cobraSinal && (
            <div className="space-y-3">
              {/* #175: escolha da modalidade do sinal */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Como o sinal é definido
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { valor: 'PERCENTUAL', rotulo: 'Percentual do valor' },
                    { valor: 'VALOR_FIXO', rotulo: 'Valor fixo' },
                  ] as const).map((op) => {
                    const ativo = (formData.tipoSinal ?? 'PERCENTUAL') === op.valor
                    return (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipoSinal: op.valor })}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          ativo
                            ? 'border-violet-400 bg-violet-50 text-violet-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200'
                        }`}
                      >
                        {op.rotulo}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(formData.tipoSinal ?? 'PERCENTUAL') === 'PERCENTUAL' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Percentual sugerido (% do valor total)">
                    <IntegerInput
                      min={0}
                      max={100}
                      value={formData.percentualSinal}
                      onChange={(v) => setFormData({ ...formData, percentualSinal: v })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    />
                  </FormField>
                  <div className="text-xs text-slate-500 self-end pb-1">
                    Exemplo: agendamento de R$ 100 com 30% → sinal de R$ 30
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Valor fixo do sinal">
                    <MoneyInput
                      value={formData.valorSinalFixo}
                      onChange={(v) => setFormData({ ...formData, valorSinalFixo: v })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                    />
                  </FormField>
                  <div className="text-xs text-slate-500 self-end pb-1">
                    Exemplo: todo agendamento pede R$ 50 de sinal, independente do valor total.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fluxo de atendimento (#157 / V78) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Fluxo de atendimento</h3>
          <p className="text-xs text-slate-500">
            Regras operacionais desta unidade. Padrões preservam o fluxo atual — só altere se entender o impacto.
          </p>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.requerSinalPraIniciar ?? false}
              onChange={(e) => setFormData({ ...formData, requerSinalPraIniciar: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
              disabled={!formData.cobraSinal}
            />
            <span className="text-sm text-slate-700">
              Exigir sinal pago para iniciar o atendimento
              <span className="block text-[11px] text-slate-500">
                Profissional não consegue iniciar enquanto o cliente não pagar o sinal.
                {!formData.cobraSinal && (
                  <span className="text-amber-700"> Disponível só com "Cobra sinal" ativo.</span>
                )}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.exigirConfirmacaoIniciar ?? false}
              onChange={(e) => setFormData({ ...formData, exigirConfirmacaoIniciar: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
            />
            <span className="text-sm text-slate-700">
              Exigir confirmação para iniciar o atendimento
              <span className="block text-[11px] text-slate-500">
                Profissional não consegue iniciar enquanto o agendamento não estiver confirmado.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!(formData.permiteFinalizarSemPagamento ?? true)}
              onChange={(e) =>
                setFormData({ ...formData, permiteFinalizarSemPagamento: !e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
            />
            <span className="text-sm text-slate-700">
              Exigir pagamento ao finalizar atendimento
              <span className="block text-[11px] text-slate-500">
                Bloqueia "Finalizar" sem registrar valor recebido. Use quando todo atendimento é pago na hora.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!(formData.clientePodeCancelarAposConfirmar ?? true)}
              onChange={(e) =>
                setFormData({ ...formData, clientePodeCancelarAposConfirmar: !e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600"
            />
            <span className="text-sm text-slate-700">
              Bloquear cancelamento pelo cliente após confirmar
              <span className="block text-[11px] text-slate-500">
                Cliente só consegue cancelar antes de confirmar. Equipe da unidade continua podendo cancelar.
              </span>
            </span>
          </label>

          <FormField label="Antecedência do lembrete automático (horas, 1–168)">
            <IntegerInput
              min={1}
              max={168}
              value={formData.lembreteConfirmacaoHoras}
              onChange={(v) => setFormData({ ...formData, lembreteConfirmacaoHoras: v })}
              className="mt-1 block w-full sm:w-40 rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
          </FormField>
          <p className="text-[11px] text-slate-500 -mt-1">
            Tempo antes do horário do agendamento pra notificar o cliente confirmar.
          </p>
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

      {/* Seção de Atendentes (Apenas edição) */}
      {unidade?.id && (
        <div className="border-t pt-6 mt-6">
          <AtendentesSection unidadeId={unidade.id} />
        </div>
      )}
    </div>
  )
}

function AtendentesSection({ unidadeId }: { unidadeId: number }) {
  const usuario = authService.getUsuario()
  const perfilNorm = (usuario?.perfil ?? '').toUpperCase().replace('-', '_')
  const rotaCadastroProfissional = perfilNorm === 'ADMINISTRADOR' ? '/profissionais' : '/usuarios'
  const { data: atendentes = [], isLoading } = useQuery({
    queryKey: ['atendentes', 'unidade', unidadeId],
    queryFn: () => atendenteService.listarPorUnidade(unidadeId),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <UserCog className="h-5 w-5 mr-2 text-gray-500" />
          Funcionários (Atendentes)
        </h3>
        <Link
          to={rotaCadastroProfissional}
          state={{ unidadeId }}
          className="text-sm text-violet-700 hover:text-violet-900 flex items-center"
        >
          Adicionar usuário <ExternalLink className="h-3 w-3 ml-1" />
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : atendentes.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500 mb-2">Nenhum atendente vinculado a esta unidade.</p>
          <Link to={rotaCadastroProfissional} state={{ unidadeId }}>
            <Button variant="secondary" size="sm">
              Adicionar usuário
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {atendentes.map((atendente) => (
            <li key={atendente.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{atendente.nomeUsuario || 'Nome não disponível'}</p>
                <p className="text-xs text-gray-500">CPF: {atendente.cpf}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${atendente.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {atendente.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
