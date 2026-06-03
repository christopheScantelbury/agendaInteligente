import { InputHTMLAttributes } from 'react'
import { maskCPF, unmask } from '../../utils/masks'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string | null | undefined
  /** Devolve string mascarada "XXX.XXX.XXX-XX". */
  onChange: (masked: string) => void
  className?: string
}

/**
 * Input CPF com máscara em tempo real (#144 / #146).
 *
 * NÃO mascarar parcialmente o CPF na visualização — esse era o bug reportado.
 * Sempre exibe o documento completo.
 */
export default function CpfInput({
  value,
  onChange,
  className = '',
  placeholder = '000.000.000-00',
  inputMode = 'numeric',
  maxLength = 14,
  ...rest
}: Props) {
  const display = value ? maskCPF(unmask(value)) : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = unmask(e.target.value).slice(0, 11)
    onChange(maskCPF(digits))
  }

  return (
    <input
      type="text"
      inputMode={inputMode}
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={maxLength}
      className={
        className ||
        'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none'
      }
      {...rest}
    />
  )
}
