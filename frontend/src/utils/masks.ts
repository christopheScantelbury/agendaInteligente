// Utilitários para máscaras de input

export const maskPhone = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Aplica máscara: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  } else {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }
}

export const maskCEP = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Aplica máscara: XXXXX-XXX
  return numbers.replace(/(\d{5})(\d)/, '$1-$2')
}

export const maskCNPJ = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Aplica máscara: XX.XXX.XXX/XXXX-XX
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export const maskCPF = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Aplica máscara: XXX.XXX.XXX-XX
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1-$2')
}

export const maskEmail = (value: string): string => {
  // Remove espaços e converte para minúsculas
  return value.trim().toLowerCase()
}

export const maskNumber = (value: string): string => {
  // Remove tudo que não é dígito
  return value.replace(/\D/g, '')
}

export const unmask = (value: string): string => {
  // Remove todos os caracteres não numéricos
  return value.replace(/\D/g, '')
}

// ============================================================
// Máscara monetária BRL (#148) — comportamento "calculadora":
// usuário só digita números; o cursor sempre representa centavos.
//
// 1     -> R$ 0,01
// 10    -> R$ 0,10
// 100   -> R$ 1,00
// 1000  -> R$ 10,00
// 10000 -> R$ 100,00
// ============================================================

/**
 * Recebe input bruto (string ou número de centavos) e devolve string formatada "R$ 1.234,56".
 * Aceita:
 *  - "1234" (string com só dígitos) -> trata como 1234 centavos -> "R$ 12,34"
 *  - "R$ 12,34" (já mascarado) -> normaliza
 *  - 12.34 (number) -> "R$ 12,34"
 */
export const maskMoney = (input: string | number | null | undefined): string => {
  if (input == null || input === '') return ''
  let centavos: number
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return ''
    centavos = Math.round(input * 100)
  } else {
    // Mantém só dígitos — qualquer formatação prévia é descartada
    const digits = input.replace(/\D/g, '')
    if (!digits) return ''
    centavos = parseInt(digits, 10)
  }
  if (Number.isNaN(centavos)) return ''
  const reais = Math.floor(centavos / 100)
  const cents = centavos % 100
  const reaisFormatado = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const centsFormatado = cents.toString().padStart(2, '0')
  return `R$ ${reaisFormatado},${centsFormatado}`
}

/**
 * "R$ 1.234,56" -> 1234.56
 * "1234,56"     -> 1234.56
 * ""            -> 0
 */
export const parseMoney = (masked: string | number | null | undefined): number => {
  if (masked == null || masked === '') return 0
  if (typeof masked === 'number') return Number.isFinite(masked) ? masked : 0
  const digits = masked.replace(/\D/g, '')
  if (!digits) return 0
  return parseInt(digits, 10) / 100
}
