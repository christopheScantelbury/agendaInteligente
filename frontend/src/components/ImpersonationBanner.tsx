import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, LogOut } from 'lucide-react'
import {
  DadosImpersonacao,
  encerrarImpersonacao,
  getDadosImpersonacao,
} from '../lib/impersonation'

/**
 * Banner sticky exibido quando ADMIN global está usando "Assumir sessão" (#94).
 * Renderiza globalmente — colocado no <body>, fora dos Layouts.
 */
export default function ImpersonationBanner() {
  const queryClient = useQueryClient()
  const [dados, setDados] = useState<DadosImpersonacao | null>(() => getDadosImpersonacao())
  const [restaurando, setRestaurando] = useState(false)

  useEffect(() => {
    // Polling leve a cada 30s pra detectar expiração
    const t = window.setInterval(() => setDados(getDadosImpersonacao()), 30_000)
    return () => window.clearInterval(t)
  }, [])

  if (!dados) return null

  async function encerrar() {
    setRestaurando(true)
    try {
      await encerrarImpersonacao()
      queryClient.clear()
      window.location.href = '/plataforma/empresas'
    } catch (err) {
      console.error(err)
    } finally {
      setRestaurando(false)
    }
  }

  const expiraEm = Math.max(0, Math.floor((dados.expiresAt - Date.now()) / 60000))

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-amber-950 shadow-md">
      <div className="max-w-6xl mx-auto px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm min-w-0">
            <p className="font-bold truncate">
              Você está como <span className="underline">{dados.empresaNome}</span>
            </p>
            <p className="text-xs opacity-80 truncate">
              Sessão impersonada — expira em ~{expiraEm} min. Toda ação está sendo auditada.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={encerrar}
          disabled={restaurando}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950 hover:bg-black text-amber-100 text-sm font-semibold disabled:opacity-50 self-stretch sm:self-auto justify-center"
        >
          <LogOut className="h-4 w-4" />
          {restaurando ? 'Encerrando...' : 'Encerrar sessão'}
        </button>
      </div>
    </div>
  )
}
