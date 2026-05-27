/**
 * Util de inspeção de JWT no client.
 * NÃO valida assinatura — só decodifica o payload pra ler `exp`.
 * A validação real é feita pelo backend a cada request.
 */

interface JwtPayload {
  exp?: number // segundos desde epoch (RFC 7519)
  [key: string]: any
}

function base64UrlDecode(seg: string): string {
  // base64url → base64 padrão
  const padded = seg.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  const full = pad ? padded + '='.repeat(4 - pad) : padded
  try {
    return atob(full)
  } catch {
    return ''
  }
}

export function decodeJwt(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const json = base64UrlDecode(parts[1])
  if (!json) return null
  try {
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Retorna true se o token está expirado, ausente ou malformado.
 * Margem de segurança de 5 segundos pra evitar race entre check e request.
 */
export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token) return true
  const payload = decodeJwt(token)
  if (!payload || typeof payload.exp !== 'number') return true
  const agoraSegundos = Math.floor(Date.now() / 1000)
  return payload.exp <= agoraSegundos + 5
}
