import { useEffect, useState } from 'react'
import { authService } from '../services/authService'

/**
 * Threshold em px pra considerar layout "web" (mesmo do Tailwind `lg:`).
 * Trocar aqui muda em todo lugar que consome o hook.
 */
export const WEB_LAYOUT_MIN_WIDTH = 1024

/**
 * Perfis que veem o layout web (versão desktop de gestão).
 * PROFISSIONAL e CLIENTE mantêm layout mobile mesmo em desktop —
 * decisão da sessão 2026-07-08: prof usa PWA, cliente agenda pelo celular,
 * então o layout web foca em ADMIN/ADMINISTRADOR/GERENTE que operam PC.
 */
const PERFIS_GESTAO = new Set(['ADMIN', 'ADMINISTRADOR', 'GERENTE'])

function tamanhoOk(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(min-width: ${WEB_LAYOUT_MIN_WIDTH}px)`).matches
}

function perfilOk(): boolean {
  const perfil = (authService.getUsuario()?.perfil ?? '').toUpperCase()
  return PERFIS_GESTAO.has(perfil)
}

/**
 * Decide se a UI deve renderizar a versão WEB (desktop) ou MOBILE.
 *
 * Regra: `web = viewport ≥ lg (1024px)  E  perfil ∈ {ADMIN, ADMINISTRADOR, GERENTE}`
 *
 * Usa `matchMedia` — atualiza reativo quando o user redimensiona a janela.
 * A parte "perfil" só reavalia quando o hook remontar (troca de login).
 */
export function useIsWebLayout(): boolean {
  const [tamanhoWeb, setTamanhoWeb] = useState<boolean>(tamanhoOk())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(`(min-width: ${WEB_LAYOUT_MIN_WIDTH}px)`)
    const listener = (e: MediaQueryListEvent) => setTamanhoWeb(e.matches)
    mql.addEventListener('change', listener)
    // Sincroniza estado inicial caso o SSR/hydration tenha divergido
    setTamanhoWeb(mql.matches)
    return () => mql.removeEventListener('change', listener)
  }, [])

  return tamanhoWeb && perfilOk()
}

/**
 * Versão que retorna só o gate por perfil — útil quando o `lg:` do Tailwind
 * já cuida do tamanho e a gente só quer bloquear perfis não-gestão de ver
 * o layout web mesmo em desktop grande.
 */
export function useIsPerfilGestao(): boolean {
  return perfilOk()
}
