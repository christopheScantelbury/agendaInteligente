import { InputHTMLAttributes } from 'react'
import { maskPhone, unmask } from '../../utils/masks'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** Valor cru (só dígitos) ou já mascarado — ambos aceitos. */
  value: string | null | undefined
  /** Devolve sempre a string mascarada "(92) 99999-9999". Persistência fica a critério do consumer. */
  onChange: (masked: string) => void
  className?: string
}

/**
 * Input telefone BRL com máscara em tempo real (#144).
 *
 * Aceita 10 dígitos (fixo): "(XX) XXXX-XXXX"
 * Aceita 11 dígitos (celular): "(XX) XXXXX-XXXX"
 *
 * Aplica máscara durante a digitação. O valor externo pode vir cru ou mascarado;
 * o componente sempre re-mascara antes de exibir/devolver.
 */
export default function PhoneInput({
  value,
  onChange,
  className = '',
  placeholder = '(00) 00000-0000',
  inputMode = 'tel',
  maxLength = 16,
  ...rest
}: Props) {
  const display = value ? maskPhone(unmask(value)) : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = unmask(e.target.value).slice(0, 11)
    onChange(maskPhone(digits))
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
