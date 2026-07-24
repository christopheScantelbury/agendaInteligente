import { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { agendamentoService, Agendamento } from '../../services/agendamentoService'
import { atendenteService } from '../../services/atendenteService'
import { authService } from '../../services/authService'
import { useNotification } from '../../contexts/NotificationContext'
import { CalendarOff, CalendarDays, CalendarRange, LayoutGrid, Users } from 'lucide-react'
import DiaHeader from '../../components/agendamentos/DiaHeader'
import ProfissionalFilterChips, { ProfissionalChipItem } from '../../components/agendamentos/ProfissionalFilterChips'
import AgendamentoFab from '../../components/agendamentos/AgendamentoFab'
import NovoAgendamentoSheet from '../../components/agendamentos/NovoAgendamentoSheet'
import DetalhesSheet from '../../components/agendamentos/DetalhesSheet'
import DayTimeline, { ColunaProfissional } from '../../components/agendamentos/DayTimeline'
import AgendamentoCard from '../../components/agendamentos/AgendamentoCard'
import { useIsWebLayout } from '../../hooks/useIsWebLayout'
import ProfissionalPickerSheet, { PickerItem } from '../../components/agendamentos/ProfissionalPickerSheet'
import {
  agendamentoOcupaIntervalo,
  getAgendamentoOcorrencias,
  getPrimeiraOcorrenciaNoIntervalo,
} from '../../utils/agendamentoOcorrencias'

interface Props {
  selectedDate: Date
  onDateChange: (date: Date) => void
  modoAtual: 'dia' | 'semana' | 'mes'
  onModoChange: (modo: 'dia' | 'semana' | 'mes') => void
}

/**
 * Modo Dia — timeline com colunas por profissional (issue #156).
 *
 * Regras:
 * - 1 profissional disponível → chips ocultos, coluna única auto-selecionada.
 * - Web: chips com multi-seleção (até 5). No 1º carregamento
 *   (e ao trocar de dia sem ter feito ajuste manual), seleciona automaticamente
 *   os 5 com mais agendamentos no dia. Os chips desses 5 ficam ATIVOS — sem
 *   chip "Todos" mentiroso.
 * - Mobile: mantém multi-seleção até 2, como antes.
 * - Tap em slot vazio: abre wizard com data/hora + profissional pré-preenchidos.
 * - Tap em card: abre detalhes do agendamento.
 */
export default function DayMode({ selectedDate, onDateChange, modoAtual, onModoChange }: Props) {
  const isWeb = useIsWebLayout()
  const limiteProfissionais = isWeb ? 5 : 2
  const { showNotification } = useNotification()
  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<number[]>([])
  const touchedRef = useRef(false)
  const initialSelectionAppliedRef = useRef(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [novoSheetOpen, setNovoSheetOpen] = useState(false)
  const [novoInitial, setNovoInitial] = useState<{ date: Date; atendenteId?: number } | null>(null)
  const [detalhesId, setDetalhesId] = useState<number | null>(null)
  const [slotMinutes, setSlotMinutes] = useState<15 | 30 | 60>(30)

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
  })

  const { data: atendentes = [] } = useQuery({
    queryKey: ['atendentes'],
    queryFn: atendenteService.listarTodos,
  })

  // Apenas atendentes ativos com id válido
  const atendentesAtivos = useMemo(
    () =>
      atendentes
        .filter((a) => a.ativo !== false)
        .map((a) => ({
          id: (a.id ?? a.usuarioId) as number | undefined,
          nome: (a.nomeUsuario || `Profissional #${a.id}`).split(' ')[0],
        }))
        .filter((a): a is { id: number; nome: string } => typeof a.id === 'number'),
    [atendentes]
  )

  const storageKey = useMemo(() => {
    const usuario = authService.getUsuario()
    const usuarioKey = usuario?.usuarioId ?? usuario?.nome ?? 'anon'
    return `agenda:day:selected-profissionais:${usuarioKey}`
  }, [])

  // Agendamentos do dia (sem filtro de profissional ainda)
  const agendamentosDoDia = useMemo(() => {
    const inicio = startOfDay(selectedDate)
    const fim = endOfDay(selectedDate)
    return agendamentos.filter((a) => {
      return agendamentoOcupaIntervalo(a, inicio, fim)
    })
  }, [agendamentos, selectedDate])

  // Top N do dia por nº de items (fallback alfabético).
  // Conta cada item separadamente pra refletir atendentes que só aparecem como
  // item em agendamentos cujo principal é outro (#155).
  const topDoDia = useMemo<number[]>(() => {
    if (atendentesAtivos.length === 0) return []
    if (atendentesAtivos.length === 1) return [atendentesAtivos[0].id]
    const contagem = new Map<number, number>()
    const inicio = startOfDay(selectedDate)
    const fim = endOfDay(selectedDate)
    agendamentosDoDia.forEach((a) => {
      getAgendamentoOcorrencias(a).forEach((ocorrencia) => {
        if (!isWithinInterval(ocorrencia.inicio, { start: inicio, end: fim })) return
        const eff = ocorrencia.atendenteId ?? a.atendenteId
        if (eff) contagem.set(eff, (contagem.get(eff) ?? 0) + 1)
      })
    })
    return [...atendentesAtivos]
      .sort((a, b) => {
        const diff = (contagem.get(b.id) ?? 0) - (contagem.get(a.id) ?? 0)
        if (diff !== 0) return diff
        return a.nome.localeCompare(b.nome)
      })
      .slice(0, limiteProfissionais)
      .map((a) => a.id)
  }, [atendentesAtivos, agendamentosDoDia, limiteProfissionais])

  const persistSelectedProfissionais = (ids: number[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids.slice(0, limiteProfissionais)))
    } catch {
      // Storage indisponível: segue sem persistência.
    }
  }

  // Restaura seleção salva no navegador; se ainda não houver seleção salva,
  // usa a sugestão automática inicial.
  useEffect(() => {
    if (initialSelectionAppliedRef.current) return
    if (atendentesAtivos.length === 0) return

    const temSalvo = localStorage.getItem(storageKey) !== null
    if (!temSalvo && isLoading) return

    let initialIds: number[] | null = null
    try {
      const raw = temSalvo ? localStorage.getItem(storageKey) : null
      if (raw !== null) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const validIds = new Set(atendentesAtivos.map((a) => a.id))
          const restoredIds = parsed
            .filter((id): id is number => typeof id === 'number' && validIds.has(id))
            .slice(0, limiteProfissionais)
          initialIds = restoredIds.length > 0 ? restoredIds : topDoDia.slice(0, 1)
        } else {
          initialIds = topDoDia.slice(0, 1)
        }
      }
    } catch {
      initialIds = null
    }

    if (initialIds === null) {
      if (topDoDia.length > 0) {
        initialIds = topDoDia.slice(0, 1)
      } else {
        initialIds = []
      }
    }

    setProfissionaisSelecionados(initialIds.slice(0, limiteProfissionais))
    persistSelectedProfissionais(initialIds.slice(0, limiteProfissionais))
    initialSelectionAppliedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topDoDia, atendentesAtivos, limiteProfissionais, storageKey])

  useEffect(() => {
    if (!initialSelectionAppliedRef.current) return
    persistSelectedProfissionais(profissionaisSelecionados)
  }, [limiteProfissionais, profissionaisSelecionados, storageKey])

  const handleProfChange = (ids: number[]) => {
    if (ids.length === 0) {
      showNotification('error', 'Deve ter pelo menos um profissional selecionado.')
      return
    }
    touchedRef.current = true
    const nextIds = ids.slice(0, limiteProfissionais)
    setProfissionaisSelecionados(nextIds)
    persistSelectedProfissionais(nextIds)
  }

  // O que vai pra timeline = exatamente o que está marcado nos chips
  const idsExibidos = profissionaisSelecionados.slice(0, limiteProfissionais)

  // Monta colunas pra timeline. Issue #155: cada SERVICO do agendamento pode ter
  // atendente/horário próprios. Achatamos em "agendamentos virtuais" — 1 por item.
  const colunas = useMemo<ColunaProfissional[]>(() => {
    const porColuna = new Map<number, any[]>()
    idsExibidos.forEach((id) => porColuna.set(id, []))

    agendamentosDoDia.forEach((a) => {
      const servicos = (a.servicos ?? []) as any[]
      if (servicos.length === 0) {
        if (a.atendenteId && porColuna.has(a.atendenteId)) {
          porColuna.get(a.atendenteId)!.push(a)
        }
        return
      }
      servicos.forEach((item) => {
        const atendenteEfetivo = (item.atendenteId as number | undefined) ?? a.atendenteId
        if (!atendenteEfetivo || !porColuna.has(atendenteEfetivo)) return

        const inicioStr = (item.dataHoraInicio as string | undefined) ?? a.dataHoraInicio
        const fimStr = (item.dataHoraFim as string | undefined) ?? a.dataHoraFim
        const virtual = {
          ...a,
          dataHoraInicio: inicioStr,
          dataHoraFim: fimStr,
          servicos: [item],
        }
        porColuna.get(atendenteEfetivo)!.push(virtual)
      })
    })

    return idsExibidos
      .map((id) => {
        const at = atendentesAtivos.find((a) => a.id === id)
        if (!at) return null
        return { id, nome: at.nome, agendamentos: porColuna.get(id) ?? [] }
      })
      .filter((c): c is ColunaProfissional => c !== null)
  }, [idsExibidos, atendentesAtivos, agendamentosDoDia])

  // Chips: apenas atendentes ativos. ProfissionalFilterChips em multi mode
  // renderiza só os selecionados + botão "Selecionar profissionais" que abre
  // o picker com busca (escala bem com unidades de muitos profs).
  const chips = useMemo<ProfissionalChipItem[]>(
    () => atendentesAtivos.map((a) => ({ id: a.id, nome: a.nome })),
    [atendentesAtivos]
  )

  // Contagem de items por atendente efetivo (mesmo cálculo que define top2DoDia,
  // mas exposto pra o picker mostrar "N agendamentos no dia" ao lado de cada).
  const contagemPorAtendente = useMemo(() => {
    const m = new Map<number, number>()
    const inicio = startOfDay(selectedDate)
    const fim = endOfDay(selectedDate)
    agendamentosDoDia.forEach((a) => {
      getAgendamentoOcorrencias(a).forEach((ocorrencia) => {
        if (!isWithinInterval(ocorrencia.inicio, { start: inicio, end: fim })) return
        const eff = ocorrencia.atendenteId ?? a.atendenteId
        if (eff) m.set(eff, (m.get(eff) ?? 0) + 1)
      })
    })
    return m
  }, [agendamentosDoDia])

  const pickerItems = useMemo<PickerItem[]>(
    () =>
      atendentesAtivos.map((a) => ({
        id: a.id,
        nome: a.nome,
        count: contagemPorAtendente.get(a.id) ?? 0,
      })),
    [atendentesAtivos, contagemPorAtendente]
  )

  const handleSlotClick = (date: Date, atendenteId: number) => {
    setNovoInitial({ date, atendenteId })
    setNovoSheetOpen(true)
  }

  const handleCardClick = (a: Agendamento) => {
    if (a.id) setDetalhesId(a.id)
  }

  const handleFabClick = () => {
    const now = new Date()
    const dt = new Date(selectedDate)
    const isHoje =
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    if (isHoje) {
      const totalMin = Math.ceil((now.getHours() * 60 + now.getMinutes()) / slotMinutes) * slotMinutes
      dt.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0)
    } else {
      dt.setHours(9, 0, 0, 0)
    }
    setNovoInitial({ date: dt })
    setNovoSheetOpen(true)
  }

  type AgendamentoVisivel = {
    agendamento: Agendamento
    inicio: Date
    fim: Date
  }

  const agendamentosFiltradosDoDia = useMemo<AgendamentoVisivel[]>(() => {
    if (idsExibidos.length === 0) return []
    const inicio = startOfDay(selectedDate)
    const fim = endOfDay(selectedDate)
    const ids = new Set(idsExibidos)

    return agendamentosDoDia
      .map((a) => {
        const ocorrencia = getPrimeiraOcorrenciaNoIntervalo(a, inicio, fim, ids)
        if (!ocorrencia) return null
        return {
          agendamento: a,
          inicio: ocorrencia.inicio,
          fim: ocorrencia.fim,
        }
      })
      .filter((item): item is AgendamentoVisivel => item !== null)
  }, [agendamentosDoDia, idsExibidos, selectedDate])

  const totalDia = agendamentosFiltradosDoDia.length

  const modoSwitcher = isWeb ? (
    <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 w-full sm:w-auto flex-shrink-0">
      {([
        { id: 'dia', label: 'Dia', icon: CalendarDays },
        { id: 'semana', label: 'Semana', icon: CalendarRange },
        { id: 'mes', label: 'Mês', icon: LayoutGrid },
      ] as const).map((mode) => {
        const Icon = mode.icon
        const isActive = modoAtual === mode.id
        return (
          <button
            key={mode.id}
            onClick={() => onModoChange(mode.id)}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              isActive
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {mode.label}
          </button>
        )
      })}
    </div>
  ) : null

  // Mobile: lista vertical cronológica do dia (padrão de app de calendário).
  const agendamentosOrdenados = useMemo(
    () =>
      [...agendamentosFiltradosDoDia].sort(
        (a, b) => a.inicio.getTime() - b.inicio.getTime()
      ),
    [agendamentosFiltradosDoDia]
  )

  return (
    <div className={isWeb ? 'h-full flex flex-col gap-3' : 'space-y-4'}>
      <div className={isWeb ? 'flex-shrink-0 space-y-3' : 'space-y-3'}>
        <DiaHeader selectedDate={selectedDate} onChange={onDateChange} />

        {/* No mobile, o filtro fica aqui. No web, ele vai junto do card da timeline. */}
        {!isWeb && (
          <ProfissionalFilterChips
            mode="multi"
            items={chips}
            selectedIds={profissionaisSelecionados}
            onChange={handleProfChange}
            maxSelected={limiteProfissionais}
            onOpenPicker={() => setPickerOpen(true)}
          />
        )}
      </div>

      <ProfissionalPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        items={pickerItems}
        initialSelectedIds={profissionaisSelecionados}
        maxSelected={limiteProfissionais}
        onConfirm={(ids) => handleProfChange(ids)}
      />

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando agenda...</div>
      ) : isWeb ? (
        atendentesAtivos.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
              <CalendarOff className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-600">Nenhum profissional ativo cadastrado.</p>
          </div>
        ) : idsExibidos.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <p className="text-sm text-slate-600">Selecione ao menos 1 profissional para ver a agenda.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-200">
              <div className="flex flex-1 min-w-0 items-center gap-2 flex-nowrap overflow-x-auto scrollbar-none">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 flex-shrink-0 whitespace-nowrap">
                  <Users className="h-3.5 w-3.5" />
                  Profissionais ({profissionaisSelecionados.length}/{Math.min(atendentesAtivos.length, limiteProfissionais)})
                </span>
                <div className="min-w-0 flex-1">
                  <ProfissionalFilterChips
                    mode="multi"
                    items={chips}
                  selectedIds={profissionaisSelecionados}
                  onChange={handleProfChange}
                  maxSelected={limiteProfissionais}
                  onOpenPicker={() => setPickerOpen(true)}
                  showPickerCount={false}
                />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                  {([15, 30, 60] as const).map((g) => {
                    const ativo = g === slotMinutes
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSlotMinutes(g)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                          ativo ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {g}m
                      </button>
                    )
                  })}
                </div>
                {modoSwitcher}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <DayTimeline
                selectedDate={selectedDate}
                colunas={colunas}
                onSlotClick={handleSlotClick}
                onAgendamentoClick={handleCardClick}
                pxPerMin={1.6}
                slotMinutes={slotMinutes}
                fillHeight
                embedded
              />
            </div>
          </div>
        )
      ) : (
        // ─── MOBILE: lista vertical cronológica ───
        agendamentosOrdenados.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
              <CalendarOff className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-600">
              {idsExibidos.length === 0
                ? 'Selecione ao menos 1 profissional para ver a agenda.'
                : 'Nenhum agendamento para os profissionais selecionados.'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {idsExibidos.length === 0 ? 'Use os chips acima para filtrar.' : 'Toque no + para criar um.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {agendamentosOrdenados.map((a) => (
              <li key={a.agendamento.id ?? `${a.inicio.toISOString()}-${a.agendamento.clienteId}`}>
                <AgendamentoCard
                  agendamento={a.agendamento}
                  showProfissionalChip
                  inicioOverride={a.inicio}
                  fimOverride={a.fim}
                  onClick={() => handleCardClick(a.agendamento)}
                />
              </li>
            ))}
          </ul>
        )
      )}

      {totalDia > 0 && !isWeb && (
        <p className="text-xs text-slate-500 text-center pt-1">
          {totalDia} agendamento{totalDia !== 1 ? 's' : ''} neste dia
        </p>
      )}

      <AgendamentoFab onClick={handleFabClick} />

      <NovoAgendamentoSheet
        isOpen={novoSheetOpen}
        onClose={() => {
          setNovoSheetOpen(false)
          setNovoInitial(null)
        }}
        initialDateTime={novoInitial?.date}
        initialAtendenteId={novoInitial?.atendenteId}
      />

      <DetalhesSheet agendamentoId={detalhesId} onClose={() => setDetalhesId(null)} />
    </div>
  )
}
