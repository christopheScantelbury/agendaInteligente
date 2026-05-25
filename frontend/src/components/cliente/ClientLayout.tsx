import { Link } from 'react-router-dom'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { clientePublicoService } from '../../services/clientePublicoService'
import BottomNav from './BottomNav'
import ConfirmDialog from '../ConfirmDialog'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const queryClient = useQueryClient()
  const cliente = clientePublicoService.getCliente()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const confirmLogout = () => {
    setShowLogoutConfirm(false)
    queryClient.clear()
    clientePublicoService.logout()
    setTimeout(() => {
      window.location.href = '/cliente/login'
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4 sticky top-0 z-30">
        <Link to="/cliente" className="flex items-center gap-2">
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
        <button
          onClick={() => setShowLogoutConfirm(true)}
          aria-label="Sair"
          className="p-2 -mr-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-md"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 pb-20 overflow-x-hidden">{children}</main>

      <BottomNav />

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sair da conta"
        message={cliente?.nome ? `Até logo, ${cliente.nome.split(' ')[0]}. Deseja mesmo sair?` : 'Deseja mesmo sair?'}
        confirmText="Sair"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}
