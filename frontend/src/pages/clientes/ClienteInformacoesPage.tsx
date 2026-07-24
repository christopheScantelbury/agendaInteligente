import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ChevronLeft, ChevronRight, Clock3, Download, FileText, Image, Phone, Search, TrendingUp, User, Briefcase, Calendar } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clienteService } from '../../services/clienteService'
import { agendamentoService } from '../../services/agendamentoService'
import { badgeClass, labelOf } from '../../utils/statusAgendamento'
import { useIsWebLayout } from '../../hooks/useIsWebLayout'
import { useNotification } from '../../contexts/NotificationContext'
import { baixarArquivo } from '../../utils/downloadFile'

type AbaId = 'home' | 'atendimentos'
type PeriodoTipo = 'MENSAL' | 'ANUAL' | 'CUSTOMIZADA'

const STATUS_EXCLUIDOS_RECEITA = new Set(['CANCELADO', 'NO_SHOW'])

function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDateBR(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, "dd/MM/yyyy", { locale: ptBR })
}

function formatHourBR(value?: string | null): string {
  if (!value) return '—'
  const date = parseISO(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'HH:mm', { locale: ptBR })
}

function getValorAgendamento(agendamento: any): number {
  const valorDireto = Number(agendamento.valorFinal ?? agendamento.valorTotal ?? 0)
  if (Number.isFinite(valorDireto) && valorDireto > 0) return valorDireto

  return (agendamento.servicos ?? []).reduce((acc: number, item: any) => {
    const valorItem = Number(item?.valorTotal ?? item?.valor ?? item?.servico?.valor ?? 0)
    return acc + (Number.isFinite(valorItem) ? valorItem : 0)
  }, 0)
}

function getServicosLabel(agendamento: any): string {
  const servicos = (agendamento.servicos ?? [])
    .map((item: any) => item?.nomeServico ?? item?.servico?.nome ?? item?.descricao)
    .filter(Boolean)
  if (servicos.length > 0) return servicos.join(', ')
  return agendamento.servico?.nome ?? 'Atendimento'
}

function getProfissionalLabel(agendamento: any): string {
  return agendamento.atendente?.nomeUsuario
    ?? agendamento.atendente?.usuario?.nome
    ?? agendamento.atendente?.nome
    ?? '—'
}

function getObservacaoLabel(agendamento: any): string {
  return agendamento.observacoes?.trim()
    ?? agendamento.observacao?.trim()
    ?? (agendamento.servicos ?? [])
      .map((item: any) => item?.descricao)
      .find((txt: string | undefined) => !!txt)
    ?? '—'
}

function createCurrentMonthRange() {
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    inicio: `${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-${pad(inicio.getDate())}`,
    fim: `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}`,
    mes: `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`,
    ano: String(agora.getFullYear()),
  }
}

export default function ClienteInformacoesPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isWeb = useIsWebLayout()
  const { showNotification } = useNotification()
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('home')
  const defaults = useMemo(() => createCurrentMonthRange(), [])
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('MENSAL')
  const [mesReferencia, setMesReferencia] = useState(defaults.mes)
  const [anoReferencia, setAnoReferencia] = useState(defaults.ano)
  const [dataInicioCustom, setDataInicioCustom] = useState(defaults.inicio)
  const [dataFimCustom, setDataFimCustom] = useState(defaults.fim)
  const [filtros, setFiltros] = useState({
    data: '',
    horario: '',
    servico: '',
    preco: '',
    profissional: '',
    situacao: '',
    observacao: '',
  })
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [page, setPage] = useState(0)

  const clienteId = id ? Number(id) : null
  const clienteIdValido = clienteId != null && Number.isFinite(clienteId)

  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ['cliente-resumo', clienteId],
    queryFn: () => clienteService.buscarResumo(clienteId!),
    enabled: clienteIdValido,
  })

  const { data: agendamentos = [], isLoading: loadingAgendamentos } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
    enabled: clienteIdValido,
    staleTime: 60_000,
  })

  const nomeCliente = resumo?.nome ?? 'Cliente'
  const telefoneCliente = resumo?.telefone ?? '—'
  const anoAtual = new Date().getFullYear()

  const atendimentosCliente = useMemo(() => {
    if (!clienteIdValido) return []
    return [...agendamentos]
      .filter((agendamento) => agendamento.clienteId === clienteId)
      .sort((a, b) => parseISO(b.dataHoraInicio).getTime() - parseISO(a.dataHoraInicio).getTime())
  }, [agendamentos, clienteId, clienteIdValido])

  const receitaEsperada = useMemo(() => {
    const agora = new Date()
    return atendimentosCliente
      .filter((agendamento) => {
        const data = parseISO(agendamento.dataHoraInicio)
        return data.getFullYear() === anoAtual && data >= agora && !STATUS_EXCLUIDOS_RECEITA.has(agendamento.status ?? '')
      })
      .reduce((acc, agendamento) => acc + getValorAgendamento(agendamento), 0)
  }, [atendimentosCliente, anoAtual])

  const atendimentosFiltrados = useMemo(() => {
    const filtrarPeriodo = (agendamento: any) => {
      const dataHora = parseISO(agendamento.dataHoraInicio)
      if (Number.isNaN(dataHora.getTime())) return false

      if (periodoTipo === 'MENSAL') {
        return dataHora.getFullYear() === Number(mesReferencia.slice(0, 4))
          && dataHora.getMonth() === Number(mesReferencia.slice(5, 7)) - 1
      }

      if (periodoTipo === 'ANUAL') {
        return dataHora.getFullYear() === Number(anoReferencia)
      }

      const inicio = dataInicioCustom ? parseISO(`${dataInicioCustom}T00:00:00`) : null
      const fim = dataFimCustom ? parseISO(`${dataFimCustom}T23:59:59`) : null
      if (inicio && dataHora < inicio) return false
      if (fim && dataHora > fim) return false
      return true
    }

    const includes = (source: string, term: string) =>
      !term || source.toLowerCase().includes(term.toLowerCase())

    return atendimentosCliente.filter((agendamento) => {
      if (!filtrarPeriodo(agendamento)) return false

      const dataHora = parseISO(agendamento.dataHoraInicio)
      const dataLabel = Number.isNaN(dataHora.getTime()) ? '' : formatDateBR(agendamento.dataHoraInicio)
      const horaLabel = Number.isNaN(dataHora.getTime()) ? '' : formatHourBR(agendamento.dataHoraInicio)
      const servicoLabel = getServicosLabel(agendamento)
      const precoLabel = formatCurrencyBR(getValorAgendamento(agendamento))
      const profissionalLabel = getProfissionalLabel(agendamento)
      const situacaoLabel = labelOf(agendamento.status)
      const observacaoLabel = getObservacaoLabel(agendamento)

      return (
        includes(dataLabel, filtros.data) &&
        includes(horaLabel, filtros.horario) &&
        includes(servicoLabel, filtros.servico) &&
        includes(precoLabel, filtros.preco) &&
        includes(profissionalLabel, filtros.profissional) &&
        includes(situacaoLabel, filtros.situacao) &&
        includes(observacaoLabel, filtros.observacao)
      )
    })
  }, [
    atendimentosCliente,
    periodoTipo,
    mesReferencia,
    anoReferencia,
    dataInicioCustom,
    dataFimCustom,
    filtros,
  ])

  const totalAtendimentosFiltrados = atendimentosFiltrados.length
  const totalPaginas = Math.max(1, Math.ceil(totalAtendimentosFiltrados / rowsPerPage))
  const paginaAtual = Math.min(page, totalPaginas - 1)
  const atendimentosPaginados = atendimentosFiltrados.slice(
    paginaAtual * rowsPerPage,
    paginaAtual * rowsPerPage + rowsPerPage,
  )

  useEffect(() => {
    setPage(0)
  }, [periodoTipo, mesReferencia, anoReferencia, dataInicioCustom, dataFimCustom, filtros, rowsPerPage])

  useEffect(() => {
    if (!isWeb && periodoTipo === 'CUSTOMIZADA') {
      setPeriodoTipo('MENSAL')
    }
  }, [isWeb, periodoTipo])

  const ultimoAtendimento = resumo?.ultimoAtendimento
  const procedimentoMaisRecente = resumo?.ultimosProcedimentos?.[0]?.nome ?? 'Nenhum procedimento'
  const isLoading = loadingResumo || loadingAgendamentos

  const abertoAnamneses = () => {
    navigate(`/clientes/${id}/anamneses`)
  }

  const abertoFotos = () => {
    showNotification('info', 'Área de fotos em breve.')
  }

  const exportarAtendimentos = () => {
    if (atendimentosFiltrados.length === 0) {
      showNotification('info', 'Sem dados para exportar no período.')
      return
    }

    const header = ['Data', 'Horario', 'Servico', 'Preco', 'Profissional', 'Situacao', 'Observacao']
    const linhas = atendimentosFiltrados.map((agendamento) => {
      const dataHora = parseISO(agendamento.dataHoraInicio)
      const data = Number.isNaN(dataHora.getTime()) ? '' : formatDateBR(agendamento.dataHoraInicio)
      const horario = Number.isNaN(dataHora.getTime())
        ? ''
        : `${formatHourBR(agendamento.dataHoraInicio)}${agendamento.dataHoraFim ? ` - ${formatHourBR(agendamento.dataHoraFim)}` : ''}`
      return [
        data,
        horario,
        getServicosLabel(agendamento),
        formatCurrencyBR(getValorAgendamento(agendamento)),
        getProfissionalLabel(agendamento),
        labelOf(agendamento.status),
        getObservacaoLabel(agendamento),
      ]
    })

    const csv = [header, ...linhas]
      .map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    baixarArquivo(csv, `atendimentos-cliente-${clienteId}.csv`)
  }

  if (!clienteIdValido) {
    return (
      <div className={`${isWeb ? 'max-w-[1920px] w-full p-6 xl:p-8' : 'max-w-3xl p-4 sm:p-6'} mx-auto`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          Cliente não encontrado.
        </div>
      </div>
    )
  }

  return (
    <div className={`${isWeb ? 'max-w-[1920px] w-full p-6 xl:p-8' : 'max-w-3xl p-4 sm:p-6'} mx-auto space-y-6`}>
      <header className="space-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/clientes')}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 truncate">
            Informações do cliente
          </h1>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6">
          <nav className="flex gap-6">
            {(['home', 'atendimentos'] as AbaId[]).map((aba) => (
              <button
                key={aba}
                type="button"
                onClick={() => setAbaAtiva(aba)}
                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${
                  abaAtiva === aba
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {aba === 'home' ? 'HOME' : 'ATENDIMENTOS'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            </div>
          ) : abaAtiva === 'home' ? (
            <div className="space-y-4">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-700">Dados cadastrais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoCard icon={User} label="Nome" value={nomeCliente} />
                  <InfoCard icon={Phone} label="Telefone" value={telefoneCliente} />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-700">Resumo do cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <MiniMetric
                    icon={TrendingUp}
                    label={`Receita esperada em ${anoAtual}`}
                    value={formatCurrencyBR(receitaEsperada)}
                  />
                  <MiniMetric
                    icon={Clock3}
                    label="Último atendimento"
                    value={ultimoAtendimento ? formatDateBR(ultimoAtendimento) : 'Nenhum atendimento'}
                    helper={resumo?.diasDesdeUltimoAtendimento != null
                      ? `há ${resumo.diasDesdeUltimoAtendimento} dia${resumo.diasDesdeUltimoAtendimento === 1 ? '' : 's'}`
                      : undefined}
                  />
                  <MiniMetric
                    icon={Briefcase}
                    label="Procedimento realizado"
                    value={procedimentoMaisRecente}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-700">Acessos rápidos</h2>
                <div className="space-y-2">
                  <ActionRow
                    icon={FileText}
                    label="ANAMNESES"
                    onClick={abertoAnamneses}
                  />
                  <ActionRow
                    icon={Image}
                    label="FOTOS"
                    onClick={abertoFotos}
                  />
                </div>
              </section>
            </div>
          ) : (
            <section className="space-y-4">
              {isWeb ? (
                <div className="flex flex-wrap items-start gap-6">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Tipo do período</p>
                    <div className="flex flex-wrap items-center gap-4">
                      {([
                        { value: 'MENSAL', label: 'Mensal' },
                        { value: 'ANUAL', label: 'Anual' },
                        { value: 'CUSTOMIZADA', label: 'Customizada' },
                      ] as const).map((opt) => (
                        <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
                          <input
                            type="radio"
                            name="periodoTipo"
                            value={opt.value}
                            checked={periodoTipo === opt.value}
                            onChange={() => setPeriodoTipo(opt.value)}
                            className="h-5 w-5 accent-violet-600"
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {periodoTipo === 'MENSAL' && (
                      <div className="space-y-1 min-w-[260px]">
                        <label className="block text-sm font-medium text-slate-700">Mês e Ano</label>
                        <MonthYearPicker
                          value={mesReferencia}
                          onChange={setMesReferencia}
                        />
                      </div>
                    )}

                    {periodoTipo === 'ANUAL' && (
                      <div className="space-y-1 min-w-[160px]">
                        <label className="block text-sm font-medium text-slate-700">Ano</label>
                        <YearPicker
                          value={anoReferencia}
                          onChange={setAnoReferencia}
                        />
                      </div>
                    )}

                    {periodoTipo === 'CUSTOMIZADA' && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-500">Data inicial</label>
                            <input
                              type="date"
                              value={dataInicioCustom}
                              onChange={(e) => setDataInicioCustom(e.target.value)}
                              className="w-full min-w-[180px] border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 shadow-none rounded-none focus:border-violet-500 focus:outline-none focus:ring-0"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-500">Data final</label>
                            <input
                              type="date"
                              value={dataFimCustom}
                              onChange={(e) => setDataFimCustom(e.target.value)}
                              className="w-full min-w-[180px] border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 shadow-none rounded-none focus:border-violet-500 focus:outline-none focus:ring-0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {isWeb && (
                    <button
                      type="button"
                      onClick={exportarAtendimentos}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-800 ml-auto"
                    >
                      <Download className="h-4 w-4" />
                      EXPORTAR
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                  <div className="space-y-1 min-w-0">
                    <label className="sr-only" htmlFor="busca-servico-mobile">
                      Buscar por serviço
                    </label>
                    <input
                      id="busca-servico-mobile"
                      type="text"
                      value={filtros.servico}
                      onChange={(e) => setFiltros((prev) => ({ ...prev, servico: e.target.value }))}
                      placeholder="Buscar serviço..."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <MobilePeriodoPicker
                    periodoTipo={periodoTipo}
                    setPeriodoTipo={setPeriodoTipo}
                    mesReferencia={mesReferencia}
                    setMesReferencia={setMesReferencia}
                    anoReferencia={anoReferencia}
                    setAnoReferencia={setAnoReferencia}
                  />
                </div>
              )}

              {isWeb ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1220px] w-full text-sm">
                      <thead className="bg-white">
                        <tr className="border-b border-slate-200">
                          <ThCell label="Data" sortIcon />
                          <ThCell label="Horario" />
                          <ThCell label="Serviço" />
                          <ThCell label="Preço" />
                          <ThCell label="Profissional" />
                          <ThCell label="Situação" />
                          <ThCell label="Observação" />
                        </tr>
                        <tr className="border-b border-slate-200 align-bottom">
                          <ThFilter>
                            <FilterInput
                              value={filtros.data}
                              onChange={(value) => setFiltros((prev) => ({ ...prev, data: value }))}
                              placeholder="dd/mm/aaaa"
                              leftIcon={Calendar}
                            />
                          </ThFilter>
                          <ThFilter>
                            <FilterInput
                              value={filtros.horario}
                              onChange={(value) => setFiltros((prev) => ({ ...prev, horario: value }))}
                              placeholder="hh:mm"
                              leftIcon={Search}
                            />
                          </ThFilter>
                          <ThFilter>
                            <FilterInput
                              value={filtros.servico}
                              onChange={(value) => setFiltros((prev) => ({ ...prev, servico: value }))}
                              placeholder="Buscar serviço..."
                              leftIcon={Search}
                            />
                          </ThFilter>
                          <ThFilter>
                            <FilterInput
                              value={filtros.preco}
                              onChange={(value) => setFiltros((prev) => ({ ...prev, preco: value }))}
                              placeholder="R$"
                              leftIcon={Search}
                            />
                          </ThFilter>
                          <ThFilter>
                            <FilterInput
                              value={filtros.profissional}
                              onChange={(value) => setFiltros((prev) => ({ ...prev, profissional: value }))}
                              placeholder="Profissional..."
                              leftIcon={Search}
                            />
                          </ThFilter>
                          <ThFilter>
                            <FilterInput
                              value={filtros.situacao}
                              onChange={(value) => setFiltros((prev) => ({ ...prev, situacao: value }))}
                              placeholder="Situação..."
                              leftIcon={Search}
                            />
                          </ThFilter>
                          <ThFilter>
                            <FilterInput
                              value={filtros.observacao}
                              onChange={(value) => setFiltros((prev) => ({ ...prev, observacao: value }))}
                              placeholder="Observação..."
                              leftIcon={Search}
                            />
                          </ThFilter>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingAgendamentos ? (
                          [...Array(4)].map((_, index) => (
                            <tr key={index}>
                              <td colSpan={7} className="px-4 py-4">
                                <div className="h-8 rounded-xl bg-slate-100 animate-pulse" />
                              </td>
                            </tr>
                          ))
                        ) : atendimentosPaginados.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-slate-500">
                              Nenhum resultado encontrado.
                            </td>
                          </tr>
                        ) : (
                          atendimentosPaginados.map((agendamento) => {
                            const dataHoraInicio = agendamento.dataHoraInicio ? parseISO(agendamento.dataHoraInicio) : null
                            const data = dataHoraInicio && !Number.isNaN(dataHoraInicio.getTime())
                              ? formatDateBR(agendamento.dataHoraInicio)
                              : '—'
                            const horario = dataHoraInicio && !Number.isNaN(dataHoraInicio.getTime())
                              ? `${formatHourBR(agendamento.dataHoraInicio)}${agendamento.dataHoraFim ? ` - ${formatHourBR(agendamento.dataHoraFim)}` : ''}`
                              : '—'
                            const situacao = labelOf(agendamento.status)

                            return (
                              <tr key={agendamento.id ?? `${agendamento.clienteId}-${agendamento.dataHoraInicio}`} className="hover:bg-slate-50/70">
                                <TdCell value={data} />
                                <TdCell value={horario} />
                                <TdCell value={getServicosLabel(agendamento)} />
                                <TdCell value={formatCurrencyBR(getValorAgendamento(agendamento))} />
                                <TdCell value={getProfissionalLabel(agendamento)} />
                                <TdCell>
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${badgeClass(agendamento.status)}`}>
                                    {situacao}
                                  </span>
                                </TdCell>
                                <TdCell value={getObservacaoLabel(agendamento)} />
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span>Linhas por página</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
                      >
                        {[10, 25, 50].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <span className="min-w-[88px] text-center sm:text-left">
                      {totalAtendimentosFiltrados === 0
                        ? '0–0 of 0'
                        : `${paginaAtual * rowsPerPage + 1}–${Math.min((paginaAtual + 1) * rowsPerPage, totalAtendimentosFiltrados)} of ${totalAtendimentosFiltrados}`}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        disabled={paginaAtual === 0}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(totalPaginas - 1, current + 1))}
                        disabled={paginaAtual >= totalPaginas - 1}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Próxima página"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {loadingAgendamentos ? (
                    [...Array(4)].map((_, index) => (
                      <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-100 animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                            <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
                            <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : atendimentosPaginados.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                      Nenhum resultado encontrado.
                    </div>
                  ) : (
                    atendimentosPaginados.map((agendamento) => {
                      const dataHoraInicio = agendamento.dataHoraInicio ? parseISO(agendamento.dataHoraInicio) : null
                      const data = dataHoraInicio && !Number.isNaN(dataHoraInicio.getTime())
                        ? formatDateBR(agendamento.dataHoraInicio)
                        : '—'
                      const horarioInicio = dataHoraInicio && !Number.isNaN(dataHoraInicio.getTime())
                        ? formatHourBR(agendamento.dataHoraInicio)
                        : '—'

                      return (
                        <article
                          key={agendamento.id ?? `${agendamento.clienteId}-${agendamento.dataHoraInicio}`}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                              <Calendar className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {agendamento.cliente?.nome ?? `Cliente #${agendamento.clienteId}`}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {data} - {horarioInicio}
                              </p>
                              <p className="truncate text-sm text-slate-700">
                                {getServicosLabel(agendamento)}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {getProfissionalLabel(agendamento)}
                              </p>
                            </div>
                          </div>
                        </article>
                      )
                    })
                  )}

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    <span>
                      {totalAtendimentosFiltrados === 0
                        ? '0 de 0'
                        : `${paginaAtual * rowsPerPage + 1}–${Math.min((paginaAtual + 1) * rowsPerPage, totalAtendimentosFiltrados)} de ${totalAtendimentosFiltrados}`}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        disabled={paginaAtual === 0}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(totalPaginas - 1, current + 1))}
                        disabled={paginaAtual >= totalPaginas - 1}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Próxima página"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
        <Icon className="h-4 w-4 text-violet-600" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900 break-words">{value}</p>
    </div>
  )
}

function MiniMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon
  label: string
  value: string
  helper?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
        <Icon className="h-4 w-4 text-violet-600" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900 break-words">{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  )
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-violet-300 hover:bg-violet-50 transition-colors"
    >
      <span className="flex items-center gap-3 min-w-0">
        <Icon className="h-4 w-4 text-violet-600 shrink-0" />
        <span className="text-sm font-semibold text-slate-900">{label}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
    </button>
  )
}

function ThCell({ label, sortIcon = false }: { label: string; sortIcon?: boolean }) {
  return (
    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
      <span className="inline-flex items-center gap-1.5">
        {label}
        {sortIcon && <ArrowDown className="h-4 w-4 text-slate-400" />}
      </span>
    </th>
  )
}

function ThFilter({ children }: { children: ReactNode }) {
  return <th className="px-4 pb-3 align-bottom">{children}</th>
}

function TdCell({ value, children }: { value?: string; children?: ReactNode }) {
  return <td className="px-4 py-3 text-slate-700 align-top">{children ?? value}</td>
}

function FilterInput({
  value,
  onChange,
  placeholder,
  leftIcon: LeftIcon,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  leftIcon: LucideIcon
}) {
  return (
    <div className="relative">
      <LeftIcon className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-0 border-b border-slate-200 bg-transparent py-2 pl-6 pr-6 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
      />
      <Search className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
    </div>
  )
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function formatMonthYear(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return 'Selecione'
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return 'Selecione'
  return `${MONTHS[month - 1]} ${year}`
}

function MonthYearPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string
  onChange: (value: string) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => Number(value.slice(0, 4)) || new Date().getFullYear())
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (!open) return undefined
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) {
      const parsed = Number(value.slice(0, 4))
      if (Number.isFinite(parsed)) setViewYear(parsed)
    }
  }, [open, value])

  const selectedMonth = Number(value.slice(5, 7))

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-left text-sm text-slate-900 shadow-none transition focus:outline-none focus:border-violet-500 focus:ring-0 ${
          compact
            ? 'min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'
            : 'min-w-[260px]'
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value ? formatMonthYear(value) : 'Selecione'}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ${
            compact ? 'right-0 w-[min(320px,calc(100vw-2rem))]' : 'left-0 w-[320px]'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((current) => current - 1)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Ano anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-slate-900">{viewYear}</div>
            <button
              type="button"
              onClick={() => setViewYear((current) => current + 1)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Próximo ano"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month, index) => {
              const monthValue = `${viewYear}-${String(index + 1).padStart(2, '0')}`
              const isSelected = Number(value.slice(0, 4)) === viewYear && selectedMonth === index + 1
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => {
                    onChange(monthValue)
                    setOpen(false)
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  {month.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function YearPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string
  onChange: (value: string) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [baseYear, setBaseYear] = useState(() => Number(value) || new Date().getFullYear())
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (!open) return undefined
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) setBaseYear(parsed)
    }
  }, [open, value])

  const years = useMemo(() => {
    const start = Math.floor(baseYear / 12) * 12
    return Array.from({ length: 12 }, (_, idx) => start + idx)
  }, [baseYear])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-left text-sm text-slate-900 shadow-none transition focus:outline-none focus:border-violet-500 focus:ring-0 ${
          compact
            ? 'min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'
            : 'min-w-[160px]'
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || 'Selecione'}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ${
            compact ? 'right-0 w-[min(280px,calc(100vw-2rem))]' : 'left-0 w-[280px]'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setBaseYear((current) => current - 12)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Doze anos anteriores"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-slate-900">
              {years[0]} - {years[years.length - 1]}
            </div>
            <button
              type="button"
              onClick={() => setBaseYear((current) => current + 12)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Próximos doze anos"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {years.map((year) => {
              const isSelected = Number(value) === year
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    onChange(String(year))
                    setOpen(false)
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  {year}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MobilePeriodoPicker({
  periodoTipo,
  setPeriodoTipo,
  mesReferencia,
  setMesReferencia,
  anoReferencia,
  setAnoReferencia,
}: {
  periodoTipo: PeriodoTipo
  setPeriodoTipo: (value: PeriodoTipo) => void
  mesReferencia: string
  setMesReferencia: (value: string) => void
  anoReferencia: string
  setAnoReferencia: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => Number(anoReferencia) || Number(mesReferencia.slice(0, 4)) || new Date().getFullYear())
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 320 })
  const selectedMonth = Number(mesReferencia.slice(5, 7))

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    if (!open) return undefined
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const parsed = Number(anoReferencia) || Number(mesReferencia.slice(0, 4))
    if (Number.isFinite(parsed)) setViewYear(parsed)
  }, [open, anoReferencia, mesReferencia])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(340, window.innerWidth - 32)
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16))
      const top = rect.bottom + 8
      setPanelPos({ top, left, width })
    }

    updatePosition()
    const onResize = () => updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, viewYear, periodoTipo])

  const popover = open
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
          style={{
            top: `${panelPos.top}px`,
            left: `${panelPos.left}px`,
            width: `${panelPos.width}px`,
            maxWidth: 'calc(100vw - 2rem)',
          }}
        >
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setPeriodoTipo('MENSAL')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  periodoTipo === 'MENSAL'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Mês e ano
              </button>
              <button
                type="button"
                onClick={() => setPeriodoTipo('ANUAL')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  periodoTipo === 'ANUAL'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Só ano
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((current) => current - 1)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Ano anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-slate-900">{viewYear}</div>
            <button
              type="button"
              onClick={() => setViewYear((current) => current + 1)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Próximo ano"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {periodoTipo === 'ANUAL' ? (
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }, (_, idx) => viewYear - 4 + idx).map((year) => {
                    const isSelected = Number(anoReferencia) === year
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setPeriodoTipo('ANUAL')
                          setAnoReferencia(String(year))
                          setOpen(false)
                        }}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                        }`}
                      >
                        {year}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {MONTHS.map((month, index) => {
                    const monthValue = `${viewYear}-${String(index + 1).padStart(2, '0')}`
                    const isSelected = Number(mesReferencia.slice(0, 4)) === viewYear && selectedMonth === index + 1
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          setPeriodoTipo('MENSAL')
                          setMesReferencia(monthValue)
                          setAnoReferencia(String(viewYear))
                          setOpen(false)
                        }}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                        }`}
                      >
                        {month.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      >
        <span className="truncate">
          {periodoTipo === 'MENSAL' ? formatMonthYear(mesReferencia) : (anoReferencia || 'Selecione')}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
      </button>
      {popover}
    </div>
  )
}
