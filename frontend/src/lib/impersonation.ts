import { plataformaService } from '../services/plataformaService'
import api from '../services/api'

/**
 * Gestão de impersonação (Assumir sessão #94).
 * Salva o estado original do ADMIN no localStorage e troca o token vigente.
 * Ao encerrar, restaura o estado original.
 */

const KEY_BACKUP_TOKEN = 'impersonation_backup_token'
const KEY_BACKUP_USUARIO = 'impersonation_backup_usuario'
const KEY_DADOS_SESSAO = 'impersonation_dados_sessao' // dados da sessão impersonada (empresaNome, etc.)

export interface DadosImpersonacao {
  empresaId: number
  empresaNome: string
  alvoEmail: string
  alvoNome: string
  alvoPerfil: string
  iniciadoEm: string
  expiresAt: number
}

export async function iniciarImpersonacao(
  empresaId: number,
  motivo: string
): Promise<DadosImpersonacao> {
  const tokenAtual = localStorage.getItem('token')
  const usuarioAtual = localStorage.getItem('usuario')

  if (!tokenAtual || !usuarioAtual) {
    throw new Error('Sem sessão atual')
  }

  const response = await plataformaService.assumirSessao(empresaId, motivo)

  // Salva o estado do ADMIN antes de trocar
  localStorage.setItem(KEY_BACKUP_TOKEN, tokenAtual)
  localStorage.setItem(KEY_BACKUP_USUARIO, usuarioAtual)

  // Troca o token vigente
  localStorage.setItem('token', response.token)
  localStorage.setItem(
    'usuario',
    JSON.stringify({
      token: response.token,
      tipo: response.tipo,
      usuarioId: response.alvoUsuarioId,
      nome: response.alvoNome,
      perfil: response.alvoPerfil,
      unidadeId: 0, // será refeito pela API
    })
  )

  const dados: DadosImpersonacao = {
    empresaId: response.empresaId,
    empresaNome: response.empresaNome,
    alvoEmail: response.alvoEmail,
    alvoNome: response.alvoNome,
    alvoPerfil: response.alvoPerfil,
    iniciadoEm: new Date().toISOString(),
    expiresAt: Date.now() + response.expiresInMs,
  }
  localStorage.setItem(KEY_DADOS_SESSAO, JSON.stringify(dados))

  return dados
}

export async function encerrarImpersonacao(): Promise<void> {
  const dadosStr = localStorage.getItem(KEY_DADOS_SESSAO)
  const dados = dadosStr ? (JSON.parse(dadosStr) as DadosImpersonacao) : null

  // Notifica backend (não bloqueia o restore)
  try {
    await api.post('/plataforma/encerrar-sessao', dados ?? {})
  } catch (e) {
    console.warn('[impersonation] erro ao encerrar no backend', e)
  }

  // Restaura backup
  const backupToken = localStorage.getItem(KEY_BACKUP_TOKEN)
  const backupUsuario = localStorage.getItem(KEY_BACKUP_USUARIO)
  if (backupToken && backupUsuario) {
    localStorage.setItem('token', backupToken)
    localStorage.setItem('usuario', backupUsuario)
  }

  localStorage.removeItem(KEY_BACKUP_TOKEN)
  localStorage.removeItem(KEY_BACKUP_USUARIO)
  localStorage.removeItem(KEY_DADOS_SESSAO)
}

export function getDadosImpersonacao(): DadosImpersonacao | null {
  const raw = typeof window === 'undefined' ? null : localStorage.getItem(KEY_DADOS_SESSAO)
  if (!raw) return null
  try {
    const dados = JSON.parse(raw) as DadosImpersonacao
    if (dados.expiresAt && dados.expiresAt < Date.now()) {
      // Expirou — limpa
      localStorage.removeItem(KEY_DADOS_SESSAO)
      return null
    }
    return dados
  } catch {
    return null
  }
}

export function isImpersonando(): boolean {
  return getDadosImpersonacao() !== null
}
