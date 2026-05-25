import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, RefreshCw, User, Mail, Hash } from 'lucide-react'
import { clientePublicoService } from '../../services/clientePublicoService'
import {
  iniciarTourCliente,
  resetarOnboarding,
} from '../../components/cliente/OnboardingCliente'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function PerfilCliente() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cliente = clientePublicoService.getCliente()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  function handleSair() {
    setShowLogoutConfirm(false)
    queryClient.clear()
    clientePublicoService.logout()
    setTimeout(() => navigate('/cliente/login'), 100)
  }

  function handleRefazerTour() {
    resetarOnboarding()
    navigate('/cliente')
    setTimeout(() => iniciarTourCliente(), 300)
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Meu perfil</h1>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        <Row icon={User} label="Nome" value={cliente?.nome ?? '—'} />
        <Row icon={Mail} label="E-mail" value={cliente?.email ?? '—'} />
        <Row icon={Hash} label="ID do cliente" value={cliente?.clienteId?.toString() ?? '—'} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Ajuda</h2>
        <button
          type="button"
          onClick={handleRefazerTour}
          className="
            w-full flex items-center gap-3 p-4
            bg-white border border-gray-200 rounded-xl
            hover:border-violet-300 hover:shadow-sm transition
            text-left
          "
        >
          <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Refazer tour</p>
            <p className="text-xs text-gray-500">Conheça novamente como usar o app</p>
          </div>
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Conta</h2>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="
            w-full flex items-center gap-3 p-4
            bg-white border border-gray-200 rounded-xl
            hover:border-red-300 hover:shadow-sm transition
            text-left
          "
        >
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <LogOut className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Sair</p>
            <p className="text-xs text-gray-500">Encerrar sessão neste dispositivo</p>
          </div>
        </button>
      </section>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sair da conta"
        message={cliente?.nome ? `Até logo, ${cliente.nome.split(' ')[0]}. Deseja mesmo sair?` : 'Deseja mesmo sair?'}
        confirmText="Sair"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleSair}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 text-gray-400" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
      </div>
    </div>
  )
}
