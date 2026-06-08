import { useId, useMemo } from 'react'

type Props = {
  /** Valor no formato ISO yyyy-MM-dd (ou '' / null pra vazio). */
  value: string | null | undefined
  /** Devolve sempre yyyy-MM-dd ou '' quando vazio. */
  onChange: (value: string) => void
  /** Limite inferior ISO yyyy-MM-dd (default '1900-01-01'). */
  min?: string
  /** Limite superior ISO yyyy-MM-dd (default hoje). */
  max?: string
  /** Classes extras pros selects desktop / input mobile. */
  className?: string
  id?: string
  required?: boolean
  disabled?: boolean
  /** Quando true, desabilita anos futuros (default false — usa max). */
  futuroDesabilitado?: boolean
}

const MESES = [
  { v: 1, label: 'Janeiro' },
  { v: 2, label: 'Fevereiro' },
  { v: 3, label: 'Março' },
  { v: 4, label: 'Abril' },
  { v: 5, label: 'Maio' },
  { v: 6, label: 'Junho' },
  { v: 7, label: 'Julho' },
  { v: 8, label: 'Agosto' },
  { v: 9, label: 'Setembro' },
  { v: 10, label: 'Outubro' },
  { v: 11, label: 'Novembro' },
  { v: 12, label: 'Dezembro' },
]

function diasNoMes(ano: number, mes: number): number {
  // dia 0 do mês seguinte == último dia do mês atual
  return new Date(ano, mes, 0).getDate()
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * #146 — DateInput modernizado:
 * - **Mobile (< sm)**: `<input type="date">` nativo — picker do iOS/Android é excelente
 * - **Desktop (≥ sm)**: 3 selects (dia/mês/ano) lado a lado — escolha rápida sem calendário
 *
 * Estado interno é derivado do `value` (ISO yyyy-MM-dd). Mudança em qualquer
 * select recalcula a string ISO e dispara onChange. Estado inválido (ex: 31 de
 * fevereiro) é normalizado pro último dia válido do mês selecionado.
 */
export default function DateInput({
  value,
  onChange,
  min,
  max,
  className = '',
  id,
  required = false,
  disabled = false,
  futuroDesabilitado = false,
}: Props) {
  const reactId = useId()
  const baseId = id ?? `date-${reactId}`
  const today = todayIso()
  const minIso = min ?? '1900-01-01'
  const maxIso = max ?? (futuroDesabilitado ? today : '2099-12-31')

  // Parse defensivo do value
  const parsed = useMemo(() => {
    if (!value) return null
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (!m) return null
    const y = parseInt(m[1], 10)
    const mo = parseInt(m[2], 10)
    const d = parseInt(m[3], 10)
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
    return { y, mo, d }
  }, [value])

  const minY = parseInt(minIso.slice(0, 4), 10)
  const maxY = parseInt(maxIso.slice(0, 4), 10)
  const anos = useMemo(() => {
    const arr: number[] = []
    // Mais recente primeiro (UX: pessoas adultas escolhem ano antigo, mas selects
    // descendentes facilitam pra cadastros novos)
    for (let y = maxY; y >= minY; y--) arr.push(y)
    return arr
  }, [minY, maxY])

  const diaSel = parsed?.d ?? ''
  const mesSel = parsed?.mo ?? ''
  const anoSel = parsed?.y ?? ''

  const diasDisponiveis = useMemo(() => {
    if (!anoSel || !mesSel) return Array.from({ length: 31 }, (_, i) => i + 1)
    return Array.from({ length: diasNoMes(Number(anoSel), Number(mesSel)) }, (_, i) => i + 1)
  }, [anoSel, mesSel])

  function emit(d: number | '', m: number | '', y: number | '') {
    if (!d || !m || !y) {
      onChange('')
      return
    }
    const maxDia = diasNoMes(Number(y), Number(m))
    const diaNorm = Math.min(Number(d), maxDia)
    const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(diaNorm).padStart(2, '0')}`
    onChange(iso)
  }

  const baseInput =
    'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition disabled:bg-slate-50 disabled:text-slate-400'

  return (
    <>
      {/* Mobile: input nativo — picker do SO é excelente e familiar */}
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={minIso}
        max={maxIso}
        required={required}
        disabled={disabled}
        id={baseId}
        className={`block w-full sm:hidden ${baseInput} ${className}`}
      />

      {/* Desktop: 3 selects compactos — escolha por dia/mês/ano sem abrir calendário */}
      <div className={`hidden sm:grid grid-cols-3 gap-2 ${className}`} role="group" aria-labelledby={baseId}>
        <select
          id={`${baseId}-dia`}
          value={diaSel}
          onChange={(e) => emit(e.target.value ? Number(e.target.value) : '', mesSel, anoSel)}
          required={required}
          disabled={disabled}
          className={baseInput}
          aria-label="Dia"
        >
          <option value="">Dia</option>
          {diasDisponiveis.map((d) => (
            <option key={d} value={d}>
              {String(d).padStart(2, '0')}
            </option>
          ))}
        </select>

        <select
          id={`${baseId}-mes`}
          value={mesSel}
          onChange={(e) => emit(diaSel, e.target.value ? Number(e.target.value) : '', anoSel)}
          required={required}
          disabled={disabled}
          className={baseInput}
          aria-label="Mês"
        >
          <option value="">Mês</option>
          {MESES.map((m) => (
            <option key={m.v} value={m.v}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          id={`${baseId}-ano`}
          value={anoSel}
          onChange={(e) => emit(diaSel, mesSel, e.target.value ? Number(e.target.value) : '')}
          required={required}
          disabled={disabled}
          className={baseInput}
          aria-label="Ano"
        >
          <option value="">Ano</option>
          {anos.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
