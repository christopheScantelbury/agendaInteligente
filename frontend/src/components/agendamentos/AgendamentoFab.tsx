import { Plus } from 'lucide-react'

interface Props {
  onClick: () => void
  label?: string
}

/**
 * FAB violet fixo bottom-right, mobile-first.
 * Em desktop fica menor e respira mais.
 */
export default function AgendamentoFab({ onClick, label = 'Novo agendamento' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-violet-600 text-white text-sm font-semibold shadow-lg shadow-violet-300 hover:bg-violet-700 transition active:scale-95"
    >
      <Plus className="h-5 w-5" strokeWidth={2.5} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
