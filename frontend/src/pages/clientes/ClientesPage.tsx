import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useCategoria } from '../../hooks/useCategoria'
import { useIsWebLayout } from '../../hooks/useIsWebLayout'
import ClienteGerenciamento from './tabs/ClienteGerenciamento'
import ClienteRetornos from './tabs/ClienteRetornos'
import ClienteSumidos from './tabs/ClienteSumidos'
import ClienteUnificarContatos from './tabs/ClienteUnificarContatos'

const TABS = [
  { id: 'gerenciamento', label: 'Gerenciamento' },
  { id: 'retornos', label: 'Retornos' },
  { id: 'sumidos', label: 'Sumidos' },
  { id: 'unificar', label: 'Unificar Contatos' },
] as const

type TabId = typeof TABS[number]['id']

export default function ClientesPage() {
  const isWeb = useIsWebLayout()
  const { dict } = useCategoria()
  const [activeTab, setActiveTab] = useState<TabId>('gerenciamento')
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className={`${isWeb ? 'max-w-[1920px] w-full p-6 xl:p-8' : 'max-w-3xl p-4 sm:p-6'} mx-auto space-y-6`}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-violet-600" />
            {dict.rotuloClientePlural}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastro, retornos e clientes inativos.
          </p>
        </div>
        {activeTab === 'gerenciamento' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'gerenciamento' && <ClienteGerenciamento searchTerm={searchTerm} />}
        {activeTab === 'retornos' && <ClienteRetornos />}
        {activeTab === 'sumidos' && <ClienteSumidos />}
        {activeTab === 'unificar' && <ClienteUnificarContatos />}
      </div>
    </div>
  )
}
