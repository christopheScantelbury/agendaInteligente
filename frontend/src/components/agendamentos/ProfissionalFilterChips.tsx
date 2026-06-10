import { Users, Plus, X } from 'lucide-react'

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
  /** Lista de ids selecionados. */
  selectedIds: number[]
  onChange: (ids: number[]) => void
  /** Limite de seleção simultânea (default 2). */
  maxSelected?: number
  /** Callback do botão "Selecionar profissionais" — abre picker com busca. */
  onOpenPicker?: () => void
}

type Props = SingleProps | MultiProps

/**
 * Strip de chips de profissional.
 *
 * - `mode="single"`: comportamento clássico — 1 chip ativo, "Todos" reseta.
 * - `mode="multi"`: mostra APENAS os profissionais selecionados como chips
 *   (com X pra desmarcar). Botão "+ Selecionar profissionais (M/N)" abre o
 *   picker com busca. Escala bem pra unidades com muitos profs.
 *
 * Não renderiza nada (single) quando só existe "Todos" + 1 profissional.
 */
export default function ProfissionalFilterChips(props: Props) {
  if (props.mode === 'multi') {
    const { items, selectedIds, onChange, onOpenPicker } = props
    // maxSelected é usado pelo picker; aqui só servimos selecionados como chips removíveis.
    const totalProfs = items.length
    // Em multi mode, o componente sempre rendera o controle se houver >= 2 profs
    // (com 1 prof, o DayMode já auto-seleciona e esconde o filtro pelo idsExibidos).
    if (totalProfs <= 1) return null

    const selectedItems = selectedIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is ProfissionalChipItem => !!i && i.id !== null)

    return (
      <div className="-mx-1 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 px-1 py-1 whitespace-nowrap">
          {selectedItems.map((item) => {
            const inicial = (item.nome || '').charAt(0).toUpperCase()
            return (
              <button
                key={item.id}
                onClick={() => onChange(selectedIds.filter((x) => x !== item.id))}
                title="Remover da seleção"
                className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1.5 rounded-full text-xs font-semibold bg-violet-600 text-white shadow-sm shadow-violet-200 flex-shrink-0 hover:bg-violet-700 transition"
              >
                <span className="h-5 w-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold">
                  {inicial}
                </span>
                <span>{item.nome}</span>
                <X className="h-3.5 w-3.5 opacity-80" />
              </button>
            )
          })}

          {/* Botão "+ Selecionar profissionais (M/N)" — abre o picker */}
          {onOpenPicker && (
            <button
              onClick={onOpenPicker}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 bg-white border border-dashed border-violet-300 text-violet-700 hover:bg-violet-50 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>
                Selecionar profissionais ({selectedIds.length}/{totalProfs})
              </span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // single mode (mantido por compat)
  if (props.items.length <= 1) return null
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
