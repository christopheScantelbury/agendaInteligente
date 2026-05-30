import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, LayoutGrid, CalendarRange } from 'lucide-react'
import DayMode from './DayMode'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const modoUrl = (searchParams.get('modo') as Modo) || 'dia'
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

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5 pb-32">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-violet-600" />
          Agendamentos
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Veja o dia, navegue pela semana ou tenha visão do mês.
        </p>
      </header>

      {/* Mode Switcher (chips) */}
      <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 w-full sm:w-auto">
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

      {/* Modo ativo */}
      {modoUrl === 'dia' && (
        <DayMode selectedDate={selectedDate} onDateChange={handleDateChange} />
      )}

      {modoUrl === 'semana' && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <CalendarRange className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Visão Semanal em construção</p>
          <p className="text-xs text-slate-500 mt-1">
            Disponível na próxima atualização. Use "Dia" enquanto isso.
          </p>
        </div>
      )}

      {modoUrl === 'mes' && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Visão Mensal em construção</p>
          <p className="text-xs text-slate-500 mt-1">
            Disponível na próxima atualização. Use "Dia" enquanto isso.
          </p>
        </div>
      )}
    </div>
  )
}
