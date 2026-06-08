import api from './api'

/**
 * Schema do conteúdo editável da Landing. Backend armazena como JSONB livre,
 * frontend valida via este tipo. Cada bloco é opcional — Landing usa fallback
 * hardcoded quando ausente, garantindo robustez contra schema vazio.
 */
export interface LandingContent {
  hero?: {
    tituloLinha1?: string
    tituloLinha2?: string
    subtitulo?: string
    ctaPrimario?: string
    ctaSecundario?: string
    ctaPrimarioLink?: string
    ctaSecundarioLink?: string
  }
  stats?: Array<{ valor: string; label: string }>
  destaques?: Array<{ icone: string; titulo: string; descricao: string }>
  comparativo?: {
    titulo?: string
    subtitulo?: string
    concorrentes?: Array<{
      nome: string
      destaque?: boolean
      cols: string[]
      tipos: Array<'has' | 'no' | 'partial' | 'neutral'>
    }>
  }
  footerCta?: {
    titulo?: string
    subtitulo?: string
    cta?: string
  }
}

export const landingConfigService = {
  /** Público — Landing carrega sem auth. */
  get: async (): Promise<LandingContent> => {
    const { data } = await api.get<LandingContent>('/landing-config')
    return data
  },

  /** Só ADMIN GLOBAL. Substitui o JSON inteiro (PUT, não merge). */
  atualizar: async (conteudo: LandingContent): Promise<LandingContent> => {
    const { data } = await api.put<LandingContent>('/landing-config', conteudo)
    return data
  },
}
