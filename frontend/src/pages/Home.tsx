import { Link } from 'react-router-dom'
import { Calendar, Users, Plus } from 'lucide-react'

export default function Home() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Bem-vindo ao Agenda Inteligente
        </h1>
        <p className="text-lg text-gray-600">
          Sistema de agendamento com pagamento e emissão de NFS-e
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        <Link
          to="/clientes"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <Users className="h-12 w-12 text-blue-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Clientes
          </h3>
          <p className="text-gray-600">
            Gerencie seus clientes e informações de contato
          </p>
        </Link>

        <Link
          to="/agendamentos"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <Calendar className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Agendamentos
          </h3>
          <p className="text-gray-600">
            Visualize e gerencie todos os agendamentos
          </p>
        </Link>

        <Link
          to="/agendamentos/novo"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <Plus className="h-12 w-12 text-purple-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Novo Agendamento
          </h3>
          <p className="text-gray-600">
            Crie um novo agendamento para um cliente
          </p>
        </Link>
      </div>
    </div>
  )
}

