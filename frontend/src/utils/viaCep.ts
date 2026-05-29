/**
 * Integração com ViaCEP — API pública gratuita do Correios brasileiro.
 * Docs: https://viacep.com.br
 *
 * Sem auth, sem rate limit publicado. Usa AbortController pra cancelar
 * chamadas em sequência (quando user digita rápido).
 */

export interface EnderecoViaCEP {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  complemento?: string
}

function limparCep(raw: string): string {
  return (raw ?? '').replace(/\D/g, '')
}

/**
 * Busca endereço pelo CEP. Retorna `null` se CEP inválido ou não encontrado.
 * Aceita signal pra cancelamento (use AbortController quando user digita).
 */
export async function buscarEnderecoPorCep(
  cepRaw: string,
  signal?: AbortSignal
): Promise<EnderecoViaCEP | null> {
  const cep = limparCep(cepRaw)
  if (cep.length !== 8) return null

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal })
    if (!resp.ok) return null
    const data = await resp.json()
    // ViaCEP retorna { erro: true } quando CEP não existe
    if (data?.erro) return null
    return {
      cep: data.cep ?? '',
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      uf: data.uf ?? '',
      complemento: data.complemento ?? undefined,
    }
  } catch (err: any) {
    // AbortError quando query foi cancelada por nova digitação
    if (err?.name === 'AbortError') return null
    return null
  }
}
