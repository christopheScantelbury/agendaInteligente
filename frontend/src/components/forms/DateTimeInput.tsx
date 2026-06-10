import { useMemo } from 'react'
import DateInput from './DateInput'

interface Props {
  /** Valor no formato ISO `yyyy-MM-ddTHH:mm` (ou '' / null pra vazio). */
  value: string | null | undefined
  /** Devolve sempre `yyyy-MM-ddTHH:mm` ou '' quando vazio. */
  onChange: (value: string) => void
  /** Limite inferior `yyyy-MM-ddTHH:mm`. Default sem limite. */
  min?: string
  /** Limite superior `yyyy-MM-ddTHH:mm`. Default sem limite. */
  max?: string
  className?: string
  required?: boolean
  disabled?: boolean
}

/**
 * DateTimeInput — composição DateInput (mobile=nativo date, desktop=selects)
 * + input type=time nativo (UX confortável tanto em mobile quanto desktop).
 *
 * Por que não `<input type="datetime-local">`: UX horrenda no mobile, formato
 * inconsistente entre browsers, sem suporte a min/max amigável em locale BR.
 *
 * Valor sempre no formato ISO local `yyyy-MM-ddTHH:mm` (sem timezone). Vazio = ''.
 */
export default function DateTimeInput({
  value,
  onChange,
  min,
  max,
  className = '',
  required = false,
  disabled = false,
}: Props) {
  const { dataPart, horaPart } = useMemo(() => {
    if (!value) return { dataPart: '', horaPart: '' }
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
    if (!m) return { dataPart: '', horaPart: '' }
    return { dataPart: m[1], horaPart: m[2] }
  }, [value])

  const minDate = min?.slice(0, 10)
  const maxDate = max?.slice(0, 10)

  const handleDataChange = (novaData: string) => {
    if (!novaData) {
      onChange('')
      return
    }
    // Mantém hora atual ou default 09:00
    const hora = horaPart || '09:00'
    onChange(`${novaData}T${hora}`)
  }

  const handleHoraChange = (novaHora: string) => {
    if (!dataPart) {
      // Sem data ainda — preenche hoje
      const hoje = new Date()
      const isoHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
      onChange(`${isoHoje}T${novaHora || '09:00'}`)
      return
    }
    onChange(`${dataPart}T${novaHora || '09:00'}`)
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 ${className}`}>
      <DateInput
        value={dataPart}
        onChange={handleDataChange}
        min={minDate}
        max={maxDate}
        required={required}
        disabled={disabled}
      />
      <input
        type="time"
        value={horaPart}
        onChange={(e) => handleHoraChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="block w-full min-w-0 box-border rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400 transition appearance-none"
      />
    </div>
  )
}
