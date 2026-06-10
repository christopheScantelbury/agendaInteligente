import { ChangeEvent, InputHTMLAttributes } from 'react'

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
 * - Mantém `type="text"` + `inputMode="numeric"` (mostra teclado numérico no mobile)
 * - Sem setinhas de incremento/decremento (proibido — feedback do user 10/06)
 * - Aceita só dígitos no onChange
 * - Clamp em min/max no onBlur (não interrompe digitação intermediária)
 *
 * Use pra: "Máximo de unidades", "Quantidade", "Antecedência em horas",
 * percentual (sem máscara R$), etc.
 */
export default function IntegerInput({
  value,
  onChange,
  min,
  max,
  onBlur,
  className,
  ...rest
}: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '')
    if (cleaned === '') {
      onChange(undefined)
      return
    }
    onChange(Number(cleaned))
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (value !== undefined) {
      let clamped = value
      if (min !== undefined) clamped = Math.max(min, clamped)
      if (max !== undefined) clamped = Math.min(max, clamped)
      if (clamped !== value) onChange(clamped)
    }
    onBlur?.(e)
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value === undefined ? '' : String(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  )
}
