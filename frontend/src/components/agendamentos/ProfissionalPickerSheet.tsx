import { useState, useEffect, useMemo } from 'react'
import { Search, X, Check, Users } from 'lucide-react'
import BottomSheet from '../BottomSheet'
import { matchSearch } from '../../utils/normalize'

export interface PickerItem {
  id: number
  nome: string
  /** Nº de agendamentos do dia (opcional — usado pra ordenar e mostrar) */
  count?: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  items: PickerItem[]
  /** Ids já selecionados ao abrir */
  initialSelectedIds: number[]
  /** Limite de seleção (default 2) */
  maxSelected?: number
  /** Aplicar seleção e fechar */
  onConfirm: (ids: number[]) => void
  title?: string
}

/**
 * BottomSheet com busca pra escolher até `maxSelected` profissionais.
 * Ordena lista por nº de agendamentos desc, alfabético como tiebreaker.
 * Quem está no limite vê os demais com checkbox disabled.
 */
export default function ProfissionalPickerSheet({
  isOpen,
  onClose,
  items,
  initialSelectedIds,
  maxSelected = 2,
  onConfirm,
  title = 'Selecionar profissionais',
}: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>(initialSelectedIds)

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelected(initialSelectedIds)
    }
  }, [isOpen, initialSelectedIds])

  const ordenados = useMemo(() => {
    return [...items].sort((a, b) => {
      const diff = (b.count ?? 0) - (a.count ?? 0)
      if (diff !== 0) return diff
      return a.nome.localeCompare(b.nome)
    })
  }, [items])

  const filtrados = useMemo(() => {
    if (!search.trim()) return ordenados
    return ordenados.filter((i) => matchSearch(i.nome, search))
  }, [ordenados, search])

  const atLimit = selected.length >= maxSelected

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id))
    } else if (!atLimit) {
      setSelected([...selected, id])
    }
  }

  const hasMudanca =
    selected.length !== initialSelectedIds.length ||
    selected.some((id) => !initialSelectedIds.includes(id))

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="auto"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {selected.length}/{maxSelected} selecionado{selected.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onConfirm(selected)
                onClose()
              }}
              disabled={!hasMudanca && selected.length === initialSelectedIds.length}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 disabled:bg-slate-300 disabled:shadow-none transition"
            >
              <Check className="h-4 w-4" />
              Confirmar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar profissional..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Hint do limite */}
        {atLimit && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            Limite de {maxSelected} profissionais. Desmarque um pra escolher outro.
          </div>
        )}

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            {search ? 'Nenhum profissional encontrado.' : 'Nenhum profissional cadastrado.'}
          </div>
        ) : (
          <ul className="space-y-1 max-h-[55vh] overflow-y-auto">
            {filtrados.map((item) => {
              const checked = selected.includes(item.id)
              const disabled = !checked && atLimit
              const inicial = item.nome.charAt(0).toUpperCase()
              return (
                <li key={item.id}>
                  <label
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${
                      checked
                        ? 'border-violet-300 bg-violet-50'
                        : disabled
                        ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-50"
                    />
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        checked ? 'bg-violet-200 text-violet-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inicial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.nome}</p>
                      {typeof item.count === 'number' && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {item.count} agendamento{item.count === 1 ? '' : 's'} no dia
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </BottomSheet>
  )
}
