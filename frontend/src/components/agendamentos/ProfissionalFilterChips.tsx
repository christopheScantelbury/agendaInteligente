import { Users } from 'lucide-react'

export interface ProfissionalChipItem {
  id: number | null  // null = "Todos"
  nome: string
}

interface BaseProps {
  items: ProfissionalChipItem[]
}

interface SingleProps extends BaseProps {
  mode?: 'single'
  selectedId: number | null
  onSelect: (id: number | null) => void
}

interface MultiProps extends BaseProps {
  mode: 'multi'
  /** Lista de ids selecionados. Array vazio = "Todos". */
  selectedIds: number[]
  onChange: (ids: number[]) => void
  /** Limite de seleção simultânea (default 2). "Todos" não conta. */
  maxSelected?: number
}

type Props = SingleProps | MultiProps

/**
 * Strip horizontal scrollável de chips de profissional.
 *
 * - `mode="single"` (default): comportamento clássico — 1 chip ativo, "Todos" reseta.
 * - `mode="multi"`: até `maxSelected` profissionais ativos simultaneamente.
 *   Chip "Todos" limpa a seleção. Tentar selecionar além do limite desativa o
 *   chip (cursor + opacity) com tooltip.
 *
 * Não renderiza nada quando só existe "Todos" + 1 profissional (não há o que filtrar).
 */
export default function ProfissionalFilterChips(props: Props) {
  if (props.items.length <= 1) return null  // só 1 profissional → nada a filtrar

  if (props.mode === 'multi') {
    const { items, selectedIds, onChange, maxSelected = 2 } = props
    const atLimit = selectedIds.length >= maxSelected

    return (
      <div className="-mx-1 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 px-1 py-1 whitespace-nowrap">
          {items.map((item) => {
            const isTodos = item.id === null
            const isActive = isTodos ? selectedIds.length === 0 : selectedIds.includes(item.id as number)
            const isDisabled = !isActive && !isTodos && atLimit
            const inicial = isTodos ? null : item.nome.charAt(0).toUpperCase()

            const handleClick = () => {
              if (isTodos) {
                onChange([])
                return
              }
              const id = item.id as number
              if (isActive) {
                onChange(selectedIds.filter((x) => x !== id))
              } else if (!atLimit) {
                onChange([...selectedIds, id])
              }
            }

            return (
              <button
                key={item.id ?? 'todos'}
                onClick={handleClick}
                disabled={isDisabled}
                title={isDisabled ? `Limite de ${maxSelected} profissionais selecionados` : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition flex-shrink-0 ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                    : isDisabled
                    ? 'bg-white border border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isTodos ? (
                  <Users className="h-3.5 w-3.5" />
                ) : (
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'
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

  const { items, selectedId, onSelect } = props
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
                    isActive ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'
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
