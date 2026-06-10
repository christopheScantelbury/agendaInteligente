import { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { agendamentoService, Agendamento } from '../../services/agendamentoService'
import { atendenteService } from '../../services/atendenteService'
import { CalendarOff } from 'lucide-react'
import DiaHeader from '../../components/agendamentos/DiaHeader'
import ProfissionalFilterChips, { ProfissionalChipItem } from '../../components/agendamentos/ProfissionalFilterChips'
import AgendamentoFab from '../../components/agendamentos/AgendamentoFab'
import NovoAgendamentoSheet from '../../components/agendamentos/NovoAgendamentoSheet'
import DetalhesSheet from '../../components/agendamentos/DetalhesSheet'
import DayTimeline, { ColunaProfissional } from '../../components/agendamentos/DayTimeline'
import ProfissionalPickerSheet, { PickerItem } from '../../components/agendamentos/ProfissionalPickerSheet'

interface Props {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

/**
 * Modo Dia — timeline com colunas por profissional (issue #156).
 *
 * Regras:
 * - 1 profissional disponível → chips ocultos, coluna única auto-selecionada.
 * - 2+ profissionais → chips com multi-seleção (até 2). No 1º carregamento
 *   (e ao trocar de dia sem ter feito ajuste manual), seleciona automaticamente
 *   os 2 com mais agendamentos no dia. Os chips desses 2 ficam ATIVOS — sem
 *   chip "Todos" mentiroso.
 * - Tap em slot vazio: abre wizard com data/hora + profissional pré-preenchidos.
 * - Tap em card: abre detalhes do agendamento.
 */
export default function DayMode({ selectedDate, onDateChange }: Props) {
  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<number[]>([])
  const touchedRef = useRef(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [novoSheetOpen, setNovoSheetOpen] = useState(false)
  const [novoInitial, setNovoInitial] = useState<{ date: Date; atendenteId?: number } | null>(null)
  const [detalhesId, setDetalhesId] = useState<number | null>(null)

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

  // Agendamentos do dia (sem filtro de profissional ainda)
  const agendamentosDoDia = useMemo(() => {
    const inicio = startOfDay(selectedDate)
    const fim = endOfDay(selectedDate)
    return agendamentos.filter((a) => {
      if (!a.dataHoraInicio) return false
      const dt = new Date(a.dataHoraInicio)
      return isWithinInterval(dt, { start: inicio, end: fim })
    })
  }, [agendamentos, selectedDate])

  // Top 2 do dia por nº de items (fallback alfabético).
  // Conta cada item separadamente pra refletir atendentes que só aparecem como
  // item em agendamentos cujo principal é outro (#155).
  const top2DoDia = useMemo<number[]>(() => {
    if (atendentesAtivos.length === 0) return []
    if (atendentesAtivos.length === 1) return [atendentesAtivos[0].id]
    const contagem = new Map<number, number>()
    agendamentosDoDia.forEach((a) => {
      const items = (a.servicos ?? []) as any[]
      if (items.length === 0) {
        if (a.atendenteId) contagem.set(a.atendenteId, (contagem.get(a.atendenteId) ?? 0) + 1)
        return
      }
      items.forEach((it) => {
        const eff = (it.atendenteId as number | undefined) ?? a.atendenteId
        if (eff) contagem.set(eff, (contagem.get(eff) ?? 0) + 1)
      })
    })
    return [...atendentesAtivos]
      .sort((a, b) => {
        const diff = (contagem.get(b.id) ?? 0) - (contagem.get(a.id) ?? 0)
        if (diff !== 0) return diff
        return a.nome.localeCompare(b.nome)
      })
      .slice(0, 2)
      .map((a) => a.id)
  }, [atendentesAtivos, agendamentosDoDia])

  // Sincroniza seleção com top 2 ENQUANTO o user não tocou nos chips.
  // Após qualquer ajuste manual, a seleção é congelada e persiste entre
  // navegações de dia. Reset acontece ao recarregar a página.
  useEffect(() => {
    if (touchedRef.current) return
    if (top2DoDia.length === 0) return
    const igual =
      top2DoDia.length === profissionaisSelecionados.length &&
      top2DoDia.every((id, i) => id === profissionaisSelecionados[i])
    if (!igual) setProfissionaisSelecionados(top2DoDia)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top2DoDia])

  const handleProfChange = (ids: number[]) => {
    touchedRef.current = true
    setProfissionaisSelecionados(ids)
  }

  // O que vai pra timeline = exatamente o que está marcado nos chips
  const idsExibidos = profissionaisSelecionados.slice(0, 2)

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
    agendamentosDoDia.forEach((a) => {
      const items = (a.servicos ?? []) as any[]
      if (items.length === 0) {
        if (a.atendenteId) m.set(a.atendenteId, (m.get(a.atendenteId) ?? 0) + 1)
        return
      }
      items.forEach((it) => {
        const eff = (it.atendenteId as number | undefined) ?? a.atendenteId
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
      const totalMin = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30
      dt.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0)
    } else {
      dt.setHours(9, 0, 0, 0)
    }
    setNovoInitial({ date: dt })
    setNovoSheetOpen(true)
  }

  const totalDia = agendamentosDoDia.length

  return (
    <div className="space-y-4">
      <DiaHeader selectedDate={selectedDate} onChange={onDateChange} />

      <ProfissionalFilterChips
        mode="multi"
        items={chips}
        selectedIds={profissionaisSelecionados}
        onChange={handleProfChange}
        maxSelected={2}
        onOpenPicker={() => setPickerOpen(true)}
      />

      <ProfissionalPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        items={pickerItems}
        initialSelectedIds={profissionaisSelecionados}
        maxSelected={2}
        onConfirm={(ids) => handleProfChange(ids)}
      />

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando agenda...</div>
      ) : atendentesAtivos.length === 0 ? (
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
        <DayTimeline
          selectedDate={selectedDate}
          colunas={colunas}
          onSlotClick={handleSlotClick}
          onAgendamentoClick={handleCardClick}
        />
      )}

      {totalDia > 0 && (
        <p className="text-xs text-slate-500 text-center pt-1">
          {totalDia} agendamento{totalDia !== 1 ? 's' : ''} no dia
          {colunas.length < atendentesAtivos.length && (
            <span className="text-slate-400">
              {' '}· mostrando {colunas.length} de {atendentesAtivos.length} profissionais
            </span>
          )}
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
