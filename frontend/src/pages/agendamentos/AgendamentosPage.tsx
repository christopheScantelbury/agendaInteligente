import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, LayoutGrid, CalendarRange } from 'lucide-react'
import DayMode from './DayMode'
import WeekMode from './WeekMode'
import MonthMode from './MonthMode'
import { authService } from '../../services/authService'
import { useIsWebLayout } from '../../hooks/useIsWebLayout'

type Modo = 'dia' | 'semana' | 'mes'

const MODES: Array<{ id: Modo; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dia', label: 'Dia', icon: CalendarDays },
  { id: 'semana', label: 'Semana', icon: CalendarRange },
  { id: 'mes', label: 'Mês', icon: LayoutGrid },
]

/**
 * AgendamentosPage (V2 — Slice 1) — wrapper com 3 modos.
 * Mobile-first. Atualmente só "Dia" está implementado;
 * Semana e Mês mostram placeholder até Slice 2.
 *
 * Estado por URL (?modo=dia&data=2026-05-29) habilita deep link e back nativo.
 */
export default function AgendamentosPage() {
  const isWeb = useIsWebLayout()
  const [searchParams, setSearchParams] = useSearchParams()
  // #137: PROFISSIONAL tem foco em visão de calendário (mês) por padrão.
  // Demais perfis seguem em Dia (timeline) como antes.
  const modoDefault: Modo = authService.isPerfilProfissional() ? 'mes' : 'dia'
  const modoUrl = (searchParams.get('modo') as Modo) || modoDefault
  const dataUrl = searchParams.get('data')

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (dataUrl) {
      const parsed = new Date(dataUrl + 'T00:00:00')
      if (!isNaN(parsed.getTime())) return parsed
    }
    return new Date()
  })

  const handleModoChange = (modo: Modo) => {
    const next = new URLSearchParams(searchParams)
    next.set('modo', modo)
    setSearchParams(next, { replace: true })
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    const next = new URLSearchParams(searchParams)
    next.set('data', date.toISOString().slice(0, 10))
    setSearchParams(next, { replace: true })
  }

  // #167: no layout web, a página ocupa a ALTURA da viewport (menos o padding do
  // <main>, lg:p-8 = 4rem) e o calendário preenche o espaço restante — nada de
  // rolar a página. Mobile mantém fluxo natural com scroll.
  const containerCls = isWeb
    ? 'max-w-[1920px] w-full mx-auto flex flex-col h-[calc(100dvh-4rem)] gap-3'
    : 'max-w-3xl mx-auto p-4 sm:p-6 space-y-5 pb-32'

  // O modo ativo (Dia/Semana/Mês) — no web vive num flex-item que rola por
  // dentro (Dia/Semana têm timeline alta) ou preenche exato (Mês).
  const modoContent =
    modoUrl === 'dia' ? (
      <DayMode selectedDate={selectedDate} onDateChange={handleDateChange} />
    ) : modoUrl === 'semana' ? (
      <WeekMode
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onJumpToDayMode={(date) => {
          handleDateChange(date)
          handleModoChange('dia')
        }}
      />
    ) : (
      <MonthMode
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onJumpToDayMode={(date) => {
          handleDateChange(date)
          handleModoChange('dia')
        }}
      />
    )

  return (
    <div className={containerCls}>
      {/* Header — compacto no web pra sobrar altura pro calendário */}
      <header className={isWeb ? 'flex-shrink-0' : ''}>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-violet-600" />
          Agendamentos
        </h1>
        {!isWeb && (
          <p className="text-sm text-slate-500 mt-0.5">
            Veja o dia, navegue pela semana ou tenha visão do mês.
          </p>
        )}
      </header>

      {/* Mode Switcher (chips) */}
      <div className={`inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 w-full sm:w-auto ${isWeb ? 'flex-shrink-0' : ''}`}>
        {MODES.map((mode) => {
          const Icon = mode.icon
          const isActive = modoUrl === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => handleModoChange(mode.id)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {mode.label}
            </button>
          )
        })}
      </div>

      {/* Modo ativo — no web preenche a altura restante (cada modo se ajusta). */}
      {isWeb ? (
        <div className="flex-1 min-h-0 overflow-hidden">{modoContent}</div>
      ) : (
        modoContent
      )}
    </div>
  )
}
