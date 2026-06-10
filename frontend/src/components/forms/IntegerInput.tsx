import { useEffect, useState, useRef, ChangeEvent, FocusEvent, InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode' | 'pattern'> {
  value: number | undefined
  onChange: (value: number | undefined) => void
  /** Mínimo permitido (clamp no blur). */
  min?: number
  /** Máximo permitido (clamp no blur). */
  max?: number
}

/**
 * Input pra inteiro livre — substituto do `<input type="number">` com spinner.
 *
 * - Mantém raw string interna; só ressincroniza com `value` externo quando NÃO
 *   está focado (evita re-overwrite mid-digitação quando parent faz `?? 1`).
 * - `type="text"` + `inputMode="numeric"` (teclado numérico no mobile)
 * - Sem setinhas (proibido — feedback do user 10/06)
 * - Clamp em min/max só no blur, e SÓ se houver valor (não força min em campo
 *   vazio — alguns forms usam undefined como "não setado")
 */
export default function IntegerInput({
  value,
  onChange,
  min,
  max,
  onBlur,
  onFocus,
  className,
  ...rest
}: Props) {
  const [raw, setRaw] = useState<string>(value === undefined ? '' : String(value))
  const focusedRef = useRef(false)

  // Sincroniza com value externo APENAS quando não está focado
  // (ex.: form é hidratado por query depois do mount, ou parent reseta).
  useEffect(() => {
    if (focusedRef.current) return
    const externalStr = value === undefined ? '' : String(value)
    if (externalStr !== raw) setRaw(externalStr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '')
    setRaw(cleaned)
    onChange(cleaned === '' ? undefined : Number(cleaned))
  }

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    focusedRef.current = true
    onFocus?.(e)
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    focusedRef.current = false
    if (raw !== '') {
      let final = Number(raw)
      if (min !== undefined) final = Math.max(min, final)
      if (max !== undefined) final = Math.min(max, final)
      if (String(final) !== raw) setRaw(String(final))
      if (final !== value) onChange(final)
    }
    onBlur?.(e)
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={raw}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
    />
  )
}
