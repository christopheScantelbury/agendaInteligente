import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Header padrão das telas de configuração — botão "Voltar para o início"
 * sempre visível no topo. Mantém a navegação fluida sem depender da sidebar.
 */
export default function ConfigPageHeader() {
  return (
    <div className="mb-2">
      <Link
        to="/gerente/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-violet-700 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o início
      </Link>
    </div>
  )
}
