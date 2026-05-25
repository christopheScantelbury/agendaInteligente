import { Link } from 'react-router-dom'
import { authService } from '../../services/authService'
import BottomNavProfissional from './BottomNavProfissional'

interface ProfessionalLayoutProps {
  children: React.ReactNode
}

export default function ProfessionalLayout({ children }: ProfessionalLayoutProps) {
  const usuario = authService.getUsuario()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4 sticky top-0 z-30">
        <Link to="/profissional/hoje" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
            <rect width="32" height="32" rx="9" fill="#7C3AED" />
            <rect x="6" y="6" width="20" height="20" rx="3" fill="white" />
            <rect x="10" y="4" width="4" height="5" rx="1.5" fill="#DDD6FE" />
            <rect x="18" y="4" width="4" height="5" rx="1.5" fill="#DDD6FE" />
            <line x1="10" y1="16" x2="22" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="19.5" x2="18" y2="19.5" stroke="#C4B5FD" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="22" cy="22" r="4" fill="#10B981" />
            <path d="M20.5 22l1 1 2.5-2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-black text-sm text-slate-900 tracking-tight">
            Agenda<span className="text-violet-600">Inteligente</span>
          </span>
        </Link>
        {usuario?.nome && (
          <span className="text-xs text-gray-500 truncate max-w-[150px]">{usuario.nome}</span>
        )}
      </header>

      <main className="flex-1 pb-20 overflow-x-hidden">{children}</main>

      <BottomNavProfissional />
    </div>
  )
}
