import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, RefreshCw, User, Mail, Hash, Briefcase, Clock } from 'lucide-react'
import { authService } from '../../services/authService'
import { atendenteService } from '../../services/atendenteService'
import ConfirmDialog from '../../components/ConfirmDialog'
import {
  iniciarTourProfissional,
  resetarOnboardingProfissional,
} from '../../components/profissional/OnboardingProfissional'

export default function PerfilProfissional() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const { data: atendente } = useQuery({
    queryKey: ['atendente', 'meu', usuario?.usuarioId],
    queryFn: () => atendenteService.buscarPorUsuarioId(usuario!.usuarioId),
    enabled: !!usuario?.usuarioId,
  })

  function handleSair() {
    setShowLogoutConfirm(false)
    queryClient.clear()
    authService.logout()
    setTimeout(() => navigate('/login'), 100)
  }

  function handleRefazerTour() {
    resetarOnboardingProfissional()
    navigate('/profissional/hoje')
    setTimeout(() => iniciarTourProfissional(), 300)
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Meu perfil</h1>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        <Row icon={User} label="Nome" value={usuario?.nome ?? '—'} />
        <Row icon={Hash} label="Perfil" value={usuario?.perfil ?? '—'} />
        <Row icon={Mail} label="ID usuário" value={usuario?.usuarioId?.toString() ?? '—'} />
        {atendente && (
          <>
            <Row icon={Briefcase} label="Atendente" value={`#${atendente.id}`} />
            {atendente.unidadeId && (
              <Row icon={Clock} label="Unidade" value={`#${atendente.unidadeId}`} />
            )}
          </>
        )}
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
            <p className="text-xs text-gray-500">Conheça novamente como usar o Modo Dia</p>
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
        message={usuario?.nome ? `Até logo, ${usuario.nome.split(' ')[0]}. Deseja mesmo sair?` : 'Deseja mesmo sair?'}
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
