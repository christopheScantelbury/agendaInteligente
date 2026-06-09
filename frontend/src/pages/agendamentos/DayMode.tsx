import { useMemo, useState, useEffect } from 'react'
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

interface Props {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

/**
 * Modo Dia — timeline com colunas por profissional (issue #156).
 *
 * Regras:
 * - 1 profissional disponível → chips ocultos, coluna única auto-selecionada.
 * - 2+ profissionais → chips com multi-seleção (até 2). Sem seleção = mostra
 *   automaticamente os 2 com mais agendamentos no dia.
 * - Tap em slot vazio: abre wizard com data/hora + profissional pré-preenchidos.
 * - Tap em card: abre detalhes do agendamento.
 */
export default function DayMode({ selectedDate, onDateChange }: Props) {
  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<number[]>([])
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

  // Auto-selecionar único profissional
  useEffect(() => {
    if (atendentesAtivos.length === 1 && profissionaisSelecionados.length === 0) {
      setProfissionaisSelecionados([atendentesAtivos[0].id])
    }
  }, [atendentesAtivos, profissionaisSelecionados.length])

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

  // Define quais profissionais exibir (até 2 colunas)
  const idsExibidos = useMemo<number[]>(() => {
    if (atendentesAtivos.length === 0) return []
    if (profissionaisSelecionados.length > 0) return profissionaisSelecionados.slice(0, 2)
    if (atendentesAtivos.length === 1) return [atendentesAtivos[0].id]

    // Sem seleção e múltiplos profs: top 2 por nº de agendamentos do dia (fallback alfabético)
    const contagem = new Map<number, number>()
    agendamentosDoDia.forEach((a) => {
      if (a.atendenteId) contagem.set(a.atendenteId, (contagem.get(a.atendenteId) ?? 0) + 1)
    })
    const ordenados = [...atendentesAtivos].sort((a, b) => {
      const diff = (contagem.get(b.id) ?? 0) - (contagem.get(a.id) ?? 0)
      if (diff !== 0) return diff
      return a.nome.localeCompare(b.nome)
    })
    return ordenados.slice(0, 2).map((a) => a.id)
  }, [profissionaisSelecionados, atendentesAtivos, agendamentosDoDia])

  // Monta colunas pra timeline
  const colunas = useMemo<ColunaProfissional[]>(() => {
    return idsExibidos
      .map((id) => {
        const at = atendentesAtivos.find((a) => a.id === id)
        if (!at) return null
        const ags = agendamentosDoDia.filter((a) => a.atendenteId === id)
        return { id, nome: at.nome, agendamentos: ags }
      })
      .filter((c): c is ColunaProfissional => c !== null)
  }, [idsExibidos, atendentesAtivos, agendamentosDoDia])

  // Chips: "Todos" + atendentes ativos (escondidos automaticamente se ≤1 prof)
  const chips = useMemo<ProfissionalChipItem[]>(
    () => [{ id: null, nome: 'Todos' }, ...atendentesAtivos.map((a) => ({ id: a.id, nome: a.nome }))],
    [atendentesAtivos]
  )

  const handleSlotClick = (date: Date, atendenteId: number) => {
    setNovoInitial({ date, atendenteId })
    setNovoSheetOpen(true)
  }

  const handleCardClick = (a: Agendamento) => {
    if (a.id) setDetalhesId(a.id)
  }

  const handleFabClick = () => {
    // FAB usa o dia selecionado + 09:00 (ou próximo slot de 30min se for hoje)
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
        onChange={setProfissionaisSelecionados}
        maxSelected={2}
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
