import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { agendamentoService, Agendamento } from '../../services/agendamentoService'
import { atendenteService } from '../../services/atendenteService'
import { CalendarOff } from 'lucide-react'
import DiaHeader from '../../components/agendamentos/DiaHeader'
import ProfissionalFilterChips, { ProfissionalChipItem } from '../../components/agendamentos/ProfissionalFilterChips'
import AgendamentoCard from '../../components/agendamentos/AgendamentoCard'
import AgendamentoFab from '../../components/agendamentos/AgendamentoFab'

interface Props {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

/**
 * Modo Dia — caso crítico Gerente + várias atendentes.
 *
 * Mobile (<sm): timeline única vertical. Chip do profissional aparece em cada card
 *               quando o filtro é "Todos". Chips no topo filtram pra 1 profissional.
 *
 * Desktop (≥md): mesma lógica mas com mais respiro horizontal.
 * (Multi-column resource view fica pra Slice 2.)
 */
export default function DayMode({ selectedDate, onDateChange }: Props) {
  const navigate = useNavigate()
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<number | null>(null)

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
  })

  const { data: atendentes = [] } = useQuery({
    queryKey: ['atendentes'],
    queryFn: atendenteService.listarTodos,
  })

  // Filtro: dia + (opcional) profissional
  const agendamentosDoDia = useMemo(() => {
    const inicio = startOfDay(selectedDate)
    const fim = endOfDay(selectedDate)
    return agendamentos
      .filter((a) => {
        if (!a.dataHoraInicio) return false
        const dt = new Date(a.dataHoraInicio)
        if (!isWithinInterval(dt, { start: inicio, end: fim })) return false
        if (profissionalSelecionado != null && a.atendenteId !== profissionalSelecionado) return false
        return true
      })
      .sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())
  }, [agendamentos, selectedDate, profissionalSelecionado])

  // Chips de profissional: "Todos" primeiro + atendentes ativos
  const chipsProfissionais = useMemo<ProfissionalChipItem[]>(() => {
    const ativos = atendentes
      .filter((a) => a.ativo !== false)
      .map((a) => ({
        id: a.id ?? a.usuarioId,
        nome: (a.nomeUsuario || `Profissional #${a.id}`).split(' ')[0],
      }))
      .filter((a) => a.id != null) as ProfissionalChipItem[]
    return [{ id: null, nome: 'Todos' }, ...ativos]
  }, [atendentes])

  const handleCardClick = (a: Agendamento) => {
    // Slice 1: redireciona pra página legada com query — ela já abre o modal de detalhes.
    // Slice 2: bottom-sheet de detalhes próprio.
    if (a.id) navigate(`/agendamentos?openId=${a.id}`)
  }

  const handleNovoAgendamento = () => {
    // Slice 1: usa fluxo legado. Slice 2: bottom-sheet wizard.
    navigate('/agendamentos/novo')
  }

  return (
    <div className="space-y-4">
      <DiaHeader selectedDate={selectedDate} onChange={onDateChange} />

      <ProfissionalFilterChips
        items={chipsProfissionais}
        selectedId={profissionalSelecionado}
        onSelect={setProfissionalSelecionado}
      />

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando agenda...</div>
      ) : agendamentosDoDia.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <CalendarOff className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">
            Nenhum agendamento {profissionalSelecionado ? 'deste profissional ' : ''}neste dia.
          </p>
          <button
            onClick={handleNovoAgendamento}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
          >
            Criar agendamento
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {agendamentosDoDia.map((a) => (
            <li key={a.id}>
              <AgendamentoCard
                agendamento={a}
                showProfissionalChip={profissionalSelecionado == null}
                onClick={() => handleCardClick(a)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Rodapé com contagem */}
      {!isLoading && agendamentosDoDia.length > 0 && (
        <p className="text-xs text-slate-500 text-center pt-2">
          {agendamentosDoDia.length} agendamento{agendamentosDoDia.length !== 1 ? 's' : ''} neste dia
        </p>
      )}

      <AgendamentoFab onClick={handleNovoAgendamento} />
    </div>
  )
}
