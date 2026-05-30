import { Users } from 'lucide-react'

export interface ProfissionalChipItem {
  id: number | null  // null = "Todos"
  nome: string
}

interface Props {
  items: ProfissionalChipItem[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}

/**
 * Strip horizontal scrollável de chips de profissional.
 * "Todos" sempre primeiro. Tap filtra a timeline para o profissional.
 */
export default function ProfissionalFilterChips({ items, selectedId, onSelect }: Props) {
  if (items.length <= 1) return null  // só "Todos" → não mostra

  return (
    <div className="-mx-1 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-2 px-1 py-1 whitespace-nowrap">
        {items.map((item) => {
          const isActive = item.id === selectedId
          const isTodos = item.id === null
          const inicial = isTodos ? null : item.nome.charAt(0).toUpperCase()
          return (
            <button
              key={item.id ?? 'todos'}
              onClick={() => onSelect(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition flex-shrink-0 ${
                isActive
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isTodos ? (
                <Users className="h-3.5 w-3.5" />
              ) : (
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-violet-100 text-violet-700'
                  }`}
                >
                  {inicial}
                </span>
              )}
              <span>{item.nome}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
