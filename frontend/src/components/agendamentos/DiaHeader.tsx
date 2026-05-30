import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DiaHeaderProps {
  selectedDate: Date
  onChange: (date: Date) => void
}

/**
 * Header de navegação por dia: < data > [Hoje]
 * Mobile-first — full width em ≤sm, alinhado em sm+.
 */
export default function DiaHeader({ selectedDate, onChange }: DiaHeaderProps) {
  const hoje = startOfDay(new Date())
  const isHoje = isSameDay(selectedDate, hoje)
  const labelData = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(selectedDate, -1))}
        className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        aria-label="Dia anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0 text-center">
        <p className="text-sm font-semibold text-slate-900 truncate capitalize">{labelData}</p>
        <p className="text-xs text-slate-500">
          {format(selectedDate, "yyyy")}
        </p>
      </div>

      <button
        onClick={() => onChange(addDays(selectedDate, 1))}
        className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
        aria-label="Próximo dia"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {!isHoje && (
        <button
          onClick={() => onChange(hoje)}
          className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
          title="Voltar para hoje"
        >
          <Calendar className="h-3.5 w-3.5" />
          Hoje
        </button>
      )}
    </div>
  )
}
