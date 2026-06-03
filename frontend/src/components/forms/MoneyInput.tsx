import { InputHTMLAttributes, useEffect, useState } from 'react'
import { maskMoney, parseMoney } from '../../utils/masks'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** Valor numérico em reais (ex: 1234.56). null/undefined renderiza vazio. */
  value: number | null | undefined
  /** Callback com o valor numérico já parseado em reais. */
  onChange: (value: number) => void
  /** Classes extras pro input. */
  className?: string
}

/**
 * Input monetário BRL padronizado (#148).
 *
 * Comportamento de calculadora: usuário digita só números, cursor sempre nos centavos.
 * Exibe "R$ 1.234,56" em tempo real. Externamente expõe number puro.
 *
 * Uso:
 *   <MoneyInput value={despesa.valor} onChange={(n) => setDespesa({...despesa, valor: n})} />
 *
 * Padrão visual: mesmo dos outros inputs do projeto (rounded-xl border-slate-200 focus violet).
 */
export default function MoneyInput({
  value,
  onChange,
  className = '',
  placeholder = 'R$ 0,00',
  inputMode = 'numeric',
  ...rest
}: Props) {
  // displayValue armazena a string mascarada; sincronizamos com `value` quando muda externamente.
  const [displayValue, setDisplayValue] = useState<string>(() =>
    value != null && value > 0 ? maskMoney(value) : ''
  )

  // Quando o valor externo muda (ex: hidratação de form do React Query), reflete na UI.
  useEffect(() => {
    if (value == null) {
      setDisplayValue('')
      return
    }
    const masked = maskMoney(value)
    setDisplayValue(masked)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const masked = maskMoney(raw)
    setDisplayValue(masked)
    onChange(parseMoney(masked))
  }

  return (
    <input
      type="text"
      inputMode={inputMode}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={
        className ||
        'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none'
      }
      {...rest}
    />
  )
}
